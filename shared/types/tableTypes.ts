import type { MyTypeNames } from './domainTypes';
import type {QueryResult} from '../../backend/src/server';

export type ColumnDef = {
  type: MyTypeNames;
  label?: string;
  required?: boolean;
  deduced?: boolean
}

export type TableStructure = {
  tableColumns: string[]
  columnsToDisplay: Record<string, ColumnDef>
  pk: string
  uiName: string
  foreignKeys?: string[]
  endpoint? : string
}
