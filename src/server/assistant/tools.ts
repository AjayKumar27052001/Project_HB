import "server-only";

import { searchAssistantProperties } from "@/server/repositories/assistant-properties";
import { getAssistantPropertyDetails } from "@/server/repositories/assistant-properties";
import { getMongoPropertyRates, findMongoBookingSelection } from "@/server/repositories/property-rates";
import { getStayNightCount } from "@/server/pricing/rate-quote";
import type { AssistantTurnRequest, CapabilityName, Plan } from "./types";
import type { SearchCriteria } from "@/shared/types";

/**
 * Capability Registry with Schema Awareness
 * Contains the purpose, allowed page scope, input parameter schema,
 * and the exact return structure for each tool.
 */
export const CAPABILITY_REGISTRY: Record<
  CapabilityName,
  {
    name: CapabilityName;
    description: string;
    allowedPages: string[];
    parameters: Record<string, string>;
    returnsStructure: Record<string, string>;
  }
> = {
  homeHelp: {
    name: "homeHelp",
    description: "Provide helpful guidance on how to fill out the hotel search form.",
    allowedPages: ["home"],
    parameters: {
      question: "string (guest query about search fields)",
    },
    returnsStructure: {
      fieldGuidance: "Explanation of valid destinations, date restrictions, adult/room limits",
    },
  },

  searchProperties: {
    name: "searchProperties",
    description: "Search and rank matching hotels across the entire database for the current city search.",
    allowedPages: ["search-results"],
    parameters: {
      criteria: "SearchCriteria { destination, checkIn, checkOut, adults, rooms }",
      filters: "optional filters for amenities or price ordering",
    },
    returnsStructure: {
      totalMatches: "number of matching properties in database",
      matches: "Array of { id, name, summary, rating, startingNightlyRate, amenities[] }",
    },
  },

  getPropertyDetails: {
    name: "getPropertyDetails",
    description: "Fetch comprehensive hotel facts, amenities, check-in/out policies, and cancellation policy specifics.",
    allowedPages: ["search-results", "rate-list"],
    parameters: {
      propertyId: "string (ID of the property)",
      attributes: "Array of string attribute keys (e.g. ['property.amenities', 'policies.cancellation', 'policies.checkIn'])",
    },
    returnsStructure: {
      entities: "Array of { entity: { id, name }, facts: Array<{ attribute, label, value, unit, basis }> }",
      cancellationPolicy: "Detailed cancellation policy rules and deadline hours",
      amenities: "Full list of on-site amenities and services",
    },
  },

  getRoomRates: {
    name: "getRoomRates",
    description: "Fetch available room types, pricing, package inclusions (breakfast, parking), and rate-level terms for a selected hotel.",
    allowedPages: ["rate-list"],
    parameters: {
      propertyId: "string (selected hotel ID)",
      checkIn: "YYYY-MM-DD",
      checkOut: "YYYY-MM-DD",
      adults: "number",
      rooms: "number",
    },
    returnsStructure: {
      propertyName: "string",
      nights: "number of nights",
      rooms: "Array of { id, name, description, maxAdults, rates: Array<{ id, name, refundable, nightlyRate, stayTotal, includes: string[], cancellationSummary, paymentSummary }> }",
    },
  },

  getCheckoutSummary: {
    name: "getCheckoutSummary",
    description: "Fetch verified price calculation, taxes, fees, and booking conditions for the selected stay.",
    allowedPages: ["checkout"],
    parameters: {
      propertyId: "string",
      roomId: "string",
      rateId: "string",
      criteria: "SearchCriteria",
    },
    returnsStructure: {
      property: "{ id, name, address }",
      room: "{ id, name }",
      rate: "{ id, name, refundable }",
      price: "{ subtotal, taxesAndFees, total, currency, nights }",
      policies: "{ cancellationSummary, paymentSummary }",
    },
  },
};

/**
 * Returns formatted tool descriptions and response structures for the LLM prompt.
 */
export function getToolsPromptDescription(page: string): string {
  const allowed = Object.values(CAPABILITY_REGISTRY).filter((c) => c.allowedPages.includes(page));

  let output = `AVAILABLE CAPABILITIES AND THEIR RETURN STRUCTURES FOR PAGE '${page}':\n\n`;
  for (const cap of allowed) {
    output += `### Tool: ${cap.name}\n`;
    output += `Description: ${cap.description}\n`;
    output += `Parameters: ${JSON.stringify(cap.parameters, null, 2)}\n`;
    output += `Response Structure (What this tool returns):\n${JSON.stringify(cap.returnsStructure, null, 2)}\n\n`;
  }
  return output;
}

/**
 * Validates that the requested plan matches current page scope and context.
 */
export function validatePlan(plan: Plan, request: AssistantTurnRequest): Plan {
  const capability = CAPABILITY_REGISTRY[plan.capability];
  if (!capability || !capability.allowedPages.includes(request.page)) {
    throw new Error(`The capability '${plan.capability}' is outside this page's (${request.page}) scope.`);
  }

  if (plan.capability === "homeHelp") {
    return plan;
  }

  if (plan.capability === "searchProperties") {
    const criteria = request.pageContext.searchCriteria;
    if (!criteria || !criteria.destination) {
      throw new Error("Search criteria with destination are required for property search.");
    }
    return {
      ...plan,
      arguments: {
        criteria,
        filters: Array.isArray(plan.arguments.filters) ? plan.arguments.filters : [],
        pageSize: 10,
      },
    };
  }

  if (plan.capability === "getPropertyDetails") {
    const propertyId = request.pageContext.propertyId || plan.arguments.propertyId;
    if (typeof propertyId !== "string" || !propertyId) {
      throw new Error("A valid property ID is required to fetch property details.");
    }
    return {
      ...plan,
      arguments: {
        propertyId,
        attributes: Array.isArray(plan.arguments.attributes) && plan.arguments.attributes.length > 0
          ? plan.arguments.attributes
          : ["property.amenities", "policies.checkIn", "policies.checkOut", "policies.cancellation"],
      },
    };
  }

  if (plan.capability === "getRoomRates") {
    const propertyId = request.pageContext.propertyId || plan.arguments.propertyId;
    const criteria = request.pageContext.searchCriteria;
    if (typeof propertyId !== "string" || !propertyId) {
      throw new Error("The propertyId is required to fetch room rates.");
    }
    if (!criteria || !criteria.checkIn || !criteria.checkOut) {
      throw new Error("Stay criteria (checkIn, checkOut) are required to fetch room rates.");
    }
    return {
      ...plan,
      arguments: {
        propertyId,
        criteria,
      },
    };
  }

  if (plan.capability === "getCheckoutSummary") {
    const { propertyId, roomId, rateId, searchCriteria } = request.pageContext;
    if (!propertyId || !roomId || !rateId || !searchCriteria) {
      throw new Error("Complete checkout selection (propertyId, roomId, rateId, criteria) is required.");
    }
    return {
      ...plan,
      arguments: {
        propertyId,
        roomId,
        rateId,
        criteria: searchCriteria,
      },
    };
  }

  return plan;
}

/**
 * Direct In-Memory Tool Execution
 * Invokes existing repositories without any HTTP network loopback.
 */
export async function executeCapability(plan: Plan, request: AssistantTurnRequest): Promise<unknown> {
  const { capability, arguments: args } = plan;

  switch (capability) {
    case "homeHelp": {
      return {
        status: "complete",
        data: {
          visibleFields: request.pageContext.visibleSearchFields ?? ["Destination", "Check-in", "Check-out", "Adults", "Rooms"],
          limits: request.pageContext.searchLimits ?? { adults: "1 to 8", rooms: "1 to 5" },
        },
      };
    }

    case "searchProperties": {
      const criteria = args.criteria as SearchCriteria;
      const filters = Array.isArray(args.filters) ? args.filters : [];
      const result = await searchAssistantProperties({
        criteria,
        filters,
        sort: null,
        cursor: typeof args.cursor === "string" ? args.cursor : null,
        pageSize: 10,
      });

      return {
        status: "complete",
        data: result,
      };
    }

    case "getPropertyDetails": {
      const propertyId = String(args.propertyId);
      const attributes = Array.isArray(args.attributes) ? (args.attributes as string[]) : [];
      const criteria = request.pageContext.searchCriteria ?? {
        destination: "New York",
        checkIn: "2026-12-01",
        checkOut: "2026-12-04",
        adults: 2,
        rooms: 1,
      };

      const result = await getAssistantPropertyDetails(
        request.page === "search-results" ? "search-results" : "rate-list",
        [propertyId],
        criteria,
        attributes,
      );

      return {
        status: result.status,
        data: result,
      };
    }

    case "getRoomRates": {
      const propertyId = String(args.propertyId);
      const criteria = args.criteria as SearchCriteria;
      const result = await getMongoPropertyRates(propertyId, {
        checkIn: criteria.checkIn,
        checkOut: criteria.checkOut,
        adults: criteria.adults,
        rooms: criteria.rooms,
      });

      if (!result) {
        return {
          status: "not_found",
          data: { error: `Property ${propertyId} not found` },
        };
      }

      return {
        status: "complete",
        data: result,
      };
    }

    case "getCheckoutSummary": {
      const propertyId = String(args.propertyId);
      const roomId = String(args.roomId);
      const rateId = String(args.rateId);
      const criteria = args.criteria as SearchCriteria;

      const selection = await findMongoBookingSelection(propertyId, roomId, rateId, {
        checkIn: criteria.checkIn,
        checkOut: criteria.checkOut,
        adults: criteria.adults,
        rooms: criteria.rooms,
      });

      if (!selection) {
        return {
          status: "not_found",
          data: { error: "Selection not found" },
        };
      }

      const nights = getStayNightCount(criteria.checkIn, criteria.checkOut);
      return {
        status: "complete",
        data: {
          property: selection.property,
          room: { id: selection.room.id, name: selection.room.name },
          rate: {
            id: selection.rate.id,
            name: selection.rate.name,
            subtotal: selection.rate.subtotal,
            taxesAndFees: selection.rate.taxesAndFees,
            total: selection.rate.total,
            cancellationSummary: selection.rate.cancellationSummary,
            cancellationDeadline: selection.rate.cancellationDeadline,
            paymentSummary: selection.rate.paymentSummary,
          },
          nights,
        },
      };
    }

    default:
      throw new Error(`Unknown capability: ${capability}`);
  }
}
