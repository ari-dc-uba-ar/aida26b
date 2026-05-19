import {tryQuery} from "../server_helpers.js";
import { Pool } from 'pg';
import type { TableStructure } from "../../../shared/types/tableTypes.ts";
import express from 'express';


export async function getTable(req: express.Request, res: express.Response, pool: Pool, structureTable: Record<string, TableStructure>) {
  const tableName: string = req.params.tableName;
  let query = "";
  if (structureTable[tableName].foreignKeys){
    query = `
      SELECT e.*, s.first_name || ' ' || s.last_name as student_name, sub.name as subject_name
      FROM enrollments e
      JOIN students s ON e.numero_libreta = s.numero_libreta
      JOIN subjects sub ON e.cod_mat = sub.cod_mat
      ORDER BY e.numero_libreta, e.cod_mat
    `;
  }
  else{
    query = `SELECT * FROM ${tableName} ORDER BY ${structureTable[tableName].pk}`;
  }

  tryQuery(pool, tableName, query, [] , 'fetching', res, true );
  
}