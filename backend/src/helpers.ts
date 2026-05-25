import { Pool } from "pg";
import { structure } from "../../shared/src/ssot/structure";
import type { TableKey, ColumnDef, TableStructure, Response} from "../../shared/src/types/types";


function getRequiredFields(tableName: TableKey){
  const tableColumns: Record<string, ColumnDef> = structure.tables[tableName].columns;
  return Object.entries(tableColumns).filter(([fieldName, column]) => column.required);
}

function getDerivableFields(tableName: TableKey): [string, ColumnDef][]{
  return Object.entries(structure.tables[tableName].columns).filter(([columnName, column]) => column.derivable);
}

function getEntityName(table: TableKey){
  return structure.tables[table].uiName;
}

function getReferencedRelations(tableName: TableKey): TableKey[]{
  return (structure.tables[tableName] as TableStructure).referencedTables as TableKey[];
}

function getNotDerivableFields(table: TableKey): string[]{
  const columns: [string, ColumnDef][] = Object.entries(structure.tables[table].columns as Record<string, ColumnDef>);
  const notDerivableEntries = columns.filter(([fieldName, columnDef]) => !columnDef.derivable);
  return notDerivableEntries.map(([fieldName, column]) => fieldName);
}
function formatTableColumnsForQuery(fieldsNames: string[], from: number = 1): string[]{
  let tupleWithReplaceParameters = '';
  for (let columnsCount = from; columnsCount <= fieldsNames.length; columnsCount++){
    tupleWithReplaceParameters += `$${columnsCount} `;
  }  
  tupleWithReplaceParameters = '(' + tupleWithReplaceParameters.split(' ').join(',').slice(0,-1) + ')';
  let tupleContent: string = '(' + fieldsNames.join(',') + ')';
  return [tupleContent, tupleWithReplaceParameters];
}

function columnNamesEqualsNumber(columnsNames: string[], from: number = 1, separator: string = ','): string{
  let res: string = '';
  let i: number   = from;
  columnsNames.forEach(columnName => {
    res += `${columnName} = $${i++}` + separator;
  })
  return res.slice(0, -separator.length);
}

async function tryQuery(pool: Pool, queryStatement: string, queryArguments?: any): Promise<Response>{
  try {
    return {success: true , data: await pool.query(queryStatement, queryArguments), message: ''};
  } catch (error) {
    console.error(error);
    return {success: false, data: error, message: 'Internal server error'};
  }
}

export{getRequiredFields, getDerivableFields, getEntityName, getReferencedRelations, getNotDerivableFields, columnNamesEqualsNumber, formatTableColumnsForQuery, tryQuery};