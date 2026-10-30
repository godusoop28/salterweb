"use client";

/* eslint-disable @next/next/no-img-element -- evidencia en data URL */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CircleCheck, CircleDot, FilterX, MessageSquarePlus, Search, ShieldAlert, TriangleAlert, User, Truck, Package, Send, ImageOff } from "lucide-react";
import { IncidentStatusBadge, SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar, Select, Textarea } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Avatar, Card, EmptyState, PageHeader, Pagination, Tabs } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { IllustrativePhoto } from "@/components/shared/evidence";
import { useCurrentUser, useDemoState } from "@/hooks/use-demo";
import { INCIDENT_STATUS_LABEL, INCIDENT_TYPE_LABEL, SEVERITY_LABEL } from "@/lib/constants";
import { addIncidentNote, updateIncidentStatus } from "@/lib/services/salter-service";
import type { Incident, IncidentSeverity, IncidentStatus, IncidentType } from "@/lib/types";
import { cn, daysAgo, formatDate, formatDateTime, formatTime, normalize, relativeTime } from "@/lib/utils";
import { ReportIncidentModal } from "./report-incident-modal";

type Group = "abiertas" | "abierta" | "en_revision" | "resuelta" | "todas";
const PAGE_SIZE = 10;

export function IncidentsView() {
  const state = useDemoState();
  const user = useCurrentUser("admin");
  const params = useSearchParams();
  const [group, setGroup] = useState<Group>("abiertas");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity | "all">("all");
  const [type, setType] = useState<IncidentType | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const c = { abierta: 0, en_revision: 0, resuelta: 0 };
    for (const i of state.incidents) c[i.status]++;
    return c;
  }, [state.incidents]);

  const filtered = useMemo(() => {
    const term = normalize(query);
    return state.incidents.filter((i) => {
      if (group === "abiertas" && i.status === "resuelta") return false;
      if (group !== "abiertas" && group !== "todas" && i.status !== group) return false;
      if (severity !== "all" && i.severity !== severity) return false;
      if (type !== "all" && i.type !== type) return false;
      if (term && !normalize(`${i.folio} ${i.guia} ${i.description} ${i.reportedBy} ${INCIDENT_TYPE_LABEL[i.type]}`).includes(term)) return false;
      return true;
    });
  }, [state.incidents, group, severity, type, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selected = state.incidents.find((i) => i.id === selectedId);
  const resolved30 = state.incidents.filter((i) => i.status === "resuelta" && i.resolvedAt && daysAgo(i.resolvedAt) < 30).length;
  const highOpen = state.incidents.filter((i) => i.status !== "resuelta" && i.severity === "alta").length;
  const courierName = (id: string | null) => state.couriers.find((c) => c.id === id)?.name ?? "Centro de distribución";

  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="Seguimiento"
        title="Incidencias"
        description="Registra, atiende y resuelve los problemas que surgen durante las entregas."
        actions={
          <Button icon={<TriangleAlert className="size-5" />} onClick={() => setCreating(true)}>
            Registrar incidencia
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Abiertas" value={String(counts.abierta)} icon={CircleDot} tone="red" hint="Sin atender todavía" />
        <StatCard label="En revisión" value={String(counts.en_revision)} icon={Search} tone="orange" hint="Con seguimiento en curso" />
        <StatCard label="Resueltas · 30 días" value={String(resolved30)} icon={CircleCheck} tone="green" hint="Cerradas en el último mes" />
        <StatCard label="Severidad alta" value={String(highOpen)} icon={ShieldAlert} tone="navy" hint="Abiertas que requieren prioridad" />
      </section>

      <Card className="mt-6">
        <div className="space-y-4 border-b border-line-soft p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchBar value={query} onChange={reset(setQuery)} placeholder="Buscar por folio, guía, repartidor o descripción…" className="flex-1" label="Buscar incidencias" />
            <Select aria-label="Severidad" value={severity} onChange={(e) => reset(setSeverity)(e.target.value as IncidentSeverity | "all")} className="lg:w-44">
              <option value="all">Toda severidad</option>
              {(["alta", "media", "baja"] as const).map((s) => (
                <option key={s} value={s}>
                  Severidad {SEVERITY_LABEL[s].toLowerCase()}
                </option>
              ))}
            </Select>
            <Select aria-label="Motivo" value={type} onChange={(e) => reset(setType)(e.target.value as IncidentType | "all")} className="lg:w-56">
              <option value="all">Todos los motivos</option>
              {(Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[]).map((t) => (
                <option key={t} value={t}>
                  {INCIDENT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          <Tabs
            value={group}
            onChange={reset(setGroup)}
            items={[
              { value: "abiertas", label: "Por atender", count: counts.abierta + counts.en_revision },
              { value: "abierta", label: "Abiertas", count: counts.abierta },
              { value: "en_revision", label: "En revisión", count: counts.en_revision },
              { value: "resuelta", label: "Resueltas", count: counts.resuelta },
              { value: "todas", label: "Todas", count: state.incidents.length },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={group === "abiertas" ? CircleCheck : FilterX}
            title={group === "abiertas" && !query ? "¡Todo en orden!" : "Sin incidencias"}
            description={group === "abiertas" && !query ? "No hay incidencias pendientes por atender." : "No hay incidencias con estos filtros."}
          />
        ) : (
          <>
            <ul className="divide-y divide-line-soft">
              {rows.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => setSelectedId(i.id)}
                    className={cn("grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-brand-50/40 md:grid-cols-[minmax(0,2.2fr)_1.2fr_1fr_1fr_auto] md:items-center", selectedId === i.id && "bg-brand-50/60")}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
                          i.status === "resuelta" ? "bg-emerald-50 text-emerald-600" : i.severity === "alta" ? "bg-red-50 text-red-600" : "bg-accent-50 text-accent-600",
                        )}
                      >
                        {i.status === "resuelta" ? <CircleCheck className="size-5" aria-hidden /> : <TriangleAlert className="size-5" aria-hidden />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-ink">
                          {INCIDENT_TYPE_LABEL[i.type]} <span className="font-mono text-[13px] font-semibold text-muted">· {i.folio}</span>
                        </p>
                        <p className="line-clamp-1 text-[14px] text-muted">{i.description}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-mono font-bold text-ink">{i.guia}</p>
                      <p className="text-[13px] text-muted">{courierName(i.courierId)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start">
                      <SeverityBadge severity={i.severity} />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-ink-soft">{formatDate(i.createdAt)}</p>
                      <p className="text-[13px] text-muted">Resp.: {i.assignee}</p>
                    </div>
                    <IncidentStatusBadge status={i.status} />
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={current} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `Incidencia ${selected.folio}` : ""} description={selected ? INCIDENT_TYPE_LABEL[selected.type] : undefined} icon={<TriangleAlert className="size-5 text-accent-600" />}>
        {selected && <IncidentDetail incident={selected} authorName={user.name} />}
      </Drawer>
      <ReportIncidentModal open={creating} onClose={() => setCreating(false)} reportedBy={user.name} onCreated={(i) => setSelectedId(i.id)} />
    </>
  );
}

function IncidentDetail({ incident: i, authorName }: { incident: Incident; authorName: string }) {
  const state = useDemoState();
  const toast = useToast();
  const [note, setNote] = useState("");
  const shipment = state.shipments.find((s) => s.id === i.shipmentId);
  const courier = state.couriers.find((c) => c.id === i.courierId);

  const changeStatus = (status: IncidentStatus) => {
    updateIncidentStatus(i.id, status, note || (status === "resuelta" ? "Incidencia resuelta." : "Se inicia la revisión del caso."));
    setNote("");
    toast.success(`Incidencia ${INCIDENT_STATUS_LABEL[status].toLowerCase()}`, status === "resuelta" ? "El paquete regresó a la cola de reparto." : `${i.folio} quedó en revisión.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <IncidentStatusBadge status={i.status} />
        <SeverityBadge severity={i.severity} />
        <span className="text-[13px] text-muted">Reportada {relativeTime(i.createdAt)}</span>
      </div>

      <div className="rounded-2xl bg-canvas p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Descripción</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{i.description}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-3.5">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Package className="size-3.5" aria-hidden /> Paquete</dt>
          <dd className="mt-1">
            <Link href={`/paquetes/${i.guia}`} className="font-mono font-bold text-brand-600 hover:underline">{i.guia}</Link>
            {shipment && <div className="mt-1"><StatusBadge status={shipment.status} size="sm" /></div>}
          </dd>
        </div>
        <div className="rounded-2xl border border-line p-3.5">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Truck className="size-3.5" aria-hidden /> Repartidor</dt>
          <dd className="mt-1 font-bold text-ink">{courier?.name ?? "—"}</dd>
          <dd className="text-[13px] text-muted">{courier?.zone}</dd>
        </div>
        <div className="rounded-2xl border border-line p-3.5">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><User className="size-3.5" aria-hidden /> Reportó</dt>
          <dd className="mt-1 font-bold text-ink">{i.reportedBy}</dd>
          <dd className="text-[13px] text-muted">{formatDateTime(i.createdAt)}</dd>
        </div>
        <div className="rounded-2xl border border-line p-3.5">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><ShieldAlert className="size-3.5" aria-hidden /> Responsable</dt>
          <dd className="mt-1 font-bold text-ink">{i.assignee}</dd>
          <dd className="text-[13px] text-muted">{i.resolvedAt ? `Resuelta ${formatDate(i.resolvedAt)}` : "Seguimiento activo"}</dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-3 font-bold text-ink">Evidencia</h3>
        <div className="h-48 overflow-hidden rounded-2xl border border-line">
          {i.evidence ? (
            <img src={i.evidence} alt="Evidencia de la incidencia" className="h-full w-full object-cover" />
          ) : i.hasEvidence ? (
            <IllustrativePhoto seed={i.folio.length + Number(i.id.replace(/\D/g, ""))} />
          ) : (
            <div className="grid h-full place-items-center bg-canvas text-center text-muted">
              <div>
                <ImageOff className="mx-auto size-8 text-subtle" aria-hidden />
                <p className="mt-2 text-sm">No se adjuntó fotografía</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold text-ink">Seguimiento</h3>
        {i.notes.length ? (
          <ol className="space-y-3">
            {i.notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <Avatar name={n.author} size="sm" />
                <div className="flex-1 rounded-2xl rounded-tl-sm bg-canvas px-4 py-3">
                  <p className="flex flex-wrap justify-between gap-2 text-[13px]">
                    <span className="font-bold text-ink">{n.author}</span>
                    <span className="text-muted">{formatDate(n.date)} · {formatTime(n.date)}</span>
                  </p>
                  <p className="mt-1 text-[15px] text-ink-soft">{n.text}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Todavía no hay comentarios de seguimiento.</p>
        )}
      </div>

      {i.status !== "resuelta" && (
        <div className="space-y-3 rounded-2xl border border-line p-4">
          <label htmlFor="incident-note" className="text-sm font-semibold text-ink-soft">Agregar comentario como {authorName}</label>
          <Textarea id="incident-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Se confirmó la nueva dirección con el destinatario." />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Send className="size-4" />}
              disabled={!note.trim()}
              onClick={() => {
                addIncidentNote(i.id, note);
                setNote("");
                toast.success("Comentario agregado");
              }}
            >
              Comentar
            </Button>
            {i.status === "abierta" && (
              <Button variant="soft" size="sm" icon={<MessageSquarePlus className="size-4" />} onClick={() => changeStatus("en_revision")}>
                Pasar a revisión
              </Button>
            )}
            <Button size="sm" icon={<CircleCheck className="size-4" />} onClick={() => changeStatus("resuelta")}>
              Marcar como resuelta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
