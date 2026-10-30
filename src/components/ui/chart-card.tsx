"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useHydrated } from "@/hooks/use-demo";
import { cn } from "@/lib/utils";
import { Card, CardHeader, Skeleton } from "./primitives";

/** Paleta categórica validada (CVD) derivada de la marca. Orden fijo, nunca se recicla. */
export const CHART_COLORS = {
  blue: "#0A5BD3",
  orange: "#FF7A00",
  sky: "#5FB8F0",
  grid: "#E9EEF5",
  axis: "#8492A9",
} as const;

export function ChartCard({
  title,
  description,
  icon,
  action,
  legend,
  children,
  height = 280,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  legend?: { label: string; color: string; dashed?: boolean }[];
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  const hydrated = useHydrated();
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} description={description} icon={icon} action={action} />
      {legend && legend.length > 1 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 px-5 pt-3 sm:px-6" aria-label="Leyenda">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
              <span className="h-2.5 w-4 rounded-full" style={{ background: l.color }} aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 pt-4 pb-4 sm:px-4" style={{ height: height + 32 }}>
        {hydrated ? children : <Skeleton className="h-full w-full rounded-2xl" />}
      </div>
    </Card>
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Tooltip consistente para todas las gráficas de Recharts. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-2xl border border-line bg-white px-4 py-3 shadow-pop">
      {label !== undefined && <p className="mb-2 text-[13px] font-bold text-ink">{label}</p>}
      <ul className="space-y-1.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-2 text-ink-soft">
              <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-bold text-ink tabular-nums">
              {typeof p.value === "number" ? p.value.toLocaleString("es-MX") : String(p.value)}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
