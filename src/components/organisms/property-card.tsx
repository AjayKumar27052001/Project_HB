import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { formatMoney } from "@/features/booking/format";
import type { Property, SearchCriteria } from "@/shared/types";

export function PropertyCard({ property, criteria }: { property: Property; criteria: SearchCriteria }) {
  const query = new URLSearchParams({
    destination: criteria.destination,
    checkIn: criteria.checkIn,
    checkOut: criteria.checkOut,
    adults: String(criteria.adults),
    rooms: String(criteria.rooms),
  });

  return (
    <article className="property-card">
      <div className={`property-photo ${property.imageClass}`} role="img" aria-label={`${property.name} exterior`}>
        <span className="photo-label">dreRuss Hotels</span>
      </div>
      <div className="property-info">
        <div className="property-title-row">
          <div>
            <span className="eyebrow">{property.cityLabel ?? "IRVING · TEXAS"}</span>
            <h2>{property.name}</h2>
            <p className="muted">{property.area}</p>
          </div>
          <div className="rating"><strong>{property.rating}</strong><span>★ · {property.reviewCount} reviews</span></div>
        </div>
        <p className="property-summary">{property.summary}</p>
        <div className="amenity-list">
          {property.amenities.map((amenity) => <Badge key={amenity}>{amenity}</Badge>)}
        </div>
        <div className="property-card-footer">
          <div>
            <span className="muted">From {formatMoney(property.startingNightlyRate)} / night</span>
          </div>
          <Link className="button button-primary" href={`/property/${property.id}/rates?${query.toString()}`}>
            View rooms <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
