import { structure } from "../ssot/structure";
import express from 'express';
import {assertValidGetInstance} from "../assertions";
import {getEntityName, getDerivableFields, getReferencedRelations, tryQuery, columnNamesEqualsNumber, } from "../helpers";
import { getPkFields } from "../utils/utils";
import {sendSuccessOperationMessage, sendNotFoundMessage, sendErrorMessage} from "../statusMessages";
import {TableKey, ColumnDef, TableStructure, Response} from "../types/types";
import {} from "../validations";
import { Pool } from "pg";

export async function getHandler(pool: Pool, req: express.Request, res: express.Response) {
    const pksValues = Object.values(req.query).map(pkValue => String(pkValue));
    const pkFields = Object.keys(req.query);
    const tableName: string = req.params.tableName;
    const entityName: string = getEntityName(tableName as TableKey);  
    if (assertValidGetInstance(tableName, res, pksValues, entityName, pkFields)){
      if (pksValues.length === 0) return getFullTable(pool, res, tableName as TableKey, entityName);
    
      return getRowOfTable(pool, res, tableName as TableKey, pksValues as string[], entityName); //Caso query con pks;
    }       
}

/**Helpers**/
function getJoinsStatements(queryTable: TableKey, referencedRelations: TableKey[]): string{
  let joinsStatement: string = "";
  const entityName: string = structure.tables[queryTable].uiName;
  referencedRelations.forEach(tableName => {
    joinsStatement += ` JOIN ${tableName} ${structure.tables[tableName].uiName} ON `
    const pkFields = getPkFields(tableName);
    const pkFieldsEqualityStatements = pkFields.map(pk => `${entityName}.${pk}=${getEntityName(tableName)}.${pk}`);
    joinsStatement += pkFieldsEqualityStatements.join(' AND ');
  });
  return joinsStatement;
}

function getOrderByPKsStatement(tableName: TableKey): string{
  let orderByStatement: string = "ORDER BY ";
  const entityName: string = structure.tables[tableName].uiName;
  orderByStatement += getPkFields(tableName).map(pk => `${entityName}.${pk}`).join(',');
  return orderByStatement;
}

function getSelectStatement(tableName: TableKey): string{
  let selectStatement: string = `SELECT ${structure.tables[tableName].uiName}.*,`;
  const derivedFields: [string, ColumnDef][] = getDerivableFields(tableName);
  selectStatement += derivedFields.map(([fieldName, column]) => column.derivable?.sqlGenerationStatement.replace(/entityName/g, `${getEntityName(column.derivable.originTable as TableKey)}`) + ` AS ${fieldName}`).join(',');
  return selectStatement;
}

async function getFullTableOrderedByPKs(pool: Pool, tableName: TableKey){
  const queryArguments = getPkFields(tableName as TableKey) ;
  let queryStatement: string;
  
  if ((structure.tables[tableName] as TableStructure).referencedTables){
    queryStatement = `${getSelectStatement(tableName)}
    FROM ${tableName} ${getEntityName(tableName)} ${getJoinsStatements(tableName, getReferencedRelations(tableName))} 
    ${getOrderByPKsStatement(tableName)}`;
    return await tryQuery(pool, queryStatement);
  }
  queryStatement = `SELECT * FROM ${tableName} ORDER BY ${queryArguments.join(',')}`;
  return await tryQuery(pool, queryStatement);
}

async function getRowByPKs(pool: Pool, tableName: TableKey, pks: string[]){
    const whereArguments: string = columnNamesEqualsNumber(getPkFields(tableName), 1, ' AND ');
    const queryArguments = pks;
    let queryStatement = `SELECT * FROM ${tableName} WHERE ${whereArguments}`;
    return tryQuery(pool, queryStatement, queryArguments);
}

async function getFullTable(pool: Pool, res: express.Response, tableName: TableKey, entityName: string){
  const responseQuery: Response = await getFullTableOrderedByPKs(pool, tableName as TableKey);
  if (!responseQuery.success){
    return sendErrorMessage(res, responseQuery.message);
  }
  return sendSuccessOperationMessage(res, entityName+'s', responseQuery.data.rows, 'fetched', 200);
}

async function getRowOfTable(pool: Pool, res: express.Response, tableName: TableKey, pks: string[], entityName: string) {
 const responseQuery: Response = await getRowByPKs(pool, tableName as TableKey, pks);
  if (responseQuery.data.rowCount === 0){
    return sendNotFoundMessage(res, entityName);
  }
  else if (!responseQuery.success){
    return sendErrorMessage(res, responseQuery.message);
  }
  return sendSuccessOperationMessage(res, entityName, responseQuery.data.rows[0], 'fetched', 200);
}
