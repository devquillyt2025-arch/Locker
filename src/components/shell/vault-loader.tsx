import { cn } from "@/lib/utils";

// Combination-dial loader: a slowly turning tick ring, a terracotta arc
// sweeping the other way, a ripple, and a padlock whose shackle lifts and
// snaps shut. Pure SVG + CSS (see globals.css), so it works in server
// components and costs no JS.
export function VaultLoader({
  size = 120,
  caption,
  className,
}: {
  size?: number;
  caption?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("vault-loader loader-delay flex flex-col items-center gap-5", className)}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
        <defs>
          <linearGradient id="vault-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>

        {/* Tick ring: 36 marks, turns slowly like a dial */}
        <circle
          className="dial-ticks"
          cx="60"
          cy="60"
          r="54"
          stroke="var(--muted-foreground)"
          strokeOpacity="0.45"
          strokeWidth="4"
          strokeDasharray="1.2 8.225"
        />

        {/* Track + sweeping arc */}
        <circle cx="60" cy="60" r="44" stroke="var(--border)" strokeWidth="2" />
        <circle
          className="dial-arc"
          cx="60"
          cy="60"
          r="44"
          stroke="url(#vault-arc)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="96 180.5"
        />

        {/* Ripple */}
        <circle
          className="dial-ping"
          cx="60"
          cy="60"
          r="32"
          stroke="var(--primary)"
          strokeWidth="1.5"
        />

        {/* Padlock */}
        <g className="lock-shackle">
          <path
            d="M50 57 V48 a10 10 0 0 1 20 0 V57"
            stroke="var(--foreground)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </g>
        <rect x="42" y="56" width="36" height="28" rx="7" fill="var(--primary)" />
        <g className="lock-keyhole">
          <circle cx="60" cy="68.5" r="3.4" fill="var(--primary-foreground)" />
          <rect x="58.6" y="70" width="2.8" height="7" rx="1.4" fill="var(--primary-foreground)" />
        </g>
      </svg>

      {caption && (
        <p className="loader-caption font-serif text-lg tracking-tight text-muted-foreground">
          {caption}
        </p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
}
