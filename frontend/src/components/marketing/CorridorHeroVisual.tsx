import { motion } from "framer-motion";
import { Activity, Building2, HeartHandshake, MapPin } from "lucide-react";

type CorridorHeroVisualProps = {
  variant?: "light" | "dark";
  className?: string;
};

/** A living illustration of a blood unit travelling through the care corridor. */
export function CorridorHeroVisual({ variant = "light", className = "" }: CorridorHeroVisualProps) {
  const dark = variant === "dark";
  const ink = dark ? "text-white" : "text-text";
  const muted = dark ? "text-brand-panel-text/70" : "text-text-muted";
  const panel = dark ? "bg-white/10 border-white/15" : "bg-surface-raised/90 border-border/70";

  return (
    <div className={`relative isolate aspect-[1.08] w-full ${className}`} aria-label="A blood unit moving safely through the care network">
      <motion.div
        className={`absolute inset-[8%] rounded-[32%] border ${dark ? "border-white/15" : "border-accent/15"}`}
        animate={{ rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className={`absolute inset-[18%] rounded-[38%] border ${dark ? "border-white/10" : "border-accent/10"}`}
        animate={{ rotate: -360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />

      <svg viewBox="0 0 440 410" className="absolute inset-0 h-full w-full overflow-visible" fill="none" aria-hidden="true">
        <path d="M77 96C150 47 270 44 355 114C405 155 386 270 306 312C220 358 103 330 62 237C42 191 41 131 77 96Z" className={dark ? "fill-white/[.045]" : "fill-accent/[.045]"} />
        <path d="M82 153C144 95 188 128 223 193C258 258 302 254 360 201" className={dark ? "stroke-white/35" : "stroke-accent/45"} strokeWidth="2" strokeLinecap="round" strokeDasharray="5 9" />
        <path d="M80 155C144 95 188 128 223 193C258 258 302 254 360 201" className={dark ? "stroke-white/65" : "stroke-accent"} strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="0.06 0.94">
          <animate attributeName="stroke-dashoffset" values="1;0" dur="3.5s" repeatCount="indefinite" />
        </path>
      </svg>

      <motion.div className={`absolute left-[5%] top-[29%] rounded-2xl border ${panel} p-3 shadow-raised`} animate={{ y: [0, -7, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}>
        <Building2 className={`h-5 w-5 ${dark ? "text-white" : "text-accent"}`} />
        <p className={`mt-1 text-2xs font-bold ${ink}`}>Centre</p>
      </motion.div>
      <motion.div className={`absolute right-[4%] top-[44%] rounded-2xl border ${panel} p-3 shadow-raised`} animate={{ y: [0, 8, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>
        <HeartHandshake className={`h-5 w-5 ${dark ? "text-white" : "text-accent"}`} />
        <p className={`mt-1 text-2xs font-bold ${ink}`}>Hospital</p>
      </motion.div>
      <motion.div className={`absolute bottom-[8%] left-[27%] rounded-2xl border ${panel} px-3 py-2.5 shadow-raised`} animate={{ scale: [1, 1.045, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${dark ? "bg-white/15" : "bg-accent/10"}`}><MapPin className={`h-3.5 w-3.5 ${dark ? "text-white" : "text-accent"}`} /></span>
          <span><b className={`block text-2xs ${ink}`}>Matched nearby</b><span className={`text-[10px] ${muted}`}>4.2 km corridor</span></span>
        </div>
      </motion.div>

      <motion.div className={`absolute left-1/2 top-1/2 flex h-[39%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[42%_42%_48%_48%] border ${dark ? "border-white/30 bg-white/10" : "border-accent/25 bg-surface-raised/95"} shadow-panel backdrop-blur-sm`} animate={{ y: ["-50%", "-54%", "-50%"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <motion.div className={`absolute inset-2 rounded-[40%] border ${dark ? "border-white/15" : "border-accent/10"}`} animate={{ scale: [1, 1.08, 1], opacity: [.55, .15, .55] }} transition={{ duration: 2.2, repeat: Infinity }} />
        <motion.svg viewBox="0 0 80 100" className={`relative h-16 w-14 ${dark ? "text-white" : "text-accent"}`} fill="none" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M40 4C40 4 9 42 9 62a31 31 0 0062 0C71 42 40 4 40 4Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="4" />
          <path d="M27 60h8l5-12 6 22 5-10h7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <span className={`relative mt-1 text-2xs font-extrabold tracking-[.16em] ${ink}`}>IN TRANSIT</span>
      </motion.div>

      <div className={`absolute left-[30%] top-[8%] flex items-center gap-1.5 rounded-full border ${panel} px-3 py-1.5 text-2xs font-bold ${ink}`}>
        <span className="relative flex h-1.5 w-1.5"><span className={`absolute inset-0 animate-ping rounded-full ${dark ? "bg-white" : "bg-accent"}`} /><span className={`relative h-1.5 w-1.5 rounded-full ${dark ? "bg-white" : "bg-accent"}`} /></span>
        Live corridor
      </div>
      <div className={`absolute bottom-[2%] right-[20%] flex items-center gap-1.5 text-2xs ${muted}`}><Activity className="h-3.5 w-3.5" /> coordinated in real time</div>
    </div>
  );
}
