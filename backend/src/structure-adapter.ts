import { structure } from '../../shared/src/ssot/structure';
import type { ColumnDef, TableStructure } from '../../shared/src/types/types';

export type DesiredColumn = {
  type: string;
  nullable?: boolean;
  default?: string;
};

export type DesiredTable = {
  columns: Record<string, DesiredColumn>;
  pk: string[];
};

function inferSqlType(col: ColumnDef): string {
  if (col.sqlType) return col.sqlType;
  if (col.input === 'textarea') return 'TEXT';
  if (col.input === 'date' || col.type === 'date') return 'DATE';
  if (col.type === 'boolean') return 'BOOLEAN';
  if (col.type === 'number') {
    return col.validator?.integer ? 'INTEGER' : 'NUMERIC';
  }
  const maxLength = col.validator?.maxLength;
  return maxLength ? `VARCHAR(${maxLength})` : 'TEXT';
}

export function desiredSchemaFromStructure(): Record<string, DesiredTable> {
  const result: Record<string, DesiredTable> = {};
  for (const [tableName, tableDef] of Object.entries(structure.tables)) {
    const td = tableDef as TableStructure;
    const columns: Record<string, DesiredColumn> = {};
    for (const [colName, colDef] of Object.entries(td.columns)) {
      if (colDef.derivable) continue;
      columns[colName] = {
        type: inferSqlType(colDef),
        nullable: colDef.validator?.required !== true,
      };
    }
    const pk = Array.isArray(td.pk) ? td.pk : [td.pk];
    result[tableName] = { columns, pk };
  }
  return result;
}
