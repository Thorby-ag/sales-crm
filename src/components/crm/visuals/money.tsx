"use client";

import { cn } from "@/lib/utils";
import { useFormat } from "../use-format";

/** "$ 548,200" with the currency symbol muted, as in the table. */
export function Money({ value, className }: { value: number; className?: string }) {
  const { moneyParts } = useFormat();
  const { symbol, amount } = moneyParts(value);
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      <span className="text-muted-foreground">{symbol}</span>
      {" "}
      {amount}
    </span>
  );
}
