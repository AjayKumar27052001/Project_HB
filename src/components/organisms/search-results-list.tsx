"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { PropertyCard } from "@/components/organisms/property-card";
import type { Property, PropertySearchResponse, SearchCriteria } from "@/shared/types";

type SearchResultsListProps = { criteria: SearchCriteria };

export function SearchResultsList({ criteria }: SearchResultsListProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedRequest, setFailedRequest] = useState<{ page: number; append: boolean } | null>(null);

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...criteria, page: nextPage, pageSize: 20 }),
      });
      const payload = await response.json() as PropertySearchResponse | { error?: { message?: string } };

      if (!response.ok || !("results" in payload)) {
        throw new Error("error" in payload ? payload.error?.message : undefined);
      }

      setProperties((current) => append ? [...current, ...payload.results] : payload.results);
      setTotal(payload.pagination.total);
      setPage(payload.pagination.page);
      setTotalPages(payload.pagination.totalPages);
      setFailedRequest(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Search results are temporarily unavailable.");
      setFailedRequest({ page: nextPage, append });
      if (!append) setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, [criteria]);

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  return (
    <section className="results-list" aria-labelledby="results-heading" aria-busy={isLoading}>
      <div className="results-heading-row">
        <div>
          <span className="eyebrow">FICTIONAL DEMO INVENTORY</span>
          <h2 id="results-heading">{isLoading && properties.length === 0 ? "Finding sample stays…" : `${total} ${total === 1 ? "stay" : "stays"} to explore`}</h2>
        </div>
        <label className="sort-label">Sort by <select defaultValue="recommended"><option value="recommended">Recommended</option><option value="price">Price</option><option value="rating">Guest rating</option></select></label>
      </div>

      {error ? (
        <div className="empty-results" role="alert">
          <h3>We couldn’t load these stays</h3>
          <p>{error}</p>
          <button type="button" className="button button-outline" onClick={() => failedRequest && void loadPage(failedRequest.page, failedRequest.append)}>Try again</button>
        </div>
      ) : null}

      {properties.map((property) => <PropertyCard key={property.id} property={property} criteria={criteria} />)}

      {!isLoading && !error && properties.length === 0 ? (
        <div className="empty-results" role="status">
          <h3>No sample stays found for {criteria.destination}</h3>
          <p>Try another supported destination. This fictional catalog has no matching properties.</p>
        </div>
      ) : null}

      {isLoading && properties.length === 0 ? <p className="muted" role="status">Loading fictional hotel results…</p> : null}
      {properties.length > 0 ? <Badge>Fictional properties and prices</Badge> : null}
      {properties.length > 0 && page < totalPages ? (
        <button type="button" className="button button-outline" disabled={isLoading} onClick={() => void loadPage(page + 1, true)}>
          {isLoading ? "Loading…" : `Show more stays (${properties.length} of ${total})`}
        </button>
      ) : null}
      <p className="page-disclaimer">All hotels, rates, and availability are synthetic demo data. They do not represent real properties or reservations.</p>
    </section>
  );
}
