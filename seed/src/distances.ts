import { distanceKey, type Facility } from "@pulsechain/shared";

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export function generateDistanceItems(facilities: Facility[]) {
  const items: any[] = [];

  for (const from of facilities) {
    for (const to of facilities) {
      if (from.facilityId === to.facilityId) continue;

      const distKm = haversineDistance(from.lat, from.lng, to.lat, to.lng);
      const keys = distanceKey(from.facilityId, distKm, to.facilityId);

      items.push({
        ...keys,
        entityType: "DISTANCE",
        fromFacilityId: from.facilityId,
        toFacilityId: to.facilityId,
        distanceKm: distKm,
      });
    }
  }

  return items;
}
