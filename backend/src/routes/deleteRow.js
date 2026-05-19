import { pkValuesSeparator } from '../server.js';
import { columnNamesEqualsNumber, tryQuery } from "../server_helpers.js";
export async function deleteRow(req, res, pool, structureTable) {
    const tableName = req.params.tableName;
    const pkValues = req.params.pk.split(pkValuesSeparator);
    const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND ');
    const query = `DELETE FROM ${tableName} WHERE ${whereArguments} RETURNING *`;
    tryQuery(pool, tableName, query, pkValues, 'deleting', res, true);
}
