import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { findBookingByConfirmationCode } from "@/server/repositories/bookings";
import { formatMoney, formatStayDates } from "@/features/booking/format";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ code: string }>;

export default async function ConfirmationPage({ params }: { params: PageParams }) {
  const { code } = await params;
  let booking;
  try {
    booking = await findBookingByConfirmationCode(code);
  } catch {
    return (
      <section className="content-card page-title-block">
        <span className="eyebrow">DEMO CONFIRMATION</span>
        <h1>Confirmation temporarily unavailable</h1>
        <p>We couldn’t load this demo confirmation. Please refresh the page to try again.</p>
        <Link className="button button-outline" href="/">Return to home</Link>
      </section>
    );
  }

  if (!booking) notFound();

  const imageClass = booking.property.imageClass ?? "photo-canal";
  const assistantContext = JSON.stringify({
    propertyName: booking.property.name,
    roomName: booking.selection.roomName,
    rateName: booking.selection.rateName,
    checkIn: booking.stay.checkIn,
    checkOut: booking.stay.checkOut,
    adults: booking.stay.adults,
    rooms: booking.stay.rooms,
    subtotal: formatMoney(booking.priceSnapshot.subtotal),
    taxesAndFees: formatMoney(booking.priceSnapshot.taxesAndFees),
    total: formatMoney(booking.priceSnapshot.total),
    cancellationSummary: booking.selection.cancellationSummary,
    paymentSummary: booking.selection.paymentSummary,
    demoBoundary: "No real reservation was created and no payment was collected.",
  });

  return (
    <div className="page-stack confirmation-page" data-assistant-context={assistantContext}>
      <section className="confirmation-hero">
        <div className="confirmation-icon" aria-hidden="true">✓</div>
        <span className="eyebrow">DEMO CONFIRMATION</span>
        <h1>Your demo stay is confirmed.</h1>
        <p>This confirmation is a synthetic record created for the dreRuss Hotels prototype.</p>
        <div className="confirmation-code"><span>DEMO CONFIRMATION</span><strong>{booking.confirmationCode}</strong></div>
      </section>

      <section className="content-card confirmation-stay">
        <div className={`confirmation-photo ${imageClass}`} role="img" aria-label={`${booking.property.name} exterior`} />
        <div className="confirmation-details">
          <Badge>{booking.property.cityLabel ?? "SAMPLE DESTINATION"}</Badge>
          <h2>{booking.property.name}</h2>
          <p>{booking.selection.roomName} · {booking.selection.rateName}</p>
          <div className="stay-facts">
            <span>{formatStayDates(booking.stay.checkIn, booking.stay.checkOut)}</span>
            <span>{booking.stay.rooms} {booking.stay.rooms === 1 ? "room" : "rooms"} · {booking.stay.adults} {booking.stay.adults === 1 ? "adult" : "adults"}</span>
          </div>
          <p>Demo guest: {booking.guestContact.name}</p>
        </div>
      </section>

      <div className="confirmation-bottom">
        <section className="content-card">
          <span className="eyebrow">PRICE SUMMARY</span>
          <h2>Demo total · {booking.stay.rooms} {booking.stay.rooms === 1 ? "room" : "rooms"} · {booking.stay.nights} {booking.stay.nights === 1 ? "night" : "nights"}</h2>
          <div className="price-line"><span>Room subtotal</span><strong>{formatMoney(booking.priceSnapshot.subtotal)}</strong></div>
          <div className="price-line"><span>Estimated taxes and fees</span><strong>{formatMoney(booking.priceSnapshot.taxesAndFees)}</strong></div>
          <div className="price-total"><span>Total</span><strong>{formatMoney(booking.priceSnapshot.total)}</strong></div>
          <p className="page-disclaimer">This synthetic quote was calculated for the confirmed demo dates and room count. No payment was collected.</p>
        </section>
        <section className="content-card arrival-card">
          <span className="eyebrow">SELECTED RATE</span>
          <h2>{booking.selection.rateName}</h2>
          <p>{booking.selection.cancellationSummary}</p>
          <p>{booking.selection.paymentSummary}</p>
        </section>
      </div>
      <p className="page-disclaimer">No real reservation was created and no payment was collected.</p>
      <Link href="/" className="button button-outline">Return to home</Link>
    </div>
  );
}
