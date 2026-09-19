import { useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundManager } from "../../lib/soundManager";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(soundManager.isEnabled);

  const toggle = useCallback(() => {
    const next = !enabled;
    soundManager.setEnabled(next);
    setEnabled(next);
    // Play a bright confirm chime so the user immediately hears that audio is working
    if (next) soundManager.play("claim");
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Audio active: Click to mute sound effects" : "Audio muted: Click to enable sound effects"}
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
      className={[
        "flex h-8 items-center gap-1.5 px-2.5 rounded-full border text-xs font-medium transition-all shadow-sm",
        enabled
          ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent hover:text-white"
          : "border-border/70 bg-surface-raised/80 text-text-muted hover:border-accent/30 hover:text-text",
      ].join(" ")}
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5 text-accent animate-pulse" /> : <VolumeX className="h-3.5 w-3.5 text-text-subtle" />}
      <span className="hidden sm:inline text-2xs">{enabled ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
