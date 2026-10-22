/** Shared look for floating surfaces: menus, selects, popovers. */
export const FLOATING_SURFACE =
  "z-50 rounded-lg border border-[#2a2a2a] bg-popover text-foreground shadow-overlay outline-none data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out";

/** Shared look for items inside menus and selects. */
export const MENU_ITEM =
  "relative flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 type-caption text-soft outline-none select-none data-[highlighted]:bg-white/6 data-[highlighted]:text-foreground data-[state=checked]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/** Shared look for cards laid out on a page. */
export const CARD = "rounded-xl border border-border bg-[#181818]";

/** Shared look for text that opens a record: underlined on hover and keyboard focus. */
export const TEXT_LINK =
  "block max-w-full truncate text-left outline-none decoration-white/40 underline-offset-4 hover:underline focus-visible:underline";

/** Shared look for form controls. */
export const FIELD =
  "h-9 w-full rounded-lg border border-input bg-[#1b1b1b] px-3 type-lead text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-[#4a4a4a] focus-visible:border-[#5c5c5c] focus-visible:ring-3 focus-visible:ring-white/8 aria-invalid:border-danger/70";
