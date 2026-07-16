// funciones para los endpoints específicos para orders según nuestra lógica de negocio

import { Pool, PoolClient } from "pg";
import type { Request, Response } from 'express';
import { sendErrorsIfInvalid, validateOnlyPk } from "../validation/validate";
import { sendErrorMessage, sendNotFoundMessage, sendSuccessOperationMessage } from "../status_messages";
import { DriverStatus, OrderStatus } from "../../../shared/src/ssot/structure";
import { putHandler } from "./put";


export async function cancelOrderHandler(
  req: Request,
  res: Response,
  pool: Pool | PoolClient
) {

  const validatedPk = validateOnlyPk("orders", req.body);

  if (sendErrorsIfInvalid(res, validatedPk)) {
    return;
  }

  const uuid = (validatedPk.data as { uuid: string }).uuid;

  try {
    await pool.query("BEGIN");

    const selectResult = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE uuid = $1
      FOR UPDATE
      `,
      [uuid]
    );

    if (selectResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return sendNotFoundMessage(res, "order");
    }

    const order = selectResult.rows[0];

    if (order.status !== OrderStatus.PREPARING) {
      await pool.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: `Only orders in '${OrderStatus.PREPARING}' status can be cancelled`,
      });
    }

    // updateamos la order
    const updateResult = await pool.query(
      `
      UPDATE orders
      SET status = $1, delivered_at_time = NULL
      WHERE uuid = $2
      RETURNING *
      `,
      [
        OrderStatus.CANCELLED,
        uuid,
      ]
    );

    // dejamos como libres a los items asociados a la misma
    await pool.query(
      `
      UPDATE items
      SET order_uuid = NULL
      WHERE order_uuid = $1
      `,
      [uuid]
    );

    await pool.query("COMMIT");

    return sendSuccessOperationMessage(
      res,
      "order",
      updateResult.rows[0],
      OrderStatus.CANCELLED,
      202
    );

  } catch (error) {

    await pool.query("ROLLBACK");

    return sendErrorMessage(
      res,
      (error as Error).message
    );
  }
}

export async function updateDriverStatusHandler(
  req: Request,
  res: Response,
  pool: Pool | PoolClient
) {

  const { license_plate, availability } = req.body;

  if (!license_plate || !availability) {
    return res.status(400).json({
      success: false,
      message: "license_plate and availability are required",
    });
  }

  try {
    await pool.query("BEGIN");

    // lock del transport
    const transportResult = await pool.query(
      `
        SELECT *
        FROM transports
        WHERE license_plate = $1
        FOR UPDATE
        `,
      [license_plate]
    );

    if (transportResult.rowCount === 0) {
      await pool.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    const previousStatus = transportResult.rows[0].availability;

    // actualizar transport
    const updatedTransport = await pool.query(
      `
        UPDATE transports
        SET availability = $1
        WHERE license_plate = $2
        RETURNING *
        `,
      [availability, license_plate]
    );

    // ready a travelling
    if (
      previousStatus === DriverStatus.READY &&
      availability === DriverStatus.TRAVELLING
    ) {
      // actualizamos sus pedidos
      await pool.query(
        `
          UPDATE orders
          SET status = $1, delivered_at_time = NULL
          WHERE
            status = $2
            AND plate_transport = $3
          `,
        [OrderStatus.TRAVELLING, OrderStatus.PREPARING, license_plate]
      );
    }

    // travelling a ready
    if (
      previousStatus === DriverStatus.TRAVELLING &&
      availability === DriverStatus.READY
    ) {
      // no se pudieron entregar algunas orders
      await pool.query(
        `
          UPDATE orders
          SET status = $1, delivered_at_time = NULL
          WHERE
            status = $2
            AND plate_transport = $3
          `,
        [OrderStatus.FAILED, OrderStatus.TRAVELLING, license_plate]
      );
    }

    // broken
    if (availability === DriverStatus.BROKEN) {
      // desasigna sus pedidos en preparación o viaje y los vuelve a preparación
      await pool.query(
        `
          UPDATE orders
          SET status = $1, plate_transport = NULL, delivered_at_time = NULL
          WHERE
            (status = $1 OR status = $2)
            AND plate_transport = $3
          `,
        [OrderStatus.PREPARING, OrderStatus.TRAVELLING, license_plate]
      );
    }

    await pool.query("COMMIT");

    return res.status(202).json({
      success: true,
      data: updatedTransport.rows[0],
      message: "Driver status updated",
    });

  } catch (error) {
    await pool.query("ROLLBACK");

    return sendErrorMessage(res, (error as Error).message);
  }
}

export async function updateOrderHandler(
  req: Request,
  res: Response,
  pool: Pool | PoolClient
) {
  req.params.tableName = 'orders';
  const programmaticUpdates: Record<string, any> = {};
  if (req.body) {
    if (req.body.status === OrderStatus.DELIVERED) {
      programmaticUpdates.delivered_at_time = new Date().toISOString();
    } else if (req.body.status) {
      programmaticUpdates.delivered_at_time = null;
    }
  }
  return putHandler(req, res, pool, programmaticUpdates);
}
