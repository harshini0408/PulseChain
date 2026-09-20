import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Droplets, LogIn } from "lucide-react";
import { Logo } from "../../components/layout/Logo";
import { PulseLine } from "../../components/motion/PulseLine";

export function LandingPage() {
  const navigate = useNavigate();
  const goToLogin = () => navigate("/login");
  const goToRequest = () => navigate("/request");

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#FAF3F4]">
      {/* ── Background Illustration with positive-only upward micro-rotation ───── */}
      <motion.div
        animate={{
          rotate: [0, 0.8, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute inset-0 hidden md:block bg-cover bg-right-top bg-no-repeat opacity-95 origin-bottom-right"
        style={{
          backgroundImage: "url('/image.png')",
          transformOrigin: "100% 100%",
        }}
        aria-hidden="true"
      />

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-12 lg:px-16 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <Logo className="h-7 w-7 text-[#B71C1C]" />
          <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A]">
            PulseChain
          </span>
        </div>

        <nav className="flex items-center gap-6 sm:gap-10">
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#4A4A4A]">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-[#B71C1C] transition-colors"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate("/impact")}
              className="hover:text-[#B71C1C] transition-colors"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => navigate("/impact")}
              className="hover:text-[#B71C1C] transition-colors"
            >
              Donate
            </button>
            <button
              type="button"
              onClick={goToRequest}
              className="hover:text-[#B71C1C] transition-colors"
            >
              Contact
            </button>
          </div>

          <button
            type="button"
            onClick={goToLogin}
            className="rounded-full border border-[#B71C1C]/30 md:border-white/80 bg-[#B71C1C]/10 md:bg-white/10 backdrop-blur-sm px-6 py-2 text-xs sm:text-sm font-bold text-[#B71C1C] md:text-white transition-all hover:bg-[#B71C1C] hover:text-white md:hover:bg-white md:hover:text-[#B71C1C] shadow-sm"
          >
            Facility Login
          </button>
        </nav>
      </motion.header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative z-10 flex min-h-[calc(100vh-100px)] items-center px-6 py-8 sm:px-12 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="w-full md:max-w-2xl"
        >
          {/* Main Headline matching screenshot */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-[68px] font-black leading-[1.02] tracking-tight text-[#1A1A1A]">
            A unit nobody<br className="hidden sm:inline" />
            {" "}claims in time is<br className="hidden sm:inline" />
            {" "}a unit <em className="not-italic text-[#B71C1C] italic">lost</em> for<br className="hidden sm:inline" />
            {" "}good.
          </h1>

          {/* Heartbeat pulse wave line */}
          <div className="my-5 w-48 opacity-90">
            <PulseLine height={20} color="#B71C1C" />
          </div>

          {/* Subtitle matching screenshot */}
          <p className="text-base sm:text-lg font-medium text-[#4A4A4A] leading-relaxed md:max-w-lg">
            Be the reason someone gets another tomorrow.<br />
            Donate blood. Save lives.
          </p>

          {/* ── 2 Bold Action Options ────────────────────────────────────── */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {/* Option 1: I Need Blood */}
            <button
              type="button"
              id="btn-landing-need-blood"
              onClick={goToRequest}
              className="group inline-flex items-center gap-3 rounded-full bg-[#B71C1C] px-8 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(183,28,28,0.38)] transition-all hover:bg-[#9E1414] hover:shadow-[0_12px_28px_rgba(183,28,28,0.48)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <Droplets className="h-5 w-5 fill-current" />
              I Need Blood
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Option 2: Facility Login */}
            <button
              type="button"
              id="btn-landing-facility-login"
              onClick={goToLogin}
              className="group inline-flex items-center gap-3 rounded-full border-2 border-[#1A1A1A] bg-[#1A1A1A] px-8 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-black hover:border-black hover:-translate-y-0.5 active:translate-y-0"
            >
              <LogIn className="h-5 w-5" />
              Facility Login
            </button>
          </div>

          {/* ── 3 Stats at bottom matching screenshot ───────────────────── */}
          <div className="mt-14 flex flex-wrap items-baseline gap-10 sm:gap-14 pt-4">
            <div>
              <div className="font-display text-3xl sm:text-4xl font-black text-[#B71C1C] tabular-nums">
                48h
              </div>
              <div className="mt-1 text-2xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                PLATELET CLOCK
              </div>
            </div>

            <div>
              <div className="font-display text-3xl sm:text-4xl font-black text-[#B71C1C] tabular-nums">
                3
              </div>
              <div className="mt-1 text-2xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                ESCALATION RINGS
              </div>
            </div>

            <div>
              <div className="font-display text-3xl sm:text-4xl font-black text-[#B71C1C] tabular-nums">
                3.5s
              </div>
              <div className="mt-1 text-2xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                CONSOLE REFRESH
              </div>
            </div>
          </div>
        </motion.div>
      </section>


    </main>
  );
}

export default LandingPage;
