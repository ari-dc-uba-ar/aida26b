import { pkValuesSeparator } from '../server.js';
import { columnNamesEqualsNumber, tryQuery } from "../server_helpers.js";
export async function getRowByPK(req, res, pool, structureTable) {
    const tableName = req.params.tableName;
    const pkValues = req.params.pk.split(pkValuesSeparator);
    const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND ');
    console.log(tableName, structureTable[tableName].pk, pkValues);
    const query = `SELECT * FROM ${tableName} WHERE ${whereArguments}`;
    tryQuery(pool, tableName, query, pkValues, 'fetching', res, true, true);
}
