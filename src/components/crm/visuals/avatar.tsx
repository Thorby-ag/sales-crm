import { cn } from "@/lib/utils";

export function Avatar({ src, size = 20, className }: { src: string; size?: number; className?: string }) {
  return (
    // Small static SVGs (or data URLs): next/image adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("shrink-0 rounded-full bg-[#2a2a2a] object-cover", className)}
    />
  );
}
