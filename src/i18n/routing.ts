import { defineRouting } from "next-intl/routing";
import { LOCALES } from "@/lib/types";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
});
