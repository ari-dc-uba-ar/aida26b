import {columnNamesEqualsNumber, tryQuery} from '../server_helpers.js';
import type { TableStructure } from '../../../shared/types/tableTypes.ts';
import { Pool } from 'pg';
import express from 'express';

export async function updateRow(req: express.Request, res: express.Response, pool: Pool, structureTable: Record<string, TableStructure>) {
  const tableName = req.params.tableName;
  const values = Object.values(req.body);
  const setArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].tableColumns);
  const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND ');
  const query: string = `UPDATE ${tableName} SET ${setArguments} WHERE ${whereArguments} RETURNING *`;
  tryQuery(pool, tableName, query, values, 'updating', res, true, true);
}