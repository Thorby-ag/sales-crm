"use client";

import { ChevronDown } from "lucide-react";
import { Fragment } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Radix menus need string values; this one stands for "no filter". */
export const ALL = "__all__";

export interface Option {
  value: string;
  label: string;
}

export interface OptionGroup {
  label?: string;
  options: Option[];
}

export interface FilterControl {
  id: string;
  /** Short label inside the pill, e.g. "Sort by". */
  label: string;
  /** Menu title and form label, e.g. "Account owner". */
  title: string;
  groups: OptionGroup[];
  value: string;
  onChange: (value: string) => void;
}

function labelFor(groups: OptionGroup[], value: string): string {
  return groups.flatMap((g) => g.options).find((o) => o.value === value)?.label ?? value;
}

/** Pill-shaped dropdown: "Sort by | Pipeline Value ⌄". */
export function FilterMenu({ label, title, groups, value, onChange }: Omit<FilterControl, "id">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group type-caption inline-flex h-[30px] items-stretch overflow-hidden rounded-full bg-secondary shadow-raised outline-none transition-colors hover:bg-[#232323] focus-visible:ring-2 focus-visible:ring-white/25 data-[state=open]:bg-[#232323]"
        >
          <span className="flex items-center border-r border-black/50 pr-[9px] pl-[10px] text-muted-foreground">{label}</span>
          <span className="flex items-center gap-1.5 pr-[9px] pl-[9px] text-foreground">
            {labelFor(groups, value)}
            <ChevronDown aria-hidden className="size-3 text-soft transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[180px]">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {groups.map((group, i) => (
            <Fragment key={group.label ?? i}>
              {i > 0 && <DropdownMenuSeparator />}
              {group.label && <DropdownMenuLabel className="pt-1.5 pb-1.5">{group.label}</DropdownMenuLabel>}
              {group.options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The same control as a labeled select, for the mobile filters sheet. */
export function FilterSelect({ id, title, groups, value, onChange }: FilterControl) {
  return (
    <Field label={title} htmlFor={`filter-${id}`}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={`filter-${id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group, i) => (
            <SelectGroup key={group.label ?? i}>
              {group.label && <SelectLabel>{group.label}</SelectLabel>}
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
