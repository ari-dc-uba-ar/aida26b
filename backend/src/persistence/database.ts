import { QueryResult, QueryResultRow } from "pg";

interface columnEntry{
    fieldName: string,
    fieldValue: string
};

interface database{
    getRow(tableName: string, primaryKeys: columnEntry[]): Promise<QueryResult<any>>,
    getTable(tableName: string, orderedBy?: columnEntry[]): Promise<QueryResult<any>>,
    deleteRow(tableName: string, primaryKeys: columnEntry[]): Promise<QueryResult<any>>,
    insertRow(tableName: string, values: columnEntry[]): Promise<QueryResult<any>>,
    updateRow(tableName: string, newValues: columnEntry[], primaryKeys: columnEntry[]): Promise<QueryResult<any>>
};

export {columnEntry, database};