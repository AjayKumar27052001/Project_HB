import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { StaySearchForm } from "@/components/organisms/stay-search-form";
import { getDefaultSearchCriteria, getFeaturedProperty } from "@/features/booking/data-source";
import { formatMoney, getSafeSearchValue } from "@/features/booking/format";
import type { SearchCriteria } from "@/shared/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSafeCount(value: string | string[] | undefined, fallback: number, maximum: number): number {
  if (typeof value !== "string") return fallback;
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue >= 1 && parsedValue <= maximum ? parsedValue : fallback;
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const featuredProperty = getFeaturedProperty();
  const defaults = getDefaultSearchCriteria();
  const params = await searchParams;
  const initialCriteria: SearchCriteria = {
    destination: getSafeSearchValue(params.destination, defaults.destination),
    checkIn: getSafeSearchValue(params.checkIn, defaults.checkIn),
    checkOut: getSafeSearchValue(params.checkOut, defaults.checkOut),
    adults: getSafeCount(params.adults, defaults.adults, 8),
    rooms: getSafeCount(params.rooms, defaults.rooms, 5),
  };

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow light-eyebrow">A STAY THAT FEELS LIKE YOURS</span>
          <h1>Find room to <em>unwind.</em></h1>
          <p>Thoughtful stays in places worth slowing down for.</p>
        </div>
        <div className="hero-decoration" aria-hidden="true"><span>J</span></div>
      </section>

      <section className="search-card" aria-labelledby="search-heading">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">PLAN YOUR NEXT STAY</span>
            <h2 id="search-heading">Where would you like to go?</h2>
          </div>
          <span className="sample-label">Sample dates · Nov 19–20, 2026</span>
        </div>
        <StaySearchForm initialCriteria={initialCriteria} />
      </section>

      <section className="featured-section" id="offers">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE INSPIRATION</span>
            <h2>Make time for Las Colinas</h2>
          </div>
          <Link href="/search?destination=Irving%2C%20Texas&checkIn=2026-11-19&checkOut=2026-11-20&adults=1&rooms=1" className="quiet-link">Explore stays <span aria-hidden="true">→</span></Link>
        </div>
        <div className="featured-card">
          <div className={`featured-photo ${featuredProperty.imageClass}`} role="img" aria-label="Canal-side hotel in Las Colinas" />
          <div className="featured-info">
            <Badge>CANAL WATERFRONT</Badge>
            <h3>{featuredProperty.name}</h3>
            <p>{featuredProperty.summary}</p>
            <div className="featured-meta"><span>★ {featuredProperty.rating} · {featuredProperty.reviewCount} guest reviews</span><strong>From {formatMoney(featuredProperty.startingNightlyRate)} / night</strong></div>
          </div>
        </div>
      </section>
    </>
  );
}
