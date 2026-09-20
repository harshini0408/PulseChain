import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Logo } from "../../components/layout/Logo";
import { PulseLine } from "../../components/motion/PulseLine";

/** The public front door — the supplied donation artwork is deliberately the hero. */
export function LandingPage() {
  const navigate = useNavigate();
  const goToLogin = () => navigate("/login");

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-raised">
      <div
        className="pointer-events-none absolute inset-0 hidden bg-contain bg-right bg-no-repeat md:block"
        style={{ backgroundImage: "url('/Gemini_Generated_Image_b6iz5vb6iz5vb6iz(2).png')" }}
        aria-hidden="true"
      />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
        className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-14"
      >
        <div className="flex items-center gap-2.5 text-accent">
          <Logo className="h-7 w-7" />
          <span className="font-display text-xl font-bold tracking-tight text-text">PulseChain</span>
        </div>
        <button
          type="button"
          onClick={goToLogin}
          className="rounded-full border border-accent bg-accent px-5 py-2 text-xs font-bold text-white shadow-raised transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-brand sm:px-6"
        >
          Login
        </button>
      </motion.header>

      <section className="relative z-10 flex min-h-[calc(100vh-85px)] items-center px-6 py-12 sm:px-10 lg:px-14">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.05, 0.7, 0.1, 1] }}
          className="max-w-[35rem] md:w-[42%] md:max-w-[28rem] lg:w-[45%] lg:max-w-[32rem] xl:w-[52%] xl:max-w-[44rem]"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-surface-raised/65 px-3 py-1.5 text-2xs font-bold uppercase tracking-[.14em] text-accent backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            One connected care corridor
          </p>

          <h1 className="font-display text-5xl font-black leading-[.94] tracking-[-.045em] text-text md:text-5xl lg:text-5xl xl:text-7xl">
            A unit nobody claims in time is a unit <em className="not-italic text-accent">lost</em> for good.
          </h1>

          <div className="mt-6 w-44 opacity-70">
            <PulseLine height={18} color="hsl(var(--accent))" />
          </div>

          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-text-muted md:max-w-[27rem] lg:max-w-[29rem] xl:max-w-[40rem]">
            PulseChain helps blood centres and hospitals see urgent stock, match it to nearby need, and coordinate each handover before the expiry clock runs out.
          </p>

          <div className="mt-8 inline-block rounded-2xl bg-accent/15 p-1" style={{ animation: "breathe 2.6s ease-in-out infinite" }}>
            <button
              type="button"
              onClick={goToLogin}
              className="group flex items-center gap-3 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-brand transition-transform hover:scale-[1.02]"
            >
              Login to PulseChain <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Network Impact Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="mt-9 flex flex-wrap gap-7 border-t border-accent/15 pt-5"
          >
            {[
              ["1,420+", "units saved by network"],
              ["98.4%", "rescue success rate"],
              ["18 min", "avg. dispatch time"],
              ["3", "escalation rings"],
            ].map(([value, label]) => (
              <div key={label}>
                <b className="block font-display text-xl font-bold text-accent tabular-nums">{value}</b>
                <span className="text-2xs font-medium text-text-muted">{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}

export default LandingPage;
