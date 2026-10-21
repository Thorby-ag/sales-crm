import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full outline-none select-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-white/25 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0";

const VARIANTS = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_4px_4px_0_rgb(42_42_42/0.32),0_0_0_1px_#0e0e0e,inset_0_4px_6px_0_rgb(255_255_255/0.2),inset_0_0_0_1px_rgb(255_255_255/0.15),inset_0_-8px_14px_0_rgb(0_0_0/0.15)] hover:bg-primary-hover",
  secondary: "bg-secondary text-foreground shadow-raised hover:bg-muted data-[state=open]:bg-muted",
  subtle: "bg-[#232323] text-foreground shadow-[0_0_0_1px_#333] hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-white/6 hover:text-foreground data-[state=open]:bg-white/6 data-[state=open]:text-foreground",
  nav: "w-full justify-start rounded-lg text-sidebar-foreground hover:text-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-foreground data-[active=true]:shadow-raised",
  item: "w-full items-start justify-start gap-3 rounded-lg text-left whitespace-normal text-foreground hover:bg-white/4",
  link: "rounded-none text-foreground underline decoration-from-font underline-offset-2 hover:text-soft",
} as const;

const SIZES = {
  sm: "h-[30px] px-[11px] text-[12px] leading-none",
  md: "p-2 text-[14px] leading-none",
  icon: "size-[30px] p-0",
  "icon-sm": "size-6 p-0",
  none: "p-0",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses({
  variant = "secondary",
  size = "sm",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
