import type { Money } from "@/shared/types";

export function formatMoney(money: Money): string {
  const amount = Number(money.amount);

  if (!Number.isFinite(amount)) {
    return `${money.currency} ${money.amount}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currency,
  }).format(amount);
}

export function formatStayDates(checkIn: string, checkOut: string): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };

  const start = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);

  return `${start.toLocaleDateString("en-US", options)} – ${end.toLocaleDateString("en-US", options)}`;
}

export function getSafeSearchValue(value: string | string[] | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
