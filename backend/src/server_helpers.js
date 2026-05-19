import { structureTable } from "./server.js";
function formatTableColumnsForQuery(table, from = 1) {
    let entries = table.tableColumns;
    console.log('Table entries: ', entries);
    let tupleWithReplaceParameters = '';
    let columnsCount = from;
    entries.forEach(_ => {
        tupleWithReplaceParameters += `$${columnsCount} `;
        columnsCount++;
    });
    tupleWithReplaceParameters = '(' + tupleWithReplaceParameters.split(' ').join(',').slice(0, -1) + ')';
    let tupleContent = '(' + entries.join(',') + ')';
    return [tupleContent, tupleWithReplaceParameters];
}
function columnNamesEqualsNumber(table, columnsNames, from = 1, separator = ',') {
    let res = '';
    let i = from;
    columnsNames.forEach(columnName => {
        res += `${columnName} = $${i++}` + separator;
    });
    return res.slice(0, -separator.length);
}
const successCodes = {
    fetching: 200,
    updating: 200,
    deleting: 200,
    inserting: 201
};
function isValidTable(tableName) {
    return structureTable[tableName] !== undefined;
}
async function askQuery(pool, queryStatement, queryArgs, queryAction, tableName) {
    try {
        const answer = await pool.query(queryStatement, queryArgs);
        return successfullAnswer(answer, queryAction, tableName);
    }
    catch (error) {
        const errorMessage = `Error ${queryAction} ${tableName}`;
        console.error(errorMessage, error);
        return ({ success: false, data: undefined, message: 'Internal server error ' + errorMessage });
    }
}
function wasSuccessfullyAnswered(queryResponse) {
    return queryResponse.success && queryResponse.data;
}
function queryResponseNotEmpty(queryResponse) {
    return queryResponse.data?.rowCount === 0;
}
function notFoundAnswerFor(tableName) {
    return { success: false, data: undefined, message: `${tableName} not found` };
}
function successfullAnswer(dataAnswer, queryAction, tableName) {
    return { success: true, data: dataAnswer, message: `${queryAction} ${tableName} successfully!` };
}
async function tryQuery(pool, tableName, queryStatement, queryArgs, queryAction, res, checkIfEmptyAnswer = false, justFirstElement = false) {
    if (isValidTable(tableName)) {
        const queryResponse = await askQuery(pool, queryStatement, queryArgs, queryAction, tableName);
        if (checkIfEmptyAnswer && wasSuccessfullyAnswered(queryResponse) && queryResponseNotEmpty(queryResponse)) {
            return res.status(404).json(notFoundAnswerFor(tableName));
        }
        if (justFirstElement && wasSuccessfullyAnswered(queryResponse)) {
            return res.status(successCodes[queryAction]).json(successfullAnswer(queryResponse.data?.rows[0], queryAction, tableName));
        }
        return res.status(successCodes[queryAction]).json(successfullAnswer(queryResponse.data?.rows, queryAction, tableName));
    }
    return res.status(404).json(notFoundAnswerFor(tableName));
}
export { formatTableColumnsForQuery, tryQuery, columnNamesEqualsNumber };
