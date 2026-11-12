"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, FileText, Lock, Plus, RotateCcw, Save, Trash2, Truck, Unlock } from "lucide-react";
import { InlineError, ProvisionalNote, QueryState, Table } from "@/components/app/common";
import { GuideStatusBadge, ManifestStatusBadge } from "@/components/app/status";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Card, EmptyState, InfoRow, PageHeader, Pagination } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, downloadFile, errorMessage } from "@/lib/api/client";
import { useCouriers, useEligibleGuides, useInvalidateOperation, useManifest, useManifests, useSenders, useShifts } from "@/lib/api/hooks";
import type { Manifest, ManifestStatus } from "@/lib/api/types";
import { fmtDate, fmtDateTime, todayKey } from "@/lib/format";
import { useSession } from "@/lib/session";

export function ManifestsList() {
  const { can } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<ManifestStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const q = useManifests({ status: status || undefined, from: from || undefined, to: to || undefined, page: page - 1 });
  return (
    <>
      <PageHeader title="Manifiestos y salidas" description="Agrupa guías confirmadas por turno o lote, ciérralos y autoriza la salida por separado."
        actions={can("MANIFESTS_MANAGE") && <ButtonLink href="/manifiestos/nuevo" icon={<Plus className="size-4" />}>Nuevo manifiesto</ButtonLink>} />
      <Card className="mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        <Select className="col-span-2 sm:col-span-1" value={status} onChange={(e) => { setStatus(e.target.value as ManifestStatus); setPage(1); }} aria-label="Estado">
          <option value="">Todos los estados</option><option value="BORRADOR">Borrador</option><option value="CERRADO">Cerrado</option><option value="DESPACHADO">Despachado</option>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" />
      </Card>
      <Card>
        <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
          {q.data?.content.length === 0 ? <EmptyState icon={ClipboardList} title="Sin manifiestos" /> : (
            <>
              <Table head={["Número", "Estado", "Fecha", "Turno", "Remitente", "Guías", "Elaboró"]}>
                {q.data?.content.map((m) => (
                  <tr key={m.id} className="cursor-pointer hover:bg-canvas" onClick={() => router.push(`/manifiestos/${m.id}`)}>
                    <td className="px-4 py-3 font-mono font-semibold text-brand-700">{m.number}</td>
                    <td className="px-4 py-3"><ManifestStatusBadge status={m.status} /></td>
                    <td className="px-4 py-3">{fmtDate(m.operationDate)}</td>
                    <td className="px-4 py-3">{m.shift?.name ?? "—"}</td>
                    <td className="px-4 py-3">{m.sender?.name ?? "Varios"}</td>
                    <td className="px-4 py-3">{m.guideCount}</td>
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

/** Elaboración / edición del manifiesto: selección de guías confirmadas pendientes. */
export function ManifestBuilder({ existing }: { existing?: Manifest }) {
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const shifts = useShifts();
  const senders = useSenders({ active: true });
  const [date, setDate] = useState(existing?.operationDate ?? todayKey());
  const [shiftId, setShiftId] = useState(existing?.shift ? String(existing.shift.id) : "");
  const [senderId, setSenderId] = useState(existing?.sender ? String(existing.sender.id) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(existing?.guides.map((g) => g.id) ?? []));
  const [error, setError] = useState<string | null>(null);
  const eligible = useEligibleGuides({ shiftId: shiftId ? Number(shiftId) : undefined, senderId: senderId ? Number(senderId) : undefined });
  const rows = useMemo(() => {
    const list = [...(existing?.guides ?? []), ...(eligible.data?.content ?? [])];
    return list.filter((g, i) => list.findIndex((x) => x.id === g.id) === i);
  }, [existing, eligible.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = { operationDate: date, shiftId: shiftId ? Number(shiftId) : undefined, senderId: senderId ? Number(senderId) : undefined, notes, guideIds: [...selected], version: existing?.version };
      return existing ? api.put<Manifest>(`/manifests/${existing.id}`, body) : api.post<Manifest>("/manifests", body);
    },
    onSuccess: async (m) => { await invalidate(); toast.success(`Manifiesto ${m.number} guardado`, "Queda en borrador hasta que lo cierres."); router.push(`/manifiestos/${m.id}`); },
    onError: (e) => setError(errorMessage(e)),
  });
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = rows.length > 0 && rows.every((g) => selected.has(g.id));

  return (
    <>
      <PageHeader title={existing ? `Editar ${existing.number}` : "Nuevo manifiesto"} description="Selecciona las guías confirmadas que integran el turno o lote." />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm font-semibold text-ink">{selected.size} de {rows.length} guías seleccionadas</p>
            <Button size="sm" variant="soft" onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((g) => g.id)))}>{allSelected ? "Quitar todas" : "Seleccionar todas"}</Button>
          </div>
          <QueryState loading={eligible.isLoading} error={eligible.error}>
            {rows.length === 0 ? <EmptyState icon={ClipboardList} title="No hay guías confirmadas pendientes" description="Las guías aparecen aquí cuando se confirman y aún no pertenecen a un manifiesto." /> : (
              <Table head={["", "Folio", "Destinatario", "Remitente", "Turno", "Bultos", "Confirmada"]}>
                {rows.map((g) => (
                  <tr key={g.id} className="cursor-pointer hover:bg-canvas" onClick={() => toggle(g.id)}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} onClick={(e) => e.stopPropagation()} aria-label={`Seleccionar ${g.reference}`} /></td>
                    <td className="px-4 py-3 font-mono font-semibold">{g.reference}</td>
                    <td className="px-4 py-3">{g.recipientName}<p className="text-[13px] text-muted">{g.recipientCity ?? ""}</p></td>
                    <td className="px-4 py-3">{g.senderName}</td>
                    <td className="px-4 py-3">{g.shift?.name ?? "—"}</td>
                    <td className="px-4 py-3">{g.packageCount}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{fmtDateTime(g.confirmedAt)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryState>
        </Card>
        <Card className="space-y-4 p-5 xl:sticky xl:top-24 xl:self-start">
          <Field label="Fecha de operación" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Turno"><Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}><option value="">Todos</option>{shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Remitente" hint="Opcional: limita el manifiesto a un remitente"><Select value={senderId} onChange={(e) => setSenderId(e.target.value)}><option value="">Varios</option>{senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Observaciones"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <InlineError message={error} />
          <Button className="w-full" size="lg" icon={<Save className="size-5" />} loading={save.isPending} disabled={selected.size === 0 || !date} onClick={() => { setError(null); save.mutate(); }}>Guardar borrador</Button>
          <ProvisionalNote>estados y formato del manifiesto pendientes de validar con el cliente.</ProvisionalNote>
        </Card>
      </div>
    </>
  );
}

export function ManifestDetail({ id }: { id: number }) {
  const q = useManifest(id);
  const toast = useToast();
  const router = useRouter();
  const invalidate = useInvalidateOperation();
  const { can } = useSession();
  const couriers = useCouriers(true, can("DISPATCH_AUTHORIZE"));
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<"close" | "dispatch" | "reopen" | "delete" | null>(null);
  const [courierId, setCourierId] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const act = useMutation({
    mutationFn: async (kind: "close" | "dispatch" | "reopen" | "delete") => {
      const m = q.data!;
      if (kind === "close") return api.post<Manifest>(`/manifests/${m.id}/close`, undefined, { version: m.version });
      if (kind === "reopen") return api.post<Manifest>(`/manifests/${m.id}/reopen`, { reason, version: m.version });
      if (kind === "delete") { await api.del(`/manifests/${m.id}`, { version: m.version }); return null; }
      return api.post<Manifest>(`/manifests/${m.id}/dispatch`, { courierId: courierId ? Number(courierId) : undefined, vehicle, notes, version: m.version });
    },
    onSuccess: async (m, kind) => {
      await invalidate();
      setDialog(null);
      if (kind === "delete") { toast.success("Manifiesto eliminado"); router.push("/manifiestos"); return; }
      toast.success(kind === "dispatch" ? `Salida autorizada: ${m?.guideCount} guías en tránsito` : kind === "close" ? "Manifiesto cerrado: guías listas para salida" : "Manifiesto reabierto");
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && (editing ? <ManifestBuilder existing={q.data} /> : (() => {
        const m = q.data;
        const a = new Set(m.allowedActions);
        return (
          <>
            <Link href="/manifiestos" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand-600"><ArrowLeft className="size-4" /> Manifiestos</Link>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">Manifiesto</p>
                <h1 className="font-mono text-3xl font-bold text-ink">{m.number}</h1>
                <div className="mt-2"><ManifestStatusBadge status={m.status} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.has("EDIT") && <Button variant="outline" onClick={() => setEditing(true)}>Editar guías</Button>}
                {a.has("CLOSE") && <Button icon={<Lock className="size-4" />} onClick={() => { setError(null); setDialog("close"); }}>Cerrar manifiesto</Button>}
                {a.has("DISPATCH") && <Button icon={<Truck className="size-4" />} onClick={() => { setError(null); setDialog("dispatch"); }}>Autorizar salida</Button>}
                {a.has("REOPEN") && <Button variant="outline" icon={<Unlock className="size-4" />} onClick={() => { setError(null); setDialog("reopen"); }}>Reabrir</Button>}
                <Button variant="outline" icon={<FileText className="size-4" />} onClick={() => downloadFile(`/manifests/${m.id}/pdf`, `manifiesto-${m.number}.pdf`, undefined, true).catch((e) => toast.error("No se pudo abrir el PDF", errorMessage(e)))}>PDF</Button>
                {a.has("DELETE") && <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={() => setDialog("delete")}>Eliminar</Button>}
              </div>
            </div>
            <Card className="mb-5 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <InfoRow label="Fecha de operación">{fmtDate(m.operationDate)}</InfoRow>
              <InfoRow label="Turno">{m.shift?.name ?? "—"}</InfoRow>
              <InfoRow label="Remitente">{m.sender?.name ?? "Varios"}</InfoRow>
              <InfoRow label="Guías / bultos">{m.guideCount} / {m.packageCount}</InfoRow>
              <InfoRow label="Elaboró">{m.createdBy.name}</InfoRow>
              <InfoRow label="Cerrado">{m.closedAt ? `${fmtDateTime(m.closedAt)} · ${m.closedBy?.name ?? ""}` : "—"}</InfoRow>
              <InfoRow label="Salida">{m.dispatch ? `${fmtDateTime(m.dispatch.dispatchedAt)} · ${m.dispatch.dispatchedBy?.name ?? ""}` : "Pendiente"}</InfoRow>
              <InfoRow label="Repartidor / vehículo">{m.dispatch ? [m.dispatch.courierName, m.dispatch.vehicle].filter(Boolean).join(" · ") || "—" : "—"}</InfoRow>
              {m.notes && <div className="sm:col-span-4"><InfoRow label="Observaciones">{m.notes}</InfoRow></div>}
            </Card>
            <Card>
              <Table head={["Folio", "Estado", "Destinatario", "Destino", "Bultos"]}>
                {m.guides.map((g) => (
                  <tr key={g.id} className="cursor-pointer hover:bg-canvas" onClick={() => router.push(`/guias/${g.id}`)}>
                    <td className="px-4 py-3 font-mono font-semibold text-brand-700">{g.reference}</td>
                    <td className="px-4 py-3"><GuideStatusBadge status={g.status} size="sm" /></td>
                    <td className="px-4 py-3">{g.recipientName}</td>
                    <td className="px-4 py-3">{g.recipientCity ?? "—"}</td>
                    <td className="px-4 py-3">{g.packageCount}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <ConfirmDialog open={dialog === "close"} onClose={() => setDialog(null)} onConfirm={() => act.mutate("close")}
              title="¿Cerrar el manifiesto?" description="Las guías quedarán «Listas para salida». Cerrar NO registra la salida: ésta se autoriza después." confirmLabel="Cerrar manifiesto" />
            <ConfirmDialog open={dialog === "delete"} onClose={() => setDialog(null)} onConfirm={() => act.mutate("delete")}
              title="¿Eliminar el borrador?" description="Las guías vuelven a estar disponibles para otro manifiesto." confirmLabel="Eliminar" />
            <Modal open={dialog === "dispatch"} onClose={() => setDialog(null)} title="Autorizar salida" description={`${m.guideCount} guías pasarán a «En tránsito» en una sola operación.`}
              footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button><Button loading={act.isPending} icon={<Truck className="size-4" />} onClick={() => act.mutate("dispatch")}>Autorizar salida</Button></>}>
              <div className="space-y-4">
                <Field label="Repartidor (opcional)" hint="Si lo eliges, se le asignan todas las guías"><Select value={courierId} onChange={(e) => setCourierId(e.target.value)}><option value="">Sin asignar</option>{couriers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                <Field label="Vehículo"><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} /></Field>
                <Field label="Observaciones"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                <InlineError message={error} />
              </div>
            </Modal>
            <Modal open={dialog === "reopen"} onClose={() => setDialog(null)} title="Reabrir manifiesto" description="Las guías regresan a «Confirmada» y el manifiesto vuelve a borrador."
              footer={<><Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button><Button loading={act.isPending} disabled={reason.trim().length < 3} icon={<RotateCcw className="size-4" />} onClick={() => act.mutate("reopen")}>Reabrir</Button></>}>
              <Field label="Motivo" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <div className="mt-3"><InlineError message={error} /></div>
            </Modal>
            {dialog === "close" && error && <div className="fixed right-6 bottom-6 z-50 max-w-md"><InlineError message={error} /></div>}
          </>
        );
      })())}
    </QueryState>
  );
}
