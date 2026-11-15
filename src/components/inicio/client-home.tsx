"use client";

import { FilePlus2, FileSpreadsheet, Package } from "lucide-react";
import { QueryState } from "@/components/app/common";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";
import { useDayStatus } from "@/lib/api/hooks";
import type { DayStatus } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { useSession } from "@/lib/session";

/** Colores validados (CVD y contraste) con validate_palette.js; siempre acompañados de etiqueta y cantidad. */
const BUCKETS = [
  { key: "delivered", pct: "deliveredPct", label: "Entregadas", color: "#0F9D6B", states: "Entrega final confirmada" },
  { key: "inTransit", pct: "inTransitPct", label: "En tránsito", color: "#0B5CD5", states: "En tránsito, recibida en destino o con incidencia" },
  { key: "pending", pct: "pendingPct", label: "Pendientes", color: "#E35D00", states: "Confirmada, lista para salida o retenida" },
] as const;

/** Inicio del portal del cliente: guías del día (hora de México) entregadas, en tránsito y pendientes. */
export function ClientHome() {
  const { me, can } = useSession();
  const q = useDayStatus();
  return (
    <>
      <PageHeader eyebrow={me?.sender?.name} title={`Hola, ${me?.fullName.split(" ")[0] ?? ""}`} description="Así van hoy las guías de tu empresa."
        actions={<>
          {can("GUIDES_CREATE") && <ButtonLink href="/guias/nueva" icon={<FilePlus2 className="size-4" />}>Nueva guía</ButtonLink>}
          {can("GUIDES_CREATE") && <ButtonLink href="/guias/importar" variant="outline" icon={<FileSpreadsheet className="size-4" />}>Guías desde archivo</ButtonLink>}
          <ButtonLink href="/guias" variant="outline" icon={<Package className="size-4" />}>Mis envíos</ButtonLink>
        </>} />
      <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {q.data && <DayChart d={q.data} />}
      </QueryState>
    </>
  );
}

function DayChart({ d }: { d: DayStatus }) {
  const parts = BUCKETS.map((b) => ({ ...b, count: d[b.key], percent: d[b.pct] }));
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-ink">Guías del día · {fmtDate(d.date)}</h2>
        <p className="text-sm text-muted"><b className="text-2xl text-ink">{d.total}</b> {d.total === 1 ? "guía confirmada hoy" : "guías confirmadas hoy"}</p>
      </div>
      {d.total === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Hoy aún no hay guías confirmadas.</p>
      ) : (
        <div className="mt-5 flex h-11 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img"
          aria-label={parts.map((p) => `${p.label}: ${p.count} (${p.percent}%)`).join(", ")}>
          {parts.filter((p) => p.count > 0).map((p) => (
            <div key={p.key} className="group relative h-full first:rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${(p.count / d.total) * 100}%`, background: p.color }}>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-[12px] text-white shadow-pop group-hover:block">
                {p.label}: {p.count} · {p.percent}%
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {parts.map((p) => (
          <div key={p.key} className="rounded-2xl border border-line p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><span className="size-3 rounded-sm" style={{ background: p.color }} aria-hidden />{p.label}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{p.count} <span className="text-lg font-semibold text-muted">{p.percent}%</span></p>
            <p className="mt-1 text-[12px] text-subtle">{p.states}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-subtle">Se cuentan las guías confirmadas hoy (hora de México), sin canceladas; cada guía está en una sola categoría según su estado actual, por eso los porcentajes suman 100%.</p>
    </Card>
  );
}
