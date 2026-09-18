import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Compass,
  ArrowRight,
} from "lucide-react";
import { api } from "../../api/client";
import { BLOOD_GROUPS, type BloodGroup, type ContactVia } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";

const CORRIDOR_CITIES = [
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Tiruppur", lat: 11.1085, lng: 77.3411 },
  { name: "Erode", lat: 11.341, lng: 77.7172 },
  { name: "Pollachi", lat: 10.6609, lng: 77.0048 },
  { name: "Salem", lat: 11.6643, lng: 78.146 },
];

export function DonorRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginAs } = useAuth();

  const initialCode = searchParams.get("code") || "";

  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCity, setSelectedCity] = useState("Coimbatore");
  const [lat, setLat] = useState(11.0168);
  const [lng, setLng] = useState(76.9558);
  const [locating, setLocating] = useState(false);
  const [contactVia, setContactVia] = useState<ContactVia>("COORDINATOR");
  const [communityCode, setCommunityCode] = useState(initialCode);
  const [hadPreviousDonation, setHadPreviousDonation] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError("Could not detect location. Using corridor default.");
      },
      { timeout: 5000 }
    );
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    const found = CORRIDOR_CITIES.find((c) => c.name === cityName);
    if (found) {
      setLat(found.lat);
      setLng(found.lng);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!bloodGroup) {
      setError("Please select your blood group");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your contact phone number");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        bloodGroup: bloodGroup as BloodGroup,
        lat,
        lng,
        city: selectedCity,
        contactVia,
        phone: phone.trim(),
        email: email.trim() || undefined,
        communityId: communityCode.trim() ? communityCode.trim() : undefined,
        lastDonationAt: hadPreviousDonation && lastDonationDate ? new Date(lastDonationDate).toISOString() : undefined,
      };

      const result = await api.registerDonor(payload);
      const donor = result.donor;

      // Save donor ID locally for instant login
      localStorage.setItem("pulsechain_donor_id", donor.donorId);
      localStorage.setItem("pulsechain_donor_name", donor.name);
      localStorage.setItem("pulsechain_donor_group", donor.bloodGroup);

      // Automatically switch demo role to DONOR for smooth onboarding
      await loginAs("DONOR");

      navigate("/donor/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to register donor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20">
            <Heart className="h-6 w-6 text-accent fill-accent/30" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Join the Donor Registry
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Fast, zero-health-data sign up. You will only be alerted when hospital stocks in your corridor are exhausted.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Blood Group Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Select Blood Group <span className="text-accent">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bg)}
                  className={`h-11 rounded-xl font-bold text-sm transition-all border ${
                    bloodGroup === bg
                      ? "bg-accent text-white border-accent shadow-md shadow-accent/20 scale-105"
                      : "bg-surface-raised text-text border-border hover:border-text-muted/60"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Full Name <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vignesh Sundaram"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Phone Number <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                <input
                  type="email"
                  placeholder="name@corridor.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
          </div>

          {/* Location & City */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Corridor Hub
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                <Compass className={`h-3 w-3 ${locating ? "animate-spin" : ""}`} />
                {locating ? "Detecting..." : "Detect exact GPS"}
              </button>
            </div>
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {CORRIDOR_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} (Corridor)
                </option>
              ))}
            </select>
          </div>

          {/* Privacy & Contact Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Contact Preference
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "COORDINATOR", label: "Coordinator", desc: "Most Private" },
                { id: "DIRECT", label: "Direct Call", desc: "Urgent Reach" },
                { id: "WHATSAPP", label: "WhatsApp", desc: "Text Only" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setContactVia(opt.id as ContactVia)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    contactVia === opt.id
                      ? "border-accent bg-accent/10 text-text font-medium ring-1 ring-accent"
                      : "border-border bg-surface-raised text-text-muted hover:border-text-muted/60"
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-text-muted mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Community Join Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center justify-between">
              <span>Community / College Join Code</span>
              <span className="text-[10px] text-text-muted/70 font-normal">Optional</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="e.g. PSG-7A2B"
                value={communityCode}
                onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-text uppercase placeholder:normal-case placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          {/* Optional Previous Donation Date */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
              <input
                type="checkbox"
                checked={hadPreviousDonation}
                onChange={(e) => setHadPreviousDonation(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span>I have donated blood recently</span>
            </label>

            {hadPreviousDonation && (
              <div className="space-y-1">
                <span className="text-[11px] text-text-muted">Date of last donation:</span>
                <input
                  type="date"
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            )}
          </div>

          {/* Ethical & Zero-Health Notice */}
          <div className="rounded-xl bg-surface-raised/80 border border-border/80 p-3 text-[11px] text-text-muted flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text">Zero Medical Data Guarantee:</span>{" "}
              PulseChain never collects health records or payment details. Eligibility is maintained strictly via safe donation interval clocks.
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Complete Registration"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
