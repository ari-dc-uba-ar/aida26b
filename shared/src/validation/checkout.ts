import { validateField } from './validate';

export type CheckoutItem = {
  cod_stock: string;
  quantity: number;
};

export type CheckoutRequest = {
  items: CheckoutItem[];
  cuit_client?: string;
};

export function validateCheckoutRequest(
  body: unknown,
): { data: CheckoutRequest } | { errors: string[] } {
  if (body == null || typeof body !== 'object') {
    return { errors: ['Request body must be an object'] };
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  if (!Array.isArray(record.items) || record.items.length === 0) {
    return { errors: ['items must be a non-empty array'] };
  }

  const items: CheckoutItem[] = [];

  record.items.forEach((rawItem, index) => {
    if (rawItem == null || typeof rawItem !== 'object') {
      errors.push(`items[${index}] must be an object`);
      return;
    }

    const item = rawItem as Record<string, unknown>;
    const codStockError = validateField('stocks', 'cod_stock', item.cod_stock);
    if (codStockError) {
      errors.push(`items[${index}].${codStockError}`);
    }

    if (!Number.isInteger(item.quantity) || (item.quantity as number) <= 0) {
      errors.push(`items[${index}].quantity must be a positive integer`);
    }

    if (!codStockError && Number.isInteger(item.quantity) && (item.quantity as number) > 0) {
      items.push({
        cod_stock: item.cod_stock as string,
        quantity: item.quantity as number,
      });
    }
  });

  let cuit_client: string | undefined;
  if ('cuit_client' in record && record.cuit_client != null) {
    const cuitError = validateField('clients', 'cuit', record.cuit_client);
    if (cuitError) {
      errors.push(cuitError);
    } else {
      cuit_client = record.cuit_client as string;
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { data: { items, cuit_client } };
}
