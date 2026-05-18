import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool =  new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());

const pkValuesSeparator = "_";


// Routes
type ApiResponse = {
  success: boolean;  
  data: Record<string, any>[];
  message: string;
};

// Type definitions
type InferType<FieldDefs extends Record<string, ColumnDef>> = {
  [K in keyof FieldDefs]: TypeMap[FieldDefs[K]['type']]
}

type Student     = InferType<typeof structure.tables.students.columnsToDisplay>;
type Subject     = InferType<typeof structure.tables.subjects.columnsToDisplay>;
type Enrollment  = InferType<typeof structure.tables.enrollments.columnsToDisplay>;
type TableTuple  = Student | Subject | Enrollment;
type Status      = {value: string, label: string};


type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
  status: Status
};

type MyTypeNames = keyof TypeMap;

type ColumnDef = {
  type: MyTypeNames;
  label?: string;
  required?: boolean;
  deduced?: boolean
}

type TableStructure = {
  tableColumns: string[]
  columnsToDisplay: Record<string, ColumnDef>
  pk: string
  uiName: string
  foreignKeys?: string[]
  endpoint? : string
}

const structure = {
  tables: {
    students: {
      tableColumns: ['numero_libreta', 'dni', 'first_name', 'last_name', 'email', 'enrollment_date', 'status'],
      columnsToDisplay:{
        numero_libreta   :{type: 'string', label: "Número de Libreta / Student ID:", required: true},
        dni              :{type: 'number', label: "DNI:", required: true},
        first_name       :{type: 'string', label: "Nombre / Name:", required: true},
        last_name        :{type: 'string', label: "Apellido / Last name:", required: true},
        email            :{type: 'string', label: "Email:"},
        enrollment_date  :{type: 'date'  , label: "Fecha de inscripción / Enrollment Date:"},
        status           :{type: 'status', label: "Estado / Status:"},
      },
      pk: 'numero_libreta',
      uiName: 'Student'
    } satisfies TableStructure,
    subjects: {
      tableColumns: ['cod_mat', 'name', 'description', 'credits', 'department'],
      columnsToDisplay:{
        cod_mat     :{type: 'string', label: "Código de Materia / Subject Code:", required: true},
        name        :{type: 'string', label: "Nombre de Materia / Subject Name:", required: true},
        description :{type: 'string', label: "Descripción de Materia / Subject Description:"},
        credits     :{type: 'number', label: "Créditos / Credits:"},
        department  :{type: 'string', label: "Departamento / Department:"},
      },
      pk: 'cod_mat',
      uiName: 'Subject'
    } satisfies TableStructure,
    enrollments: {
        pk: 'numero_libreta cod_mat', 
        uiName: 'Enrollment',
        tableColumns: ['numero_libreta', 'cod_mat', 'enrollment_date', 'grade', 'status'],
        columnsToDisplay: {
          numero_libreta:  {type: 'string', label: "Número de Libreta / Student ID:", required: true},
          student_name:    {type: 'string', label: "Nombre de Estudiante / Student Name:", required: true},
          subject_name:    {type: 'string', label: "Nombre de Materia / Subject Name:", required: true},
          cod_mat:         {type: 'string', label: "Código de Materia / Subject Code:", required: true},
          enrollment_date: { type: 'date'  , label: "Fecha de Inscripción / Enrollment Date:", required: true},
          grade:           { type: 'number', label: "Nota / Grade:" },
          status:          { type: 'status', label: "Estado / Status:" }
        },
        foreignKeys: ["subjects", "students"],
    } satisfies TableStructure
  }
}

//getGenericTable
/*
app.get('/api/subjects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY cod_mat');
    res.json({success: true, data: result.rows, message: `Subjects table fetched successfully`} );
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error fetching subjects`} );
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY numero_libreta');
    res.json({success: true, data: result.rows, message: "Students table fetched succesfully"});
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({success: false, data: "", message: 'Internal server error: Error fetching students'});
  }
});
*/

//getCompositeTable
app.get('/api/enrollments', async (req, res) => {
  try {    
    const result = await pool.query(`
      SELECT e.*, s.first_name || ' ' || s.last_name as student_name, sub.name as subject_name
      FROM enrollments e
      JOIN students s ON e.numero_libreta = s.numero_libreta
      JOIN subjects sub ON e.cod_mat = sub.cod_mat
      ORDER BY e.numero_libreta, e.cod_mat
    `);
    res.json({success: true, data: result.rows, message: `Enrollments fetched succesfully`} );
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({success: false, data: "", message: `Internal server: Error fetching enrollments`} );
  }
});

app.get('/api/:singleEntityTable', async (req, res) => {
  try {
    const singleEntityTable: string = req.params.singleEntityTable;
    const structureTable: Record<string, TableStructure> = structure.tables;
    const result = await pool.query(`SELECT * FROM ${singleEntityTable} ORDER BY ${structureTable[singleEntityTable].pk}`);
    res.json({success: true, data: result.rows, message: `${structureTable[singleEntityTable].uiName} table fetched succesfully`});
  } catch (error) {
    const errorMessage = `Error fetching ${req.params.singleEntityTable}:`;
    console.error(errorMessage, error);
    res.status(500).json({success: false, data: "", message: "Internal server error:" + errorMessage});
  }
});


//getRowOfGenericTableByPrimaryKey
/*
app.get('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE cod_mat = $1', [cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `Subject not found`} );
    }
    res.json({success: true, data: result.rows[0], message: `Subject fetched successfully`} );
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error fetching subject`} );
  }
});

app.get('/api/students/:numero_libreta', async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE numero_libreta = $1', [numero_libreta]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: 'Student not found' });
    }
    res.json({success: true, data: result.rows[0], message: `Student fetched successfully`} );
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error fetching student`} );
  }
});*/

app.get('/api/:singleEntityTable/:pk', async (req, res) => {
  const structureTable: Record<string, TableStructure> = structure.tables;
  const { singleEntityTable, pk } = req.params;
  console.log(singleEntityTable, structureTable[singleEntityTable].pk, pk);
  try {
    const result = await pool.query(`SELECT * FROM ${singleEntityTable} WHERE ${structureTable[singleEntityTable].pk} = $1`, [pk]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `${structureTable[singleEntityTable].uiName} not found`});
    }
    res.json({success: true, data: result.rows[0], message: `${structureTable[singleEntityTable].uiName} fetched successfully`} );
  } catch (error) {
    const errorMessage = `Error fetching ${req.params.singleEntityTable}:`;
    console.error(errorMessage, error);
    res.status(500).json({success: false, data: "", message: `Internal server error:` + errorMessage} );
  }
});


//getRowOfCompositeTableByPKs
app.get('/api/enrollments/:numero_libreta/:cod_mat', async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const result = await pool.query('SELECT * FROM enrollments WHERE numero_libreta = $1 AND cod_mat = $2', [numero_libreta, cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `Internal server error: Enrollment not found`} );
    }
    res.json({success: true, data: result.rows[0], message: `Enrollment found`} );
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error fetching enrollment`} );
  }
});

//Post to generic table
/*
app.post('/api/students', async (req, res) => {
  try {
    const { numero_libreta, dni, first_name, last_name, email, enrollment_date, status } = req.body;
    const result = await pool.query(
      'INSERT INTO students (numero_libreta, dni, first_name, last_name, email, enrollment_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [numero_libreta, dni, first_name, last_name, email, enrollment_date, status]
    );
    res.status(201).json({success: false, data: result.rows[0], message: `Student created successfully`} );
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error creating student`} );
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { cod_mat, name, description, credits, department } = req.body;
    const result = await pool.query(
      'INSERT INTO subjects (cod_mat, name, description, credits, department) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cod_mat, name, description, credits, department]
    );
    res.status(201).json({success: false, data: result.rows[0], message: `Subject created succefully`} );
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error creating subject`} );
  }
});

app.post('/api/enrollments', async (req, res) => {
  try {
    const { numero_libreta, cod_mat, enrollment_date, grade, status } = req.body;
    const result = await pool.query(
      'INSERT INTO enrollments (numero_libreta, cod_mat, enrollment_date, grade, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [numero_libreta, cod_mat, enrollment_date, grade, status]
    );
    res.status(201).json({success: true, data: result.rows[0], message: `Enrollment created succesfully`} );
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error creating enrollment`} );
  }
});*/

app.post('/api/:tableName', async (req, res) => {
  const structureTable: Record<string, TableStructure> = structure.tables;
  const tableName = req.params.tableName;
  const values = Object.values(req.body);
  const [tupleWithTableColumnsNames, tupleWithReplaceParameters] = formatTableColumnsForQuery(structureTable[tableName]);
  console.log(tableName);console.log(values);console.log(tupleWithTableColumnsNames);console.log(tupleWithReplaceParameters);
  try {
    const result = await pool.query(
      `INSERT INTO ${tableName} ${tupleWithTableColumnsNames} VALUES ${tupleWithReplaceParameters} RETURNING *`, values
    );
    res.status(201).json({success: true, data: result.rows[0], message: `${tableName} created succesfully`} );
  } catch (error) {
    const errorMessage = `Error creating ${req.params.tableName}:`;
    console.error(errorMessage, error);
    res.status(500).json({success: false, data: "", message: `Internal server error: ` + errorMessage} );
  }
});

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

//Put
/*
app.put('/api/students/:numero_libreta', async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const { dni, first_name, last_name, email, enrollment_date, status } = req.body;
    const result = await pool.query(
      'UPDATE students SET dni = $1, first_name = $2, last_name = $3, email = $4, enrollment_date = $5, status = $6 WHERE numero_libreta = $7 RETURNING *',
      [dni, first_name, last_name, email, enrollment_date, status, numero_libreta]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `Student not found`} );
    }
    return res.json({success: true, data: result.rows[0], message: `Student updated successfully`} );
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error updating student`} );
  }
});

app.put('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const { name, description, credits, department } = req.body;
    const result = await pool.query(
      'UPDATE subjects SET name = $1, description = $2, credits = $3, department = $4 WHERE cod_mat = $5 RETURNING *',
      [name, description, credits, department, cod_mat]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `Subject not found`} );
    }
    res.json({success: false, data: result.rows[0], message: `Subject updated succesfully`} );
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({success: false, data: "", message: `Error updating subject`} );
  }
});
*/

function columnNamesEqualsNumber(table: TableStructure, columnsNames: string[], from: number = 1, separator: string = ','): string{
  let res: string = '';
  let i: number   = from;
  columnsNames.forEach(columnName => {
    res += `${columnName} = $${i++}` + separator;
  })
  return res.slice(0, -separator.length);
}

app.put('/api/:tableName/:pk', async (req, res) => {
  const tableName = req.params.tableName;
  const pkValues  = req.params.pk.split(pkValuesSeparator);
  const structureTable: Record<string, TableStructure> = structure.tables;
  const values = Object.values(req.body);
  const setArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].tableColumns);
  const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND ');
  console.log(setArguments);
  console.log(whereArguments);
  console.log(values);
  console.log(pkValues);
  try {
  const result = await pool.query(
      `UPDATE ${tableName} SET ${setArguments} WHERE ${whereArguments} RETURNING *`, values);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `${structureTable[tableName].uiName} not found`} );
    }
    res.json({success: false, data: result.rows[0], message: `${structureTable[tableName].uiName} updated succesfully`} );
  } catch (error) {
    const errorMessage: string = `Error updating ${structureTable[tableName].uiName}:`;
    console.error(errorMessage, error);
    res.status(500).json({success: false, data: "", message: `Internal server error:` + errorMessage});
  }
});

/*
app.put('/api/enrollments/:numero_libreta/:cod_mat', async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const { enrollment_date, grade, status } = req.body;
    const result = await pool.query(
      'UPDATE enrollments SET enrollment_date = $1, grade = $2, status = $3 WHERE numero_libreta = $4 AND cod_mat = $5 RETURNING *',
      [enrollment_date, grade, status, numero_libreta, cod_mat]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({success: true, data: "", message: `Error enrollment not found`} );
    }
    res.json({success: true, data: result.rows[0], message: "Enrollment updated successfully"});
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error updating enrollment`} );
  }
});
*/
//Delete
/*
app.delete('/api/students/:numero_libreta', async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const result = await pool.query('DELETE FROM students WHERE numero_libreta = $1 RETURNING *', [numero_libreta]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `Student not found`} );
    }
    res.json({success: true, data: "", message: `Student deleted successfully`} );
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error deleting student`} );
  }
});


app.delete('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const result = await pool.query('DELETE FROM subjects WHERE cod_mat = $1 RETURNING *', [cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `Subject not found`} );
    }
    res.json({success: true, data: "", message: `Subject deleted successfully`} );
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error deleting subject`} );
  }
});*/

app.delete('/api/:tableName/:pk', async (req, res) => {
  const structureTable: Record<string, TableStructure> = structure.tables;
  const tableName = req.params.tableName;
  const pkValues  = req.params.pk.split(pkValuesSeparator);
  const whereArguments = columnNamesEqualsNumber(structureTable[tableName], structureTable[tableName].pk.split(' '), 1, ' AND '); 
  console.log(pkValues);
  console.log(structureTable[tableName].pk.split(' '));
  console.log(whereArguments);
  try {
    const result    = await pool.query(`DELETE FROM ${tableName} WHERE ${whereArguments} RETURNING *`, pkValues);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `${tableName} not found`} );
    }
    res.json({success: true, data: "", message: `${tableName} deleted successfully`} );
  } catch (error) {
    const errorMessage = `Error deleting ${req.params.tableName}:`;
    console.error(errorMessage, error);
    res.status(500).json({success: false, data: "", message: `Internal server error: ` + errorMessage} );
  }
});


/*
app.delete('/api/enrollments/:numero_libreta/:cod_mat', async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const result = await pool.query('DELETE FROM enrollments WHERE numero_libreta = $1 AND cod_mat = $2 RETURNING *', [numero_libreta, cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: 'Enrollment not found'} );
    }
    res.json({success: true, data: "", message: 'Enrollment deleted successfully'} );
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error deleting enrollment`} );
  }
});
*/
/*
app.delete('/api/:table/:pks', async (req, res) => {
  try {
    const tableName: string = req.params.table;
    const primaryKeys: columnEntry[] = parsePKs(JSON.parse(req.body), req.params.pks);
    const result = await pool.deleteRow(tableName, primaryKeys);
    
    if (result.rows.length === 0) {
      return res.status(404).json({success: false, data: "", message: `${tableName} not found`} );
    }

    res.json({success: true, data: "", message: `${tableName} deleted successfully`} );

  } catch (error) {
    console.error(`Error deleting ${req.params.table}:`, error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error deleting ${req.params.table}`} );
  }
});*/




// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




 