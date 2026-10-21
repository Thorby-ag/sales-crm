import type { Metadata } from "next";
import { routing } from "./routing";

/** Canonical URL plus hreflang alternates for a path that exists in every locale. */
export function alternatesFor(locale: string, path: "" | `/${string}`): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}
