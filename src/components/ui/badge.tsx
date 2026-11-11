import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
export type Tone = "slate" | "blue" | "sky" | "indigo" | "green" | "orange" | "red" | "navy";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
  sky: "bg-sky-50 text-sky-800 ring-sky-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  orange: "bg-accent-50 text-accent-700 ring-accent-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  navy: "bg-navy text-white ring-navy",
};

export function Badge({
  tone = "slate",
  icon: Icon,
  children,
  className,
  size = "md",
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-[13px]",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />}
      {children}
    </span>
  );
}

