import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { formatMoney } from "@/features/booking/format";
import type { RateOption } from "@/shared/types";

type RateOptionCardProps = {
  rate: RateOption;
  propertyId: string;
  roomId: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  maxAdults: number;
};

export function RateOptionCard({ rate, propertyId, roomId, destination, checkIn, checkOut, adults, rooms, maxAdults }: RateOptionCardProps) {
  const hasEnoughDemoRooms = (rate.demoAvailableRooms ?? 0) >= rooms;
  const guestCountFits = adults <= maxAdults * rooms;
  const canSelect = hasEnoughDemoRooms && guestCountFits;
  const nights = rate.nightlyRates?.length ?? 1;
  const query = new URLSearchParams({
    propertyId,
    roomId,
    rateId: rate.id,
    destination,
    checkIn,
    checkOut,
    adults: String(adults),
    rooms: String(rooms),
  });

  return (
    <div className="rate-option">
      <div className="rate-title">
        <div>
          <h3>{rate.name}</h3>
          <p className="muted">{rate.description}</p>
        </div>
        {rate.badge ? <Badge>{rate.badge}</Badge> : null}
      </div>
      <div className="rate-facts">
        <span>{rate.cancellationSummary}</span>
        <span>{rate.paymentSummary}</span>
      </div>
      <div className="rate-price-row">
        <div>
          <span className="muted">Total · {rooms} {rooms === 1 ? "room" : "rooms"} · {nights} {nights === 1 ? "night" : "nights"}</span>
          <strong>{formatMoney(rate.total)}</strong>
          <small>Room subtotal {formatMoney(rate.subtotal)} · taxes and fees {formatMoney(rate.taxesAndFees)}</small>
          <small>Demo availability: {rate.demoAvailableRooms} {rate.demoAvailableRooms === 1 ? "room" : "rooms"}</small>
        </div>
        {canSelect ? (
          <Link className="button button-secondary" href={`/checkout?${query.toString()}`}>Select rate</Link>
        ) : (
          <span className="muted" role="status">{guestCountFits ? "Not enough demo rooms" : "Guest count exceeds room capacity"}</span>
        )}
      </div>
    </div>
  );
}
