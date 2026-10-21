// Plain module (no "use client") so the root layout can inline the init script.

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 400;
export const SIDEBAR_DEFAULT = 254;
export const SIDEBAR_STORAGE_KEY = "crm:sidebar-width";

/** Runs before first paint so a stored width never causes a layout jump. */
export const SIDEBAR_INIT_SCRIPT = `try{var w=parseInt(localStorage.getItem("${SIDEBAR_STORAGE_KEY}"),10);if(w>=${SIDEBAR_MIN}&&w<=${SIDEBAR_MAX})document.documentElement.style.setProperty("--sidebar-width",w+"px")}catch(e){}`;
