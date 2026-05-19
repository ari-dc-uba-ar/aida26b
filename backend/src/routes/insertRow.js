import { formatTableColumnsForQuery, tryQuery } from "../server_helpers.js";
export async function insertRow(req, res, pool, structureTable) {
    const tableName = req.params.tableName;
    const values = Object.values(req.body);
    const [tupleWithTableColumnsNames, tupleWithReplaceParameters] = formatTableColumnsForQuery(structureTable[tableName]);
    const query = `INSERT INTO ${tableName} ${tupleWithTableColumnsNames} VALUES ${tupleWithReplaceParameters} RETURNING *`;
    tryQuery(pool, tableName, query, values, 'inserting', res, false, true);
}
