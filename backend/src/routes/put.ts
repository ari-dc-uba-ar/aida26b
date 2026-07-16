import express from 'express';
import type { Pool, PoolClient } from 'pg';

import { OrderStatus, structure } from '../../../shared/src/ssot/structure';
import type { TableKey, Response } from '../../../shared/src/types/types';
import { getPkFields } from '../../../shared/src/utils/utils';

import {
  getEntityName,
  getNotDerivableFields,
  tryQuery,
  columnNamesEqualsNumber,
} from '../helpers';

import {
  sendSuccessOperationMessage,
  sendNotFoundMessage,
  sendErrorMessage,
} from '../status_messages';

import {
  validateFullObject,
  validateOnlyPk,
  sendErrorsIfInvalid,
} from '../validation/validate';

export async function putHandler(
  req: express.Request,
  res: express.Response,
  pool: Pool | PoolClient
) {
  const tableNameParam = req.params.tableName;

  if (!isKnownTable(tableNameParam)) {
    return sendNotFoundMessage(res, tableNameParam);
  }

  const tableName = tableNameParam as TableKey;
  const entityName = getEntityName(tableName);

  if (req.query.cancel === 'true') {
    const tableConfig = structure.tables[tableName];
    if (!('cancelButtonLabel' in tableConfig)) {
      return res.status(400).json({
        success: false,
        message: `Cancellation is not supported for ${entityName}`,
      });
    }

    const queryParamsWithoutCancel = { ...req.query };
    delete queryParamsWithoutCancel.cancel;
    const validatedPk = validateOnlyPk(tableName, queryParamsWithoutCancel);

    if (sendErrorsIfInvalid(res, validatedPk)) {
      return;
    }

    const pkFields = getPkFields(tableName);
    const pkValues = pkFields.map(
      (pkField) => (validatedPk.data as Record<string, unknown>)[pkField]
    );

    const whereArgumentsString = columnNamesEqualsNumber(
      pkFields,
      1,
      ' AND '
    );

    try {
      await pool.query('BEGIN');

      const selectQuery = `SELECT * FROM ${tableName} WHERE ${whereArgumentsString} FOR UPDATE`;
      const selectResult = await pool.query(selectQuery, pkValues);

      if (selectResult.rowCount === 0) {
        await pool.query('ROLLBACK');
        return sendNotFoundMessage(res, entityName);
      }

      const record = selectResult.rows[0];

      if (tableName === 'orders' && record.status !== OrderStatus.PREPARING) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Only orders in '${OrderStatus.PREPARING}' status can be cancelled`,
        });
      }

      if (tableName === 'orders') {
        const updateOrderQuery = `
          UPDATE orders
          SET status = $1
          WHERE uuid = $2
          RETURNING *
        `;
        const orderResult = await pool.query(
          updateOrderQuery, 
          [OrderStatus.CANCELLED, record.uuid]);

        const updateItemsQuery = `
          UPDATE items
          SET order_uuid = NULL
          WHERE order_uuid = $1
        `;
        await pool.query(updateItemsQuery, [record.uuid]);

        await pool.query('COMMIT');

        return sendSuccessOperationMessage(
          res,
          entityName,
          orderResult.rows[0],
          OrderStatus.CANCELLED,
          202
        );
      } else {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cancellation logic for ${entityName} is not implemented`,
        });
      }
    } catch (error) {
      await pool.query('ROLLBACK');
      return sendErrorMessage(res, (error as Error).message);
    }
  }

  const validatedBody = validateFullObject(tableName, req.body);

  if (sendErrorsIfInvalid(res, validatedBody)) {
    return;
  }

  const validatedPk = validateOnlyPk(tableName, req.query);

  if (sendErrorsIfInvalid(res, validatedPk)) {
    return;
  }

  const pkFields = getPkFields(tableName);

  const pkValues = pkFields.map(
    (pkField) => (validatedPk.data as Record<string, unknown>)[pkField]
  );

  const fieldsToUpdate = getNotDerivableFields(tableName).filter(
    (fieldName) => !pkFields.includes(fieldName)
  );

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({
      success: false,
      message: `No editable fields found for ${entityName}`,
    });
  }

  const newValues = fieldsToUpdate.map(
    (fieldName) => (validatedBody.data as Record<string, unknown>)[fieldName]
  );

  const setArgumentsString = columnNamesEqualsNumber(
    fieldsToUpdate,
    1,
    ', '
  );

  const whereArgumentsString = columnNamesEqualsNumber(
    pkFields,
    fieldsToUpdate.length + 1,
    ' AND '
  );

  const query = `
    UPDATE ${tableName}
    SET ${setArgumentsString}
    WHERE ${whereArgumentsString}
    RETURNING *
  `;

  const result: Response = await tryQuery(pool, query, [
    ...newValues,
    ...pkValues,
  ]);

  if (!result.success) {
    if (result.code === '23505') {
      return res.status(409).json({
        success: false,
        data: undefined,
        message: `${entityName} already exists`,
      });
    }

    return sendErrorMessage(res, result.message);
  }

  if (result.data?.rowCount === 0) {
    return sendNotFoundMessage(res, entityName);
  }

  return sendSuccessOperationMessage(
    res,
    entityName,
    result.data.rows[0],
    'updated',
    202
  );
}

function isKnownTable(tableName: string): tableName is TableKey {
  return Object.prototype.hasOwnProperty.call(structure.tables, tableName);
}