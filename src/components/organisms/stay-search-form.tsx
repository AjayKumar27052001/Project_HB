"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { Field } from "@/components/molecules/field";
import type { SearchCriteria } from "@/shared/types";

const MIN_ADULTS = 1;
const MAX_ADULTS = 8;
const MIN_ROOMS = 1;
const MAX_ROOMS = 5;

function getSearchValidationError(
  destination: string,
  checkIn: string,
  checkOut: string,
  adults: number,
  rooms: number,
): string | null {
  if (!destination.trim()) return "Enter a destination to search for a stay.";
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return "Choose a check-out date after your check-in date.";
  }
  if (!Number.isInteger(adults) || adults < MIN_ADULTS || adults > MAX_ADULTS) {
    return `Choose between ${MIN_ADULTS} and ${MAX_ADULTS} adults.`;
  }
  if (!Number.isInteger(rooms) || rooms < MIN_ROOMS || rooms > MAX_ROOMS) {
    return `Choose between ${MIN_ROOMS} and ${MAX_ROOMS} rooms.`;
  }

  return null;
}

export function StaySearchForm({ initialCriteria }: { initialCriteria: SearchCriteria }) {
  const router = useRouter();
  const [destination, setDestination] = useState(initialCriteria.destination);
  const [checkIn, setCheckIn] = useState(initialCriteria.checkIn);
  const [checkOut, setCheckOut] = useState(initialCriteria.checkOut);
  const [adults, setAdults] = useState(initialCriteria.adults);
  const [rooms, setRooms] = useState(initialCriteria.rooms);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = getSearchValidationError(destination, checkIn, checkOut, adults, rooms);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    const params = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      adults: String(adults),
      rooms: String(rooms),
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <Field label="Destination" value={destination} onChange={(event) => { setDestination(event.target.value); setFormError(null); }} required />
      <Field label="Check-in" type="date" value={checkIn} onChange={(event) => { setCheckIn(event.target.value); setFormError(null); }} required />
      <Field label="Check-out" type="date" min={checkIn} value={checkOut} onChange={(event) => { setCheckOut(event.target.value); setFormError(null); }} required />
      <div className="field-row">
        <Field label="Adults" type="number" min={MIN_ADULTS} max={MAX_ADULTS} value={adults} onChange={(event) => { setAdults(Number(event.target.value)); setFormError(null); }} required />
        <Field label="Rooms" type="number" min={MIN_ROOMS} max={MAX_ROOMS} value={rooms} onChange={(event) => { setRooms(Number(event.target.value)); setFormError(null); }} required />
      </div>
      {formError ? <p className="search-form-error" role="alert">{formError}</p> : null}
      <Button className="search-submit" type="submit">Search stays <span aria-hidden="true">→</span></Button>
    </form>
  );
}
