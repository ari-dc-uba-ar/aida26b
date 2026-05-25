import   express         from 'express';
import   cors            from 'cors';
import   dotenv          from 'dotenv';
import   path            from 'path';
import { Pool          } from 'pg';
import { getHandler    } from './routes/get';
import { putHandler    } from './routes/put';
import { postHandler   } from './routes/post';
import { deleteHandler } from './routes/delete';
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
app.get('/api/:tableName', async (req, res) => getHandler(pool, req, res));

app.put('/api/:tableName', async (req, res) => putHandler(pool, req, res));

app.post('/api/:tableName', async (req, res) => postHandler(pool, req, res));

app.delete('/api/:tableName', async (req, res) => deleteHandler(pool, req, res));

// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

