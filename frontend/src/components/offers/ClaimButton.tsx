import React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ClaimButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ClaimButton: React.FC<ClaimButtonProps> = ({
  onClick,
  isLoading,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Claiming Unit...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Claim Unit</span>
        </>
      )}
    </button>
  );
};
