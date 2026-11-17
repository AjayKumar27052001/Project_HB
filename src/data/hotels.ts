import type { Property } from "@/shared/types";

const usd = (amount: string) => ({ amount, currency: "USD" });

export const searchCriteria = {
  destination: "Irving, Texas",
  checkIn: "2026-11-19",
  checkOut: "2026-11-20",
  adults: 1,
  rooms: 1,
};

// This single fictional property is used for the Home page inspiration card only.
// Search Results and Rate List Menu read their property and price data from MongoDB APIs.
export const properties: Property[] = [
  {
    id: "JNP-DFW-04",
    name: "The Juniper Las Colinas Canal & Spa",
    area: "Las Colinas waterfront · 0.8 miles from the Urban Center",
    summary: "A calm canal-side stay with a heated pool and a garden bistro.",
    rating: "4.9",
    reviewCount: 428,
    amenities: ["Canal view", "Heated pool", "Spa", "Bistro"],
    startingNightlyRate: usd("285.00"),
    imageClass: "photo-canal",
  },
];
