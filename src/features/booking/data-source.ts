import { properties, searchCriteria } from "@/data/hotels";
import type { Property, SearchCriteria } from "@/shared/types";

// The Home inspiration card and initial form values are local demo presentation data.
// Search and Rates pages load their property data through backend APIs.
export function getDefaultSearchCriteria(): SearchCriteria {
  return searchCriteria;
}

export function getFeaturedProperty(): Property {
  return properties[0];
}
