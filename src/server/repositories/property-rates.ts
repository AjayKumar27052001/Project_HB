import "server-only";

import type { Collection } from "mongodb";
import type { Money, Property, PropertyRatesResponse, RateOption, RoomOption } from "@/shared/types";
import { calculateRateQuote, getStayNightCount } from "@/server/pricing/rate-quote";
import { getDatabase } from "@/server/mongo/database";

type RatePlanDocument = {
  id: string;
  name: string;
  refundable: boolean;
  cancellationSummary: string;
  paymentSummary: string;
  includes?: string[];
  nightlyRate: Money;
  taxPercent: string;
  feesPerNight: Money;
  demoAvailableRooms: number;
};

type RoomTypeDocument = {
  id: string;
  name: string;
  description: string;
  maxAdults: number;
  maxChildren: number;
  bedSummary: string;
  ratePlans: RatePlanDocument[];
};

type PropertyRateDocument = {
  _id: string;
  name: string;
  summary: string;
  destination: { city: string; region: string };
  address: { line1: string };
  rating: number;
  reviewCount: number;
  amenities: Array<{ name: string }>;
  roomTypes: RoomTypeDocument[];
  active: boolean;
};

export type RateSearchCriteria = {
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
};

export type BookingSelectionSnapshot = {
  property: { id: string; name: string; cityLabel: string; imageClass: string };
  room: { id: string; name: string; maxAdults: number };
  rate: RateOption;
  maxAdults: number;
  availableRooms: number;
};

function chooseImageClass(propertyId: string): string {
  const imageClasses = ["photo-canal", "photo-lake", "photo-garden"];
  const characterTotal = [...propertyId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return imageClasses[characterTotal % imageClasses.length];
}

function mapProperty(document: PropertyRateDocument): Property {
  const allNightlyRates = document.roomTypes.flatMap((room) => room.ratePlans.map((rate) => rate.nightlyRate));
  const startingNightlyRate = allNightlyRates
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

function mapRateOptions(room: RoomTypeDocument, criteria: RateSearchCriteria): RateOption[] {
  return room.ratePlans.map((rate) => {
    const quote = calculateRateQuote(rate, criteria);

    return {
      id: rate.id,
      name: rate.name,
      description: rate.refundable ? "Flexible cancellation terms." : "Non-refundable rate.",
      subtotal: quote.subtotal,
      taxesAndFees: quote.taxesAndFees,
      total: quote.total,
      cancellationSummary: rate.cancellationSummary,
      cancellationDeadline: "",
      paymentSummary: rate.paymentSummary,
      includes: rate.includes ?? [],
      nightlyRates: quote.nightlyRates,
      taxes: quote.taxes,
      fees: quote.fees,
      demoAvailableRooms: rate.demoAvailableRooms,
    };
  });
}

function mapRooms(document: PropertyRateDocument, criteria: RateSearchCriteria): RoomOption[] {
  return document.roomTypes.map((room, index) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    details: [room.bedSummary, `Up to ${room.maxAdults} adults`, `Up to ${room.maxChildren} children`],
    imageClass: index === 0 ? "photo-room" : "photo-suite",
    maxAdults: room.maxAdults,
    rates: mapRateOptions(room, criteria),
  }));
}

async function findActiveProperty(propertyId: string): Promise<PropertyRateDocument | null> {
  const database = await getDatabase();
  const properties: Collection<PropertyRateDocument> = database.collection("properties");
  const projection = {
    _id: 1,
    name: 1,
    summary: 1,
    destination: { city: 1, region: 1 },
    address: { line1: 1 },
    rating: 1,
    reviewCount: 1,
    amenities: { name: 1 },
    roomTypes: {
      id: 1,
      name: 1,
      description: 1,
      maxAdults: 1,
      maxChildren: 1,
      bedSummary: 1,
      ratePlans: {
        id: 1,
        name: 1,
        refundable: 1,
        cancellationSummary: 1,
        paymentSummary: 1,
        nightlyRate: 1,
        taxPercent: 1,
        feesPerNight: 1,
        demoAvailableRooms: 1,
      },
    },
  };

  return properties.findOne({ _id: propertyId, active: true }, { projection });
}

export async function getMongoPropertyRates(
  propertyId: string,
  criteria: RateSearchCriteria,
): Promise<PropertyRatesResponse | null> {
  const nights = getStayNightCount(criteria.checkIn, criteria.checkOut);
  const document = await findActiveProperty(propertyId);
  if (!document) return null;

  return {
    property: mapProperty(document),
    criteria,
    nights,
    rooms: mapRooms(document, criteria),
    demo: true,
  };
}

export async function findMongoBookingSelection(
  propertyId: string,
  roomId: string,
  rateId: string,
  criteria: RateSearchCriteria,
): Promise<BookingSelectionSnapshot | null> {
  const rateOptions = await getMongoPropertyRates(propertyId, criteria);
  const room = rateOptions?.rooms.find((candidate) => candidate.id === roomId);
  const rate = room?.rates.find((candidate) => candidate.id === rateId);

  if (!rateOptions || !room || !rate) return null;

  return {
    property: {
      id: rateOptions.property.id,
      name: rateOptions.property.name,
      cityLabel: rateOptions.property.cityLabel ?? "",
      imageClass: rateOptions.property.imageClass,
    },
    room: { id: room.id, name: room.name, maxAdults: room.maxAdults ?? 1 },
    rate,
    maxAdults: room.maxAdults ?? 1,
    availableRooms: rate.demoAvailableRooms ?? 0,
  };
}
