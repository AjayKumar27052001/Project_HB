import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Set MONGODB_URI before running npm run seed:db.");
}

const databaseName = process.env.MONGODB_DATABASE || "juniper_hotels_demo";

async function readSeedFile(fileName) {
  const fileUrl = new URL(`../src/data/seed/${fileName}`, import.meta.url);
  const fileContents = await readFile(fileUrl, "utf8");
  return JSON.parse(fileContents);
}

async function replaceSeedDocuments(collection, documents) {
  const operations = documents.map((document) => ({
    replaceOne: {
      filter: { _id: document._id },
      replacement: document,
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await collection.bulkWrite(operations, { ordered: true });
  }
}

async function createIndexes(database) {
  const properties = database.collection("properties");
  const demoProfiles = database.collection("demoProfiles");
  const bookings = database.collection("bookings");

  await properties.createIndex({ slug: 1 }, { unique: true });
  await properties.createIndex({ "destination.cityNormalized": 1, active: 1 });
  await properties.createIndex({ "amenities.id": 1, active: 1 });
  await demoProfiles.createIndex({ email: 1 }, { unique: true });
  await bookings.createIndex({ confirmationCode: 1 }, { unique: true });
  await bookings.createIndex({ idempotencyKey: 1 }, { unique: true });
  await bookings.createIndex({ createdAt: -1 });
  await bookings.createIndex({ profileId: 1, createdAt: -1 });
}

async function seedDatabase() {
  const [properties, demoProfiles] = await Promise.all([
    readSeedFile("properties.json"),
    readSeedFile("demo-profiles.json"),
  ]);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db(databaseName);

    await replaceSeedDocuments(database.collection("properties"), properties);
    await replaceSeedDocuments(database.collection("demoProfiles"), demoProfiles);
    await createIndexes(database);

    console.log(`Seeded ${properties.length} properties and ${demoProfiles.length} demo profiles into ${databaseName}.`);
  } finally {
    await client.close();
  }
}

await seedDatabase();
