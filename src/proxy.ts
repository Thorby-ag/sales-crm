import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 calls middleware "proxy". This one picks /en or /es from the browser language.
export default createMiddleware(routing);

export const config = {
  // Everything except Next internals, Vercel internals and files with an extension.
  matcher: "/((?!_next|_vercel|.*\\..*).*)",
};
