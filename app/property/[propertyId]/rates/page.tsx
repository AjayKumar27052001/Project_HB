import { PropertyRatesPanel } from "@/components/organisms/property-rates-panel";
import { getDefaultSearchCriteria } from "@/features/booking/data-source";
import { getSafeSearchValue } from "@/features/booking/format";

type PageParams = Promise<{ propertyId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RatesPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const [{ propertyId }, query] = await Promise.all([params, searchParams]);
  const defaults = getDefaultSearchCriteria();
  const destination = getSafeSearchValue(query.destination, defaults.destination);
  const checkIn = getSafeSearchValue(query.checkIn, defaults.checkIn);
  const checkOut = getSafeSearchValue(query.checkOut, defaults.checkOut);
  const adults = Number(getSafeSearchValue(query.adults, String(defaults.adults))) || 1;
  const rooms = Number(getSafeSearchValue(query.rooms, String(defaults.rooms))) || 1;

  return (
    <PropertyRatesPanel
      propertyId={propertyId}
      destination={destination}
      checkIn={checkIn}
      checkOut={checkOut}
      adults={adults}
      rooms={rooms}
    />
  );
}
