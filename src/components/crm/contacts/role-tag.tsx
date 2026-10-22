"use client";

import { useTranslations } from "next-intl";
import { Tag } from "@/components/ui/chips";
import { BUYING_ROLE_TONES } from "@/lib/constants";
import type { BuyingRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RoleTag({ role, className }: { role: BuyingRole; className?: string }) {
  const t = useTranslations("buyingRoles");
  return (
    <Tag tone={BUYING_ROLE_TONES[role]} className={cn("type-caption h-5 px-1.5", className)}>
      {t(role)}
    </Tag>
  );
}
