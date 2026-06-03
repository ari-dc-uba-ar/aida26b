// Declarative desired schema — single source of truth for what the database
// SHOULD look like. `npm run migrate:diff` compares this against the live DB
// and generates a draft migration for any difference.
//
// Types are written as Postgres types. Keep this in sync with reality by only
// ever changing it together with a generated (and reviewed) migration.

export type ColumnDef = {
  type: string; // Postgres type, e.g. 'VARCHAR(20)', 'INTEGER', 'NUMERIC(5,2)'
  nullable?: boolean; // default: true
  default?: string; // raw SQL default expression, e.g. "'active'" or 'NOW()'
};

export type TableDef = {
  columns: Record<string, ColumnDef>;
  pk: string[];
};

export const desiredSchema: Record<string, TableDef> = {
  students: {
    columns: {
      numero_libreta: { type: 'VARCHAR(20)', nullable: false },
      dni: { type: 'VARCHAR(20)', nullable: false },
      first_name: { type: 'VARCHAR(100)', nullable: false },
      last_name: { type: 'VARCHAR(100)', nullable: false },
      email: { type: 'VARCHAR(255)' },
      enrollment_date: { type: 'DATE' },
      status: { type: 'VARCHAR(50)' },
    },
    pk: ['numero_libreta'],
  },
  subjects: {
    columns: {
      cod_mat: { type: 'VARCHAR(20)', nullable: false },
      name: { type: 'VARCHAR(200)', nullable: false },
      description: { type: 'TEXT' },
      credits: { type: 'INTEGER' },
      department: { type: 'VARCHAR(100)' },
    },
    pk: ['cod_mat'],
  },
  enrollments: {
    columns: {
      numero_libreta: { type: 'VARCHAR(20)', nullable: false },
      cod_mat: { type: 'VARCHAR(20)', nullable: false },
      enrollment_date: { type: 'DATE', nullable: false },
      grade: { type: 'NUMERIC(5,2)' },
      status: { type: 'VARCHAR(50)' },
    },
    pk: ['numero_libreta', 'cod_mat'],
  },
};
