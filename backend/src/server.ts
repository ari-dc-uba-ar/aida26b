import express from 'express';
import type { Request, RequestHandler } from 'express';
import cors from 'cors';
import { Pool, QueryResult, type PoolClient } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import * as auth from './auth';

import { getHandler } from './routes/get';
import { putHandler } from './routes/put';
import { postHandler } from './routes/post';
import { deleteHandler } from './routes/delete';
import { checkoutHandler } from './routes/cart';
import { FormDataMap, TableKey, TableRecordMap } from '../../shared/src/types/types';
import { formatTableColumnsForQuery } from './helpers';
import { sendErrorMessage } from './status_messages';
import { DriverStatus, OrderStatus } from '../../shared/src/ssot/structure';

// Load environment variables before reading process.env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());

type AuthedRequest = Request & { user?: auth.AuthUser; dbClient?: PoolClient };

function getSessionToken(req: Request) {
  return auth.parseCookies(req.headers.cookie)[auth.SESSION_COOKIE];
}

function readPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 8 ? value : null;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

async function audit(
  req: Request,
  eventType: string,
  outcome: string,
  details: Record<string, unknown> = {}
) {
  try {
    await pool.query(
      `INSERT INTO auth.audit_log
       (actor_user_id, event_type, outcome, ip, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        (req as AuthedRequest).user?.id ?? null,
        eventType,
        outcome,
        req.ip,
        req.get('user-agent') ?? null,
        JSON.stringify(details),
      ]
    );
  } catch (error) {
    console.error('Error writing audit log:', error);
  }
}

async function loadSession(req: Request) {
  const token = getSessionToken(req);

  if (!token) {
    return null;
  }

  const result = await pool.query(
    `SELECT
       s.id AS session_id,
       u.id,
       u.username,
       u.email,
       u.role,
       u.is_active,
       u.must_change_password,
       u.client_cuit,
       u.transport_license
     FROM auth.sessions s
     JOIN auth.users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND u.is_active = true`,
    [auth.hashToken(token)]
  );

  return result.rows[0] ? auth.publicUser(result.rows[0]) : null;
}

const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const user = await loadSession(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    (req as AuthedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requirePasswordReady: RequestHandler = (req, res, next) => {
  if ((req as AuthedRequest).user?.must_change_password) {
    return res.status(403).json({ error: 'Password change required' });
  }

  next();
};

const requireAdmin: RequestHandler = async (req, res, next) => {
  if ((req as AuthedRequest).user?.role === 'admin') {
    return next();
  }

  await audit(req, 'permission_denied', 'denied', {
    path: req.path,
    method: req.method,
  });

  return res.status(403).json({ error: 'Forbidden' });
};

const requireAcademicWrite: RequestHandler = async (req, res, next) => {
  const user = (req as AuthedRequest).user;
  const role = user?.role;
  const tableName = req.params.tableName;

  if (role === 'admin' || role === 'editor') {
    return next();
  }

  if (
    role === 'client' &&
    req.method === 'POST' &&
    tableName === 'orders'
  ) {
    return next();
  }

  if (
    role === 'client' &&
    req.method === 'PUT' &&
    tableName === 'orders' &&
    req.query.cancel === 'true'
  ) {
    return next();
  }

  if (
    role === 'driver' &&
    req.method === 'PUT' &&
    (tableName === 'orders')
  ) {
    return next();
  }

  await audit(req, 'permission_denied', 'denied', {
    path: req.path,
    method: req.method,
  });

  return res.status(403).json({ error: 'Forbidden' });
};

/* 
Para que los valores de app.role/client_cuit/transport_license persistan, toda la sesión del usuario debe correr sobre
la misma conexión a DB. Antes, para cada request se creaba una conexión nueva con "Pool", ahora usamos pool.connect() para obtener
un PoolClient, única sesión con la que hacer las request 
*/
const attachDbSession: RequestHandler = async (req, res, next) => {
  const typedReq = req as AuthedRequest;
  const user = typedReq.user;

  if (!user) {
    return next();
  }

  const client = await pool.connect();

  const cleanup = () => {
    if (!typedReq.dbClient) {
      return;
    }

    const releasedClient = typedReq.dbClient;
    typedReq.dbClient = undefined;

    releasedClient
      .query(
        `RESET app.role; RESET app.client_cuit; RESET app.transport_license`
      )
      .catch((error: unknown) => {
        console.error('Error resetting session variables:', error);
      })
      .finally(() => releasedClient.release());
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  try {
    const role = user.role;
    const clientCuit = user.client_cuit || '';
    const transportLicense = user.transport_license || '';

    await client.query("SELECT set_config('app.role', $1, false)", [role]);
    await client.query(
      "SELECT set_config('app.client_cuit', $1, false)",
      [clientCuit]
    );
    await client.query(
      "SELECT set_config('app.transport_license', $1, false)",
      [transportLicense]
    );

    typedReq.dbClient = client; //forwardeamos las conexión
    next();
  } catch (error: unknown) {
    client.release();
    next(error);
  }
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const username =
      typeof req.body.username === 'string' ? req.body.username.trim() : '';

    const password =
      typeof req.body.password === 'string' ? req.body.password : '';

    const result = await pool.query(
      `SELECT
         id,
         username,
         email,
         password_hash,
         password_salt,
         role,
         is_active,
         must_change_password,
         client_cuit,
         transport_license
       FROM auth.users
       WHERE username = $1`,
      [username]
    );

    const row = result.rows[0];

    const ok =
      row &&
      row.is_active === true &&
      (await auth.verifyPassword(password, row.password_salt, row.password_hash));

    if (!ok) {
      await audit(req, 'login_failed', 'failure', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = auth.publicUser(row);
    const token = auth.newSessionToken();

    await pool.query(
      `INSERT INTO auth.sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '7 days')`,
      [user.id, auth.hashToken(token)]
    );

    (req as AuthedRequest).user = user;

    await audit(req, 'login_success', 'success');

    res.setHeader(
      'Set-Cookie',
      auth.sessionCookie(token, process.env.NODE_ENV === 'production')
    );

    return res.json({ user });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getSessionToken(req);

    if (token) {
      const user = await loadSession(req);

      if (user) {
        (req as AuthedRequest).user = user;
      }

      await pool.query('DELETE FROM auth.sessions WHERE token_hash = $1', [
        auth.hashToken(token),
      ]);

      await audit(req, 'logout', 'success');
    }

    res.setHeader(
      'Set-Cookie',
      auth.clearSessionCookie(process.env.NODE_ENV === 'production')
    );

    return res.status(204).send();
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ user: (req as AuthedRequest).user });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword =
      typeof req.body.current_password === 'string'
        ? req.body.current_password
        : '';

    const newPassword = readPassword(req.body.new_password);
    const user = (req as AuthedRequest).user!;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and a valid new password are required',
      });
    }

    const current = await pool.query(
      'SELECT password_hash, password_salt FROM auth.users WHERE id = $1',
      [user.id]
    );

    const row = current.rows[0];

    const ok =
      row &&
      (await auth.verifyPassword(
        currentPassword,
        row.password_salt,
        row.password_hash
      ));

    if (!ok) {
      await audit(req, 'password_change_failed', 'failure');
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const { passwordHash, passwordSalt } = await auth.hashPassword(newPassword);

    const result = await pool.query(
      `UPDATE auth.users
       SET
         password_hash = $1,
         password_salt = $2,
         must_change_password = false,
         updated_at = now()
       WHERE id = $3
       RETURNING id, username, email, role, is_active, must_change_password`,
      [passwordHash, passwordSalt, user.id]
    );

    (req as AuthedRequest).user = auth.publicUser(result.rows[0]);

    await audit(req, 'password_changed', 'success');

    return res.json({ user: (req as AuthedRequest).user });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes
app.post(
  '/api/admin/users',
  requireAuth,
  requirePasswordReady,
  requireAdmin,
  async (req, res) => {
    try {
      const username =
        typeof req.body.username === 'string' ? req.body.username.trim() : '';

      const email =
        typeof req.body.email === 'string' && req.body.email.trim()
          ? req.body.email.trim()
          : null;

      const password = readPassword(req.body.password);
      const role = req.body.role;

      if (!username || !password || !auth.isRole(role)) {
        return res.status(400).json({
          error: 'Valid username, password and role are required',
        });
      }

      const { passwordHash, passwordSalt } = await auth.hashPassword(password);

      const result = await pool.query(
        `INSERT INTO auth.users
         (username, email, password_hash, password_salt, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, role, is_active, must_change_password`,
        [username, email, passwordHash, passwordSalt, role]
      );

      await audit(req, 'user_created', 'success', {
        user_id: result.rows[0].id,
        role,
      });

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.post(
  '/api/admin/users/:id/reset-password',
  requireAuth,
  requirePasswordReady,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const password = readPassword(req.body.password);

      if (!Number.isInteger(userId) || !password) {
        return res.status(400).json({
          error: 'Valid user id and password are required',
        });
      }

      const { passwordHash, passwordSalt } = await auth.hashPassword(password);

      const result = await pool.query(
        `UPDATE auth.users
         SET
           password_hash = $1,
           password_salt = $2,
           must_change_password = true,
           updated_at = now()
         WHERE id = $3
         RETURNING id, username, email, role, is_active, must_change_password`,
        [passwordHash, passwordSalt, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await pool.query('DELETE FROM auth.sessions WHERE user_id = $1', [userId]);

      await audit(req, 'password_reset', 'success', { user_id: userId });

      return res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);


async function createEntityWithUser<K extends TableKey>(tableKey: K, req: Request, res: express.Response) {

  const formData = req.body as FormDataMap[K];

  // desestructuramos: lo que va en la tabla tableKey y lo que va en la de auth.users
  const {
    username, 
    password,
    role, 
    ...entityData} = formData;

  if (!password) {
    return postHandler(req, res, pool);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { passwordHash, passwordSalt } = await auth.hashPassword(password);

    const columnNames = Object.keys(entityData); 
    const columnValues = Object.values(entityData);

    const [fieldNamesTuple, parametersNumbersTuple] = formatTableColumnsForQuery(columnNames);

    const entityResult = await client.query(`
      INSERT INTO ${tableKey} ${fieldNamesTuple}
      VALUES ${parametersNumbersTuple}
      RETURNING *
    `, columnValues);
    
    const userResult = await client.query<{ id: number }>(
      `INSERT INTO auth.users
       (username, email, password_hash, password_salt, role, client_cuit, transport_license, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id`,
      [
        username,
        formData.email ? formData.email : `${username}@gmail.com`,
        passwordHash,
        passwordSalt,
        role,
        formData?.cuit || null,
        formData?.license_plate || null
      ]
    );

    await client.query('COMMIT');

    await audit(req, `${tableKey}_user_created`, 'success', {
      username: username,
      user_id: userResult.rows[0].id,
    });

    return res.status(201).json({
      success: true,
      message: `${tableKey} created successfully`,
      data: entityResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (isUniqueViolation(error)) {
      return res.status(409).json({
        success: false,
        error: `${tableKey} or username already exists`,
      });
    }

    console.error(`Error creating ${tableKey}:`, error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  } finally {
    client.release();
  }

}

app.post(
  '/api/cart/checkout',
  requireAuth,
  requirePasswordReady,
  attachDbSession,
  async (req: AuthedRequest, res) => checkoutHandler(req, res)
);

async function updateDriverStatusHandler(
  req: express.Request,
  res: express.Response,
  pool: Pool | PoolClient
) {

  const { license_plate, availability } = req.body;

  if (!license_plate || !availability) {
    return res.status(400).json({
      success: false,
      message: "license_plate and availability are required",
    });
  }

  try {
    await pool.query("BEGIN");

    // lock del transport
    const transportResult = await pool.query(
      `
        SELECT *
        FROM transports
        WHERE license_plate = $1
        FOR UPDATE
        `,
      [license_plate]
    );

    if (transportResult.rowCount === 0) {
      await pool.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    const previousStatus = transportResult.rows[0].availability;

    // actualizar transport
    const updatedTransport = await pool.query(
      `
        UPDATE transports
        SET availability = $1
        WHERE license_plate = $2
        RETURNING *
        `,
      [availability, license_plate]
    );

    // ready a travelling
    if (
      previousStatus === DriverStatus.READY &&
      availability === DriverStatus.TRAVELLING
    ) {
      // actualizamos sus pedidos
      await pool.query(
        `
          UPDATE orders
          SET status = 'travelling'
          WHERE
            plate_transport = $1
            AND status = 'preparing'
          `,
        [license_plate]
      );
    }

    // travelling a ready
    if (
      previousStatus === DriverStatus.TRAVELLING &&
      availability === DriverStatus.READY
    ) {
      // no se pudieron entregar algunas orders
      await pool.query(
        `
          UPDATE orders
          SET status = 'failed'
          WHERE
            plate_transport = $1
            AND status = 'travelling'
          `,
        [license_plate]
      );
    }

    await pool.query("COMMIT");

    return res.status(202).json({
      success: true,
      data: updatedTransport.rows[0],
      message: "Driver status updated",
    });

  } catch (error) {
    await pool.query("ROLLBACK");

    return sendErrorMessage(res, (error as Error).message);
  }
}

app.post(
  "/api/transports/updateStatus",
  requireAuth,
  requirePasswordReady,
  attachDbSession,
  async (req: AuthedRequest, res) => {
    return updateDriverStatusHandler(req, res, req.dbClient ?? pool);
  }
);
// Generic academic API routes
app.get(
  '/api/:tableName',
  requireAuth,
  requirePasswordReady,
  attachDbSession,
  async (req: AuthedRequest, res) => {
    return getHandler(req, res, req.dbClient ?? pool);
  }
);

app.post(
  '/api/:tableName',
  requireAuth,
  requirePasswordReady,
  attachDbSession,
  requireAcademicWrite,
  async (req: AuthedRequest, res) => {
    if (req.params.tableName === 'clients') {
      return createEntityWithUser("clients", req, res);
    }
    if (req.params.tableName === 'transports') {
      return createEntityWithUser("transports", req, res);
    }
    return postHandler(req, res, req.dbClient ?? pool);
  }
);

app.put(
  '/api/:tableName',
  requireAuth,
  requirePasswordReady,
  attachDbSession,
  requireAcademicWrite,
  async (req: AuthedRequest, res) => {
    return putHandler(req, res, req.dbClient ?? pool);
  }
);

app.delete(
  '/api/:tableName',
  requireAuth,
  requirePasswordReady,
  attachDbSession,
  requireAcademicWrite,
  async (req: AuthedRequest, res) => {
    return deleteHandler(req, res, req.dbClient ?? pool);
  }
);

// Resolve frontend static files directory
let frontendDistPath = path.join(__dirname, '../../frontend/dist');

if (!fs.existsSync(path.join(frontendDistPath, 'index.html'))) {
  const fallbackPath = path.join(__dirname, '../../../../frontend/dist');

  if (fs.existsSync(path.join(fallbackPath, 'index.html'))) {
    frontendDistPath = fallbackPath;
  }
}

// Serve static files from frontend dist
app.use(express.static(frontendDistPath));

// Catch-all handler for frontend routes
app.get('*', (_req, res) => {
  return res.sendFile(path.join(frontendDistPath, 'index.html'));
});

export { app, pool };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
