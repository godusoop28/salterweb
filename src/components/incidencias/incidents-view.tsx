"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { InlineError, QueryState, Table } from "@/components/app/common";
import { GUIDE_STATUS, INCIDENT_TYPE, IncidentStatusBadge, SeverityBadge } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Card, EmptyState, InfoRow, PageHeader, Pagination } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useIncidents, useInvalidateOperation } from "@/lib/api/hooks";
import type { Incident, IncidentStatus } from "@/lib/api/types";
import { fmtDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDebounced } from "@/hooks/use-debounced";

export function IncidentsView() {
  const params = useSearchParams();
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(params.get("id") ? Number(params.get("id")) : null);
  const dq = useDebounced(q.trim());
  const list = useIncidents({ status: status || undefined, q: dq || undefined, page: page - 1 });
  return (
    <>
      <PageHeader title="Incidencias" description="Seguimiento y resolución. Al resolver, la guía vuelve a su estado previo, se retiene o se cancela." />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as IncidentStatus); setPage(1); }} aria-label="Estado">
          <option value="">Todas</option><option value="ABIERTA">Abiertas</option><option value="EN_REVISION">En revisión</option><option value="RESUELTA">Resueltas</option>
        </Select>
        <Input className="sm:col-span-2" placeholder="Folio de incidencia o de guía" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Buscar" />
      </Card>
      <Card>
        <QueryState loading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {list.data?.content.length === 0 ? <EmptyState icon={TriangleAlert} title="Sin incidencias" /> : (
            <>
              <Table head={["Folio", "Guía", "Tipo", "Severidad", "Estado", "Reportó", "Fecha"]}>
                {list.data?.content.map((i) => (
                  <tr key={i.id} className="cursor-pointer hover:bg-canvas" onClick={() => setOpenId(i.id)}>
                    <td className="px-4 py-3 font-mono font-semibold">{i.folio}</td>
                    <td className="px-4 py-3 font-mono text-brand-700">{i.guideFolio}</td>
                    <td className="px-4 py-3">{INCIDENT_TYPE[i.type]}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={i.severity} /></td>
                    <td className="px-4 py-3"><IncidentStatusBadge status={i.status} /></td>
                    <td className="px-4 py-3 text-ink-soft">{i.reportedByName}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{fmtDateTime(i.createdAt)}</td>
                  </tr>
                ))}
              </Table>
              {list.data && list.data.totalPages > 1 && <div className="border-t border-line-soft p-4"><Pagination page={page} pageCount={list.data.totalPages} total={list.data.totalElements} pageSize={list.data.size} onChange={setPage} /></div>}
            </>
          )}
        </QueryState>
      </Card>
      {openId && <IncidentDrawer key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function IncidentDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const { can } = useSession();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const q = useQuery({ queryKey: ["incidents", "detail", id], queryFn: () => api.get<Incident>(`/incidents/${id}`) });
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState("RESTAURAR");
  const [error, setError] = useState<string | null>(null);

  const addNote = useMutation({
    mutationFn: () => api.post<Incident>(`/incidents/${id}/notes`, { text: note }),
    onSuccess: async () => { setNote(""); await q.refetch(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const changeStatus = useMutation({
    mutationFn: (status: IncidentStatus) => api.post<Incident>(`/incidents/${id}/status`, { status, resolution: resolution || undefined, outcome, version: q.data!.version }),
    onSuccess: async (_, status) => { await invalidate(); await q.refetch(); toast.success(status === "RESUELTA" ? "Incidencia resuelta" : "Incidencia en revisión"); },
    onError: (e) => setError(errorMessage(e)),
  });

  const i = q.data;
  return (
    <Drawer open onClose={onClose} title={i ? `Incidencia ${i.folio}` : "Incidencia"}>
      <QueryState loading={q.isLoading} error={q.error}>
        {i && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><IncidentStatusBadge status={i.status} /><SeverityBadge severity={i.severity} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Guía"><Link href={`/guias/${i.guideId}`} className="font-mono text-brand-700">{i.guideFolio}</Link></InfoRow>
              <InfoRow label="Tipo">{INCIDENT_TYPE[i.type]}</InfoRow>
              <InfoRow label="Estado de la guía">{GUIDE_STATUS[i.guideStatus]?.label}</InfoRow>
              <InfoRow label="Estado previo">{GUIDE_STATUS[i.guideStatusBefore]?.label}</InfoRow>
              <InfoRow label="Reportó">{i.reportedByName} · {fmtDateTime(i.createdAt)}</InfoRow>
              {i.resolvedAt && <InfoRow label="Resuelta">{fmtDateTime(i.resolvedAt)}</InfoRow>}
            </div>
            <p className="rounded-2xl bg-canvas p-3 text-sm text-ink">{i.description}</p>
            {i.resolution && <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800"><strong>Resolución:</strong> {i.resolution}</p>}
            <div>
              <h4 className="mb-2 text-sm font-bold text-ink">Seguimiento</h4>
              <ul className="space-y-2">{i.notes.map((n) => <li key={n.id} className="rounded-xl border border-line-soft p-2.5 text-sm"><p className="text-ink">{n.text}</p><p className="text-[12px] text-muted">{n.authorName} · {fmtDateTime(n.createdAt)}</p></li>)}</ul>
              {i.status !== "RESUELTA" && (
                <div className="mt-2 flex gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota" aria-label="Nota" /><Button variant="outline" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>Agregar</Button></div>
              )}
            </div>
            {can("INCIDENTS_RESOLVE") && i.status !== "RESUELTA" && (
              <Card className="space-y-3 p-4">
                {i.status === "ABIERTA" && <Button variant="outline" size="sm" loading={changeStatus.isPending && changeStatus.variables === "EN_REVISION"} onClick={() => changeStatus.mutate("EN_REVISION")}>Marcar en revisión</Button>}
                <Field label="Resolución" required><Textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} /></Field>
                <Field label="Qué pasa con la guía">
                  <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                    <option value="RESTAURAR">Vuelve a «{GUIDE_STATUS[i.guideStatusBefore]?.label}»</option>
                    <option value="RETENER">Queda retenida</option>
                    <option value="CANCELAR">Se cancela</option>
                  </Select>
                </Field>
                <Button disabled={!resolution.trim()} loading={changeStatus.isPending && changeStatus.variables === "RESUELTA"} onClick={() => changeStatus.mutate("RESUELTA")}>Resolver incidencia</Button>
              </Card>
            )}
            <InlineError message={error} />
          </div>
        )}
      </QueryState>
    </Drawer>
  );
}
