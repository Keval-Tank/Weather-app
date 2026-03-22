import { MongoClient } from "mongodb";

let client;
let db;

export async function connectToDatabase({ mongoUri, dbName }) {
  if (db) {
    return db;
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);

  await db.collection("countries").createIndex({ country: 1 }, { unique: true });
  await db.collection("weather_snapshots").createIndex({ country: 1, city: 1, dateKey: 1 }, { unique: true });
  await db.collection("weather_snapshots").createIndex({ fetchedAt: -1 });

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database is not connected");
  }

  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }

  client = undefined;
  db = undefined;
}
