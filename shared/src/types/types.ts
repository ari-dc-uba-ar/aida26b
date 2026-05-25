import { structure } from "../ssot/structure";

type Response = {
  success: boolean;
  data: undefined | any;
  message: string;
}

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
};

type MyTypeNames = keyof TypeMap;

type TableStructure = {
  columns: Record<string, ColumnDef>
  pk: string | string[]
  uiName: string
  title?: string
  addButtonLabel?: string
  referencedTables?: string[]
}

type ColumnDef = {
  type: MyTypeNames;
  label?: string;
  input?: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  editable?: boolean;
  readonlyOnEdit?: boolean;
  nullable?: boolean;
  derivable?: {originTable: string, sqlGenerationStatement: string};
}

type TableKey = keyof typeof structure.tables;

type TableRecordMap = {
  [T in keyof typeof structure.tables]: InferType<(typeof structure.tables)[T]['columns']>
};

type InferType<FieldDefs extends Record<string, ColumnDef>> = {
  [K in keyof FieldDefs]: TypeMap[FieldDefs[K]['type']]
}

export type {TableKey, TableRecordMap, TableStructure, MyTypeNames, InferType, ColumnDef, Response};