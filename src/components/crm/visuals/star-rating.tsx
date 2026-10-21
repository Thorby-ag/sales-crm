"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

/** 1–5 star rating. Read-only unless `onChange` is given; then it behaves as a radio group. */
export function StarRating({
  value,
  label,
  optionLabel,
  onChange,
}: {
  value: number;
  /** Group label, e.g. "Business fit rating". */
  label: string;
  /** Label of each option, e.g. (3) => "3 of 5". */
  optionLabel: (value: number) => string;
  onChange?: (value: number) => void;
}) {
  if (!onChange) {
    return (
      <span role="img" aria-label={`${label}: ${optionLabel(value)}`} className="flex items-center gap-px">
        {STARS.map((n) => (
          <Star key={n} aria-hidden className={cn("size-3", n <= value ? "fill-success text-success" : "text-[#757575]")} />
        ))}
      </span>
    );
  }
  return (
    <span role="radiogroup" aria-label={label} className="flex items-center">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={optionLabel(n)}
          tabIndex={n === value ? 0 : -1}
          onClick={() => onChange(n)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(Math.min(5, value + 1));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.max(1, value - 1));
            }
          }}
          className="group grid size-4 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <Star
            aria-hidden
            className={cn("size-3 transition-transform group-hover:scale-125", n <= value ? "fill-success text-success" : "text-[#757575]")}
          />
        </button>
      ))}
    </span>
  );
}
