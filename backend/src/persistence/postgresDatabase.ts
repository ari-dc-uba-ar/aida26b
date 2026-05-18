import { Pool, QueryResult } from "pg";
import {database, columnEntry} from "./database.ts";
import { table } from "console";

export class PostgresDatabase implements database{
    #pool: Pool;
    
    constructor(configOptions: Object){
        this.#pool = new Pool(configOptions);
    }

    async getRow(tableNames: string, primaryKeys: columnEntry[]): Promise<QueryResult<any>>{
        let selectFrom: string = `SELECT * FROM ${tableNames} `;
        let where: string = 'WHERE ' + this.conjunctionOfPrimaryKeys(primaryKeys);
        return await this.#pool.query(selectFrom + where, primaryKeys.map(column => column.fieldValue));
    }

    async getTable(tableName: string, orderedBy?: columnEntry[], foreignKeys?: string[]): Promise<QueryResult<any>>{
        let query: string = `SELECT * FROM ${tableName} `;
        const order = "ORDER BY " + orderedBy?.join(',');
        query += orderedBy? order : ''; 
        return await this.#pool.query(query);
    }

    conjunctionOfPrimaryKeys(primaryKeys: columnEntry[], from : number = 1): string{
        let conjunction: string = '';
        for (let i = from; i <= primaryKeys.length; i++){
            conjunction += `${primaryKeys[i].fieldName} = $${i}`;
            conjunction += (i <= primaryKeys.length - 1) ? 'AND' : '';
        }
        return conjunction;
    }


    async deleteRow(tableName: string, primaryKeys: columnEntry[]): Promise<QueryResult<any>>{
        let deleteFrom: string = `DELETE FROM ${tableName} `;
        let where: string = `WHERE ` + this.conjunctionOfPrimaryKeys(primaryKeys) + ' RETURNING *';
        return await this.#pool.query(deleteFrom + where, primaryKeys.map(column => column.fieldValue));
    }

    async insertRow(tableName: string, columns: columnEntry[]): Promise<QueryResult<any>>{
        let query: string = `INSERT INTO ${tableName} ${this.tupleWithFieldNames(columns)} VALUES ${this.tupleWithNumberForValues(columns.length)} RETURNING *`;
        return await this.#pool.query(query, columns.map(column => column.fieldValue));
    }

    tupleWithNumberForValues(amount: number): string{
        let tuple: string = '(';
        for (let i = 1; i <= amount; i++){
            tuple += `$${i}` + (i <= amount - 1) ? ',' : '';
        }
        return tuple + ')';
    }

    tupleWithFieldNames(columns: columnEntry[]): string{
        return '('+ columns.map(column => column.fieldName).join(',') + ')';
    }

    async updateRow(tableName: string, newValues: columnEntry[], columns: columnEntry[]): Promise<QueryResult<any>>{
        
        const updateTable: string = `UPDATE ${tableName} `;
        const set: string = `SET ${this.conjunctionOfPrimaryKeys(newValues), 1} `;
        const where: string = `WHERE ${this.conjunctionOfPrimaryKeys(columns), newValues.length + 1} `;
        const allValues = newValues
            .map(column => column.fieldValue)
            .concat(columns.map(column => column.fieldValue)); 
        
        return await this.#pool.query(updateTable + set + where + `RETURNING *`, allValues);
    }
}