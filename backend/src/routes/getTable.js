import { tryQuery } from "../server_helpers.js";
export async function getTable(req, res, pool, structureTable) {
    const tableName = req.params.tableName;
    let query = "";
    if (structureTable[tableName].foreignKeys) {
        query = `
      SELECT e.*, s.first_name || ' ' || s.last_name as student_name, sub.name as subject_name
      FROM enrollments e
      JOIN students s ON e.numero_libreta = s.numero_libreta
      JOIN subjects sub ON e.cod_mat = sub.cod_mat
      ORDER BY e.numero_libreta, e.cod_mat
    `;
    }
    else {
        query = `SELECT * FROM ${tableName} ORDER BY ${structureTable[tableName].pk}`;
    }
    tryQuery(pool, tableName, query, [], 'fetching', res, true);
}
