import express from 'express';
import cors from 'cors';
import path from 'path';
import { pool } from './db';
import { assertSchemaInSync } from './schema-lock';
import { DEFAULT_MIGRATIONS_DIR } from './migration-files';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Gate every /api/* route on the database schema being in sync with the
// migrations on disk. The schema-lock detail (filenames, commands) is
// logged for the operator but not exposed to the client.
async function requireSchemaInSync(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    await assertSchemaInSync(pool, DEFAULT_MIGRATIONS_DIR);
    next();
  } catch (err) {
    console.error('[schema-lock] blocked request:\n' + (err as Error).message);
    res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await assertSchemaInSync(pool, DEFAULT_MIGRATIONS_DIR);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[schema-lock] health check failed:\n' + (err as Error).message);
    res.status(503).json({ status: 'error' });
  }
});

app.use('/api', requireSchemaInSync);

// Routes
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY numero_libreta');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/students/:numero_libreta', async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE numero_libreta = $1', [numero_libreta]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { numero_libreta, dni, first_name, last_name, email, enrollment_date, status } = req.body;
    const result = await pool.query(
      'INSERT INTO students (numero_libreta, dni, first_name, last_name, email, enrollment_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [numero_libreta, dni, first_name, last_name, email, enrollment_date, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/students/:numero_libreta', async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const result = await pool.query('DELETE FROM students WHERE numero_libreta = $1 RETURNING *', [numero_libreta]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subjects routes
app.get('/api/subjects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY cod_mat');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE cod_mat = $1', [cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { cod_mat, name, description, credits, department } = req.body;
    const result = await pool.query(
      'INSERT INTO subjects (cod_mat, name, description, credits, department) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cod_mat, name, description, credits, department]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const result = await pool.query('DELETE FROM subjects WHERE cod_mat = $1 RETURNING *', [cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enrollments routes
app.get('/api/enrollments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.first_name, s.last_name, sub.name as subject_name
      FROM enrollments e
      JOIN students s ON e.numero_libreta = s.numero_libreta
      JOIN subjects sub ON e.cod_mat = sub.cod_mat
      ORDER BY e.numero_libreta, e.cod_mat
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/enrollments/:numero_libreta/:cod_mat', async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const result = await pool.query('SELECT * FROM enrollments WHERE numero_libreta = $1 AND cod_mat = $2', [numero_libreta, cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/enrollments', async (req, res) => {
  try {
    const { numero_libreta, cod_mat, enrollment_date, grade, status } = req.body;
    const result = await pool.query(
      'INSERT INTO enrollments (numero_libreta, cod_mat, enrollment_date, grade, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [numero_libreta, cod_mat, enrollment_date, grade, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/enrollments/:numero_libreta/:cod_mat', async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const result = await pool.query('DELETE FROM enrollments WHERE numero_libreta = $1 AND cod_mat = $2 RETURNING *', [numero_libreta, cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
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