import   express         from 'express';
import   cors            from 'cors';
import   dotenv          from 'dotenv';
import   path            from 'path';
import { Pool          } from 'pg';
import { getHandler    } from './routes/get';
import { putHandler    } from './routes/put';
import { postHandler   } from './routes/post';
import { deleteHandler } from './routes/delete';

export function createAppWithPool(pool: Pool){
    const app = express();    
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
    return app;
}