import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { CheckoutForm } from "@/components/organisms/checkout-form";
import { getDefaultSearchCriteria } from "@/features/booking/data-source";
import { formatMoney, formatStayDates, getSafeSearchValue } from "@/features/booking/format";
import { getStayNightCount } from "@/server/pricing/rate-quote";
import { getMongoPropertyRates } from "@/server/repositories/property-rates";
import type { PropertyRatesResponse } from "@/shared/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getRequiredValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getCount(value: string | string[] | undefined, minimum: number, maximum: number): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= minimum && count <= maximum ? count : null;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const defaults = getDefaultSearchCriteria();
  const propertyId = getRequiredValue(params.propertyId);
  const roomId = getRequiredValue(params.roomId);
  const rateId = getRequiredValue(params.rateId);
  if (!propertyId || !roomId || !rateId) notFound();

  const destination = getSafeSearchValue(params.destination, defaults.destination);
  const checkIn = getRequiredValue(params.checkIn);
  const checkOut = getRequiredValue(params.checkOut);
  const adults = getCount(params.adults, 1, 8);
  const rooms = getCount(params.rooms, 1, 5);
  if (!checkIn || !checkOut || !isRealDate(checkIn) || !isRealDate(checkOut) || checkOut <= checkIn || adults === null || rooms === null) notFound();
  try {
    getStayNightCount(checkIn, checkOut);
  } catch {
    notFound();
  }

  let stay: PropertyRatesResponse | null;
  try {
    stay = await getMongoPropertyRates(propertyId, { checkIn, checkOut, adults, rooms });
  } catch {
    const ratesQuery = new URLSearchParams({ destination, checkIn, checkOut, adults: String(adults), rooms: String(rooms) });
    return (
      <section className="content-card page-title-block" role="alert">
        <span className="eyebrow">CHECKOUT · FINAL REVIEW</span>
        <h1>Checkout is temporarily unavailable</h1>
        <p>We couldn’t load the selected sample rate. Please try again or return to the Rate List Menu.</p>
        <Link className="button button-outline" href={`/property/${propertyId}/rates?${ratesQuery.toString()}`}>Return to rates</Link>
      </section>
    );
  }

  const property = stay?.property;
  const room = stay?.rooms.find((option) => option.id === roomId);
  const rate = room?.rates.find((option) => option.id === rateId);

  if (!stay || !property || !room || !rate) notFound();
  if (rate.demoAvailableRooms !== undefined && rooms > rate.demoAvailableRooms) notFound();
  if (room.maxAdults !== undefined && adults > room.maxAdults * rooms) notFound();

  const ratesQuery = new URLSearchParams({ destination, checkIn, checkOut, adults: String(adults), rooms: String(rooms) });
  const assistantContext = JSON.stringify({
    propertyId,
    roomId,
    rateId,
    searchCriteria: { destination, checkIn, checkOut, adults, rooms },
  });

  return (
    <div className="page-stack" data-assistant-context={assistantContext}>
      <Link className="back-link" href={`/property/${propertyId}/rates?${ratesQuery.toString()}`}>← Back to rates</Link>
      <section className="page-title-block">
        <span className="eyebrow">CHECKOUT · FINAL REVIEW</span>
        <h1>Review your stay</h1>
        <p>Check the details below before you continue to the mock confirmation.</p>
      </section>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="content-card stay-review-card">
            <div className={`review-photo ${room.imageClass}`} role="img" aria-label={room.name} />
            <div className="review-details">
              <Badge>SELECTED ROOM</Badge>
              <h2>{property.name}</h2>
              <h3>{room.name}</h3>
              <p>Search destination: {destination}</p>
              <p>{formatStayDates(checkIn, checkOut)} · {adults} {adults === 1 ? "adult" : "adults"} · {rooms} {rooms === 1 ? "room" : "rooms"}</p>
              <p>{rate.name}</p>
            </div>
          </section>

          <section className="content-card">
            <span className="eyebrow">GUEST DETAILS</span>
            <h2>Selected demo guest</h2>
            <p className="muted">Contact details come from the profile selector in the header.</p>
            <CheckoutForm
              propertyId={propertyId}
              roomId={roomId}
              rateId={rateId}
              checkIn={checkIn}
              checkOut={checkOut}
              adults={adults}
              rooms={rooms}
            />
          </section>
        </div>

        <aside className="price-summary content-card">
          <span className="eyebrow">PRICE SUMMARY</span>
          <h2>Your total</h2>
          <p className="summary-date">{formatStayDates(checkIn, checkOut)} · {rooms} {rooms === 1 ? "room" : "rooms"}</p>
          <div className="price-line"><span>Room subtotal · {rooms} {rooms === 1 ? "room" : "rooms"} · {stay.nights} {stay.nights === 1 ? "night" : "nights"} · {rate.name}</span><strong>{formatMoney(rate.subtotal)}</strong></div>
          <div className="price-line"><span>Estimated taxes and fees</span><strong>{formatMoney(rate.taxesAndFees)}</strong></div>
          <div className="price-total"><span>Demo total</span><strong>{formatMoney(rate.total)}</strong></div>
          <p className="page-disclaimer">This synthetic quote covers {stay.nights} {stay.nights === 1 ? "night" : "nights"} and {rooms} {rooms === 1 ? "room" : "rooms"}. No payment is collected.</p>
          <div className="policy-note"><strong>Cancellation policy</strong><span>{rate.cancellationSummary}</span></div>
          <div className="policy-note"><strong>Payment terms</strong><span>{rate.paymentSummary}</span></div>
          <div className="mock-notice"><strong>Mock booking</strong><span>No payment details are collected and no real reservation or payment is submitted.</span></div>
        </aside>
      </div>
    </div>
  );
}
