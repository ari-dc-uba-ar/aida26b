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

// Rules a column's value must satisfy. Grouped here so they stay separate from display/layout concerns.
type ColumnValidator = {
  required?: boolean;
  nullable?: boolean;       // value may be null (reflects a nullable DB column)
  minLength?: number;       // string: minimum number of characters
  maxLength?: number;       // string: maximum number of characters
  minValue?: number;        // number: minimum value
  maxValue?: number;        // number: maximum value
  minDayOffset?: number;    // date: earliest allowed day-offset from today (-30 = 30 days ago, 0 = not in the past)
  maxDayOffset?: number;    // date: latest allowed day-offset from today (0 = not in the future, 7 = up to 7 days ahead)
  minDate?: string;         // date: earliest allowed calendar date, as ISO 'YYYY-MM-DD'
  integer?: boolean;        // number must be an integer
  pattern?: string;         // regex source the value must match
  patternMessage?: string;  // human-readable message when pattern fails
  normalize?: { pattern: string; replacement: string }; // regex find/replace applied to canonicalize the stored value
}

type ForeignKeyDef = {
  table: string;
  valueField: string;
  labelField: string;
  dependsOn?: {
    field: string;
    foreignField: string;
  };
};

type Language = 'es' | 'en';
type LocalizedText = Record<Language, string>;

type ColumnDef = {
  type: MyTypeNames;
  label?: LocalizedText;
  input?: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select';
  options?: Array<{ value: string; label: LocalizedText }>;
  editable?: boolean;
  required?: boolean;
  readonlyOnEdit?: boolean;
  validator?: ColumnValidator;
  nullable?: boolean;
  persist?: boolean;
  derivable?: {originTable: string, sqlGenerationStatement: string};
  foreignKey?: ForeignKeyDef;
}

type TableStructure = {
  columns: Record<string, ColumnDef>
  pk: string | string[]
  uiName: LocalizedText
  title?: LocalizedText
  addButtonLabel?: LocalizedText
  referencedTables?: string[]
}

type InferType<FieldDefs extends Record<string, ColumnDef>> = {
  [K in keyof FieldDefs]: TypeMap[FieldDefs[K]['type']]
}

type TableKey = keyof typeof structure.tables;

type TableRecordMap = {
  [T in keyof typeof structure.tables]: InferType<(typeof structure.tables)[T]['columns']>
};

type RendererProps<K extends TableKey> = {
  id: string;
  fieldName: keyof TableRecordMap[K] & string;
  column: ColumnDef;
  record?: Partial<TableRecordMap[K]>;
  isEdit?: boolean;
};

type RendererFunc = <K extends TableKey>(props: RendererProps<K>) => HTMLElement;

export type {TypeMap, MyTypeNames, ColumnValidator, ColumnDef, TableStructure, InferType, TableKey, TableRecordMap, Response, ForeignKeyDef, Language, LocalizedText, RendererProps, RendererFunc};