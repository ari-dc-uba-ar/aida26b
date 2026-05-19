import { columnNamesEqualsNumber, tryQuery } from '../server_helpers.js';
export async function updateRow(req, res, pool, structureTable) {
    const tableName = req.params.tableName;
    const values = Object.values(req.body);
    const setArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].tableColumns);
    const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND ');
    const query = `UPDATE ${tableName} SET ${setArguments} WHERE ${whereArguments} RETURNING *`;
    tryQuery(pool, tableName, query, values, 'updating', res, true, true);
}
