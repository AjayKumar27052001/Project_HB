import type { Money } from "@/shared/types";

export type RatePricingInput = {
  nightlyRate: Money;
  taxPercent: string;
  feesPerNight: Money;
};

export type RateQuote = {
  nights: number;
  nightlyRates: Array<{ date: string; amount: string; currency: string }>;
  subtotal: Money;
  taxes: Money;
  fees: Money;
  taxesAndFees: Money;
  total: Money;
};

function parseCents(amount: string): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  if (!/^\d+$/.test(whole) || !/^\d{0,2}$/.test(fraction)) {
    throw new Error("Invalid synthetic money amount.");
  }

  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function parseDecimal(value: string): { units: bigint; scale: bigint } {
  const [whole = "0", fraction = ""] = value.split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) {
    throw new Error("Invalid synthetic tax percentage.");
  }

  return {
    units: BigInt(`${whole}${fraction}`),
    scale: 10n ** BigInt(fraction.length),
  };
}

function roundRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function formatCents(cents: bigint): string {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function getStayNightCount(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  const nights = Math.round((end - start) / 86_400_000);

  if (!Number.isInteger(nights) || nights < 1 || nights > 30) {
    throw new RangeError("Choose a stay between 1 and 30 nights.");
  }

  return nights;
}

export function calculateRateQuote(
  rate: RatePricingInput,
  criteria: { checkIn: string; checkOut: string; rooms: number },
): RateQuote {
  const nights = getStayNightCount(criteria.checkIn, criteria.checkOut);
  const nightlyCents = parseCents(rate.nightlyRate.amount);
  const nightlyFeeCents = parseCents(rate.feesPerNight.amount);
  const taxPercent = parseDecimal(rate.taxPercent);
  const stayRoomCount = BigInt(nights * criteria.rooms);
  const subtotalCents = nightlyCents * stayRoomCount;
  const feesCents = nightlyFeeCents * stayRoomCount;
  const taxesCents = roundRatio(
    subtotalCents * taxPercent.units,
    100n * taxPercent.scale,
  );
  const taxesAndFeesCents = taxesCents + feesCents;
  const money = (cents: bigint): Money => ({ amount: formatCents(cents), currency: rate.nightlyRate.currency });
  const nightlyRates = Array.from({ length: nights }, (_, index) => {
    const date = new Date(Date.parse(`${criteria.checkIn}T00:00:00Z`) + index * 86_400_000)
      .toISOString()
      .slice(0, 10);

    return { date, amount: rate.nightlyRate.amount, currency: rate.nightlyRate.currency };
  });

  return {
    nights,
    nightlyRates,
    subtotal: money(subtotalCents),
    taxes: money(taxesCents),
    fees: money(feesCents),
    taxesAndFees: money(taxesAndFeesCents),
    total: money(subtotalCents + taxesAndFeesCents),
  };
}
