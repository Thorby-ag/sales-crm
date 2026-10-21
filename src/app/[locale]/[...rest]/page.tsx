import { notFound } from "next/navigation";

// Unknown paths inside a locale (e.g. /en/reports) get the localized 404 inside the app shell.
export default function CatchAll() {
  notFound();
}
