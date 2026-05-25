import express from 'express';
import {assertValidPutInstance} from "../assertions";
import {getEntityName, getNotDerivableFields, tryQuery, columnNamesEqualsNumber, } from "../helpers";
import {sendSuccessOperationMessage, sendNotFoundMessage, sendErrorMessage} from "../statusMessages";
import {TableKey, Response} from "../../../shared/src/types/types";
import { Pool } from "pg";

export async function putHandler(pool: Pool, req: express.Request, res: express.Response) {
    const tableName          = req.params.tableName;
    const entityName: string = getEntityName(tableName as TableKey);  
    const pksValues          = Object.values(req.query) as any[];
    const pkFieldsNames      = Object.keys(req.query);
    const newValues          = Object.values(req.body) as any[];

    if (assertValidPutInstance(tableName, res, pksValues, entityName, Object.keys(req.body), newValues, pkFieldsNames)){
      const setArgumentsString: string   = columnNamesEqualsNumber(getNotDerivableFields(tableName as TableKey), pkFieldsNames.length + 1);
      const whereArgumentsString: string = columnNamesEqualsNumber(pkFieldsNames, 1, ' AND ');
      const query: string                = `UPDATE ${tableName} SET ${setArgumentsString} WHERE ${whereArgumentsString} RETURNING *`;
      const result: Response             = await tryQuery(pool, query, pksValues.concat(newValues));
      
      if (result.data?.rowCount === 0) return sendNotFoundMessage(res, entityName + `not found`);
      else if (!result.success) return sendErrorMessage(res, result.message);
      return sendSuccessOperationMessage(res, entityName, result.data.rows[0], 'updated', 200);
    }
}