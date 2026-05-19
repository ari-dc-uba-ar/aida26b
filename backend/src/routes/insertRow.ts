import {formatTableColumnsForQuery, tryQuery} from "../server_helpers.js";
import type { TableStructure } from "../../../shared/types/tableTypes.ts";
import { Pool } from 'pg';
import express from 'express';

export async function insertRow(req: express.Request, res: express.Response, pool: Pool, structureTable: Record<string, TableStructure>){

  const tableName = req.params.tableName;
  const values = Object.values(req.body);
  const [tupleWithTableColumnsNames, tupleWithReplaceParameters] = formatTableColumnsForQuery(structureTable[tableName]);
  const query: string = `INSERT INTO ${tableName} ${tupleWithTableColumnsNames} VALUES ${tupleWithReplaceParameters} RETURNING *`;
  tryQuery(pool, tableName, query, values, 'inserting', res, false, true);
}