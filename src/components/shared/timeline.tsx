import { Check, MapPin, User } from "lucide-react";
import { STATUS_FLOW, STATUS_LABEL } from "@/lib/constants";
import type { ShipmentEvent, ShipmentStatus } from "@/lib/types";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { STATUS_META } from "@/components/ui/badge";

const DOT_TONE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-brand-100 text-brand-700",
  sky: "bg-sky-100 text-sky-700",
  indigo: "bg-indigo-100 text-indigo-700",
  green: "bg-emerald-100 text-emerald-700",
  orange: "bg-accent-100 text-accent-700",
  red: "bg-red-100 text-red-700",
};

/** Línea de tiempo de movimientos; el evento más reciente aparece primero y resaltado. */
export function Timeline({ events, compact = false }: { events: ShipmentEvent[]; compact?: boolean }) {
  const ordered = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="relative">
      {ordered.map((e, i) => {
        const meta = STATUS_META[e.status];
        const Icon = meta.icon;
        const latest = i === 0;
        return (
          <li key={e.id} className={cn("relative flex gap-4", compact ? "pb-5" : "pb-7", "last:pb-0")}>
            {i < ordered.length - 1 && <span className="absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-line" aria-hidden />}
            <div
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-white",
                latest ? "bg-accent-500 text-white animate-pulse-ring" : DOT_TONE[meta.tone],
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </div>
            <div className={cn("min-w-0 flex-1 pt-0.5", latest && !compact && "rounded-2xl bg-accent-50/60 p-3 -mt-1.5 ring-1 ring-accent-100")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className={cn("font-bold", latest ? "text-ink" : "text-ink-soft")}>
                  {STATUS_LABEL[e.status]}
                  {latest && <span className="ml-2 text-xs font-bold uppercase tracking-wide text-accent-600">Actual</span>}
                </p>
                <time className="text-[13px] font-medium text-muted tabular-nums" dateTime={e.date}>
                  {formatDate(e.date)} · {formatTime(e.date)}
                </time>
              </div>
              <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">{e.description}</p>
              {!compact && (
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden /> {e.location}
                  </span>
                  {e.actor && (
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" aria-hidden /> {e.actor}
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Progreso visual del envío en 5 etapas. */
export function StatusStepper({ status, className }: { status: ShipmentStatus; className?: string }) {
  const exception = status === "pendiente" || status === "incidencia";
  const current = exception ? 3 : STATUS_FLOW.indexOf(status);
  return (
    <ol className={cn("grid grid-cols-5", className)} aria-label="Etapas del envío">
      {STATUS_FLOW.map((step, i) => {
        const done = i < current || status === "entregado";
        const active = i === current && status !== "entregado";
        const Icon = STATUS_META[step].icon;
        return (
          <li key={step} className="relative flex flex-col items-center text-center" aria-current={active ? "step" : undefined}>
            {i > 0 && (
              <span
                className={cn("absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded-full", i <= current || status === "entregado" ? "bg-brand-gradient" : "bg-line")}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-10 place-items-center rounded-full border-2 transition-all",
                done && "border-transparent bg-brand-500 text-white",
                active && !exception && "border-accent-500 bg-accent-500 text-white shadow-glow animate-pulse-ring",
                active && status === "pendiente" && "border-accent-500 bg-white text-accent-600",
                active && status === "incidencia" && "border-red-500 bg-white text-red-600",
                !done && !active && "border-line bg-white text-subtle",
              )}
            >
              {done ? <Check className="size-5" aria-hidden /> : <Icon className="size-[18px]" aria-hidden />}
            </span>
            <span className={cn("mt-2 px-0.5 text-[11px] font-semibold leading-tight sm:text-[13px]", done || active ? "text-ink" : "text-subtle")}>
              {active && exception ? STATUS_LABEL[status] : STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
