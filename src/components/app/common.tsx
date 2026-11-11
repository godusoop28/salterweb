"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, LoadingState } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api/client";
import type { Movement } from "@/lib/api/types";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GUIDE_STATUS } from "./status";

/** Estado de carga / error / contenido para cualquier consulta. */
export function QueryState({ loading, error, onRetry, children, rows }: {
  loading: boolean; error: unknown; onRetry?: () => void; children: ReactNode; rows?: number;
}) {
  if (loading) return <LoadingState rows={rows} />;
  if (error) return <ErrorBox error={error} onRetry={onRetry} />;
  return <>{children}</>;
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <CircleAlert className="size-8 text-red-500" aria-hidden />
      <p className="font-semibold text-ink">{errorMessage(error)}</p>
      {onRetry && <Button variant="outline" size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>Reintentar</Button>}
    </Card>
  );
}

export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{message}</span>
    </div>
  );
}

export function ProvisionalNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-accent-100 bg-accent-50 px-3 py-2 text-[13px] text-accent-700">
      <strong>Provisional:</strong> {children}
    </p>
  );
}

/** Historial de movimientos de una guía (inmutable). */
export function MovementTimeline({ movements }: { movements: Movement[] }) {
  const list = [...movements].reverse();
  return (
    <ol className="relative space-y-5 border-l-2 border-line-soft pl-6">
      {list.map((m, i) => {
        const meta = GUIDE_STATUS[m.toStatus];
        const Icon = meta?.icon;
        return (
          <li key={m.id} className="relative">
            <span className={cn("absolute -left-[37px] grid size-7 place-items-center rounded-full ring-4 ring-white",
              i === 0 ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600")}>
              {Icon && <Icon className="size-3.5" aria-hidden />}
            </span>
            <p className="text-sm font-bold text-ink">{m.typeLabel}</p>
            <p className="text-[13px] text-muted">
              {fmtDateTime(m.occurredAt)}{m.userName ? ` · ${m.userName}` : ""}{m.location ? ` · ${m.location}` : ""}
            </p>
            {m.fromStatus !== m.toStatus && <p className="text-[13px] text-subtle">Estado: {meta?.label ?? m.toStatus}</p>}
            {m.notes && <p className="mt-1 rounded-lg bg-canvas px-2.5 py-1.5 text-sm text-ink-soft">{m.notes}</p>}
            {m.metadata && m.type === "CORRECCION" && (
              <ul className="mt-1 space-y-0.5 text-[13px] text-muted">
                {Object.entries(m.metadata).map(([k, v]) => {
                  const c = v as { antes?: string; despues?: string };
                  return <li key={k}><strong>{k}:</strong> {c.antes} → {c.despues}</li>;
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[12px] uppercase tracking-wider text-subtle">
            {head.map((h, i) => <th key={i} className="px-4 py-3 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">{children}</tbody>
      </table>
    </div>
  );
}
