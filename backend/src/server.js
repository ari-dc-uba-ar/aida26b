import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteRow } from './routes/deleteRow.js';
import { getRowByPK } from './routes/getRowByPK.js';
import { getTable } from './routes/getTable.js';
import { insertRow } from './routes/insertRow.js';
import { updateRow } from './routes/updateRow.js';
import { structure } from '../../shared/structure/structure.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
const pkValuesSeparator = "_";
const structureTable = structure.tables;
app.get('/api/:tableName', async (req, res) => getTable(req, res, pool, structureTable));
app.get('/api/:tableName/:pk', async (req, res) => getRowByPK(req, res, pool, structureTable));
app.post('/api/:tableName', async (req, res) => insertRow(req, res, pool, structureTable));
app.put('/api/:tableName/:pk', async (req, res) => updateRow(req, res, pool, structureTable));
app.delete('/api/:tableName/:pk', async (req, res) => deleteRow(req, res, pool, structureTable));
// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
export { pkValuesSeparator, structureTable };
