import type { ForecastGroup } from "@/lib/forecast";

/** One color per forecast group, shared by the KPIs, chart, bars and deal list. */
export const GROUP_COLOR: Record<ForecastGroup, string> = {
  won: "bg-status",
  commit: "bg-commit",
  bestCase: "bg-warning",
  pipeline: "bg-subtle",
  omitted: "bg-faint",
};
