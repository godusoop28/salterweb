"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, ClipboardCheck, ClipboardList, Download, Eye, Lock, Plus, Printer, RotateCcw, Save, ShieldCheck, Trash2, TriangleAlert, Truck, Unlock,
} from "lucide-react";
import { InlineError, ProvisionalNote, QueryState, Table } from "@/components/app/common";
import { GuideStatusBadge, ManifestStatusBadge } from "@/components/app/status";
import { printPdf } from "@/components/guias/guide-print";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Card, EmptyState, InfoRow, PageHeader, Pagination } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, downloadFile, errorMessage } from "@/lib/api/client";
import { useCouriers, useEligibleGuides, useInvalidateOperation, useManifest, useManifests, useSenders, useShifts, useShippingRoutes } from "@/lib/api/hooks";
import type { GuideSummary, Manifest, ManifestStatus } from "@/lib/api/types";
import { fmtDate, fmtDateTime, printedFolio, todayKey } from "@/lib/format";
import { useSession } from "@/lib/session";

export function ManifestsList() {
  const { can } = useSession();
  const router = useRouter();
  const routes = useShippingRoutes();
  const [status, setStatus] = useState<ManifestStatus | "">("");
  const [routeId, setRouteId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const q = useManifests({ status: status || undefined, shippingRouteId: routeId ? Number(routeId) : undefined, from: from || undefined, to: to || undefined, page: page - 1 });
  return (
    <>
      <PageHeader title="Manifiestos y salidas" description="Organizados por ruta de embarque: las guías confirmadas entran solas al manifiesto en preparación de su ruta. Se cierran, el encargado autoriza la salida y después se registra el despacho."
        actions={can("MANIFESTS_MANAGE") && <ButtonLink href="/manifiestos/nuevo" icon={<Plus className="size-4" />}>Nuevo manifiesto</ButtonLink>} />
      <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ManifestStatus); setPage(1); }} aria-label="Estado">
          <option value="">Estado (todos)</option><option value="BORRADOR">En preparación</option><option value="CERRADO">Cerrado</option><option value="DESPACHADO">Despachado</option>
        </Select>
        <Select value={routeId} onChange={(e) => { setRouteId(e.target.value); setPage(1); }} aria-label="Ruta de embarque">
          <option value="">Ruta (todas)</option>
          {routes.data?.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" title="Desde" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" title="Hasta" />
      </Card>
      <Card>
        <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
          {q.data?.content.length === 0 ? <EmptyState icon={ClipboardList} title="Sin manifiestos" description="Se crean solos al confirmar guías de un remitente con ruta de embarque, o manualmente." /> : (
            <>
              <Table head={["Número", "Estado", "Ruta de embarque", "Fecha", "Turno", "Guías", "Salida", "Elaboró"]}>
                {q.data?.content.map((m) => (
                  <tr key={m.id} className="cursor-pointer hover:bg-canvas" onClick={() => router.push(`/manifiestos/${m.id}`)}>
                    <td className="px-4 py-3 font-mono font-semibold text-brand-700">{m.number}</td>
                    <td className="px-4 py-3"><ManifestStatusBadge status={m.status} /></td>
                    <td className="px-4 py-3">{m.shippingRoute?.name ?? <span className="text-muted">Sin ruta</span>}</td>
                    <td className="px-4 py-3">{fmtDate(m.operationDate)}</td>
                    <td className="px-4 py-3">{m.shift?.name ?? "—"}</td>
                    <td className="px-4 py-3">{m.guideCount}</td>
                    <td className="px-4 py-3">{m.status === "DESPACHADO" ? <Badge tone="green" size="sm">Despachado</Badge> : m.authorized ? <Badge tone="blue" size="sm">Autorizada</Badge> : m.status === "CERRADO" ? <Badge tone="orange" size="sm">Por autorizar</Badge> : "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{m.createdBy.name}</td>
                  </tr>
                ))}
              </Table>
              {q.data && q.data.totalPages > 1 && <div className="border-t border-line-soft p-4"><Pagination page={page} pageCount={q.data.totalPages} total={q.data.totalElements} pageSize={q.data.size} onChange={setPage} /></div>}
            </>
          )}
        </QueryState>
      </Card>
    </>
  );
}

/** Elaboración / edición manual del manifiesto: selección de guías confirmadas pendientes. */
export function ManifestBuilder({ existing }: { existing?: Manifest }) {
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const shifts = useShifts();
  const senders = useSenders({ active: true });
  const routes = useShippingRoutes(true);
  const [date, setDate] = useState(existing?.operationDate ?? todayKey());
  const [shiftId, setShiftId] = useState(existing?.shift ? String(existing.shift.id) : "");
  const [senderId, setSenderId] = useState(existing?.sender ? String(existing.sender.id) : "");
  const [routeId, setRouteId] = useState(existing?.shippingRoute ? String(existing.shippingRoute.id) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(existing?.guides.map((g) => g.id) ?? []));
  const [error, setError] = useState<string | null>(null);
  const eligible = useEligibleGuides({ shiftId: shiftId ? Number(shiftId) : undefined, senderId: senderId ? Number(senderId) : undefined, shippingRouteId: routeId ? Number(routeId) : undefined });
  const rows = useMemo(() => {
    const list = [...(existing?.guides ?? []), ...(eligible.data?.content ?? [])];
    return list.filter((g, i) => list.findIndex((x) => x.id === g.id) === i);
  }, [existing, eligible.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = { operationDate: date, shiftId: shiftId ? Number(shiftId) : undefined, senderId: senderId ? Number(senderId) : undefined,
        shippingRouteId: routeId ? Number(routeId) : undefined, notes, guideIds: [...selected], version: existing?.version };
      return existing ? api.put<Manifest>(`/manifests/${existing.id}`, body) : api.post<Manifest>("/manifests", body);
    },
    onSuccess: async (m) => { await invalidate(); toast.success(`Manifiesto ${m.number} guardado`, "Queda en preparación hasta que lo cierres."); router.push(`/manifiestos/${m.id}`); },
    onError: (e) => setError(errorMessage(e)),
  });
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = rows.length > 0 && rows.every((g) => selected.has(g.id));
  const pieces = rows.filter((g) => selected.has(g.id)).reduce((s, g) => s + (g.packageCount ?? 0), 0);

  return (
    <>
      <PageHeader title={existing ? `Editar ${existing.number}` : "Nuevo manifiesto"} description="Selecciona las guías confirmadas. Si eliges ruta de embarque, sólo puede haber un manifiesto en preparación por ruta." />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm font-semibold text-ink">{selected.size} de {rows.length} guías · {pieces} piezas</p>
            <Button size="sm" variant="soft" onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((g) => g.id)))}>{allSelected ? "Quitar todas" : "Seleccionar todas"}</Button>
          </div>
          <QueryState loading={eligible.isLoading} error={eligible.error}>
            {rows.length === 0 ? <EmptyState icon={ClipboardList} title="No hay guías confirmadas pendientes" description="Las guías aparecen aquí cuando se confirman y aún no pertenecen a un manifiesto." /> : (
              <Table head={["", "Folio", "Cliente", "Ruta", "Subruta", "Piezas", "Confirmada"]}>
                {rows.map((g) => (
                  <tr key={g.id} className="cursor-pointer hover:bg-canvas" onClick={() => toggle(g.id)}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} onClick={(e) => e.stopPropagation()} aria-label={`Seleccionar ${g.reference}`} /></td>
                    <td className="px-4 py-3 font-mono font-semibold">{g.reference}</td>
                    <td className="px-4 py-3">{g.recipientName}<p className="text-[13px] text-muted">{g.senderName}</p></td>
                    <td className="px-4 py-3">{g.shippingRoute?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono">{g.subRoute ?? "—"}</td>
                    <td className="px-4 py-3">{g.packageCount ?? "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{fmtDateTime(g.confirmedAt)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>
        <Card className="space-y-4 p-5 xl:sticky xl:top-24 xl:self-start">
          <Field label="Ruta de embarque" hint="Recomendado: organiza el manifiesto por ruta"><Select value={routeId} onChange={(e) => setRouteId(e.target.value)}><option value="">Sin ruta</option>{routes.data?.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}</Select></Field>
          <Field label="Fecha de operación" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Turno"><Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}><option value="">Todos</option>{shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Remitente" hint="Opcional: limita el manifiesto a un remitente"><Select value={senderId} onChange={(e) => setSenderId(e.target.value)}><option value="">Varios</option>{senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Observaciones"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <InlineError message={error} />
          <Button className="w-full" size="lg" icon={<Save className="size-5" />} loading={save.isPending} disabled={selected.size === 0 || !date} onClick={() => { setError(null); save.mutate(); }}>Guardar</Button>
          <ProvisionalNote>el formato impreso del manifiesto es provisional hasta recibir el del cliente.</ProvisionalNote>
        </Card>
      </div>
    </>
  );
}

type DialogKind = "close" | "authorize" | "dispatch" | "reopen" | "delete" | null;

export function ManifestDetail({ id }: { id: number }) {
  const q = useManifest(id);
  const toast = useToast();
  const router = useRouter();
  const invalidate = useInvalidateOperation();
  const { can } = useSession();
  const couriers = useCouriers(true, can("DISPATCH_REGISTER"));
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [travel, setTravel] = useState<{ guide: GuideSummary; travels: boolean; reason: string } | null>(null);
  const [courierId, setCourierId] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [authNotes, setAuthNotes] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const act = useMutation({
    mutationFn: async (kind: Exclude<DialogKind, null>) => {
      const m = q.data!;
      if (kind === "close") return api.post<Manifest>(`/manifests/${m.id}/close`, undefined, { version: m.version });
      if (kind === "reopen") return api.post<Manifest>(`/manifests/${m.id}/reopen`, { reason, version: m.version });
      if (kind === "authorize") return api.post<Manifest>(`/manifests/${m.id}/authorize`, { notes: authNotes || undefined, version: m.version });
      if (kind === "delete") { await api.del(`/manifests/${m.id}`, { version: m.version }); return null; }
      return api.post<Manifest>(`/manifests/${m.id}/dispatch`, { courierId: courierId ? Number(courierId) : undefined, vehicle, notes, version: m.version });
    },
    onSuccess: async (m, kind) => {
      await invalidate();
      setDialog(null);
      if (kind === "delete") { toast.success("Manifiesto eliminado"); router.push("/manifiestos"); return; }
      toast.success(kind === "dispatch" ? `Salida registrada: ${m?.dispatch?.guideCount ?? 0} guías en tránsito` : kind === "close" ? "Manifiesto cerrado: pendiente de autorización de salida"
        : kind === "authorize" ? "Salida autorizada" : "Manifiesto reabierto");
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const travelMut = useMutation({
    mutationFn: () => api.post<Manifest>(`/manifests/${q.data!.id}/guides/${travel!.guide.id}/travel`, { travels: travel!.travels, reason: travel!.reason || undefined }),
    onSuccess: async () => { await invalidate(); toast.success(travel!.travels ? "La guía viaja" : "Marcada como «No viaja»"); setTravel(null); },
    onError: (e) => setError(errorMessage(e)),
  });

  const pdf = (mode: "preview" | "download" | "print") => {
    const m = q.data!;
    const path = `/manifests/${m.id}/pdf`;
    const p = mode === "print"
      ? printPdf(path)
      : downloadFile(path, `manifiesto-${m.number}.pdf`, undefined, mode === "preview");
    p.catch((e) => toast.error("No se pudo generar el PDF", errorMessage(e)));
  };

  return (
    <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && (editing ? <ManifestBuilder existing={q.data} /> : (() => {
        const m = q.data;
        const a = new Set(m.allowedActions);
        const entry = (gid: number) => m.entries.find((e) => e.guideId === gid && e.active);
        const r = m.review;
        return (
          <>
            <Link href="/manifiestos" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand-600"><ArrowLeft className="size-4" /> Manifiestos</Link>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">Manifiesto{m.shippingRoute ? ` · ruta ${m.shippingRoute.name}` : ""}</p>
                <h1 className="font-mono text-3xl font-bold text-ink">{m.number}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ManifestStatusBadge status={m.status} />
                  {m.status === "CERRADO" && (m.authorization ? <Badge tone="blue" icon={ShieldCheck}>Salida autorizada</Badge> : <Badge tone="orange">Pendiente de autorización</Badge>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.has("EDIT") && <Button variant="outline" onClick={() => setEditing(true)}>Editar guías</Button>}
                {a.has("CLOSE") && <Button icon={<Lock className="size-4" />} onClick={() => { setError(null); setDialog("close"); }}>Revisar y cerrar</Button>}
                {a.has("AUTHORIZE") && <Button icon={<ShieldCheck className="size-4" />} onClick={() => { setError(null); setDialog("authorize"); }}>Autorizar salida</Button>}
                {a.has("DISPATCH") && <Button icon={<Truck className="size-4" />} onClick={() => { setError(null); setDialog("dispatch"); }}>Registrar despacho</Button>}
                {a.has("REOPEN") && <Button variant="outline" icon={<Unlock className="size-4" />} onClick={() => { setError(null); setDialog("reopen"); }}>Reabrir</Button>}
                <Button variant="outline" icon={<Eye className="size-4" />} onClick={() => pdf("preview")}>Vista previa</Button>
                <Button variant="outline" icon={<Printer className="size-4" />} onClick={() => pdf("print")}>Imprimir</Button>
                <Button variant="outline" icon={<Download className="size-4" />} onClick={() => pdf("download")}>PDF</Button>
                {a.has("DELETE") && <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={() => setDialog("delete")}>Eliminar</Button>}
              </div>
            </div>

            <ManifestReviewPanel m={m} />

            <Card className="my-5 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <InfoRow label="Ruta de embarque">{m.shippingRoute?.name ?? "Sin ruta"}</InfoRow>
              <InfoRow label="Fecha de operación">{fmtDate(m.operationDate)}</InfoRow>
              <InfoRow label="Turno">{m.shift?.name ?? "—"}</InfoRow>
              <InfoRow label="Remitente">{m.sender?.name ?? "Varios"}</InfoRow>
              <InfoRow label="Elaboró">{m.createdBy.name}</InfoRow>
              <InfoRow label="Cerró (confirmó)">{m.closedAt ? `${m.closedBy?.name ?? ""} · ${fmtDateTime(m.closedAt)}` : "—"}</InfoRow>
              <InfoRow label="Autorizó salida">{m.authorization ? `${m.authorization.authorizedBy?.name ?? ""} · ${fmtDateTime(m.authorization.authorizedAt)}` : "Pendiente"}</InfoRow>
              <InfoRow label="Despacho">{m.dispatch ? `${m.dispatch.dispatchedBy?.name ?? ""} · ${fmtDateTime(m.dispatch.dispatchedAt)}${m.dispatch.vehicle ? ` · ${m.dispatch.vehicle}` : ""}` : "Pendiente"}</InfoRow>
              {m.authorization?.notes && <div className="sm:col-span-4"><InfoRow label="Observaciones de la autorización">{m.authorization.notes}</InfoRow></div>}
              {m.notes && <div className="sm:col-span-4"><InfoRow label="Observaciones">{m.notes}</InfoRow></div>}
            </Card>

            <Card>
              <Table head={["Folio", "Estado", "Cliente", "Subruta", "Pedidos", "Bultos", "Piezas", "Viaja"]}>
                {m.guides.map((g) => {
                  const e = entry(g.id);
                  return (
                    <tr key={g.id} className="hover:bg-canvas">
                      <td className="px-4 py-3 font-mono font-semibold text-brand-700"><Link href={`/guias/${g.id}`}>{g.folio ? printedFolio(g.folio) : g.reference}</Link></td>
                      <td className="px-4 py-3"><GuideStatusBadge status={g.status} size="sm" /></td>
                      <td className="px-4 py-3">{g.recipientName}</td>
                      <td className="px-4 py-3 font-mono">{g.subRoute ?? "—"}</td>
                      <td className="px-4 py-3">{e?.orders ?? 0}</td>
                      <td className="px-4 py-3 text-[13px]">{e ? Object.entries(e.piecesByType).map(([t, n]) => `${n} ${t}`).join(", ") : "—"}</td>
                      <td className="px-4 py-3 font-bold">{g.packageCount ?? "—"}</td>
                      <td className="px-4 py-3">
                        {e?.travels === false ? (
                          <div>
                            <Badge tone="orange" size="sm">No viaja</Badge>
                            {e.travelReason && <p className="mt-0.5 max-w-48 text-[12px] text-muted" title={e.travelReason}>{e.travelReason}</p>}
                            {e.travelChangedBy && <p className="text-[11px] text-subtle">{e.travelChangedBy.name} · {fmtDateTime(e.travelChangedAt)}</p>}
                          </div>
                        ) : <Badge tone="green" size="sm">Sí</Badge>}
                        {a.has("TRAVEL") && (
                          <button type="button" className="mt-1 block text-[12px] font-semibold text-brand-700" onClick={() => { setError(null); setTravel({ guide: g, travels: e?.travels === false, reason: "" }); }}>
                            {e?.travels === false ? "Marcar «Viaja»" : "Marcar «No viaja»"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </Card>

            {m.notTravelledHistory.length > 0 && (
              <Card className="mt-5 p-5">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-subtle">No viajaron en este manifiesto (historial)</h3>
                <ul className="space-y-1 text-sm">
                  {m.notTravelledHistory.map((g) => {
                    const e = m.entries.find((x) => x.guideId === g.id && !x.active);
                    return <li key={g.id}><Link href={`/guias/${g.id}`} className="font-mono font-semibold text-brand-700">{g.folio ? printedFolio(g.folio) : g.reference}</Link> · {g.recipientName} · {e?.travelReason ?? ""} <span className="text-muted">({g.statusLabel})</span></li>;
                  })}
                </ul>
              </Card>
            )}

            {/* Cerrar = confirmar el manifiesto tras revisar totales */}
            <Modal open={dialog === "close"} onClose={() => setDialog(null)} size="lg" icon={<ClipboardCheck className="size-5 text-brand-600" />} title="Revisar y cerrar el manifiesto"
              description="Compara las cantidades. Al cerrar, las guías que viajan quedan «Listas para salida». Cerrar NO registra la salida: el encargado la autoriza después."
              footer={<><Button variant="outline" onClick={() => setDialog(null)} autoFocus>Cancelar</Button><Button loading={act.isPending} disabled={r.travelling === 0} icon={<Lock className="size-4" />} onClick={() => act.mutate("close")}>Cerrar manifiesto</Button></>}>
              <ManifestReviewPanel m={m} compact />
              <div className="mt-3"><InlineError message={error} /></div>
            </Modal>
            <Modal open={dialog === "authorize"} onClose={() => setDialog(null)} size="lg" icon={<ShieldCheck className="size-5 text-brand-600" />} title="Autorizar salida"
              description={`Confirmas que ${r.travelling} guías (${r.travellingPieces} piezas) pueden salir en la ruta ${m.shippingRoute?.name ?? "—"}. Queda registrado tu nombre, la fecha y tus observaciones.`}
              footer={<><Button variant="outline" onClick={() => setDialog(null)} autoFocus>Cancelar</Button><Button loading={act.isPending} icon={<ShieldCheck className="size-4" />} onClick={() => act.mutate("authorize")}>Autorizar salida</Button></>}>
              <ManifestReviewPanel m={m} compact />
              <Field label="Observaciones (opcional)" className="mt-3"><Textarea rows={2} value={authNotes} onChange={(e) => setAuthNotes(e.target.value)} /></Field>
              <div className="mt-3"><InlineError message={error} /></div>
            </Modal>
            <ConfirmDialog open={dialog === "delete"} onClose={() => setDialog(null)} onConfirm={() => act.mutate("delete")}
              title="¿Eliminar el manifiesto en preparación?" description="Las guías vuelven a estar disponibles para otro manifiesto." confirmLabel="Eliminar" />
            <Modal open={dialog === "dispatch"} onClose={() => setDialog(null)} title="Registrar despacho" description={`${r.travelling} guías pasarán a «En tránsito». ${r.notTravelling ? `${r.notTravelling} que no viajan se quedan y pasan al siguiente manifiesto de la ruta.` : ""}`}
              footer={<><Button variant="outline" onClick={() => setDialog(null)} autoFocus>Cancelar</Button><Button loading={act.isPending} icon={<Truck className="size-4" />} onClick={() => act.mutate("dispatch")}>Registrar salida</Button></>}>
              <div className="space-y-4">
                <Field label="Repartidor / operador (opcional)" hint="Si lo eliges, se le asignan las guías que viajan"><Select value={courierId} onChange={(e) => setCourierId(e.target.value)}><option value="">Sin asignar</option>{couriers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                <Field label="Vehículo"><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></Field>
                <Field label="Observaciones"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                <InlineError message={error} />
              </div>
            </Modal>
            <Modal open={dialog === "reopen"} onClose={() => setDialog(null)} title="Reabrir manifiesto" description="Las guías regresan a «Confirmada», el manifiesto vuelve a preparación y la autorización de salida se anula."
              footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button><Button loading={act.isPending} disabled={reason.trim().length < 3} icon={<RotateCcw className="size-4" />} onClick={() => act.mutate("reopen")}>Reabrir</Button></>}>
              <Field label="Motivo" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <div className="mt-3"><InlineError message={error} /></div>
            </Modal>
            <Modal open={!!travel} onClose={() => setTravel(null)} size="sm" title={travel?.travels ? "¿La guía viaja?" : "Marcar «No viaja»"}
              description={travel?.travels ? "La guía volverá a contarse para el despacho." : "No se despachará ni se contará como despachada; conserva su estado y pasa al siguiente manifiesto de la ruta."}
              footer={<><Button variant="outline" onClick={() => setTravel(null)}>Cancelar</Button>
                <Button loading={travelMut.isPending} disabled={!travel?.travels && !travel?.reason.trim()} onClick={() => travelMut.mutate()}>Confirmar</Button></>}>
              <p className="mb-3 text-sm font-semibold text-ink">{travel?.guide.folio ? printedFolio(travel.guide.folio) : travel?.guide.reference} · {travel?.guide.recipientName}</p>
              <Field label={travel?.travels ? "Observación (opcional)" : "Motivo"} required={!travel?.travels}>
                <Textarea rows={2} value={travel?.reason ?? ""} onChange={(e) => setTravel((t) => (t ? { ...t, reason: e.target.value } : t))} />
              </Field>
              <div className="mt-3"><InlineError message={error} /></div>
            </Modal>
          </>
        );
      })())}
    </QueryState>
  );
}

/** Resumen de revisión: totales, bultos por tipo, viaja / no viaja, comparación con el archivo y cambios de ruta. */
function ManifestReviewPanel({ m, compact = false }: { m: Manifest; compact?: boolean }) {
  const r = m.review;
  const stats: [string, string | number][] = [
    ["Guías", r.guides], ["Viajan", r.travelling], ["No viajan", r.notTravelling], ["Pedidos", r.orders], ["Cajas", r.boxes],
    ["Piezas", r.pieces], ["Piezas que viajan", r.travellingPieces],
  ];
  return (
    <Card className={compact ? "border-0 p-0 shadow-none" : "p-5"}>
      {!compact && <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-subtle">Revisión del manifiesto</h3>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-canvas px-3 py-2"><p className="text-[11px] font-bold uppercase tracking-wider text-subtle">{l}</p><p className="text-xl font-bold text-ink">{v}</p></div>
        ))}
      </div>
      {r.piecesByType.length > 0 && <p className="mt-3 text-sm text-ink-soft"><b>Bultos por tipo:</b> {r.piecesByType.map((t) => `${t.quantity} ${t.type}`).join(" · ")}</p>}
      {r.batches.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead><tr className="text-[11px] uppercase tracking-wider text-subtle"><th className="py-1">Archivo de carga</th><th>Declarados</th><th>En este manifiesto</th><th>En otros</th><th>Sin manifiesto</th><th>Diferencia</th></tr></thead>
            <tbody>{r.batches.map((b) => (
              <tr key={b.batchId}><td className="py-1">{b.load ?? b.fileName}</td><td>{b.declaredPackages ?? "—"}</td><td>{b.piecesInManifest}</td><td>{b.piecesInOtherManifests}</td><td>{b.piecesWithoutManifest}</td>
                <td className={b.difference ? "font-bold text-red-700" : "text-emerald-700"}>{b.difference ?? "—"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {r.routeChanges.length > 0 && (
        <div className="mt-3 text-[13px]">
          <p className="font-bold text-ink">Cambios de ruta</p>
          <ul className="mt-1 space-y-0.5 text-ink-soft">{r.routeChanges.map((c, i) => <li key={i}>{c.folio ?? c.guideId}: {c.from} → {c.to} · {c.by} · {fmtDateTime(c.at)}{c.reason ? ` · ${c.reason}` : ""}</li>)}</ul>
        </div>
      )}
      {r.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">{r.warnings.map((w) => <li key={w} className="flex items-start gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1.5 text-[13px] text-accent-700"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{w}</li>)}</ul>
      )}
    </Card>
  );
}
