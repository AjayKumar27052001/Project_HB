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

function stableNumber(value) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createAssistantSeedData(properties) {
  return properties.map((property) => {
    const propertySeed = stableNumber(property._id);
    const petPolicyAllowed = propertySeed % 5 !== 0;
    const feeIsKnown = propertySeed % 4 !== 0;
    const amenities = property.amenities.map((amenity) => amenity.id);

    const roomTypes = property.roomTypes.map((room, roomIndex) => {
      const roomSeed = stableNumber(`${property._id}:${room.id}:${roomIndex}`);
      const accessible = roomSeed % 3 === 0;

      return {
        ...room,
        assistantAttributes: {
          accessible,
          accessibleFeatures: accessible
            ? ["Step-free entry", "Wheelchair-accessible bathroom"]
            : [],
          rollawayBed: roomSeed % 2 === 0,
          crib: roomSeed % 4 !== 0,
        },
        ratePlans: room.ratePlans.map((rate, rateIndex) => ({
          ...rate,
          includes: rateIndex % 2 === 0 ? ["Breakfast"] : [],
        })),
      };
    });

    const existingServices = Array.isArray(property.services) ? property.services : [];
    const spaServices = propertySeed % 3 === 0
      ? []
      : [{
          id: `SPA-${property._id}`,
          name: "Signature spa treatment",
          description: "Synthetic demo spa service; request subject to availability.",
          openingHours: "9:00 AM–8:00 PM",
          price: {
            amount: String(55 + (propertySeed % 96)) + ".00",
            currency: "USD",
            basis: "per treatment",
          },
          assistantAttributes: { type: "spaTreatment", available: true },
        }];

    return {
      ...property,
      services: [...existingServices, ...spaServices],
      roomTypes,
      assistantAttributes: {
        petPolicy: {
          allowed: petPolicyAllowed,
          fee: petPolicyAllowed && feeIsKnown
            ? {
                amount: String(12 + (propertySeed % 39)).padStart(2, "0") + ".00",
                currency: "USD",
                basis: propertySeed % 2 === 0 ? "per pet per night" : "one-time per stay",
              }
            : null,
        },
        parking: {
          available: propertySeed % 6 !== 0,
          type: propertySeed % 2 === 0 ? "Self parking" : "Valet parking",
          fee: {
            amount: propertySeed % 6 === 0 ? "0.00" : String(8 + (propertySeed % 23)) + ".00",
            currency: "USD",
            basis: "per night",
          },
        },
        internet: { wifi: { available: propertySeed % 9 !== 0, complimentary: propertySeed % 3 !== 0 } },
        fitnessCenter: { available: amenities.includes("GYM") || propertySeed % 4 !== 0 },
        pool: { available: amenities.some((id) => id.includes("POOL")) || propertySeed % 3 === 0 },
      },
      policies: {
        checkIn: "3:00 PM",
        checkOut: "11:00 AM",
        cancellation: "Cancellation terms vary by rate; review the selected rate for its terms.",
      },
    };
  });
}

async function createIndexes(database) {
  const properties = database.collection("properties");
  const demoProfiles = database.collection("demoProfiles");
  const bookings = database.collection("bookings");

  await properties.createIndex({ slug: 1 }, { unique: true });
  await properties.createIndex({ "destination.cityNormalized": 1, active: 1 });
  await properties.createIndex({ "amenities.id": 1, active: 1 });
  await properties.createIndex({ "destination.cityNormalized": 1, "assistantAttributes.petPolicy.allowed": 1, active: 1 });
  await properties.createIndex({ "destination.cityNormalized": 1, "assistantAttributes.petPolicy.fee.amount": 1, active: 1 });
  await properties.createIndex({ "destination.cityNormalized": 1, "roomTypes.assistantAttributes.accessible": 1, active: 1 });
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

    await replaceSeedDocuments(database.collection("properties"), createAssistantSeedData(properties));
    await replaceSeedDocuments(database.collection("demoProfiles"), demoProfiles);
    await createIndexes(database);

    console.log(`Seeded ${properties.length} properties and ${demoProfiles.length} demo profiles into ${databaseName}.`);
  } finally {
    await client.close();
  }
}

await seedDatabase();
