import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" }) {
  // Permite fondos personalizados (p. ej. tarjetas navy) sin conflicto con el blanco por defecto.
  const customBg = className?.split(" ").some((c) => c.startsWith("bg-"));
  return <Tag className={cn("rounded-3xl border border-line shadow-card", !customBg && "bg-white", className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6", className)}>
      <div className="flex min-w-0 flex-[1_1_12rem] items-start gap-3">
        {Icon && (
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon className="size-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-accent-600">{eyebrow}</p>}
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-brand-100 text-brand-700",
  "bg-accent-100 text-accent-700",
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const hash = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold",
        AVATAR_COLORS[hash % AVATAR_COLORS.length],
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-12 text-base",
        size === "xl" && "size-16 text-xl",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-brand-50" aria-hidden />
        <div className="relative grid size-16 place-items-center rounded-2xl border border-brand-100 bg-white text-brand-500 shadow-card">
          <Icon className="size-7" aria-hidden />
        </div>
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[15px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

export function LoadingState({ rows = 4, label = "Cargando información…" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  return (
    <nav className="flex flex-col items-center justify-between gap-3 border-t border-line-soft px-5 py-4 sm:flex-row" aria-label="Paginación">
      <p className="text-sm text-muted">
        Mostrando <span className="font-semibold text-ink">{from.toLocaleString("es-MX")}–{to.toLocaleString("es-MX")}</span> de{" "}
        <span className="font-semibold text-ink">{total.toLocaleString("es-MX")}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:bg-brand-50 disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p, i) => (
          <span key={p} className="flex items-center">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-subtle">…</span>}
            <button
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "h-9 min-w-9 rounded-xl px-2 text-sm font-semibold",
                p === page ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-brand-50",
              )}
            >
              {p}
            </button>
          </span>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pageCount}
          className="grid size-9 place-items-center rounded-xl border border-line text-ink-soft hover:bg-brand-50 disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className={cn("scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-canvas p-1 ring-1 ring-line-soft", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl font-semibold transition-all",
              size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
              active ? "bg-white text-brand-700 shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-brand-50 text-brand-700" : "bg-white text-muted")}>
                {it.count.toLocaleString("es-MX")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value, tone = "blue", className, label }: { value: number; tone?: "blue" | "orange" | "green"; className?: string; label?: string }) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line-soft", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "blue" && "bg-brand-gradient",
          tone === "orange" && "bg-accent-500",
          tone === "green" && "bg-emerald-500",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function InfoRow({ label, children, icon: Icon }: { label: string; children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />}
      <div className="min-w-0 flex-1">
        <dt className="text-[13px] font-medium text-muted">{label}</dt>
        <dd className="mt-0.5 text-[15px] font-semibold text-ink">{children}</dd>
      </div>
    </div>
  );
}

export function DemoTag({ className, children = "Demostración visual" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700 ring-1 ring-inset ring-accent-100", className)}>
      <span className="size-1.5 rounded-full bg-accent-500" aria-hidden />
      {children}
    </span>
  );
}
