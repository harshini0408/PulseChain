/**
 * frontend/src/pages/coordinator/PoolsPage.tsx
 *
 * Coordinator Donor Pools Management Console.
 * Displays:
 * 1. Registered pools table: Name, Type, City, Derived Registered Count, Per-Group Breakdown, Last Mobilised.
 * 2. Registration form: Name, Type, City/Lat/Lng, Contact Name, Contact Email, starting group counts per blood group.
 *
 * Constraints:
 * - Reuses PageHeader, Card, Badge, EmptyState from components/ui/*
 * - Only uses existing Tailwind classes
 * - Derived registered count from groupCounts
 * - Strict client-side validation
 * - Coordinate presets frontend-only
 */

import { useState, useMemo } from "react";
import {
  BLOOD_GROUPS,
  POOL_TYPES,
  type BloodGroup,
  type DonorPool,
  type PoolType,
} from "@pulsechain/shared";
import { usePoolsQuery, useCreatePoolMutation } from "../../api/hooks";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
  useToast,
} from "../../components/ui";
import { formatRelative, pluralise } from "../../lib/format";
import {
  Users,
  MapPin,
  Mail,
  User,
  Plus,
  Building,
  GraduationCap,
  Home,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

/** Frontend-only coordinate presets around Coimbatore corridor */
const PRESETS = [
  { label: "Peelamedu (PSG / Tech)", city: "Coimbatore", lat: 11.025, lng: 76.995 },
  { label: "Gandhipuram (Central)", city: "Coimbatore", lat: 11.018, lng: 76.966 },
  { label: "RS Puram (West)", city: "Coimbatore", lat: 11.008, lng: 76.945 },
  { label: "Saravanampatti (IT North)", city: "Coimbatore", lat: 11.082, lng: 77.001 },
  { label: "Singanallur (East Highway)", city: "Coimbatore", lat: 10.999, lng: 77.026 },
] as const;

const POOL_TYPE_META: Record<PoolType, { label: string; icon: typeof GraduationCap }> = {
  COLLEGE: { label: "College / NSS", icon: GraduationCap },
  RWA: { label: "Residents Association (RWA)", icon: Home },
  CORPORATE: { label: "Corporate CSR", icon: Building },
};

export function PoolsPage() {
  const { data: pools, isLoading, isError, error, refetch } = usePoolsQuery();
  const createMutation = useCreatePoolMutation();
  const { push } = useToast();

  // Form State
  const [name, setName] = useState("");
  const [poolType, setPoolType] = useState<PoolType>("COLLEGE");
  const [city, setCity] = useState("Coimbatore");
  const [latStr, setLatStr] = useState("11.0250");
  const [lngStr, setLngStr] = useState("76.9950");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [counts, setCounts] = useState<Record<BloodGroup, number>>({
    "O-": 0,
    "O+": 0,
    "A-": 0,
    "A+": 0,
    "B-": 0,
    "B+": 0,
    "AB-": 0,
    "AB+": 0,
  });

  // Client validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Derive registered donors strictly from groupCounts
  const derivedRegistered = useMemo(() => {
    return Object.values(counts).reduce((acc, val) => acc + (val > 0 ? val : 0), 0);
  }, [counts]);

  const handlePresetSelect = (preset: (typeof PRESETS)[number]) => {
    setCity(preset.city);
    setLatStr(preset.lat.toFixed(4));
    setLngStr(preset.lng.toFixed(4));
    // Clear coordinate errors if any
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.lat;
      delete next.lng;
      return next;
    });
  };

  const handleCountChange = (group: BloodGroup, valueStr: string) => {
    const parsed = parseInt(valueStr, 10);
    const validCount = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setCounts((prev) => ({
      ...prev,
      [group]: validCount,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Pool name is required";
    if (!contactName.trim()) errs.contactName = "Contact name is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail.trim() || !emailRegex.test(contactEmail.trim())) {
      errs.contactEmail = "A valid contact email is required";
    }

    const lat = parseFloat(latStr);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errs.lat = "Latitude must be between -90 and 90";
    }

    const lng = parseFloat(lngStr);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errs.lng = "Longitude must be between -180 and 180";
    }

    if (derivedRegistered <= 0) {
      errs.counts = "At least one blood group must have registered donors";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const cleanCounts: Partial<Record<BloodGroup, number>> = {};
      for (const bg of BLOOD_GROUPS) {
        if (counts[bg] > 0) cleanCounts[bg] = counts[bg];
      }

      await createMutation.mutateAsync({
        name: name.trim(),
        poolType,
        city: city.trim() || "Coimbatore",
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        groupCounts: cleanCounts,
      });

      push({
        tone: "success",
        title: "Donor pool registered",
        message: `${name.trim()} added with ${pluralise(derivedRegistered, "donor")} across ${Object.keys(cleanCounts).length} blood groups.`,
      });

      // Reset form
      setName("");
      setContactName("");
      setContactEmail("");
      setCounts({
        "O-": 0,
        "O+": 0,
        "A-": 0,
        "A+": 0,
        "B-": 0,
        "B+": 0,
        "AB-": 0,
        "AB+": 0,
      });
      setFormErrors({});
    } catch (err) {
      push({
        tone: "error",
        title: "Could not register donor pool",
        message: err instanceof Error ? err.message : "The server rejected the registration.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingState label="Loading registered donor pools…" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Donor pools did not load"
        message={error instanceof Error ? error.message : "Unable to load donor pools."}
        onRetry={() => void refetch()}
      />
    );
  }

  const registeredPools = pools ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coordinator Operations"
        title="Donor Pools"
        subtitle="Manage community, campus, and corporate donor reserves for hospital shortage escalation"
        actions={
          <Badge variant="accent" className="px-3 py-1 text-xs">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            {pluralise(registeredPools.length, "pool")} registered
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left Column: Pool Registration Form (5 cols) ───────────────── */}
        <div className="lg:col-span-5">
          <Card className="sticky top-6">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-text">Register New Pool</h2>
                <p className="text-xs text-text-muted">
                  Add a verified community cohort with aggregate group counts
                </p>
              </div>
              <Plus className="h-5 w-5 text-accent" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="pool-name" className="mb-1 block text-xs font-semibold text-text">
                  Pool Name *
                </label>
                <input
                  id="pool-name"
                  type="text"
                  placeholder="e.g. PSG College of Technology NSS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder-text-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {formErrors.name && <p className="mt-1 text-2xs text-accent">{formErrors.name}</p>}
              </div>

              {/* Pool Type */}
              <div>
                <label htmlFor="pool-type" className="mb-1 block text-xs font-semibold text-text">
                  Cohort Type *
                </label>
                <select
                  id="pool-type"
                  value={poolType}
                  onChange={(e) => setPoolType(e.target.value as PoolType)}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {POOL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {POOL_TYPE_META[type].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* City & Coordinates with Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text">Location & Presets</label>
                  <span className="text-2xs text-text-muted">Click preset to autofill</span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className="inline-flex items-center rounded-md border border-border bg-surface-sunken px-2 py-1 text-2xs text-text-muted hover:border-accent hover:text-accent"
                    >
                      <MapPin className="mr-1 h-2.5 w-2.5" />
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="pool-city" className="mb-0.5 block text-2xs text-text-muted">
                      City
                    </label>
                    <input
                      id="pool-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="pool-lat" className="mb-0.5 block text-2xs text-text-muted">
                      Latitude
                    </label>
                    <input
                      id="pool-lat"
                      type="text"
                      value={latStr}
                      onChange={(e) => setLatStr(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                    />
                    {formErrors.lat && <p className="mt-0.5 text-3xs text-accent">{formErrors.lat}</p>}
                  </div>
                  <div>
                    <label htmlFor="pool-lng" className="mb-0.5 block text-2xs text-text-muted">
                      Longitude
                    </label>
                    <input
                      id="pool-lng"
                      type="text"
                      value={lngStr}
                      onChange={(e) => setLngStr(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                    />
                    {formErrors.lng && <p className="mt-0.5 text-3xs text-accent">{formErrors.lng}</p>}
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1 block text-xs font-semibold text-text">
                    Contact Coordinator *
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
                    <input
                      id="contact-name"
                      type="text"
                      placeholder="e.g. Dr. R. Sundaram"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-raised py-2 pl-8 pr-2.5 text-xs text-text placeholder-text-subtle focus:border-accent focus:outline-none"
                    />
                  </div>
                  {formErrors.contactName && (
                    <p className="mt-1 text-2xs text-accent">{formErrors.contactName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-1 block text-xs font-semibold text-text">
                    Contact Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="coordinator@domain.invalid"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-raised py-2 pl-8 pr-2.5 text-xs text-text placeholder-text-subtle focus:border-accent focus:outline-none"
                    />
                  </div>
                  {formErrors.contactEmail && (
                    <p className="mt-1 text-2xs text-accent">{formErrors.contactEmail}</p>
                  )}
                </div>
              </div>

              {/* Group Counts Breakdown & Live Derived Counter */}
              <div className="rounded-xl border border-border bg-surface-sunken p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">Donor Counts by Group</span>
                  <Badge variant="accent" className="font-mono text-2xs">
                    Derived Total: {derivedRegistered}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <div key={bg} className="rounded-lg border border-border bg-surface-raised p-1.5 text-center">
                      <span className="block font-display text-2xs font-bold text-accent">{bg}</span>
                      <input
                        type="number"
                        min="0"
                        value={counts[bg]}
                        onChange={(e) => handleCountChange(bg, e.target.value)}
                        className="mt-1 w-full rounded border border-border/80 bg-surface-raised px-1 py-0.5 text-center font-mono text-xs text-text focus:border-accent focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                {formErrors.counts && <p className="mt-2 text-2xs text-accent">{formErrors.counts}</p>}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Registering…" : "Register Donor Pool"}
              </Button>
            </form>
          </Card>
        </div>

        {/* ── Right Column: Registered Pools Table (7 cols) ───────────────── */}
        <div className="lg:col-span-7">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text">Active Donor Pools</h2>
              <p className="text-xs text-text-muted">
                Available for regional emergency ranking when hospital inventory cannot be filled
              </p>
            </div>
            <span className="text-xs font-semibold text-text-muted">
              {pluralise(registeredPools.length, "registered pool")}
            </span>
          </div>

          {registeredPools.length === 0 ? (
            <EmptyState
              title="No donor pools registered"
              message="Register college student bodies, resident associations, or corporate CSR groups to establish regional donor mobilization pools for emergency hospital requisitions."
              icon={<Users className="h-6 w-6" />}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-sunken">
                      <th className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-text-muted first:pl-4">
                        Pool & Contact
                      </th>
                      <th className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-text-muted">
                        Type
                      </th>
                      <th className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-text-muted">
                        City & Geo
                      </th>
                      <th className="px-3 py-2.5 text-center text-2xs font-semibold uppercase tracking-widest text-text-muted">
                        Registered
                      </th>
                      <th className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-text-muted">
                        Group Breakdown
                      </th>
                      <th className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-widest text-text-muted last:pr-4">
                        Last Mobilised
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {registeredPools.map((pool) => {
                      const meta = POOL_TYPE_META[pool.poolType] || POOL_TYPE_META.COLLEGE;
                      const Icon = meta.icon;
                      const activeGroups = BLOOD_GROUPS.filter((bg) => (pool.groupCounts?.[bg] ?? 0) > 0);

                      return (
                        <tr key={pool.poolId} className="hover:bg-surface-sunken/40 transition-colors">
                          {/* Name & Contact */}
                          <td className="px-3 py-3 first:pl-4">
                            <div className="font-semibold text-sm text-text leading-snug">{pool.name}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-text-muted">
                              <span>{pool.contactName}</span>
                              <span>•</span>
                              <a
                                href={`mailto:${pool.contactEmail}`}
                                className="text-accent hover:underline"
                              >
                                {pool.contactEmail}
                              </a>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="inline-flex items-center gap-1 py-0.5 text-2xs">
                              <Icon className="h-3 w-3 text-accent" />
                              <span>{meta.label.split(" ")[0]}</span>
                            </Badge>
                          </td>

                          {/* City & Coordinates */}
                          <td className="px-3 py-3">
                            <div className="text-xs font-medium text-text">{pool.city || "Coimbatore"}</div>
                            <div className="text-3xs text-text-subtle font-mono">
                              {pool.lat.toFixed(4)}, {pool.lng.toFixed(4)}
                            </div>
                          </td>

                          {/* Derived Registered Donors */}
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block rounded-md bg-surface-overlay px-2 py-1 font-mono text-xs font-bold text-text">
                              {pool.registered}
                            </span>
                          </td>

                          {/* Per-Group Breakdown */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {activeGroups.length === 0 ? (
                                <span className="text-3xs text-text-muted">No counts</span>
                              ) : (
                                activeGroups.map((bg) => (
                                  <span
                                    key={bg}
                                    className="inline-flex items-center rounded border border-border/80 bg-surface-sunken px-1.5 py-0.5 text-3xs font-mono text-text-muted"
                                  >
                                    <strong className="text-accent font-semibold mr-1">{bg}</strong>
                                    {pool.groupCounts?.[bg]}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Last Mobilised */}
                          <td className="px-3 py-3 text-right last:pr-4">
                            {pool.lastMobilisedAt ? (
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="accent" className="text-3xs">
                                  <Clock className="mr-1 h-2.5 w-2.5" />
                                  {formatRelative(pool.lastMobilisedAt)}
                                </Badge>
                                {pool.lastMobilisationStatus ? (
                                  <StatusPill
                                    kind="mobilisation"
                                    value={pool.lastMobilisationStatus}
                                    size="sm"
                                    withDot
                                  />
                                ) : null}
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-3xs text-text-subtle">
                                <CheckCircle2 className="mr-1 h-3 w-3 text-text-subtle" />
                                Never mobilised
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
