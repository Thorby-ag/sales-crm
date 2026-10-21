"use client";

import { Tag } from "@/components/ui/chips";
import { Tooltip } from "@/components/ui/tooltip";
import { splitTags } from "@/lib/companies";
import { TAG_TONES } from "@/lib/constants";
import type { Tag as TagName } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Tags that fit the table cell, plus a "+N" chip for the rest. `wrap` shows them all. */
export function TagList({ tags, wrap = false, className }: { tags: readonly TagName[]; wrap?: boolean; className?: string }) {
  const { visible, hidden } = wrap ? { visible: tags, hidden: [] } : splitTags(tags);
  return (
    <div className={cn("flex items-center gap-1", wrap && "flex-wrap", className)}>
      {visible.map((tag) => (
        <Tag key={tag} tone={TAG_TONES[tag]}>
          {tag}
        </Tag>
      ))}
      {hidden.length > 0 && (
        <Tooltip content={hidden.join(", ")}>
          <span className="inline-flex h-[22px] items-center rounded-full border border-[#363636] bg-muted px-1.5 type-lead text-chip">
            +{hidden.length}
            <span className="sr-only">: {hidden.join(", ")}</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
}
