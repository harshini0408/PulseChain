import React, { useMemo } from "react";
import { Building, MapPin, Users, Compass } from "lucide-react";

interface RadarNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  memberCount?: number;
  type?: string;
  highlighted?: boolean;
}

interface CommunityRadarMapProps {
  center?: { name: string; lat: number; lng: number };
  communities: RadarNode[];
  maxRangeKm?: number;
  onSelectCommunity?: (community: RadarNode) => void;
  selectedCommunityId?: string;
}

// Convert lat/lng delta to km (equirectangular projection around corridor)
function getKmOffset(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number
): { dx: number; dy: number; distKm: number } {
  const rad = Math.PI / 180;
  const avgLat = ((lat + centerLat) / 2) * rad;
  const dx = (lng - centerLng) * 111.32 * Math.cos(avgLat);
  const dy = (lat - centerLat) * 110.574;
  const distKm = Math.sqrt(dx * dx + dy * dy);
  return { dx, dy, distKm };
}

export const CommunityRadarMap: React.FC<CommunityRadarMapProps> = ({
  center = { name: "Coimbatore Medical College Hospital", lat: 11.0028, lng: 76.9806 },
  communities,
  maxRangeKm = 30,
  onSelectCommunity,
  selectedCommunityId,
}) => {
  const size = 380;
  const radius = size / 2;
  const padding = 36;
  const usableRadius = radius - padding;

  // Concentric radar rings (e.g., 5km, 15km, 30km)
  const rings = [
    { km: Math.round(maxRangeKm * 0.25), label: `${Math.round(maxRangeKm * 0.25)} km` },
    { km: Math.round(maxRangeKm * 0.5), label: `${Math.round(maxRangeKm * 0.5)} km` },
    { km: maxRangeKm, label: `${maxRangeKm} km` },
  ];

  const projectedNodes = useMemo(() => {
    return communities.map((comm) => {
      const { dx, dy, distKm } = getKmOffset(comm.lat, comm.lng, center.lat, center.lng);
      // Scale to SVG coordinates: center is (radius, radius)
      // Note: in SVG, y goes down, so north (dy > 0) is y < radius
      const scale = usableRadius / maxRangeKm;
      const clampedDist = Math.min(distKm, maxRangeKm * 1.05);
      const angle = Math.atan2(-dy, dx);
      const r = (clampedDist / maxRangeKm) * usableRadius;
      const cx = radius + r * Math.cos(angle);
      const cy = radius + r * Math.sin(angle);

      return {
        ...comm,
        distKm: Math.round(distKm * 10) / 10,
        cx,
        cy,
      };
    });
  }, [communities, center, maxRangeKm, radius, usableRadius]);

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-4 shadow-xl overflow-hidden">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between text-xs text-text-muted mb-2 px-1">
        <div className="flex items-center gap-1.5 font-medium text-text">
          <Compass className="h-4 w-4 text-accent animate-pulse" />
          <span>Tier-3 Community Radar Network</span>
        </div>
        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] border border-border">
          {communities.length} Active Corridors
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="select-none transition-transform"
        >
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.15" />
              <stop offset="60%" stopColor="hsl(var(--accent))" stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background Ambient Glow */}
          <circle cx={radius} cy={radius} r={usableRadius} fill="url(#radarGlow)" />

          {/* Radar Ring Grids */}
          {rings.map((ring, idx) => {
            const r = (ring.km / maxRangeKm) * usableRadius;
            return (
              <g key={idx}>
                <circle
                  cx={radius}
                  cy={radius}
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  className="text-border/60"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={radius + 4}
                  y={radius - r + 12}
                  className="fill-text-muted/60 text-[9px] font-mono select-none"
                >
                  {ring.label}
                </text>
              </g>
            );
          })}

          {/* Crosshair Lines */}
          <line
            x1={padding}
            y1={radius}
            x2={size - padding}
            y2={radius}
            stroke="currentColor"
            className="text-border/30"
            strokeWidth="1"
          />
          <line
            x1={radius}
            y1={padding}
            x2={radius}
            y2={size - padding}
            stroke="currentColor"
            className="text-border/30"
            strokeWidth="1"
          />

          {/* Center Hub (Requesting Hospital / CMCH Node) */}
          <g transform={`translate(${radius}, ${radius})`}>
            <circle r="14" fill="hsl(var(--accent))" fillOpacity="0.2" className="animate-ping" />
            <circle r="8" fill="hsl(var(--accent))" />
            <circle r="3" fill="#ffffff" />
          </g>

          {/* Community Nodes */}
          {projectedNodes.map((node) => {
            const isSelected = selectedCommunityId === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.cx}, ${node.cy})`}
                className="cursor-pointer group"
                onClick={() => onSelectCommunity?.(node)}
              >
                {/* Distance Link Line */}
                <line
                  x1={0}
                  y1={0}
                  x2={radius - node.cx}
                  y2={radius - node.cy}
                  stroke="currentColor"
                  strokeWidth={isSelected ? "1.5" : "0.75"}
                  className={isSelected ? "text-accent stroke-accent" : "text-border/40 group-hover:text-accent/60"}
                  strokeDasharray="2 3"
                />

                {/* Outer halo */}
                <circle
                  r={isSelected ? 16 : 12}
                  fill={isSelected ? "hsl(var(--accent))" : "hsl(var(--surface-raised))"}
                  fillOpacity={isSelected ? 0.3 : 0.8}
                  stroke={isSelected ? "hsl(var(--accent))" : "hsl(var(--border))"}
                  strokeWidth={isSelected ? 2 : 1.5}
                  className="transition-all duration-200 group-hover:scale-125"
                />

                {/* Inner pip */}
                <circle
                  r={isSelected ? 5 : 4}
                  fill={isSelected ? "hsl(var(--accent))" : "#3b82f6"}
                  className="transition-transform duration-200"
                />

                {/* Member count pill */}
                {node.memberCount !== undefined && (
                  <g transform="translate(0, -16)">
                    <rect
                      x="-14"
                      y="-8"
                      width="28"
                      height="15"
                      rx="7.5"
                      fill="hsl(var(--surface-raised))"
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      className="shadow-sm"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      className="fill-text text-[9px] font-bold font-mono"
                    >
                      {node.memberCount}
                    </text>
                  </g>
                )}

                {/* Community Name Label */}
                <text
                  x="0"
                  y="22"
                  textAnchor="middle"
                  className="fill-text-muted text-[10px] font-medium group-hover:fill-text group-hover:font-semibold transition-colors pointer-events-none"
                >
                  {node.name.length > 15 ? `${node.name.slice(0, 14)}…` : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Label Pill */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-surface-raised/90 border border-border px-3 py-1 shadow-sm text-[11px] font-medium text-text">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="truncate max-w-[200px]">{center.name}</span>
        </div>
      </div>
    </div>
  );
};
