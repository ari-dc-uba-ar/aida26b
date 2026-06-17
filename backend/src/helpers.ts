import type { TableKey, Response, ColumnDef, TableStructure }  from '../../shared/src/types/types';
import      { structure } from '../../shared/src/ssot/structure';
import type { Pool }      from 'pg';

function getEntityName(table: TableKey): string {
  return String(structure.tables[table].uiName.en);
}

async function tryQuery(pool: Pool, queryStatement: string, queryArguments?: any): Promise<Response>{
  try {
    return {success: true , data: await pool.query(queryStatement, queryArguments), message: ''};
  } catch (error) {
    console.error(error);
    return {success: false, data: error, message: 'Internal server error'};
  }
}

function columnNamesEqualsNumber(columnsNames: string[], from: number = 1, separator: string = ','): string{
  let res: string = '';
  let i: number   = from;
  columnsNames.forEach(columnName => {
    res += `${columnName} = $${i++}` + separator;
  })
  return res.slice(0, -separator.length);
}

function getDerivableFields(tableName: TableKey): [string, ColumnDef][]{
  return Object.entries(structure.tables[tableName].columns).filter(([columnName, column]) => column.derivable);
}

function getNotDerivableFields(table: TableKey): string[]{
  const columns: [string, ColumnDef][] = Object.entries(structure.tables[table].columns as Record<string, ColumnDef>);
  const notDerivableEntries = columns.filter(
    ([fieldName, columnDef]) => !columnDef.derivable && columnDef.persist !== false
  );
  return notDerivableEntries.map(([fieldName, column]) => fieldName);
}

function getReferencedRelations(tableName: TableKey): TableKey[]{
  const refs = (structure.tables[tableName] as TableStructure).referencedTables;
  return (Array.isArray(refs) ? refs : []) as TableKey[];
}

function getRequiredFields(tableName: TableKey){
  const tableColumns: Record<string, ColumnDef> = structure.tables[tableName].columns;
  return Object.entries(tableColumns)
    .filter(([fieldName, column]) => column.required && column.persist !== false)
    .map(([fieldName]) => fieldName);
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

export { getEntityName, tryQuery, columnNamesEqualsNumber, getNotDerivableFields, getRequiredFields, formatTableColumnsForQuery, getReferencedRelations, getDerivableFields };