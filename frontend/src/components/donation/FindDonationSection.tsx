import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search,
  Navigation,
  Building2,
  Activity,
  Calendar,
  Users,
  Globe2,
  Clock,
  Phone,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Heart,
  X,
  SlidersHorizontal,
  Info,
  Sparkles,
} from "lucide-react";

export type FacilityType =
  | "BLOOD_CENTER"
  | "HOSPITAL"
  | "UPCOMING_CAMP"
  | "COMMUNITY"
  | "NGO";

export interface DonationCenter {
  id: string;
  name: string;
  type: FacilityType;
  typeLabel: string;
  distanceKm: number;
  address: string;
  city: string;
  hours: string;
  campDate?: string;
  contact: string;
  neededGroups: string[];
  isVerified: boolean;
  notes: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

const MOCK_DONATION_CENTERS: DonationCenter[] = [
  {
    id: "dc-1",
    name: "PSG Hospitals Blood Bank",
    type: "HOSPITAL",
    typeLabel: "Hospital Blood Bank",
    distanceKm: 1.4,
    address: "Avinashi Road, Peelamedu, Coimbatore - 641004",
    city: "Coimbatore",
    hours: "Open 24/7 (Emergency & Routine)",
    contact: "+91 422 434 5353",
    neededGroups: ["O-", "B+", "A-", "Platelets (SDP)"],
    isVerified: true,
    notes:
      "Walk-in donors warmly welcomed. Full in-house donor lounge, hemoglobin testing, and post-donation refreshments.",
    badgeColor: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
  },
  {
    id: "dc-2",
    name: "PSG Tech Youth Red Cross Blood Drive",
    type: "UPCOMING_CAMP",
    typeLabel: "Upcoming Camp",
    distanceKm: 1.8,
    address: "Auditorium Hall, PSG College of Technology, Peelamedu",
    city: "Coimbatore",
    hours: "9:00 AM - 3:30 PM",
    campDate: "Saturday, Oct 24, 2026",
    contact: "+91 98422 10101",
    neededGroups: ["All Groups", "O+", "A+", "B+", "O-"],
    isVerified: true,
    notes:
      "Joint initiative with Coimbatore Govt. Blood Center. Donor certificates and donor pin awarded upon completion.",
    badgeColor: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
    },
  },
  {
    id: "dc-3",
    name: "Coimbatore Medical College Hospital (CMCH) Blood Center",
    type: "BLOOD_CENTER",
    typeLabel: "Govt. Blood Center",
    distanceKm: 2.8,
    address: "Trichy Road, Gopalapuram, Town Hall, Coimbatore - 641018",
    city: "Coimbatore",
    hours: "8:00 AM - 8:00 PM (Daily)",
    contact: "+91 422 230 1393",
    neededGroups: ["O-", "A-", "B-", "AB-", "O+"],
    isVerified: true,
    notes:
      "Regional referral blood center equipped with advanced component separation and apheresis units.",
    badgeColor: {
      bg: "bg-rose-50",
      text: "text-[#B71C1C]",
      border: "border-rose-200",
    },
  },
  {
    id: "dc-4",
    name: "G. Kuppuswamy Naidu Memorial (GKNM) Hospital Blood Bank",
    type: "HOSPITAL",
    typeLabel: "Hospital Blood Bank",
    distanceKm: 3.2,
    address: "Netaji Road, Pappanaickenpalayam, Coimbatore - 641037",
    city: "Coimbatore",
    hours: "8:30 AM - 6:30 PM (Mon-Sat)",
    contact: "+91 422 432 2222",
    neededGroups: ["A+", "B+", "O+", "Platelets"],
    isVerified: true,
    notes:
      "NABH accredited center. Priority emergency inventory support for pediatric and oncology patients.",
    badgeColor: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
  },
  {
    id: "dc-5",
    name: "Rotary Central Blood Bank & Research Foundation",
    type: "NGO",
    typeLabel: "NGO Blood Bank",
    distanceKm: 4.5,
    address: "Cross Cut Road, Gandhipuram, Coimbatore - 641012",
    city: "Coimbatore",
    hours: "8:00 AM - 7:30 PM (Daily)",
    contact: "+91 422 223 4567",
    neededGroups: ["O-", "B-", "A-", "AB-"],
    isVerified: true,
    notes:
      "Community blood bank coordinating voluntary mobile vans and emergency regional distributions.",
    badgeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
    },
  },
  {
    id: "dc-6",
    name: "TIDEL Park IT Corporate Donation Drive",
    type: "UPCOMING_CAMP",
    typeLabel: "Upcoming Camp",
    distanceKm: 5.1,
    address: "Ground Floor Atrium, TIDEL Park, Aerodrome Post, Coimbatore",
    city: "Coimbatore",
    hours: "10:00 AM - 4:00 PM",
    campDate: "Friday, Nov 06, 2026",
    contact: "+91 99401 23456",
    neededGroups: ["O+", "B+", "A+", "O-"],
    isVerified: true,
    notes:
      "Organized by Tech Park Welfare Committee with certified phlebotomy medical crew. Fast-track registration available.",
    badgeColor: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
    },
  },
  {
    id: "dc-7",
    name: "Lions Voluntary Blood Bank & Apheresis Centre",
    type: "BLOOD_CENTER",
    typeLabel: "Charitable Blood Center",
    distanceKm: 6.2,
    address: "D.B. Road, R.S. Puram West, Coimbatore - 641002",
    city: "Coimbatore",
    hours: "8:00 AM - 8:00 PM",
    contact: "+91 422 254 7890",
    neededGroups: ["B+", "AB+", "O-", "Platelets (SDP)"],
    isVerified: true,
    notes:
      "Equipped with specialized Single Donor Platelet (SDP) harvest machines for urgent dengue and cancer requirements.",
    badgeColor: {
      bg: "bg-rose-50",
      text: "text-[#B71C1C]",
      border: "border-rose-200",
    },
  },
  {
    id: "dc-8",
    name: "Kovaipudur Residents Community Donor Guild",
    type: "COMMUNITY",
    typeLabel: "Community Guild",
    distanceKm: 8.6,
    address: "Community Center, 5th Block, Kovaipudur, Coimbatore",
    city: "Coimbatore",
    hours: "Weekend On-Call & Scheduled Drives",
    campDate: "Every 2nd & 4th Sunday",
    contact: "+91 94433 77889",
    neededGroups: ["Active Roster for South Coimbatore Area"],
    isVerified: true,
    notes:
      "Volunteer neighborhood guild matching local registered residents to nearby hospitals during emergency hours.",
    badgeColor: {
      bg: "bg-purple-50",
      text: "text-purple-800",
      border: "border-purple-200",
    },
  },
];

const CATEGORY_TABS: { id: string; label: string; type?: FacilityType }[] = [
  { id: "ALL", label: "All Places" },
  { id: "BLOOD_CENTER", label: "Blood Centers", type: "BLOOD_CENTER" },
  { id: "HOSPITAL", label: "Hospitals", type: "HOSPITAL" },
  { id: "UPCOMING_CAMP", label: "Upcoming Camps", type: "UPCOMING_CAMP" },
  { id: "COMMUNITY", label: "Communities & Colleges", type: "COMMUNITY" },
  { id: "NGO", label: "NGOs", type: "NGO" },
];

export function FindDonationSection() {
  const [searchLocation, setSearchLocation] = useState("Coimbatore");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("ALL");
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<DonationCenter | null>(null);

  // Handle "Use My Location"
  const handleUseMyLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setSearchLocation("Gandhipuram, Coimbatore");
          setIsLocating(false);
        },
        () => {
          // Fallback if permission denied
          setSearchLocation("Gandhipuram, Coimbatore");
          setIsLocating(false);
        },
        { timeout: 3000 }
      );
    } else {
      setSearchLocation("Gandhipuram, Coimbatore");
      setIsLocating(false);
    }
  };

  // Filter and Sort results by distance
  const filteredResults = useMemo(() => {
    return MOCK_DONATION_CENTERS.filter((item) => {
      // 1. Search Query Match (Location / Name / Address / City)
      const query = searchLocation.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.address.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query);

      // 2. Category Tab Match
      const matchesCategory =
        selectedCategory === "ALL" || item.type === selectedCategory;

      // 3. Blood Group Filter Match
      const matchesBloodGroup =
        selectedBloodGroup === "ALL" ||
        item.neededGroups.some(
          (g) =>
            g.toLowerCase().includes(selectedBloodGroup.toLowerCase()) ||
            g.toLowerCase().includes("all")
        );

      // 4. Distance Filter Match
      const matchesDistance = item.distanceKm <= maxDistance;

      return matchesSearch && matchesCategory && matchesBloodGroup && matchesDistance;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [searchLocation, selectedCategory, selectedBloodGroup, maxDistance]);

  const handleGetDirections = (center: DonationCenter) => {
    const mapsQuery = encodeURIComponent(`${center.name}, ${center.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`, "_blank");
  };

  return (
    <section
      id="find-donate"
      className="relative py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto bg-[#FAF8F7] text-[#1A1A1A]"
    >
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B71C1C]/10 border border-[#B71C1C]/20 text-[#B71C1C] text-xs font-bold uppercase tracking-widest">
          <Heart className="w-3.5 h-3.5 fill-[#B71C1C]" />
          WANT TO DONATE BLOOD?
        </div>

        <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111] leading-tight">
          Find a donation center or <br />
          <span className="text-[#B71C1C]">community near you.</span>
        </h2>

        <p className="text-base sm:text-lg text-[#555555] max-w-2xl mx-auto leading-relaxed">
          Enter your location to discover verified hospital blood banks, accredited blood centers,
          upcoming campus drives, and local community donor guilds.
        </p>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Location Search Input */}
          <div className="md:col-span-6 relative">
            <label className="block text-2xs font-bold uppercase tracking-wider text-[#666666] mb-1.5">
              Enter Location / City / Area
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3.5 w-5 h-5 text-[#B71C1C]" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="e.g. Coimbatore, Peelamedu, Gandhipuram..."
                className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-[#FAF8F7] border border-black/10 text-sm font-semibold text-[#111111] placeholder:text-[#888888] focus:outline-none focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 transition-all"
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="absolute right-2 px-3 py-1.5 rounded-xl bg-white border border-black/10 text-xs font-bold text-[#444444] hover:text-[#B71C1C] hover:border-[#B71C1C]/40 shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-[#B71C1C]" : ""}`} />
                <span className="hidden sm:inline">Near me</span>
              </button>
            </div>
          </div>

          {/* Blood Group Filter */}
          <div className="md:col-span-3">
            <label className="block text-2xs font-bold uppercase tracking-wider text-[#666666] mb-1.5">
              Blood Group (Optional)
            </label>
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-[#FAF8F7] border border-black/10 text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 transition-all cursor-pointer"
            >
              <option value="ALL">All Blood Types</option>
              <option value="O+">O Positive (O+)</option>
              <option value="O-">O Negative (O-)</option>
              <option value="A+">A Positive (A+)</option>
              <option value="A-">A Negative (A-)</option>
              <option value="B+">B Positive (B+)</option>
              <option value="B-">B Negative (B-)</option>
              <option value="AB+">AB Positive (AB+)</option>
              <option value="AB-">AB Negative (AB-)</option>
              <option value="Platelets">Platelets / SDP</option>
            </select>
          </div>

          {/* Max Distance Filter */}
          <div className="md:col-span-3">
            <label className="block text-2xs font-bold uppercase tracking-wider text-[#666666] mb-1.5">
              Distance Radius
            </label>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full px-4 py-3.5 rounded-2xl bg-[#FAF8F7] border border-black/10 text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#B71C1C] focus:ring-2 focus:ring-[#B71C1C]/20 transition-all cursor-pointer"
            >
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
            </select>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="pt-2 border-t border-black/5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#666666] mr-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter by:
          </span>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === tab.id
                  ? "bg-[#1A1A1A] text-white shadow-xs"
                  : "bg-[#FAF8F7] border border-black/5 text-[#555555] hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Header & Count ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-black text-[#111111]">
            {filteredResults.length} Verified {filteredResults.length === 1 ? "Place" : "Places"} Found
          </span>
          <span className="text-xs font-bold text-[#777777]">
            (Sorted by nearest distance)
          </span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-2xs font-semibold">
          <Sparkles className="w-3 h-3 text-[#B71C1C]" />
          Demo prototype data
        </div>
      </div>

      {/* ── Results Grid ──────────────────────────────────────────────── */}
      {filteredResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((center) => (
            <motion.div
              key={center.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-3xl p-6 border border-black/5 shadow-2xs hover:shadow-lg hover:border-[#B71C1C]/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3.5">
                {/* Top Badge & Distance */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${center.badgeColor.bg} ${center.badgeColor.text} ${center.badgeColor.border}`}
                  >
                    {center.typeLabel}
                  </span>

                  <div className="flex items-center gap-1 text-xs font-bold text-[#B71C1C] bg-red-50 px-2.5 py-1 rounded-full">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{center.distanceKm} km</span>
                  </div>
                </div>

                {/* Facility Name */}
                <h3 className="font-display text-lg font-bold text-[#111111] leading-snug group-hover:text-[#B71C1C] transition-colors">
                  {center.name}
                </h3>

                {/* Address */}
                <p className="text-xs text-[#555555] flex items-start gap-2 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                  <span>{center.address}</span>
                </p>

                {/* Timings or Camp Date */}
                {center.campDate ? (
                  <div className="text-xs font-semibold text-amber-900 bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200/60 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Camp: {center.campDate}</span>
                  </div>
                ) : (
                  <div className="text-xs text-[#555555] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{center.hours}</span>
                  </div>
                )}

                {/* Needed Groups Tags */}
                <div className="pt-2 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Actively Seeking
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {center.neededGroups.map((grp, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F7] border border-black/5 text-[#444444]"
                      >
                        {grp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-black/5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCenter(center)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-[#222222] transition-colors"
                >
                  View Details
                </button>

                <button
                  type="button"
                  onClick={() => handleGetDirections(center)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#B71C1C] hover:bg-[#9E1414] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Get Google Maps directions"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Directions</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-black/5 space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-red-50 text-[#B71C1C] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-[#111111]">
            No donation places found
          </h3>
          <p className="text-xs sm:text-sm text-[#666666]">
            Try expanding your distance radius or clearing the blood group filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchLocation("");
              setSelectedCategory("ALL");
              setSelectedBloodGroup("ALL");
              setMaxDistance(50);
            }}
            className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* ── Eligibility & Disclaimer Notice ───────────────────────────── */}
      <div className="mt-12 p-6 rounded-2xl bg-white border border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-[#B71C1C] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#111111]">
              Medical & Donation Eligibility Note
            </div>
            <p className="text-xs text-[#666666]">
              Donation eligibility (age 18–65, weight &ge; 45kg, hemoglobin level, and medical history) is confirmed directly by the participating blood center or medical team.
            </p>
          </div>
        </div>

        <a
          href="tel:108"
          className="shrink-0 px-4 py-2 rounded-xl bg-[#FAF8F7] border border-black/5 text-xs font-bold text-[#333333] hover:text-[#B71C1C] transition-colors flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-[#B71C1C]" />
          <span>Emergency Helpline: 108</span>
        </a>
      </div>

      {/* ── Modal: Center Details Dialog ──────────────────────────────── */}
      <AnimatePresence>
        {selectedCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-black/10 shadow-2xl space-y-6 relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedCenter(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${selectedCenter.badgeColor.bg} ${selectedCenter.badgeColor.text} ${selectedCenter.badgeColor.border}`}
                >
                  {selectedCenter.typeLabel}
                </span>
                <h3 className="font-display text-2xl font-black text-[#111111]">
                  {selectedCenter.name}
                </h3>
                <div className="text-xs font-semibold text-[#B71C1C] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedCenter.distanceKm} km from search location</span>
                </div>
              </div>

              {/* Details List */}
              <div className="bg-[#FAF8F7] rounded-2xl p-4 border border-black/5 space-y-3 text-xs">
                <div>
                  <div className="font-bold text-[#777777] uppercase text-[10px]">Address</div>
                  <div className="font-medium text-[#111111] mt-0.5">{selectedCenter.address}</div>
                </div>

                {selectedCenter.campDate ? (
                  <div>
                    <div className="font-bold text-amber-800 uppercase text-[10px]">Camp Date & Hours</div>
                    <div className="font-bold text-amber-950 mt-0.5">
                      {selectedCenter.campDate} • {selectedCenter.hours}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-[#777777] uppercase text-[10px]">Operating Hours</div>
                    <div className="font-medium text-[#111111] mt-0.5">{selectedCenter.hours}</div>
                  </div>
                )}

                <div>
                  <div className="font-bold text-[#777777] uppercase text-[10px]">Direct Contact Phone</div>
                  <a
                    href={`tel:${selectedCenter.contact}`}
                    className="font-bold text-[#B71C1C] hover:underline mt-0.5 inline-block"
                  >
                    {selectedCenter.contact}
                  </a>
                </div>

                <div>
                  <div className="font-bold text-[#777777] uppercase text-[10px]">Facility Notes</div>
                  <div className="text-[#555555] mt-0.5 leading-relaxed">{selectedCenter.notes}</div>
                </div>
              </div>

              {/* Urgently Needed Groups */}
              <div>
                <div className="text-2xs font-bold uppercase tracking-wider text-[#666666] mb-2">
                  Urgent & Priority Blood Group Needs
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCenter.neededGroups.map((grp, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-[#B71C1C] text-xs font-bold"
                    >
                      {grp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={`tel:${selectedCenter.contact}`}
                  className="flex-1 py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-[#111111] text-center transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-[#B71C1C]" />
                  Call Facility
                </a>

                <button
                  type="button"
                  onClick={() => handleGetDirections(selectedCenter)}
                  className="flex-1 py-3 rounded-2xl bg-[#B71C1C] hover:bg-[#9E1414] text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default FindDonationSection;
