import type { ColumnDef } from "./tableTypes";
import { structure } from "../structure/structure";

export type InferType<FieldDefs extends Record<string, ColumnDef>> = {
  [K in keyof FieldDefs]: TypeMap[FieldDefs[K]['type']]
}

// Type definitions
export type Student     = InferType<typeof structure.tables.students.columnsToDisplay>;
export type Subject     = InferType<typeof structure.tables.subjects.columnsToDisplay>;
export type Enrollment  = InferType<typeof structure.tables.enrollments.columnsToDisplay>;
export type TableTuple  = Student | Subject | Enrollment;
export type Status      = {value: string, label: string};

export type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
  status: Status
};

export type MyTypeNames = keyof TypeMap;

