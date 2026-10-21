import type { CompanyLogo as Logo, LogoMark } from "@/lib/types";
import { cn } from "@/lib/utils";

function Mark({ mark, color }: { mark: LogoMark; color: string }) {
  switch (mark) {
    case "orbit":
      return (
        <>
          <circle cx="11" cy="13" r="6.5" fill={color} />
          <circle cx="19" cy="5" r="2.5" fill={color} opacity="0.65" />
        </>
      );
    case "bars":
      return (
        <>
          <rect x="3.5" y="12" width="4.5" height="8.5" rx="1.5" fill={color} opacity="0.5" />
          <rect x="9.75" y="8" width="4.5" height="12.5" rx="1.5" fill={color} opacity="0.75" />
          <rect x="16" y="3.5" width="4.5" height="17" rx="1.5" fill={color} />
        </>
      );
    case "diamond":
      return (
        <>
          <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" transform="rotate(45 12 12)" fill={color} />
          <circle cx="12" cy="12" r="2" fill="#161616" />
        </>
      );
    case "split":
      return (
        <>
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill={color} />
          <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill={color} opacity="0.4" />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="2" fill={color} />
          <rect x="13" y="4" width="7" height="7" rx="2" fill={color} opacity="0.6" />
          <rect x="4" y="13" width="7" height="7" rx="2" fill={color} opacity="0.6" />
          <rect x="13" y="13" width="7" height="7" rx="3.5" fill={color} />
        </>
      );
    case "wave":
      return (
        <>
          <path d="M3 10c3-5 6-5 9 0s6 5 9 0" stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path
            d="M3 16c3-5 6-5 9 0s6 5 9 0"
            stroke={color}
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
        </>
      );
    case "peak":
      return (
        <>
          <path d="M2 19.5 9 7l4.5 7 2.5-3.5 6 9Z" fill={color} />
          <circle cx="18" cy="5.5" r="2" fill={color} opacity="0.6" />
        </>
      );
    case "ring":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="3" fill="none" />
          <circle cx="12" cy="12" r="2.5" fill={color} />
        </>
      );
    case "spark":
      return (
        <path d="M12 2.5c.7 5 3.5 7.9 9.5 9.5-6 1.6-8.8 4.5-9.5 9.5-.7-5-3.5-7.9-9.5-9.5 6-1.6 8.8-4.5 9.5-9.5Z" fill={color} />
      );
    case "hex":
      return (
        <>
          <path d="M12 2.5 20.5 7.25v9.5L12 21.5l-8.5-4.75v-9.5Z" fill={color} />
          <path d="M12 8 15.5 10v4L12 16l-3.5-2v-4Z" fill="#161616" opacity="0.55" />
        </>
      );
  }
}

/** Square logo tile: an uploaded image or a generated geometric mark. */
export function CompanyLogo({ logo, size = 24, className }: { logo: Logo; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/6 bg-[#232323]", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.26) }}
    >
      {logo.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo.src} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)}>
          <Mark mark={logo.mark} color={logo.color} />
        </svg>
      )}
    </span>
  );
}
