import type { TableStructure } from "../../shared/types/tableTypes.ts";
import type { ApiResponse } from "../../shared/types/apiTypes.ts";
import express from "express";
import {structureTable} from "./server.js";
import { Pool } from "pg";

function formatTableColumnsForQuery(table: TableStructure, from: number = 1): string[]{
  let entries = table.tableColumns;
  console.log('Table entries: ', entries);
  let tupleWithReplaceParameters = '';
  let columnsCount = from;
  entries.forEach(_ => {
    tupleWithReplaceParameters += `$${columnsCount} `;
    columnsCount++;
  });
  tupleWithReplaceParameters = '(' + tupleWithReplaceParameters.split(' ').join(',').slice(0,-1) + ')';
  let tupleContent: string = '(' + entries.join(',') + ')';
  return [tupleContent, tupleWithReplaceParameters];
}

function columnNamesEqualsNumber(table: TableStructure, columnsNames: string[], from: number = 1, separator: string = ','): string{
  let res: string = '';
  let i: number   = from;
  columnsNames.forEach(columnName => {
    res += `${columnName} = $${i++}` + separator;
  })
  return res.slice(0, -separator.length);
}


const successCodes: Record<string, number> = {
  fetching: 200,
  updating: 200,
  deleting: 200,
  inserting: 201
}

function isValidTable(tableName: string): boolean{
  return structureTable[tableName] !== undefined;
}

async function askQuery(pool: Pool, queryStatement: string, queryArgs: any[], queryAction: string, tableName: string): Promise<ApiResponse>{
    try {
      const answer = await pool.query(queryStatement, queryArgs);
      return successfullAnswer(answer, queryAction, tableName);
    }
    catch (error) {
        const errorMessage: string = `Error ${queryAction} ${tableName}`
        console.error(errorMessage, error);
        return({success: false, data: undefined, message: 'Internal server error ' + errorMessage});
    }
  }


function wasSuccessfullyAnswered(queryResponse: ApiResponse){
  return queryResponse.success && queryResponse.data;
}

function queryResponseNotEmpty(queryResponse: ApiResponse){
  return queryResponse.data?.rowCount === 0;
}

function notFoundAnswerFor(tableName: string){
  return {success: false, data: undefined, message: `${tableName} not found`};
}

function successfullAnswer(dataAnswer: any, queryAction: string, tableName: string){
  return {success: true, data: dataAnswer, message: `${queryAction} ${tableName} successfully!`}
}

async function tryQuery(pool: Pool, tableName: string, queryStatement: string, queryArgs: any[], queryAction: string, res: express.Response, checkIfEmptyAnswer: boolean = false, justFirstElement: boolean = false){
  
  if (isValidTable(tableName)){
    const queryResponse: ApiResponse = await askQuery(pool, queryStatement, queryArgs, queryAction, tableName);
  
    if (checkIfEmptyAnswer && wasSuccessfullyAnswered(queryResponse) && queryResponseNotEmpty(queryResponse)){
      return res.status(404).json(notFoundAnswerFor(tableName));
    }
    if (justFirstElement && wasSuccessfullyAnswered(queryResponse)){
      return res.status(successCodes[queryAction]).json(successfullAnswer(queryResponse.data?.rows[0], queryAction, tableName)); 
    }
    return res.status(successCodes[queryAction]).json(
      successfullAnswer(queryResponse.data?.rows, queryAction, tableName));
  }
  return res.status(404).json(notFoundAnswerFor(tableName));
}

export {formatTableColumnsForQuery, tryQuery, columnNamesEqualsNumber}