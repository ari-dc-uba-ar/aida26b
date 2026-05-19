import  {pkValuesSeparator} from '../server.js';
import {columnNamesEqualsNumber, tryQuery} from "../server_helpers.js";
import { Pool } from 'pg';
import type { TableStructure } from '../../../shared/types/tableTypes.ts';
import express from 'express';


export async function getRowByPK(req: express.Request, res: express.Response, pool: Pool, structureTable: Record<string, TableStructure>) {

  const tableName = req.params.tableName;
  const pkValues  = req.params.pk.split(pkValuesSeparator);
  const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND ');
  console.log(tableName, structureTable[tableName].pk, pkValues);
  const query: string = `SELECT * FROM ${tableName} WHERE ${whereArguments}`;
  tryQuery(pool, tableName, query, pkValues, 'fetching', res, true, true);

}