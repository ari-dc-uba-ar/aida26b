import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY numero_libreta');
    res.json({success: true, data: result.rows, message: "Students table fetched succesfully"});
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({success: false, data: "", message: 'Internal server error: Error fetching students'});
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
});

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

// Subjects routes
app.get('/api/subjects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY cod_mat');
    res.json({success: true, data: result.rows, message: `Subjects table fetched successfully`} );
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error fetching subjects`} );
  }
});

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
});

// Enrollments routes
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
});

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
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({success: false, data: "", message: `Internal server error: Error updating enrollment`} );
  }
});

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

// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




 