"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { RateOptionCard } from "@/components/organisms/rate-option-card";
import { formatStayDates } from "@/features/booking/format";
import type { PropertyRatesResponse } from "@/shared/types";

type PropertyRatesPanelProps = {
  propertyId: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
};

export function PropertyRatesPanel(props: PropertyRatesPanelProps) {
  const { propertyId, destination, checkIn, checkOut, adults, rooms } = props;
  const [stay, setStay] = useState<PropertyRatesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const query = new URLSearchParams({ checkIn, checkOut, adults: String(adults), rooms: String(rooms) });
    try {
      const response = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}/rates?${query.toString()}`);
      const payload = await response.json() as PropertyRatesResponse | { error?: { message?: string } };

      if (!response.ok || !("property" in payload) || !("rooms" in payload)) {
        throw new Error("error" in payload ? payload.error?.message : "Unable to load these sample rates.");
      }

      setStay(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Rate options are temporarily unavailable.");
      setStay(null);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, checkIn, checkOut, adults, rooms]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const searchQuery = new URLSearchParams({ destination, checkIn, checkOut, adults: String(adults), rooms: String(rooms) });

  if (isLoading) {
    return <p className="content-card" role="status">Loading sample rooms and rates…</p>;
  }

  if (error || !stay) {
    return (
      <section className="empty-results" role="alert">
        <h2>We couldn’t load these rates</h2>
        <p>{error || "This sample property is unavailable."}</p>
        <button type="button" className="button button-outline" onClick={() => void loadRates()}>Try again</button>
        <p><Link className="quiet-link" href={`/search?${searchQuery.toString()}`}>Return to search results</Link></p>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <Link className="back-link" href={`/search?${searchQuery.toString()}`}>← Back to stays</Link>
      <section className="property-intro">
        <div className={`property-intro-photo ${stay.property.imageClass}`} role="img" aria-label={`${stay.property.name} exterior`} />
        <div className="property-intro-copy">
          <Badge>{stay.property.cityLabel}</Badge>
          <h1>{stay.property.name}</h1>
          <p>{stay.property.area} · {stay.property.summary}</p>
          <div className="stay-facts">
            <span>Search destination: {destination}</span>
            <span>{formatStayDates(checkIn, checkOut)} · {stay.nights} {stay.nights === 1 ? "night" : "nights"}</span>
            <span>{rooms} {rooms === 1 ? "room" : "rooms"} · {adults} {adults === 1 ? "adult" : "adults"}</span>
            <span>★ {stay.property.rating} · {stay.property.reviewCount} demo reviews</span>
          </div>
        </div>
      </section>

      <div className="section-heading rates-heading">
        <div><span className="eyebrow">ROOMS & RATES</span><h2>Choose the stay that suits you</h2></div>
        <p className="rate-total-note">Synthetic quote · {stay.nights} {stay.nights === 1 ? "night" : "nights"} · {rooms} {rooms === 1 ? "room" : "rooms"}</p>
      </div>

      {stay.rooms.map((room) => (
        <article className="room-card" key={room.id}>
          <div className={`room-photo ${room.imageClass}`} role="img" aria-label={room.name}><span className="photo-label">ROOM DETAILS</span></div>
          <div className="room-content">
            <span className="eyebrow">{room.details.slice(0, 2).join(" · ")}</span>
            <h2>{room.name}</h2>
            <p className="muted">{room.description}</p>
            <div className="amenity-list">{room.details.slice(2).map((detail) => <Badge key={detail}>{detail}</Badge>)}</div>
            {room.rates.length ? (
              <div className="rate-list">
                {room.rates.map((rate) => (
                  <RateOptionCard
                    key={rate.id}
                    rate={rate}
                    propertyId={propertyId}
                    roomId={room.id}
                    destination={destination}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    adults={adults}
                    rooms={rooms}
                    maxAdults={room.maxAdults ?? 1}
                  />
                ))}
              </div>
            ) : <p className="empty-results">No rate options match the selected guest count.</p>}
          </div>
        </article>
      ))}

      <p className="page-disclaimer">All rooms, rates, taxes, fees, and availability are fictional sample data. Availability is not date-specific; no real reservation or payment is made.</p>
    </div>
  );
}
