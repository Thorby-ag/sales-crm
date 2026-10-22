import type { TagTone } from "@/lib/constants";
import { initials } from "@/lib/contacts";
import { hashString } from "@/lib/text";
import { cn } from "@/lib/utils";

const TONES: TagTone[] = ["blue", "purple", "green", "orange", "teal", "amber", "red", "yellow"];

/** Customers get initials, so they never look like the team's illustrated avatars. */
export function ContactAvatar({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      data-tone={TONES[hashString(name) % TONES.length]}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full border border-(color:--tone-border) bg-(--tone-bg) leading-none font-medium text-(color:--tone-text) select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}
