import express from 'express';
import {assertValidPostInstance} from "../assertions";
import {getEntityName, getNotDerivableFields, tryQuery, formatTableColumnsForQuery, } from "../helpers";
import {sendSuccessOperationMessage, sendErrorMessage} from "../statusMessages";
import {TableKey} from "../../../shared/src/types/types";
import { Pool } from "pg";


export async function postHandler(pool: Pool, req: express.Request, res: express.Response) {
    const tableName: string              = req.params.tableName;
    const entityName: string           = getEntityName(tableName as TableKey);
    const valuesToInsert: string[]     = Object.values(req.body);  
    const fieldsToModify: string[]     = Object.keys(req.body);
    const notDerivableFields: string[] = getNotDerivableFields(tableName as TableKey);
    
    if (assertValidPostInstance(tableName, res, fieldsToModify, Object.keys(req.query), Object.values(req.query), valuesToInsert, entityName)){
      const [fieldNamesTuples, parametersNumbersTuple] = formatTableColumnsForQuery(notDerivableFields);
      const query: string = `INSERT INTO ${tableName} ${fieldNamesTuples} VALUES ${parametersNumbersTuple} RETURNING *`; 
      const queryResponse = await tryQuery(pool, query, valuesToInsert);
      if (!queryResponse.success){
        return sendErrorMessage(res, queryResponse.message);
      }
      return sendSuccessOperationMessage(res, entityName, queryResponse.data.rows[0], 'created', 201);
    } 
}
