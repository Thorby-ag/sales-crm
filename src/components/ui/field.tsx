import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FIELD } from "./surface";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  required,
  trailing,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  trailing?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="type-caption text-soft">
          {label}
          {required && (
            <span className="text-subtle" aria-hidden>
              {" "}
              *
            </span>
          )}
        </label>
        {trailing}
      </div>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="type-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
