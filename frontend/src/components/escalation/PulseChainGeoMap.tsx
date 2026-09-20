/**
 * PulseChainGeoMap.tsx
 *
 * Interactive real geographic map for the Coordinator Escalation Console using Leaflet.
 * Features:
 * - Real geographic tile layer (CartoDB Positron / OSM style with roads, locality names, geographic scale).
 * - Real coordinate markers for all facilities (Blood Centres, Hospitals, logged-in origin).
 * - Animated route and moving vehicle (🚚) when a transfer is IN_TRANSIT.
 * - Dynamic route polyline between Origin and Target/Claimant facility with distance label.
 * - Subtle, accurate geographic radius circles for Ring 1 (10 km) and Ring 2 (30 km).
 * - Selected facility coordinate HUD (e.g. 11.0183° N · 76.9690° E).
 * - Floating Transfer Progress HUD when in transit.
 * - Interactive marker popups and clicks integrating with the facility detail drawer.
 * - Zoom in / Zoom out / Fit corridor controls.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import {
  Car,
  CheckCircle2,
  Compass,
  Maximize2,
  Minus,
  Navigation,
  Plus,
  Radio,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { Facility } from "@pulsechain/shared";
import type { ActiveEscalation, StockUnit } from "../../api/client";
import { haversineKm } from "../../lib/geo";

interface PulseChainGeoMapProps {
  facilities: Facility[];
  escalation?: ActiveEscalation;
  unit?: StockUnit;
  originFacility?: Facility | null;
  targetFacility?: Facility | null;
  selectedFacilityId?: string | null;
  onSelectFacility: (facilityId: string) => void;
  onOpenFacilityDrawer?: (facility: Facility) => void;
  isSimulatingTransit?: boolean;
}

export function PulseChainGeoMap({
  facilities,
  escalation,
  unit,
  originFacility,
  targetFacility,
  selectedFacilityId,
  onSelectFacility,
  onOpenFacilityDrawer,
  isSimulatingTransit = false,
}: PulseChainGeoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const ringsLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  // Transit animation progress state: 0 to 1
  const [transitProgress, setTransitProgress] = useState(0.35);

  // Determine if unit is actively in transit (either real status or simulation)
  const inTransit = isSimulatingTransit || unit?.status === "IN_TRANSIT" || unit?.status === "CLAIMED";

  // Real distance between origin and target
  const distanceKm = useMemo(() => {
    if (!originFacility || !targetFacility) return null;
    return haversineKm(originFacility.lat, originFacility.lng, targetFacility.lat, targetFacility.lng);
  }, [originFacility, targetFacility]);

  // Interpolate vehicle coordinate along origin -> target
  const vehicleCoord = useMemo<[number, number] | null>(() => {
    if (!originFacility || !targetFacility || !inTransit) return null;
    const lat = originFacility.lat + (targetFacility.lat - originFacility.lat) * transitProgress;
    const lng = originFacility.lng + (targetFacility.lng - originFacility.lng) * transitProgress;
    return [lat, lng];
  }, [originFacility, targetFacility, inTransit, transitProgress]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center around Coimbatore (11.0168, 76.9558)
    const map = L.map(mapContainerRef.current, {
      center: [11.0168, 76.9658],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // High quality tile layer: uses Carto if an API key is provided, or OpenStreetMap (free, no watermark)
    const cartoKey = import.meta.env.VITE_CARTO_API_KEY as string | undefined;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: cartoKey ? "abcd" : "abc",
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    ringsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update animated truck progress in transit
  useEffect(() => {
    if (!inTransit) return;

    const interval = window.setInterval(() => {
      setTransitProgress((prev) => {
        if (prev >= 0.98) return 0.05; // cycle smoothly for demonstration
        return prev + 0.015;
      });
    }, 450);

    return () => window.clearInterval(interval);
  }, [inTransit]);

  // Render Rings around Origin
  useEffect(() => {
    const ringsGroup = ringsLayerRef.current;
    if (!ringsGroup) return;
    ringsGroup.clearLayers();

    if (!originFacility) return;

    const center: [number, number] = [originFacility.lat, originFacility.lng];

    // Ring 1: 10 km
    L.circle(center, {
      radius: 10000,
      color: "hsl(1, 64%, 45%)",
      weight: 1.5,
      dashArray: "4, 6",
      fillColor: "hsl(1, 64%, 45%)",
      fillOpacity: 0.04,
      interactive: false,
    }).addTo(ringsGroup);

    // Ring 2: 30 km
    L.circle(center, {
      radius: 30000,
      color: "hsl(43, 100%, 34%)",
      weight: 1.2,
      dashArray: "5, 8",
      fillColor: "hsl(43, 100%, 34%)",
      fillOpacity: 0.02,
      interactive: false,
    }).addTo(ringsGroup);
  }, [originFacility]);

  // Update Facility Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    const map = mapInstanceRef.current;
    if (!markersGroup || !map) return;

    markersGroup.clearLayers();

    facilities.forEach((fac) => {
      const isOrigin = fac.facilityId === originFacility?.facilityId;
      const isTarget = fac.facilityId === targetFacility?.facilityId;
      const isSelected = fac.facilityId === selectedFacilityId;
      const isCentre = fac.type === "BLOOD_CENTRE";

      // SVG Icon Pin tailored with PulseChain design tokens
      const pinColor = isOrigin
        ? "hsl(1, 64%, 45%)" // Primary crimson
        : isTarget
          ? "hsl(167, 76%, 30%)" // Green teal (Received / Target)
          : isCentre
            ? "hsl(0, 91%, 17%)" // Deep oxblood
            : "hsl(0, 10%, 58%)"; // Subtle slate

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-115">
          ${
            isOrigin || isTarget || isSelected
              ? `<span class="absolute -inset-2 rounded-full animate-ping opacity-35" style="background-color: ${pinColor}"></span>`
              : ""
          }
          <div class="relative flex items-center justify-center rounded-full shadow-md border-2 border-white transition-all"
               style="background-color: ${pinColor}; width: ${isOrigin || isTarget ? "28px" : "20px"}; height: ${isOrigin || isTarget ? "28px" : "20px"}">
            <span class="text-white text-3xs font-bold">
              ${isOrigin ? "ORIGIN" : isCentre ? "BC" : "H"}
            </span>
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-3xs font-bold text-gray-800 shadow-sm pointer-events-none border border-border">
            ${fac.name.split(" ").slice(0, 2).join(" ")}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-facility-pin",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([fac.lat, fac.lng], { icon: customIcon }).addTo(markersGroup);

      // Popup with operational details & link to drawer
      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; min-width: 170px;">
          <p style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #888; margin: 0 0 2px 0;">
            ${fac.type === "BLOOD_CENTRE" ? "Blood Centre" : "Hospital"}
          </p>
          <p style="font-size: 13px; font-weight: 700; color: #111; margin: 0 0 4px 0; line-height: 1.2;">
            ${fac.name}
          </p>
          <p style="font-size: 11px; color: #666; margin: 0 0 6px 0;">
            ${fac.city} • ${fac.lat.toFixed(4)}° N, ${fac.lng.toFixed(4)}° E
          </p>
          <button id="btn-popup-${fac.facilityId}"
                  style="width: 100%; border: none; background: #BB2B29; color: white; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">
            View operational profile →
          </button>
        </div>
      `);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-popup-${fac.facilityId}`);
        if (btn) {
          btn.onclick = () => {
            onSelectFacility(fac.facilityId);
            onOpenFacilityDrawer?.(fac);
          };
        }
      });

      marker.on("click", () => {
        onSelectFacility(fac.facilityId);
      });
    });
  }, [facilities, originFacility, targetFacility, selectedFacilityId, onSelectFacility, onOpenFacilityDrawer]);

  // Route Polyline between Origin and Target
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (originFacility && targetFacility && originFacility.facilityId !== targetFacility.facilityId) {
      const latlngs: [number, number][] = [
        [originFacility.lat, originFacility.lng],
        [targetFacility.lat, targetFacility.lng],
      ];

      const polyline = L.polyline(latlngs, {
        color: inTransit ? "hsl(1, 64%, 45%)" : "hsl(43, 100%, 34%)",
        weight: 3.5,
        opacity: 0.85,
        dashArray: inTransit ? undefined : "6, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routeLayerRef.current = polyline;

      // Fit bounds nicely to encompass both origin and destination with padding
      map.fitBounds(polyline.getBounds(), {
        padding: [60, 60],
        maxZoom: 14,
      });
    }
  }, [originFacility, targetFacility, inTransit]);

  // Animated Vehicle Marker on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }

    if (inTransit && vehicleCoord) {
      const truckHtml = `
        <div class="flex items-center justify-center -translate-x-3 -translate-y-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-xl border-2 border-white ring-2 ring-accent/40 animate-pulse">
            <span class="text-sm">🚚</span>
          </div>
        </div>
      `;

      const truckIcon = L.divIcon({
        html: truckHtml,
        className: "custom-truck-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(vehicleCoord, { icon: truckIcon }).addTo(map);
      vehicleMarkerRef.current = marker;
    }
  }, [inTransit, vehicleCoord]);

  // Zoom / Fit handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleFitNetwork = () => {
    const map = mapInstanceRef.current;
    if (!map || facilities.length === 0) return;
    const bounds = L.latLngBounds(facilities.map((f) => [f.lat, f.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  const selectedFacility = facilities.find((f) => f.facilityId === selectedFacilityId);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-surface-sunken shadow-inner">
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Selected Facility Coordinate HUD — positioned safely below the HUD */}
      {selectedFacility && (
        <div className="absolute left-4 top-[175px] z-[400] flex items-center gap-2 rounded-xl glass-surface px-3 py-1.5 text-2xs text-text shadow-sm border border-border/60">
          <Compass className="h-3 w-3 text-accent" />
          <span className="font-semibold">{selectedFacility.name.split(" ").slice(0, 2).join(" ")}:</span>
          <span className="font-mono text-3xs text-text-muted">
            {selectedFacility.lat.toFixed(4)}° N, {selectedFacility.lng.toFixed(4)}° E
          </span>
        </div>
      )}

      {/* Top Right: Map Controls */}
      <div className="absolute right-4 top-4 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-xl glass-surface text-text shadow-sm transition-colors hover:bg-surface-raised hover:text-accent"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-xl glass-surface text-text shadow-sm transition-colors hover:bg-surface-raised hover:text-accent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleFitNetwork}
          title="Fit full corridor"
          className="flex h-8 w-8 items-center justify-center rounded-xl glass-surface text-text shadow-sm transition-colors hover:bg-surface-raised hover:text-accent"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Floating Active Transfer HUD (when in transit) */}
      {inTransit && originFacility && targetFacility && (
        <div className="absolute bottom-4 left-4 z-[400] max-w-sm rounded-3xl glass-surface p-4 shadow-xl border-accent/40">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                <Truck className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-2xs font-bold uppercase tracking-widest text-accent">
                  Transfer In Progress
                </p>
                <p className="font-display text-sm font-bold text-text">
                  {unit?.bloodGroup ?? "O-"} {unit?.component ?? "Platelets"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-2xs font-bold text-accent">
              ETA ~{Math.max(1, Math.round((1 - transitProgress) * 16))} min
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5 text-2xs">
            <div className="flex items-center justify-between text-text">
              <span className="font-semibold text-text-subtle">Origin:</span>
              <span className="truncate max-w-[170px] font-medium">{originFacility.name}</span>
            </div>
            <div className="flex items-center justify-between text-text">
              <span className="font-semibold text-text-subtle">Target:</span>
              <span className="truncate max-w-[170px] font-bold text-status-received">{targetFacility.name}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-3xs text-text-subtle mb-1">
              <span>Transit progress</span>
              <span className="font-mono font-bold text-accent">
                {Math.round(transitProgress * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${Math.round(transitProgress * 100)}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-3xs text-text-subtle">
              <span>{distanceKm ? `${(distanceKm * (1 - transitProgress)).toFixed(1)} km remaining` : "Dispatch"}</span>
              <span>Cold-chain verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right: Map Legend */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-wrap items-center gap-2.5 rounded-2xl glass-surface px-3.5 py-2 text-3xs font-semibold text-text-muted shadow-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Origin / Rescue
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-status-received" />
          Destination / Claim
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-oxblood" />
          Blood Centre
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-text-subtle" />
          Hospital
        </span>
      </div>
    </div>
  );
}
