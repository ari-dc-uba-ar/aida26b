import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';

import type { AuthUser } from '../auth';
import {
  getEntityName,
  getNotDerivableFields,
  tryQuery,
  formatTableColumnsForQuery,
} from '../helpers';
import {
  sendErrorMessage,
} from '../status_messages';
import {
  validateFullObject,
  sendErrorsIfInvalid,
} from '../validation/validate';
import {
  validateCheckoutRequest,
  type CheckoutItem,
} from '../../../shared/src/validation/checkout';
import { DriverStatus, OrderStatus } from '../../../shared/src/ssot/structure';

type AuthedRequest = Request & { user?: AuthUser; dbClient?: PoolClient };

function generateOrderId(): string {
  return `ORD${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

async function getRandomTransport(client: PoolClient): Promise<string> {
  const result = await client.query<{ license_plate: string }>(
    `SELECT license_plate
     FROM transports
     WHERE availability IS NULL
        OR availability = $1
     ORDER BY random()
     LIMIT 1`,
     [DriverStatus.READY]
  );

  if (result.rows.length === 0) {
    throw new Error('No hay transportes disponibles');
  }

  return result.rows[0].license_plate;
}

async function getItemsRandomly(
  client: PoolClient,
  cod_stock: string,
  quantity: number,
): Promise<string[]> {
  const freeItems = await client.query<{ cod_item: string }>(
    `SELECT cod_item
     FROM items
     WHERE cod_stock = $1
       AND order_uuid IS NULL
     ORDER BY random()
     LIMIT $2`,
    [cod_stock, quantity],
  );

  if (freeItems.rows.length < quantity) {
    throw new Error(
      `Stock insuficiente para '${cod_stock}': disponibles ${freeItems.rows.length}, solicitados ${quantity}`,
    );
  }

  return freeItems.rows.map((row) => row.cod_item);
}

async function insertOrder(
  client: PoolClient,
  orderData: Record<string, unknown>,
) {
  const validated = validateFullObject('orders', orderData);

  if ('errors' in validated) {
    return { success: false as const, errors: validated.errors };
  }

  const notDerivableFields = getNotDerivableFields('orders');
  const valuesToInsert = notDerivableFields.map(
    (fieldName) => (validated.data as Record<string, unknown>)[fieldName],
  );
  const [fieldNamesTuple, parametersNumbersTuple] =
    formatTableColumnsForQuery(notDerivableFields);

  const query = `
    INSERT INTO orders ${fieldNamesTuple}
    VALUES ${parametersNumbersTuple}
    RETURNING *
  `;

  return tryQuery(client, query, valuesToInsert);
}

function resolveClientCuit(user: AuthUser, cuitFromBody?: string): string | null {
  if (user.role === 'client') {
    return user.client_cuit ?? null;
  }

  return cuitFromBody ?? user.client_cuit ?? null;
}

export async function checkoutHandler(req: AuthedRequest, res: Response) {
  const user = req.user;
  const client = req.dbClient;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!client) {
    return sendErrorMessage(res, 'Database session not available');
  }

  if (user.role !== 'client' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const validatedRequest = validateCheckoutRequest(req.body);
  if (sendErrorsIfInvalid(res, validatedRequest)) {
    return;
  }

  const { items, cuit_client: cuitFromBody } = validatedRequest.data;
  const clientCUIT = resolveClientCuit(user, cuitFromBody);

  if (!clientCUIT) {
    return res.status(400).json({
      error:
        'No se pudo determinar el cliente. Especifique cuit_client o asegúrese de tener un perfil de cliente.',
    });
  }

  const clientExists = await client.query(
    'SELECT 1 FROM clients WHERE cuit = $1',
    [clientCUIT],
  );

  if (clientExists.rowCount === 0) {
    return res.status(400).json({
      error: `El cliente con CUIT ${clientCUIT} no existe`,
    });
  }

  try {
    await client.query('BEGIN');

    // Elevamos temporalmente el rol a admin para las consultas internas (transporte e items).
    // El cliente no debería tener acceso directo a esas tablas, pero el servidor sí necesita consultarlas.
    // SET LOCAL solo aplica dentro de esta transacción.
    await client.query("SET LOCAL app.role = 'admin'");

    const plate_transport = await getRandomTransport(client);

    const itemsToReserve: string[] = [];
    for (const { cod_stock, quantity } of items as CheckoutItem[]) {
      const fetchedRandomItems: string[] = await getItemsRandomly(
        client,
        cod_stock,
        quantity,
      );
      itemsToReserve.push(...fetchedRandomItems);
    }

    // Restauramos el rol del cliente para que el INSERT de la orden respete las políticas RLS de orders
    await client.query("SET LOCAL app.role = 'client'");

    const orderUUID = generateOrderId();
    const orderDate = new Date().toISOString().split('T')[0];

    const insertResult = await insertOrder(client, {
      uuid: orderUUID,
      order_date: orderDate,
      cuit_client: clientCUIT,
      plate_transport,
      status: OrderStatus.PREPARING,
    });

    if (!insertResult.success) {
      if ('errors' in insertResult) {
        await client.query('ROLLBACK');
        return sendErrorsIfInvalid(res, insertResult);
      }

      await client.query('ROLLBACK');

      if (insertResult.code === '23505') {
        return res.status(409).json({
          success: false,
          message: `${getEntityName('orders')} already exists`,
        });
      }

      return sendErrorMessage(res, insertResult.message);
    }

    if (itemsToReserve.length > 0) {
      const assignResult = await tryQuery(
        client,
        `UPDATE items
         SET order_uuid = $1
         WHERE cod_item = ANY($2::varchar[])`,
        [orderUUID, itemsToReserve],
      );

      if (!assignResult.success) {
        await client.query('ROLLBACK');
        return sendErrorMessage(res, assignResult.message);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Compra procesada correctamente',
      data: {
        order_uuid: orderUUID,
        order: insertResult.data.rows[0],
      },
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');

    const message =
      error instanceof Error ? error.message : 'Error interno al procesar la compra';
    const isStockError = message.includes('Stock insuficiente');
    const isTransportError = message.includes('No hay transportes disponibles');

    console.error('Checkout error:', error);

    return res.status(isStockError || isTransportError ? 409 : 500).json({
      error: isStockError || isTransportError ? message : 'Error interno al procesar la compra',
    });
  }
}
