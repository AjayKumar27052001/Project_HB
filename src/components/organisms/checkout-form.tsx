"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { Field } from "@/components/molecules/field";
import { useDemoProfile } from "@/features/profiles/profile-context";
import type { BookingConfirmation } from "@/shared/types";

type CheckoutFormProps = {
  propertyId: string;
  roomId: string;
  rateId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
};

export function CheckoutForm({ propertyId, roomId, rateId, checkIn, checkOut, adults, rooms }: CheckoutFormProps) {
  const router = useRouter();
  const { selectedProfile } = useDemoProfile();
  const idempotencyKey = useRef<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    idempotencyKey.current = null;
  }, [selectedProfile.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          propertyId,
          roomId,
          rateId,
          checkIn,
          checkOut,
          adults,
          rooms,
          profileId: selectedProfile.id,
        }),
      });
      const result = await response.json() as BookingConfirmation | { error?: { message?: string } };

      if (!response.ok || !("confirmationCode" in result)) {
        const message = "error" in result ? result.error?.message : undefined;
        setSubmitError(message ?? "The demo reservation could not be saved. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/confirmation/${result.confirmationCode}`);
    } catch {
      setSubmitError("The demo reservation could not be saved. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="guest-form" onSubmit={handleSubmit}>
      <Field label="Demo guest name" name="guestName" value={selectedProfile.displayName} readOnly />
      <Field label="Demo email address" type="email" name="email" value={selectedProfile.email} readOnly />
      {submitError ? <p className="search-form-error" role="alert">{submitError}</p> : null}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving demo reservation…" : "Confirm mock reservation"} <span aria-hidden="true">→</span></Button>
      <p className="form-note">These fictional profile details are for the demo only. Do not enter real personal information. No payment or real reservation is created.</p>
    </form>
  );
}
