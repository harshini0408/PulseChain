import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  MapPin,
  Clock,
  ShieldCheck,
  Layers,
  Cpu,
  Heart,
  Sparkles,
  Calendar,
  CheckCircle2,
  Check,
  AlertTriangle,
  Radio,
  FileCheck,
  Eye,
  Lock,
  Globe2,
  RefreshCw,
  Compass,
  Zap,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Logo } from "../../components/layout/Logo";
import { PulseLine } from "../../components/motion/PulseLine";

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export function AboutPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"hospital" | "donor" | "community">("hospital");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FAF8F7] text-[#1A1A1A] font-sans antialiased selection:bg-[#B71C1C]/15 selection:text-[#B71C1C]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FAF8F7]/90 backdrop-blur-md border-b border-black/5">
        <div className="flex items-center justify-between px-6 py-4 sm:px-12 lg:px-16 max-w-7xl mx-auto">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <Logo className="h-7 w-7 text-[#B71C1C] transition-transform group-hover:scale-105" />
            <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#111111]">
              PulseChain
            </span>
          </div>

          <nav className="flex items-center gap-6 sm:gap-10">
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#4A4A4A]">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="hover:text-[#B71C1C] transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigate("/about")}
                className="text-[#B71C1C] font-bold transition-colors"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => navigate("/donate")}
                className="hover:text-[#B71C1C] transition-colors"
              >
                Donate
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-full bg-[#1A1A1A] px-5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-black transition-all shadow-sm"
              >
                Facility Login
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — HERO                                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Value Prop */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="lg:col-span-7 space-y-6"
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B71C1C]/10 border border-[#B71C1C]/20 text-[#B71C1C] text-xs font-bold uppercase tracking-widest">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              THE BLOOD COORDINATION NETWORK
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-6xl lg:text-[62px] font-black leading-[1.05] tracking-tight text-[#111111]">
              Connecting Blood Where It Is Needed,{" "}
              <span className="text-[#B71C1C]">Before It Is Too Late.</span>
            </h1>

            {/* Heartbeat pulse wave line */}
            <div className="w-36 opacity-85 py-1">
              <PulseLine height={18} color="#B71C1C" />
            </div>

            {/* Supporting Text */}
            <p className="text-lg sm:text-xl font-medium text-[#4A4A4A] leading-relaxed max-w-2xl">
              PulseChain is an AI-assisted coordination network connecting hospitals, blood centers,
              donors and communities to help coordinate urgent blood requirements and reduce
              avoidable wastage of time-sensitive blood components.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => scrollToSection("how-it-works")}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#B71C1C] px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-[0_8px_20px_rgba(183,28,28,0.3)] hover:bg-[#9E1414] hover:shadow-[0_10px_25px_rgba(183,28,28,0.4)] transition-all hover:-translate-y-0.5"
              >
                See How It Works
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("network-mesh")}
                className="inline-flex items-center gap-2.5 rounded-full bg-white border border-black/10 px-7 py-3.5 text-sm sm:text-base font-bold text-[#1A1A1A] hover:bg-neutral-50 shadow-sm transition-all hover:-translate-y-0.5"
              >
                Explore the Network
              </button>
            </div>
          </motion.div>

          {/* Right Column: Interactive Network Mesh Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center justify-between pb-6 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#B71C1C] animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                    Live Coordination Mesh
                  </span>
                </div>
                <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
                  Active
                </span>
              </div>

              {/* Node Diagram */}
              <div className="relative py-8 flex flex-col items-center justify-center min-h-[300px]">
                {/* Central PulseChain Node */}
                <div className="z-20 flex flex-col items-center justify-center w-24 h-24 rounded-full bg-[#B71C1C] text-white shadow-[0_0_30px_rgba(183,28,28,0.4)] border-4 border-[#FAF8F7] animate-pulse">
                  <Logo className="h-6 w-6 text-white" />
                  <span className="text-xs font-black tracking-tight mt-1">PulseChain</span>
                  <span className="text-[9px] font-medium opacity-80">Coordination</span>
                </div>

                {/* Satellite Nodes */}
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
                  {/* Top-Left: Hospitals */}
                  <div className="absolute top-2 left-2 flex items-center gap-2 bg-neutral-50 border border-black/5 px-3 py-2 rounded-2xl shadow-sm">
                    <Building2 className="w-4 h-4 text-[#B71C1C]" />
                    <div>
                      <div className="text-xs font-bold text-[#1A1A1A]">Hospitals</div>
                      <div className="text-[10px] text-[#737373]">Urgent Needs</div>
                    </div>
                  </div>

                  {/* Top-Right: Blood Centers */}
                  <div className="absolute top-2 right-2 flex items-center gap-2 bg-neutral-50 border border-black/5 px-3 py-2 rounded-2xl shadow-sm">
                    <Activity className="w-4 h-4 text-[#B71C1C]" />
                    <div>
                      <div className="text-xs font-bold text-[#1A1A1A]">Blood Centers</div>
                      <div className="text-[10px] text-[#737373]">Stock & Testing</div>
                    </div>
                  </div>

                  {/* Bottom-Left: Donors */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-neutral-50 border border-black/5 px-3 py-2 rounded-2xl shadow-sm">
                    <Heart className="w-4 h-4 text-[#B71C1C]" />
                    <div>
                      <div className="text-xs font-bold text-[#1A1A1A]">Donors</div>
                      <div className="text-[10px] text-[#737373]">Verified Pools</div>
                    </div>
                  </div>

                  {/* Bottom-Right: Colleges & Communities */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-neutral-50 border border-black/5 px-3 py-2 rounded-2xl shadow-sm">
                    <GraduationCap className="w-4 h-4 text-[#B71C1C]" />
                    <div>
                      <div className="text-xs font-bold text-[#1A1A1A]">Communities</div>
                      <div className="text-[10px] text-[#737373]">Mobilized Guilds</div>
                    </div>
                  </div>
                </div>

                {/* Visual Interconnected Rings */}
                <div className="absolute inset-4 rounded-full border border-dashed border-[#B71C1C]/20 pointer-events-none" />
                <div className="absolute inset-14 rounded-full border border-neutral-200 pointer-events-none" />
              </div>

              <div className="pt-4 border-t border-black/5 text-center">
                <p className="text-xs text-[#666666] font-medium">
                  Bidirectional coordination ensures requirements find verified resources across all tiers.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — THE PROBLEM                                              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-y border-black/5">
        <div className="px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[#666666] text-xs font-bold uppercase tracking-wider mb-4">
              The Reality
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111] leading-tight">
              The Problem Isn’t Always a Lack of Blood.
              <br />
              <span className="text-[#B71C1C]">
                Sometimes, the Right Resource Is Simply Disconnected From the Need.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-[#FAF8F7] border border-black/5 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100/60 flex items-center justify-center text-[#B71C1C]">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">
                Sudden Emergency Windows
              </h3>
              <p className="text-sm text-[#555555] leading-relaxed">
                Critical trauma cases, surgeries, and oncology requirements emerge unpredictably with zero lead time.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#FAF8F7] border border-black/5 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100/60 flex items-center justify-center text-[#B71C1C]">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">
                Siloed Facility Inventories
              </h3>
              <p className="text-sm text-[#555555] leading-relaxed">
                Availability data resides in disconnected hospital spreadsheets and blood center logs with no cross-visibility.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-[#FAF8F7] border border-black/5 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100/60 flex items-center justify-center text-[#B71C1C]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">
                Frantic Family Search Burden
              </h3>
              <p className="text-sm text-[#555555] leading-relaxed">
                Families in distress are forced to broadcast unverified messages across chat groups while precious minutes tick away.
              </p>
            </div>
          </div>

          {/* Fragmented Journey Visual Comparison */}
          <div className="rounded-3xl bg-[#111111] text-white p-8 sm:p-12 space-y-8 shadow-xl">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#B71C1C]">
                Traditional Breakdown
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold">
                The Painful Fragmented Search Journey
              </h3>
            </div>

            {/* The 6 Fragmented Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { step: "01", label: "Need Appears", desc: "Patient in critical condition" },
                { step: "02", label: "Search", desc: "Calling individual contacts" },
                { step: "03", label: "Call", desc: "Checking facility by facility" },
                { step: "04", label: "Message", desc: "Broadcasting on social apps" },
                { step: "05", label: "Wait", desc: "Uncertain response delay" },
                { step: "06", label: "Search Again", desc: "Starting over when unmet" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center flex flex-col justify-between space-y-2"
                >
                  <span className="text-xs font-mono text-[#B71C1C] font-bold">{item.step}</span>
                  <div className="font-bold text-sm text-white">{item.label}</div>
                  <div className="text-2xs text-white/60">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/10 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#B71C1C] text-white font-bold text-sm sm:text-base shadow-lg">
                <CheckCircle2 className="w-5 h-5" />
                PulseChain turns this fragmented journey into one coordinated workflow.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — THE KEY INSIGHT                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section id="network-mesh" className="py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] text-xs font-bold uppercase tracking-wider">
            Product Philosophy
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
            “We Don’t Need Another Blood Search Website.”
          </h2>
          <p className="text-xl sm:text-2xl font-bold text-[#B71C1C]">
            We need a coordination layer.
          </p>
          <p className="text-base sm:text-lg text-[#555555] leading-relaxed">
            Existing blood services may exist independently, but the response journey can still be fragmented. PulseChain acts as the coordination layer connecting these participants.
          </p>
        </div>

        {/* Hub & Spoke Connectivity Architecture */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/5 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-6">
            <h3 className="font-display text-2xl font-bold text-[#111111]">
              Connecting Existing Ecosystems, Not Replacing Them
            </h3>
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
              PulseChain does not replace existing blood banks, certified laboratories, or donor organizations. Instead, it provides the digital fabric that allows them to communicate, match, and escalate seamlessly.
            </p>
            <ul className="space-y-3 text-sm text-[#444444]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#B71C1C]" />
                <span>Interoperable connection with licensed hospital blood banks</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#B71C1C]" />
                <span>Synchronized donor pool alerts with zero spam</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#B71C1C]" />
                <span>Multi-tier escalation to neighboring cities when demand exceeds local stock</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 bg-[#FAF8F7] rounded-2xl p-6 sm:p-8 border border-black/5">
            <div className="text-center font-bold text-xs uppercase tracking-wider text-[#666666] mb-6">
              The 7 Core Ecosystem Nodes Unified by PulseChain
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              {[
                { title: "Donors", icon: Heart },
                { title: "Hospitals", icon: Building2 },
                { title: "Blood Centers", icon: Activity },
                { title: "NGOs", icon: Globe2 },
                { title: "Colleges", icon: GraduationCap },
                { title: "RWAs & Housing", icon: Users },
                { title: "Camp Organizers", icon: Calendar },
              ].map((node, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white border border-black/5 shadow-2xs flex flex-col items-center gap-2 hover:border-[#B71C1C]/40 transition-colors"
                >
                  <node.icon className="w-5 h-5 text-[#B71C1C]" />
                  <span className="text-xs font-bold text-[#111111]">{node.title}</span>
                </div>
              ))}
              <div className="p-4 rounded-xl bg-[#B71C1C] text-white flex flex-col items-center justify-center col-span-2 sm:col-span-1 shadow-sm">
                <span className="text-xs font-black">PulseChain</span>
                <span className="text-[10px] opacity-80">Coordination Core</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4 — HOW PULSECHAIN WORKS                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-y border-black/5">
        <div className="px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[#666666] text-xs font-bold uppercase tracking-wider">
              The Workflow
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
              One Request. One Network.
              <br />
              <span className="text-[#B71C1C]">Multiple Paths to Fulfilment.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#555555]">
              A continuous 5-step protocol that accelerates triage while preserving strict medical oversight.
            </p>
          </div>

          {/* 5-Step Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                step: "01",
                title: "Create Request",
                desc: "Blood group, component, units, hospital, location and urgency level.",
                icon: FileCheck,
              },
              {
                step: "02",
                title: "Match Nearby Resources",
                desc: "Check nearby blood centers, relevant donor pools and partner facilities.",
                icon: Compass,
              },
              {
                step: "03",
                title: "Coordinate Response",
                desc: "Notify relevant participants and track real-time confirmations without duplication.",
                icon: Zap,
              },
              {
                step: "04",
                title: "Escalate When Needed",
                desc: "Expand from local radius to neighboring facilities and regional cities if unmet.",
                icon: Radio,
              },
              {
                step: "05",
                title: "Human Verification",
                desc: "Authorized healthcare/blood-center personnel validate, release, and transfuse.",
                icon: ShieldCheck,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="relative bg-[#FAF8F7] rounded-3xl p-6 border border-black/5 flex flex-col justify-between hover:shadow-md hover:border-[#B71C1C]/30 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-[#B71C1C]">
                      {item.step}
                    </span>
                    <item.icon className="w-5 h-5 text-neutral-400 group-hover:text-[#B71C1C] transition-colors" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#111111] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/5 text-[11px] font-semibold text-[#888888] flex items-center gap-1">
                  Step {item.step} of 05
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5 — EVERY UNIT HAS A CLOCK                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto">
        <div className="bg-[#FAF8F7] rounded-3xl p-8 sm:p-12 border border-black/5 shadow-sm space-y-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/60 text-[#B71C1C] text-xs font-bold uppercase tracking-wider">
              Time-Critical Inventory
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#111111]">
              Time-Sensitive Inventory Needs Timely Coordination.
            </h2>
            <p className="text-base sm:text-lg text-[#555555] leading-relaxed">
              Different blood components have different storage requirements and usable lifetimes. Platelets are especially time-sensitive, making timely coordination important.
            </p>
          </div>

          {/* Timeline Visual */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">
              Component Lifecycle Window
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { stage: "Collected", desc: "Donated, screened, and prepared into components", status: "Secure", bg: "bg-emerald-50 border-emerald-200 text-emerald-900" },
                { stage: "Available", desc: "Active in blood bank inventory, awaiting requisitions", status: "Optimal", bg: "bg-blue-50 border-blue-200 text-blue-900" },
                { stage: "Approaching Expiry", desc: "PulseChain activates proactive rescue matching", status: "Urgent Window", bg: "bg-amber-50 border-amber-200 text-amber-900" },
                { stage: "Expired", desc: "Avoidable waste if coordination did not take place", status: "Avoidable Loss", bg: "bg-rose-50 border-rose-200 text-rose-900" },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-5 border ${step.bg} flex flex-col justify-between space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{step.stage}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/60">
                      {step.status}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-sm text-[#111111]">
                Preventing Discard Through Early Intelligence
              </div>
              <p className="text-xs text-[#666666]">
                PulseChain helps surface time-sensitive inventory and relevant demand so organizations can coordinate earlier.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="shrink-0 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-colors"
            >
              Monitor Facility Stock
            </button>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6 — WHO PULSECHAIN CONNECTS                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-white border-y border-black/5">
        <div className="px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[#666666] text-xs font-bold uppercase tracking-wider">
              Ecosystem Participants
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
              Who PulseChain Connects
            </h2>
            <p className="text-base sm:text-lg text-[#555555]">
              Six key stakeholders unified through automated workflows and role-based consoles.
            </p>
          </div>

          {/* 6 Premium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "1. Hospitals",
                desc: "Create requests and coordinate requirements in real time during trauma, oncology, and surgical emergencies.",
                icon: Building2,
                badge: "Demand Generator",
              },
              {
                title: "2. Blood Centers",
                desc: "Share availability information, manage component inventory, and coordinate fulfilment before units expire.",
                icon: Activity,
                badge: "Supply Custodian",
              },
              {
                title: "3. Donors",
                desc: "Register, manage availability, and respond to relevant urgent requests in their immediate geographic radius.",
                icon: Heart,
                badge: "Life Savers",
              },
              {
                title: "4. Colleges & Companies",
                desc: "Build organized donor communities and launch targeted campaigns for specific blood-group shortages.",
                icon: GraduationCap,
                badge: "Organized Guilds",
              },
              {
                title: "5. NGOs & Organizers",
                desc: "Manage blood-donation drives, checklist operations, and partner with licensed blood banks.",
                icon: Globe2,
                badge: "Camp Leaders",
              },
              {
                title: "6. Nearby Cities",
                desc: "Extend unmet emergency requests into a wider regional network when local supply is fully exhausted.",
                icon: MapPin,
                badge: "Regional Escalation",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className="bg-[#FAF8F7] rounded-3xl p-7 border border-black/5 hover:border-[#B71C1C]/40 hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#B71C1C] shadow-2xs border border-black/5">
                      <card.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white border border-black/5 text-[#555555]">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#111111]">
                    {card.title}
                  </h3>
                  <p className="text-sm text-[#555555] leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 7 — EMERGENCY BLOOD REQUEST                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] text-xs font-bold uppercase tracking-wider">
              Core Coordination Engine
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
              Emergency Blood Request Coordination
            </h2>
            <p className="text-base sm:text-lg text-[#555555] leading-relaxed">
              When an urgent requisition is logged, PulseChain triggers a multi-tier matching protocol across facilities, donor pools, and escalation rings simultaneously.
            </p>
            <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-2xs space-y-2">
              <div className="font-bold text-sm text-[#111111] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B71C1C]" />
                Zero Double-Commitment Guarantee
              </div>
              <p className="text-xs text-[#666666]">
                PulseChain locks matching units upon reservation, preventing simultaneous claims across multiple hospitals.
              </p>
            </div>
          </div>

          {/* Interactive Mock Requisition Card */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#B71C1C]/30 shadow-[0_12px_40px_rgba(183,28,28,0.08)] space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-black/5">
                <div>
                  <div className="text-xs font-bold tracking-wider uppercase text-[#B71C1C]">
                    URGENT BLOOD REQUEST
                  </div>
                  <div className="text-xs font-mono text-[#777777]">#REQ-8042 • Live</div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#B71C1C] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#B71C1C] animate-ping" />
                  Priority: High
                </div>
              </div>

              {/* Requirement Summary */}
              <div className="grid grid-cols-2 gap-4 bg-[#FAF8F7] p-4 rounded-2xl border border-black/5">
                <div>
                  <div className="text-2xs font-bold uppercase text-[#777777]">Blood Group</div>
                  <div className="font-display text-2xl font-black text-[#B71C1C]">B+ Positive</div>
                </div>
                <div>
                  <div className="text-2xs font-bold uppercase text-[#777777]">Quantity Required</div>
                  <div className="font-display text-2xl font-black text-[#111111]">2 Units</div>
                </div>
                <div>
                  <div className="text-2xs font-bold uppercase text-[#777777]">Facility</div>
                  <div className="text-sm font-bold text-[#111111]">City Hospital</div>
                </div>
                <div>
                  <div className="text-2xs font-bold uppercase text-[#777777]">Location</div>
                  <div className="text-sm font-bold text-[#111111]">Coimbatore</div>
                </div>
              </div>

              {/* PulseChain Orchestration Pipeline */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                  PulseChain Response Pipeline
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-xs font-medium text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Nearby blood center checked (Stock confirmed)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Donor network searched (Radius: 10km)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Relevant donors identified & alert mobilized</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Partner facilities checked for compatible reserves</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#B71C1C] bg-red-50 px-3.5 py-2 rounded-xl border border-red-100">
                    <ArrowRight className="w-4 h-4 text-[#B71C1C] animate-pulse shrink-0" />
                    <span>Coordination continues until the request is fulfilled or closed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 8 — COMMUNITY DONOR NETWORK                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-white border-y border-black/5">
        <div className="px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[#666666] text-xs font-bold uppercase tracking-wider">
              Organized Donor Cohorts
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
              “Don’t Just Find Donors.
              <br />
              <span className="text-[#B71C1C]">Build Ready-to-Reach Communities.”</span>
            </h2>
            <p className="text-base sm:text-lg text-[#555555]">
              Colleges, corporate campuses, and residential communities can form organized donor groups that can be mobilized with targeted accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Example Community Dashboard */}
            <div className="lg:col-span-7 bg-[#FAF8F7] rounded-3xl p-6 sm:p-8 border border-black/5 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xs font-bold uppercase tracking-wider text-[#888888]">
                    Community Guild Dashboard
                  </span>
                  <h3 className="font-display text-xl font-black text-[#111111]">
                    College A — Donor Chapter
                  </h3>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-black text-[#B71C1C]">420</div>
                  <div className="text-2xs font-bold uppercase text-[#888888]">Registered Donors</div>
                </div>
              </div>

              {/* Blood Group Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                  Verified Blood Group Distribution
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-black/5 text-center">
                    <div className="text-xs font-bold text-[#777777]">O+</div>
                    <div className="font-display text-xl font-black text-[#111111]">150</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-black/5 text-center">
                    <div className="text-xs font-bold text-[#777777]">A+</div>
                    <div className="font-display text-xl font-black text-[#111111]">110</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-black/5 text-center">
                    <div className="text-xs font-bold text-[#777777]">B+</div>
                    <div className="font-display text-xl font-black text-[#111111]">95</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border-2 border-[#B71C1C]/40 text-center">
                    <div className="text-xs font-bold text-[#B71C1C]">O- (Rare)</div>
                    <div className="font-display text-xl font-black text-[#B71C1C]">8</div>
                  </div>
                </div>
              </div>

              {/* Targeted Outreach Banner */}
              <div className="bg-white p-4 rounded-2xl border border-black/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100/60 flex items-center justify-center text-[#B71C1C]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111111]">Targeted Outreach for O- Demand</div>
                    <div className="text-2xs text-[#666666]">Reaches only eligible, non-cooldown donors</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#B71C1C]">Ready</span>
              </div>
            </div>

            {/* Explanation Column */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-display text-2xl font-bold text-[#111111]">
                Context-Aware Community Mobilization
              </h3>
              <p className="text-sm sm:text-base text-[#555555] leading-relaxed">
                Rather than spamming hundreds of unrelated people, the platform helps organizations identify relevant communities based on location, verified blood group data, and donation history.
              </p>
              <ul className="space-y-2.5 text-sm text-[#444444]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#B71C1C] shrink-0 mt-0.5" />
                  <span>Eliminates donor fatigue with smart cooldown timers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#B71C1C] shrink-0 mt-0.5" />
                  <span>Enables student-run guilds to organize high-impact drives</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#B71C1C] shrink-0 mt-0.5" />
                  <span>Direct link to nearby blood banks for batch donation camps</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 9 — BLOOD CAMP PLANNER                                       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] text-xs font-bold uppercase tracking-wider">
            Operational Blueprint
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
            “From an Idea for a Camp to a Ready-to-Run Plan.”
          </h2>
          <p className="text-base sm:text-lg text-[#555555]">
            A structured workflow and checklist designed for colleges, NGOs, and corporate organizers.
          </p>
        </div>

        {/* Camp Creation Step Sequence */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-black/5 shadow-sm space-y-8">
          <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">
            Camp Execution Workflow
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              "Create Camp",
              "Choose Venue",
              "Partner Blood Center",
              "Estimate Donors",
              "Prepare Infrastructure",
              "Assign Volunteers",
              "Publish Camp",
            ].map((step, idx) => (
              <div
                key={idx}
                className="bg-[#FAF8F7] p-3.5 rounded-2xl border border-black/5 text-center flex flex-col justify-between"
              >
                <div className="font-mono text-xs font-bold text-[#B71C1C]">0{idx + 1}</div>
                <div className="font-bold text-xs text-[#111111] mt-1">{step}</div>
              </div>
            ))}
          </div>

          {/* Operational Checklist Cards */}
          <div className="pt-6 border-t border-black/5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">
              10-Point Operational Readiness Checklist
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: "Venue", icon: Building2 },
                { name: "Medical Team", icon: ShieldCheck },
                { name: "Registration Area", icon: FileCheck },
                { name: "Donation Area", icon: Heart },
                { name: "Recovery Area", icon: Clock },
                { name: "Electricity", icon: Zap },
                { name: "Drinking Water", icon: Sparkles },
                { name: "Volunteers", icon: Users },
                { name: "Refreshments", icon: Activity },
                { name: "Partner Coordination", icon: Radio },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-black/5 flex items-center gap-2.5 shadow-2xs"
                >
                  <item.icon className="w-4 h-4 text-[#B71C1C]" />
                  <span className="text-xs font-bold text-[#111111]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 10 — WHERE AI HELPS                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-white border-y border-black/5">
        <div className="px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[#666666] text-xs font-bold uppercase tracking-wider">
              Enabling Intelligence Layer
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
              Where AI Helps
            </h2>
            <p className="text-base sm:text-lg text-[#555555]">
              AI is not marketed as the product itself; it is the enabling coordination engine that eliminates latency in critical moments.
            </p>
          </div>

          {/* 3 AI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FAF8F7] rounded-3xl p-8 border border-black/5 space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#B71C1C]/10 flex items-center justify-center text-[#B71C1C]">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono font-bold text-[#B71C1C]">01 PILLAR</div>
              <h3 className="font-display text-2xl font-bold text-[#111111]">
                UNDERSTAND
              </h3>
              <p className="text-sm text-[#555555] leading-relaxed">
                Converts unstructured natural-language emergency requests into verified, structured medical parameters (blood group, component, quantity, urgency).
              </p>
            </div>

            <div className="bg-[#FAF8F7] rounded-3xl p-8 border border-black/5 space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#B71C1C]/10 flex items-center justify-center text-[#B71C1C]">
                <Compass className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono font-bold text-[#B71C1C]">02 PILLAR</div>
              <h3 className="font-display text-2xl font-bold text-[#111111]">
                CONNECT
              </h3>
              <p className="text-sm text-[#555555] leading-relaxed">
                Matches relevant donors, organizations, and blood banks using precise geospatial distance, real-time availability, and clinical compatibility rules.
              </p>
            </div>

            <div className="bg-[#FAF8F7] rounded-3xl p-8 border border-black/5 space-y-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#B71C1C]/10 flex items-center justify-center text-[#B71C1C]">
                <Radio className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono font-bold text-[#B71C1C]">03 PILLAR</div>
              <h3 className="font-display text-2xl font-bold text-[#111111]">
                COORDINATE
              </h3>
              <p className="text-sm text-[#555555] leading-relaxed">
                Surfaces multi-ring regional escalation pathways and assists camp organizers with automated volunteer allocation and scheduling.
              </p>
            </div>
          </div>

          {/* AI Clinical Disclaimer */}
          <div className="p-6 rounded-2xl bg-neutral-100 border border-neutral-200 text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-[#555555]">
              <strong>Medical Disclaimer:</strong> AI assists with logistics, search triage, and workflow coordination; it does not replace qualified medical decisions, clinical testing, or blood release protocols.
            </p>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 11 — TRUST & PRIVACY                                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] text-xs font-bold uppercase tracking-wider">
            Integrity & Security
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
            A Health Network Needs Trust.
          </h2>
          <p className="text-base sm:text-lg text-[#555555]">
            Built with strict privacy guarantees, verified credentials, and complete regulatory compliance.
          </p>
        </div>

        {/* 6 Trust Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Verified Organization Profiles",
              desc: "Every hospital, blood bank, and NGO must undergo strict administrative credential verification.",
              icon: ShieldCheck,
            },
            {
              title: "Consent-Based Sharing",
              desc: "Donors choose when and how they receive notifications. No third-party data broker access.",
              icon: Lock,
            },
            {
              title: "Donor Availability Controls",
              desc: "Donors can toggle their status to inactive or pause alerts after recent donations.",
              icon: Clock,
            },
            {
              title: "Location Privacy",
              desc: "Specific home addresses are never published; matching relies on radius zones.",
              icon: MapPin,
            },
            {
              title: "Automatic Request Expiry",
              desc: "Requisitions automatically expire once fulfilled to prevent unnecessary calls to donors.",
              icon: RefreshCw,
            },
            {
              title: "Audit Trail & Oversight",
              desc: "Full traceability of every coordination event, claim token, and blood center match.",
              icon: FileCheck,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-7 border border-black/5 shadow-sm space-y-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#B71C1C]">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#111111]">{item.title}</h3>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Human Medical Oversight Statement */}
        <div className="p-8 rounded-3xl bg-[#111111] text-white text-center max-w-4xl mx-auto space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-[#B71C1C]">
            Human Medical Oversight
          </div>
          <p className="text-base sm:text-lg font-medium leading-relaxed max-w-2xl mx-auto text-neutral-200">
            “PulseChain coordinates information; authorized healthcare professionals remain responsible for medical verification and clinical decisions.”
          </p>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 12 — OUR VISION                                              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 bg-[#0F0F0F] text-white border-y border-white/10 relative overflow-hidden">
        <div className="px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#B71C1C]/20 border border-[#B71C1C]/40 text-[#B71C1C] text-xs font-bold uppercase tracking-widest">
              Long-Term Horizon
            </div>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              A Connected Blood Network,{" "}
              <span className="text-[#B71C1C]">Not Another Standalone App.</span>
            </h2>
            <p className="text-lg sm:text-xl text-neutral-300 font-medium leading-relaxed">
              “Our vision is a regional digital coordination layer where no urgent blood requirement has to start from zero and no usable resource remains invisible simply because the right people are not connected.”
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-neutral-300 text-sm sm:text-base leading-relaxed">
            <p>
              Today, donors, hospitals, blood centers, organizations, and donation campaigns can operate as separate networks. PulseChain connects these participants into a unified response system.
            </p>
            <p>
              A request can begin locally, search nearby resources, activate donor communities, and expand into nearby cities when necessary. Over time, PulseChain can evolve into infrastructure for coordinated blood-resource management across regions.
            </p>
          </div>

          {/* Network Expansion Map */}
          <div className="pt-8 space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Multi-Tier Escalation Topology
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { title: "Person", desc: "Patient Requisition" },
                { title: "Hospital", desc: "In-House Blood Bank" },
                { title: "City Network", desc: "Local Radius Centers" },
                { title: "Nearby Cities", desc: "Inter-City Rail/Road Hub" },
                { title: "Regional Network", desc: "Multi-District Mesh" },
              ].map((tier, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1 hover:bg-white/10 transition-colors"
                >
                  <div className="text-xs font-mono text-[#B71C1C] font-bold">Tier {idx + 1}</div>
                  <div className="font-bold text-sm text-white">{tier.title}</div>
                  <div className="text-2xs text-neutral-400">{tier.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 13 — WHY PULSECHAIN                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] text-xs font-bold uppercase tracking-wider">
            Strategic Value
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-[#111111]">
            Why PulseChain
          </h2>
        </div>

        {/* 3 Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <span className="font-mono text-xs font-bold text-[#B71C1C]">01 PILLAR</span>
            <h3 className="font-display text-2xl font-black text-[#111111]">CONNECT</h3>
            <p className="text-sm font-semibold text-[#B71C1C]">
              Hospitals • Blood Centers • Donors • Communities
            </p>
            <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
              Unifies fragmented stakeholder silos into a single, synchronized communications fabric.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <span className="font-mono text-xs font-bold text-[#B71C1C]">02 PILLAR</span>
            <h3 className="font-display text-2xl font-black text-[#111111]">COORDINATE</h3>
            <p className="text-sm font-semibold text-[#B71C1C]">
              One request → Multiple response pathways
            </p>
            <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
              Automatically evaluates nearby banks, localized donor cohorts, and regional escalation tiers.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <span className="font-mono text-xs font-bold text-[#B71C1C]">03 PILLAR</span>
            <h3 className="font-display text-2xl font-black text-[#111111]">REDUCE WASTE</h3>
            <p className="text-sm font-semibold text-[#B71C1C]">
              Earlier visibility into time-sensitive blood resources
            </p>
            <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
              Surfaces units approaching their critical expiry window before they are discarded.
            </p>
          </div>
        </div>

        {/* Final Insight Statement */}
        <div className="text-center max-w-2xl mx-auto pt-6">
          <p className="text-base sm:text-lg font-bold text-[#111111]">
            “PulseChain is not trying to replace the existing blood ecosystem. It is designed to connect it.”
          </p>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 14 — FINAL CTA                                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-white border-t border-black/5">
        <div className="px-6 sm:px-12 lg:px-16 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B71C1C]/10 text-[#B71C1C] text-xs font-bold uppercase tracking-widest">
            Join the Coordination Layer
          </div>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#111111] leading-tight">
            Every Connection Can Shorten the Distance Between{" "}
            <span className="text-[#B71C1C]">Need and Help.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#555555] max-w-2xl mx-auto">
            Whether you are an individual donor, college organizer, hospital, or blood bank — join the network today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/donate")}
              className="inline-flex items-center gap-2 rounded-full bg-[#B71C1C] px-8 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(183,28,28,0.35)] hover:bg-[#9E1414] hover:shadow-[0_12px_28px_rgba(183,28,28,0.45)] transition-all hover:-translate-y-0.5"
            >
              <Heart className="w-5 h-5 fill-current" />
              Join as a Donor
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-8 py-4 text-base font-bold text-white shadow-md hover:bg-black transition-all hover:-translate-y-0.5"
            >
              <Building2 className="w-5 h-5" />
              Register an Organization
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#FAF8F7] border-t border-black/5 py-12 px-6 sm:px-12 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#777777]">
          <div className="flex items-center gap-3">
            <Logo className="h-5 w-5 text-[#B71C1C]" />
            <span className="font-bold text-[#111111]">PulseChain Coordination Network</span>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <button onClick={() => navigate("/")} className="hover:text-[#B71C1C]">Home</button>
            <button onClick={() => navigate("/about")} className="hover:text-[#B71C1C]">About</button>
            <button onClick={() => navigate("/donate")} className="hover:text-[#B71C1C]">Donate</button>
            <button onClick={() => navigate("/login")} className="hover:text-[#B71C1C]">Facility Login</button>
          </div>
          <div className="text-center sm:text-right text-[11px]">
            © {new Date().getFullYear()} PulseChain. For hackathon demonstration.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutPage;
