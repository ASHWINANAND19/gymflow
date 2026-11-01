// PostgreSQL connection pool shared by the whole app.
import pg from 'pg';

const { Pool, types } = pg;

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects
types.setTypeParser(1082, (value) => value);
// NUMERIC -> number, BIGINT (e.g. COUNT(*)) -> number
types.setTypeParser(1700, (value) => parseFloat(value));
types.setTypeParser(20, (value) => parseInt(value, 10));

// The pool is created on first use and cached on globalThis so that
// Next.js hot reloads in development do not open new pools each time.
function getPool() {
  if (!globalThis._gymflowPool) {
    globalThis._gymflowPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return globalThis._gymflowPool;
}

export function query(text, params = []) {
  return getPool().query(text, params);
}

// Runs `work(client)` inside BEGIN ... COMMIT. Any error rolls the whole
// transaction back, so either every statement is saved or none are.
export async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (globalThis._gymflowPool) {
    await globalThis._gymflowPool.end();
    globalThis._gymflowPool = undefined;
  }
}
