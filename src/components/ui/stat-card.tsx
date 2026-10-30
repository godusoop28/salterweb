import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "blue" | "orange" | "sky" | "green" | "red" | "navy";

const ICON_TONE: Record<StatTone, string> = {
  blue: "bg-brand-50 text-brand-600",
  orange: "bg-accent-50 text-accent-600",
  sky: "bg-sky-50 text-sky-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  navy: "bg-slate-100 text-navy",
};

const FEATURED_ICON = "bg-white/10 text-white";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
  delta,
  href,
  featured,
  footer,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
  delta?: { value: string; positive: boolean; label?: string };
  href?: string;
  featured?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid size-11 place-items-center rounded-2xl", featured ? FEATURED_ICON : ICON_TONE[tone])}>
          <Icon className="size-[22px]" aria-hidden />
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
              featured
                ? "bg-white/15 text-white"
                : delta.positive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700",
            )}
          >
            {delta.positive ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {delta.value}
          </span>
        )}
      </div>
      <p className={cn("mt-3 text-[13px] font-semibold sm:mt-4 sm:text-sm", featured ? "text-white/80" : "text-muted")}>{label}</p>
      <p className={cn("mt-1 font-display text-[26px] font-bold sm:text-[32px] leading-none tracking-tight", featured ? "text-white" : "text-ink")}>{value}</p>
      {hint && <p className={cn("mt-2 text-[13px]", featured ? "text-white/75" : "text-muted")}>{hint}</p>}
      {footer}
    </>
  );
  const cardClass = cn(
    "group relative block overflow-hidden rounded-3xl border p-4 transition-all sm:p-5",
    className,
    featured ? "border-transparent bg-brand-gradient text-white shadow-[0_18px_40px_-18px_rgb(11_92_213/0.7)]" : "border-line bg-white shadow-card",
    href && "hover:-translate-y-0.5 hover:shadow-pop",
  );
  if (href)
    return (
      <Link href={href} className={cardClass}>
        {featured && <Decoration />}
        <div className="relative">{content}</div>
      </Link>
    );
  return (
    <div className={cardClass}>
      {featured && <Decoration />}
      <div className="relative">{content}</div>
    </div>
  );
}

function Decoration() {
  return (
    <svg className="absolute -right-6 -bottom-8 h-36 w-36 text-white/10" viewBox="0 0 100 100" fill="none" aria-hidden>
      <rect x="8" y="8" width="84" height="84" rx="18" stroke="currentColor" strokeWidth="7" />
      <path d="M70 38h22M70 50h26M70 62h22" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
