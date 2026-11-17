export type Money = {
  amount: string;
  currency: string;
};

export type DemoProfile = {
  id: string;
  displayName: string;
  email: string;
  preferences: string[];
  rewards: {
    programName: string;
    tier: string;
    pointsBalance: number;
    upgradeAwardsAvailable: number;
  };
  demo: true;
};

export type SearchCriteria = {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
};

export type PropertySearchResponse = {
  criteria: SearchCriteria;
  results: Property[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type Property = {
  id: string;
  name: string;
  area: string;
  cityLabel?: string;
  summary: string;
  rating: string;
  reviewCount: number;
  amenities: string[];
  startingNightlyRate: Money;
  estimatedStayTotal?: Money;
  imageClass: string;
};

export type RateOption = {
  id: string;
  name: string;
  description: string;
  subtotal: Money;
  taxesAndFees: Money;
  total: Money;
  cancellationSummary: string;
  cancellationDeadline: string;
  paymentSummary: string;
  badge?: string;
  nightlyRates?: Array<{ date: string; amount: string; currency: string }>;
  taxes?: Money;
  fees?: Money;
  demoAvailableRooms?: number;
};

export type RoomOption = {
  id: string;
  name: string;
  description: string;
  details: string[];
  imageClass: string;
  rates: RateOption[];
  maxAdults?: number;
};

export type PropertyStay = {
  property: Property;
  rooms: RoomOption[];
};

export type PropertyRatesResponse = PropertyStay & {
  criteria: Omit<SearchCriteria, "destination">;
  nights: number;
  demo: true;
};

export type BookingConfirmation = {
  bookingId: string;
  confirmationCode: string;
  status: "confirmed";
  demo: true;
  profileId: string;
  profile: { id: string; displayName: string };
  guestContact: { name: string; email: string };
  property: { id: string; name: string; cityLabel?: string; imageClass?: string };
  stay: {
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    rooms: number;
  };
  selection: {
    roomId: string;
    roomName: string;
    rateId: string;
    rateName: string;
    cancellationSummary: string;
    paymentSummary: string;
  };
  priceSnapshot: {
    subtotal: Money;
    taxesAndFees: Money;
    total: Money;
    priceBasis: { rooms: number; nights: number };
  };
  createdAt: string;
};
