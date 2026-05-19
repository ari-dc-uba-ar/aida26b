import {pkValuesSeparator} from '../server.js';
import {columnNamesEqualsNumber, tryQuery} from "../server_helpers.js";
import type { TableStructure } from '../../../shared/types/tableTypes.ts';
import { Pool } from 'pg';
import express from 'express';

export async function deleteRow(req: express.Request, res: express.Response, pool: Pool, structureTable: Record<string, TableStructure>){
  
  const tableName = req.params.tableName;
  const pkValues  = req.params.pk.split(pkValuesSeparator);
  const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND '); 
  const query: string = `DELETE FROM ${tableName} WHERE ${whereArguments} RETURNING *`;
  tryQuery(pool, tableName, query, pkValues, 'deleting', res, true);

}