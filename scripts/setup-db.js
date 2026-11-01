// Builds both databases from scratch:
//   PostgreSQL: runs db/sql/00_drop.sql ... 06_indexes.sql in order
//   MongoDB:    recreates the collections with their validators and indexes
// Usage: npm run db:setup
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { MongoClient } from 'mongodb';
import { setupMongo } from '../db/mongo/setup.js';

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'sql');
const SQL_FILES = [
  '00_drop.sql',
  '01_schema.sql',
  '02_alter.sql',
  '03_functions.sql',
  '04_triggers.sql',
  '05_views.sql',
  '06_indexes.sql',
];

// Creates the database if it does not exist yet and sets its timezone
async function ensureDatabaseExists(databaseUrl) {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);
  url.pathname = '/postgres';

  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
    await admin.query(`ALTER DATABASE "${dbName}" SET timezone TO 'Asia/Kolkata'`);
  } finally {
    await admin.end();
  }
}

export async function setupDatabase({ databaseUrl, mongoUri, mongoDb }) {
  await ensureDatabaseExists(databaseUrl);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of SQL_FILES) {
      const sql = await fs.readFile(path.join(SQL_DIR, file), 'utf8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  try {
    await setupMongo(mongo.db(mongoDb));
  } finally {
    await mongo.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupDatabase({
    databaseUrl: process.env.DATABASE_URL,
    mongoUri: process.env.MONGODB_URI,
    mongoDb: process.env.MONGODB_DB,
  })
    .then(() => console.log('PostgreSQL and MongoDB are ready.'))
    .catch((err) => {
      console.error('Setup failed:', err.message);
      process.exit(1);
    });
}
