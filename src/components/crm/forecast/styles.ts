import type { ForecastGroup } from "@/lib/forecast";

export const CARD = "rounded-xl border border-border bg-[#181818]";

/** One color per forecast group, shared by the KPIs, chart, bars and deal list. */
export const GROUP_COLOR: Record<ForecastGroup, string> = {
  won: "bg-status",
  commit: "bg-commit",
  bestCase: "bg-warning",
  pipeline: "bg-subtle",
  omitted: "bg-faint",
};
