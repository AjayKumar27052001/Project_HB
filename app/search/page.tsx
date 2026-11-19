import Link from "next/link";
import { SearchResultsList } from "@/components/organisms/search-results-list";
import { getDefaultSearchCriteria } from "@/features/booking/data-source";
import { formatStayDates, getSafeSearchValue } from "@/features/booking/format";
import type { SearchCriteria } from "@/shared/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const defaults = getDefaultSearchCriteria();
  const criteria: SearchCriteria = {
    destination: getSafeSearchValue(params.destination, defaults.destination),
    checkIn: getSafeSearchValue(params.checkIn, defaults.checkIn),
    checkOut: getSafeSearchValue(params.checkOut, defaults.checkOut),
    adults: Number(getSafeSearchValue(params.adults, String(defaults.adults))) || 1,
    rooms: Number(getSafeSearchValue(params.rooms, String(defaults.rooms))) || 1,
  };
  return (
    <div className="page-stack" data-assistant-context={JSON.stringify({ searchCriteria: criteria })}>
      <section className="search-summary">
        <div>
          <span className="eyebrow">YOUR SEARCH</span>
          <h1>Sample stays in {criteria.destination}</h1>
          <p>Your search: {criteria.destination} · {formatStayDates(criteria.checkIn, criteria.checkOut)} · {criteria.rooms} {criteria.rooms === 1 ? "room" : "rooms"} · {criteria.adults} {criteria.adults === 1 ? "adult" : "adults"}</p>
        </div>
        <Link
          className="button button-outline"
          href={`/?${new URLSearchParams({
            destination: criteria.destination,
            checkIn: criteria.checkIn,
            checkOut: criteria.checkOut,
            adults: String(criteria.adults),
            rooms: String(criteria.rooms),
          }).toString()}`}
        >
          Edit search
        </Link>
      </section>

      <div className="results-layout">
        <aside className="filter-panel" aria-label="Search filters">
          <div className="filter-heading"><h2>Filters</h2><button type="button" className="text-button">Reset</button></div>
          <fieldset>
            <legend>Nightly price</legend>
            <label><input type="checkbox" /> Under $300</label>
            <label><input type="checkbox" /> $300–$400</label>
            <label><input type="checkbox" /> $400 and up</label>
          </fieldset>
          <fieldset>
            <legend>Amenities</legend>
            <label><input type="checkbox" /> Pool</label>
            <label><input type="checkbox" /> Spa</label>
            <label><input type="checkbox" /> Airport access</label>
          </fieldset>
          <p className="filter-note">Filters are visual examples in this frontend phase.</p>
        </aside>

        <SearchResultsList criteria={criteria} />
      </div>
    </div>
  );
}
