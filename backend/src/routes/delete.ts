import express from 'express';
import { getEntityName } from "../helpers";
import { Pool } from 'pg';
import type { TableKey, Response } from "../types/types";
import  { assertValidDeleteInstance } from '../assertions';
import  { columnNamesEqualsNumber, tryQuery} from '../helpers';
import  { getPkFields } from '../utils/utils';
import  { sendErrorMessage, sendNotFoundMessage, sendSuccessOperationMessage} from '../statusMessages';

export async function deleteHandler(pool: Pool, req: express.Request, res: express.Response) {
  const tableName: string = req.params.tableName;
  const pkFieldsNames: string[] = Object.values(req.query) as string[]; 
  const entityName = getEntityName(tableName as TableKey);
  
  if (assertValidDeleteInstance(tableName, res, pkFieldsNames, entityName)){
    const whereArgumentsString = columnNamesEqualsNumber(getPkFields(tableName as TableKey), 1, ' AND ');
    const query: string = `DELETE FROM ${tableName} WHERE ${whereArgumentsString} RETURNING *`;
    const queryResponse: Response = await tryQuery(pool, query, Object.values(req.query));
    if (queryResponse.data?.rowCount === 0) return sendNotFoundMessage(res, entityName);
    else if(!queryResponse.success) return sendErrorMessage(res, queryResponse.message);
    return sendSuccessOperationMessage(res, entityName, queryResponse.data?.rows?.[0], 'deleted', 200);
  }
}