import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  MapPin,
  Phone,
  UserCheck,
  CheckCircle2,
  Copy,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Share2,
} from "lucide-react";
import { api } from "../../api/client";
import { COMMUNITY_TYPES, type CommunityType } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";

const CORRIDOR_CITIES = [
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Tiruppur", lat: 11.1085, lng: 77.3411 },
  { name: "Erode", lat: 11.341, lng: 77.7172 },
  { name: "Pollachi", lat: 10.6609, lng: 77.0048 },
  { name: "Salem", lat: 11.6643, lng: 78.146 },
];

export function CommunityRegisterPage() {
  const navigate = useNavigate();
  const { loginAs } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState<CommunityType>("COLLEGE");
  const [selectedCity, setSelectedCity] = useState("Coimbatore");
  const [lat, setLat] = useState(11.0168);
  const [lng, setLng] = useState(76.9558);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorContact, setCoordinatorContact] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCommunity, setCreatedCommunity] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

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

    if (!name.trim() || !coordinatorName.trim() || !coordinatorContact.trim()) {
      setError("Please fill out all required fields");
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerCommunity({
        name: name.trim(),
        type,
        lat,
        lng,
        city: selectedCity,
        coordinatorName: coordinatorName.trim(),
        coordinatorContact: coordinatorContact.trim(),
      });

      const comm = res.community;
      setCreatedCommunity(comm);
      localStorage.setItem("pulsechain_community_id", comm.communityId);
      await loginAs("COMMUNITY_COORDINATOR");
    } catch (err: any) {
      setError(err.message || "Failed to register community");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!createdCommunity) return;
    const shareUrl = `${window.location.origin}/donor/register?code=${createdCommunity.joinCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {createdCommunity ? (
          /* Success Screen */
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-text">Community Registered!</h2>
              <p className="text-xs text-text-muted">
                Your corridor node is now live in the PulseChain Tier 3 community network.
              </p>
            </div>

            {/* Join Code Box */}
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Community Join Code
              </span>
              <div className="text-3xl font-extrabold font-mono text-text tracking-wider">
                {createdCommunity.joinCode}
              </div>
              <p className="text-[11px] text-text-muted">
                Share this code with your volunteers, students, or team members so they can join your corridor.
              </p>
            </div>

            {/* Share Link */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised p-2.5">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/donor/register?code=${createdCommunity.joinCode}`}
                className="flex-1 bg-transparent text-xs text-text-muted font-mono outline-none"
              />
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-border transition-colors border border-border"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Console Navigation CTA */}
            <button
              onClick={() => navigate(`/community/${createdCommunity.communityId}`)}
              className="w-full h-11 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
            >
              <span>Open Coordinator Console</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Registration Form */
          <>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                Register a Corridor Community
              </h1>
              <p className="text-xs text-text-muted leading-relaxed">
                Connect your NSS chapter, corporate CSR division, or volunteers to receive fallback donor mobilizations when hospital blood units expire or run short.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Community Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Community / Organization Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NSS Unit PSG College of Technology"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {/* Community Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Organization Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CommunityType)}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="COLLEGE">College NSS / Youth Red Cross</option>
                  <option value="CORPORATE">Corporate CSR Division</option>
                  <option value="NGO">Volunteer Association / NGO</option>
                  <option value="RESIDENTIAL">Residents Welfare Association</option>
                </select>
              </div>

              {/* Coordinator Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Coordinator Name <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. K. Raman"
                      value={coordinatorName}
                      onChange={(e) => setCoordinatorName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Coordinator Phone <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 00000"
                      value={coordinatorContact}
                      onChange={(e) => setCoordinatorContact(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </div>
                </div>
              </div>

              {/* City Corridor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Corridor Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {CORRIDOR_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} (Corridor)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notice */}
              <div className="rounded-xl bg-surface-raised/70 border border-border p-3 text-[11px] text-text-muted leading-relaxed">
                <span className="font-semibold text-text">Corridor Isolation Policy:</span> As coordinator, you will only see volunteers affiliated with your community join code. Member contact info is shielded from external parties.
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {loading ? "Registering Community..." : "Create Community Node"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
