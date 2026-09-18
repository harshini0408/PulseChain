/**
 * The PulseChain mark: a droplet with a pulse cut through it. Inherits
 * currentColor so it works on the oxblood sidebar and on white alike.
 */

interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-5 w-5" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.5c0 0 6.5 6.1 6.5 11a6.5 6.5 0 1 1-13 0c0-4.9 6.5-11 6.5-11z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M12 2.5c0 0 6.5 6.1 6.5 11a6.5 6.5 0 1 1-13 0c0-4.9 6.5-11 6.5-11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.6 14.2h2.2l1.2-2.6 1.6 4.4 1.2-1.8h2.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
