import "server-only";

import type { Collection } from "mongodb";
import { getDatabase } from "@/server/mongo/database";
import type { Money, Property, SearchCriteria } from "@/shared/types";

type PropertySearchDocument = {
  _id: string;
  name: string;
  summary: string;
  destination: { city: string; cityNormalized: string; region: string };
  address: { line1: string };
  rating: number;
  reviewCount: number;
  amenities: Array<{ name: string }>;
  roomTypes: Array<{ ratePlans: Array<{ nightlyRate: Money }> }>;
  active: boolean;
};

export type PropertySearchPage = {
  properties: Property[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function normalizeDestination(destination: string): string {
  return destination
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getSearchableCity(destination: string): string {
  const normalized = normalizeDestination(destination);
  const cityAliases: Record<string, string> = {
    "new york ny": "new york",
    "new york city": "new york",
    "new york city ny": "new york",
    "irving texas": "irving",
    "irving tx": "irving",
    "chicago il": "chicago",
    "los angeles ca": "los angeles",
    "san francisco ca": "san francisco",
  };

  return cityAliases[normalized] ?? normalized;
}

function chooseImageClass(propertyId: string): string {
  const imageClasses = ["photo-canal", "photo-lake", "photo-garden"];
  const characterTotal = [...propertyId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return imageClasses[characterTotal % imageClasses.length];
}

function mapSearchResult(document: PropertySearchDocument): Property {
  const availableRates = document.roomTypes.flatMap((room) => room.ratePlans);
  const startingNightlyRate = availableRates
    .map((rate) => rate.nightlyRate)
    .sort((first, second) => Number(first.amount) - Number(second.amount))[0] ?? { amount: "0.00", currency: "USD" };

  return {
    id: document._id,
    name: document.name,
    area: document.address.line1,
    cityLabel: `${document.destination.city} · ${document.destination.region}`,
    summary: document.summary,
    rating: document.rating.toFixed(1),
    reviewCount: document.reviewCount,
    amenities: document.amenities.map((amenity) => amenity.name),
    startingNightlyRate,
    imageClass: chooseImageClass(document._id),
  };
}

export async function searchMongoProperties(
  criteria: SearchCriteria,
  page: number,
  pageSize: number,
): Promise<PropertySearchPage> {
  const database = await getDatabase();
  const properties: Collection<PropertySearchDocument> = database.collection("properties");
  const cityNormalized = getSearchableCity(criteria.destination);
  const filter = { "destination.cityNormalized": cityNormalized, active: true };
  const projection = {
    _id: 1,
    name: 1,
    summary: 1,
    destination: { city: 1, cityNormalized: 1, region: 1 },
    address: { line1: 1 },
    rating: 1,
    reviewCount: 1,
    amenities: { name: 1 },
    "roomTypes.ratePlans.nightlyRate": 1,
    active: 1,
  };
  const [documents, total] = await Promise.all([
    properties.find(filter)
      .project<PropertySearchDocument>(projection)
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    properties.countDocuments(filter),
  ]);

  return {
    properties: documents.map(mapSearchResult),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
