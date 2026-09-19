import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Loader2 } from "lucide-react";

interface ClaimButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  claimed?: boolean;
}

export function ClaimButton({ onClick, loading = false, disabled = false, claimed = false }: ClaimButtonProps) {
  return (
    <AnimatePresence mode="wait">
      {claimed ? (
        <motion.span
          key="claimed"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="inline-flex items-center gap-2 rounded-xl bg-status-received px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          Claimed ✓
        </motion.span>
      ) : (
        <motion.button
          key="claim-btn"
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Claiming…</span>
            </>
          ) : (
            <>
              <span>Claim</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
