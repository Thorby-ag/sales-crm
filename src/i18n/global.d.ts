import type messages from "../messages/en.json";
import type { routing } from "./routing";

// Type-checks every translation key and locale against the English messages.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
