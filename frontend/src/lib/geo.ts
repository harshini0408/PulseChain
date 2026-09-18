/**
 * frontend/src/lib/geo.ts
 *
 * Great-circle distance and a locally-flat projection for the corridor map.
 *
 * NOTE: `haversineKm` mirrors seed/src/distances-util.ts. The frontend cannot
 * import from `seed` (it is not a dependency of this workspace), and moving the
 * function into `shared` would mean touching a package this brief puts out of
 * scope. If a third caller ever appears, that is the moment to promote it into
 * shared/src/ and delete both copies.
 */

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Project lat/lng onto the SVG plane, centred on the origin facility.
 *
 * Over a corridor ~60 km across, a locally-flat projection is accurate to well
 * under a pixel, so there is no need for anything heavier. Longitude is scaled
 * by cos(lat) so east–west distances are not stretched, and the y axis is
 * flipped because SVG counts downward while latitude counts north.
 */
export function project(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number,
  pxPerKm: number,
  centre: Point,
): Point {
  const KM_PER_DEG_LAT = 111.0;
  const cosLat = Math.cos((originLat * Math.PI) / 180);

  return {
    x: centre.x + (lng - originLng) * cosLat * KM_PER_DEG_LAT * pxPerKm,
    y: centre.y - (lat - originLat) * KM_PER_DEG_LAT * pxPerKm,
  };
}
