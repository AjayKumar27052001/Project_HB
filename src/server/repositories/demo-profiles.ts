import "server-only";

import type { Collection } from "mongodb";
import { getDatabase } from "@/server/mongo/database";
import type { DemoProfile } from "@/shared/types";

type DemoProfileDocument = Omit<DemoProfile, "id"> & {
  _id: string;
};

function toDemoProfile(document: DemoProfileDocument): DemoProfile {
  const { _id, ...profile } = document;

  return { ...profile, id: _id };
}

async function getDemoProfileCollection(): Promise<Collection<DemoProfileDocument>> {
  const database = await getDatabase();
  return database.collection<DemoProfileDocument>("demoProfiles");
}

export async function listDemoProfiles(): Promise<DemoProfile[]> {
  const profiles = await getDemoProfileCollection();
  const documents = await profiles.find({}).sort({ displayName: 1 }).toArray();

  return documents.map(toDemoProfile);
}

export async function findDemoProfile(profileId: string): Promise<DemoProfile | null> {
  const profiles = await getDemoProfileCollection();
  const document = await profiles.findOne({ _id: profileId });

  return document ? toDemoProfile(document) : null;
}
