import   dotenv              from 'dotenv';
import { createAppWithPool } from './app';
import { Pool              } from 'pg';    

// Load environment variables
if (process.env.NODE_ENV === 'tests'){
  dotenv.config({path: '../test/.env.tests'});
}
else{
  dotenv.config();
}

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const port = process.env.PORT || 3000;

const app = createAppWithPool(pool);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

