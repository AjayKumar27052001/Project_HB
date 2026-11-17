import "server-only";

import { MongoClient, type Db } from "mongodb";

type MongoGlobal = typeof globalThis & {
  juniperMongoClientPromise?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as MongoGlobal;

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MongoDB is not configured. Set MONGODB_URI in the server environment.");
  }

  if (!mongoGlobal.juniperMongoClientPromise) {
    const client = new MongoClient(uri);
    mongoGlobal.juniperMongoClientPromise = client.connect().catch((error: unknown) => {
      mongoGlobal.juniperMongoClientPromise = undefined;
      throw error;
    });
  }

  const client = await mongoGlobal.juniperMongoClientPromise;
  const databaseName = process.env.MONGODB_DATABASE || "juniper_hotels_demo";

  return client.db(databaseName);
}
