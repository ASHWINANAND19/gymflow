// MongoDB client shared by the whole app (same caching idea as lib/db.js).
import { MongoClient } from 'mongodb';

export async function getMongoDb() {
  if (!globalThis._gymflowMongo) {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
    globalThis._gymflowMongo = client.connect();
  }
  const client = await globalThis._gymflowMongo;
  return client.db(process.env.MONGODB_DB || 'gymflow');
}

export async function closeMongo() {
  if (globalThis._gymflowMongo) {
    const client = await globalThis._gymflowMongo;
    await client.close();
    globalThis._gymflowMongo = undefined;
  }
}
