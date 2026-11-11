"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Ban, CircleCheck, ClipboardList, FileText, Hand, MessageSquarePlus, PackageCheck, Pencil, Play, Truck, TriangleAlert, Warehouse,
} from "lucide-react";
import { MovementTimeline, QueryState } from "@/components/app/common";
import { GuideStatusBadge, ManifestStatusBadge } from "@/components/app/status";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, InfoRow } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, downloadFile, errorMessage } from "@/lib/api/client";
import { useGuide, useInvalidateOperation } from "@/lib/api/hooks";
import type { Guide } from "@/lib/api/types";
import { fmtDate, fmtDateTime, joinAddress, printedFolio } from "@/lib/format";
import { GuideActionDialog, type ActionKind } from "./guide-actions";
import { GuideForm } from "./guide-form";

export function GuideDetail({ id }: { id: number }) {
  const q = useGuide(id);
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const [action, setAction] = useState<ActionKind | null>(null);
  const [editing, setEditing] = useState(false);

  const confirm = useMutation({
    mutationFn: (g: Guide) => api.post<Guide>(`/guides/${g.id}/confirm`, undefined, { version: g.version }),
    onSuccess: async (g) => { await invalidate(); toast.success(`Guía ${g.folio} confirmada`); },
    onError: (e) => toast.error("No se pudo confirmar", errorMessage(e)),
  });

  return (
    <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && (editing ? (
        <>
          <div className="mb-4 flex items-center gap-2"><Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => setEditing(false)}>Volver</Button><h1 className="font-display text-2xl font-bold">Editar borrador</h1></div>
          <GuideForm draft={q.data} />
        </>
      ) : (
        <Detail g={q.data} onAction={setAction} onEdit={() => setEditing(true)} onConfirm={() => confirm.mutate(q.data!)} confirming={confirm.isPending}
          onPdf={() => downloadFile(`/guides/${q.data!.id}/pdf`, `guia-${q.data!.folio}.pdf`, undefined, true).catch((e) => toast.error("No se pudo abrir el PDF", errorMessage(e)))} />
      ))}
      {q.data && <GuideActionDialog guide={q.data} kind={action} onClose={() => setAction(null)} />}
    </QueryState>
  );
}

function Detail({ g, onAction, onEdit, onConfirm, confirming, onPdf }: {
  g: Guide; onAction: (k: ActionKind) => void; onEdit: () => void; onConfirm: () => void; confirming: boolean; onPdf: () => void;
}) {
  const a = new Set(g.allowedActions);
  return (
    <>
      <Link href="/guias" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand-600"><ArrowLeft className="size-4" /> Guías</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">{g.folio ? "Folio" : "Borrador (sin folio)"}</p>
          <h1 className="font-mono text-3xl font-bold text-ink">{g.folio ? printedFolio(g.folio) : g.reference}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2"><GuideStatusBadge status={g.status} size="lg" />{g.recipientOneTime && <span className="text-[13px] text-muted">Destinatario de un solo uso</span>}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.has("CONFIRM") && <Button onClick={onConfirm} loading={confirming} icon={<CircleCheck className="size-4" />}>Confirmar y asignar folio</Button>}
          {a.has("EDIT") && <Button variant="outline" onClick={onEdit} icon={<Pencil className="size-4" />}>Editar</Button>}
          {a.has("RECEIVE") && <Button onClick={() => onAction("RECEIVE")} icon={<Warehouse className="size-4" />}>Recibir en destino</Button>}
          {a.has("DELIVER") && <Button onClick={() => onAction("DELIVER")} icon={<PackageCheck className="size-4" />}>Confirmar entrega</Button>}
          {(a.has("ASSIGN") || a.has("REASSIGN")) && <Button variant="outline" onClick={() => onAction("ASSIGN")} icon={<Truck className="size-4" />}>{a.has("REASSIGN") ? "Reasignar" : "Asignar repartidor"}</Button>}
          {a.has("REPORT_INCIDENT") && <Button variant="outline" onClick={() => onAction("REPORT_INCIDENT")} icon={<TriangleAlert className="size-4" />}>Incidencia</Button>}
          {a.has("HOLD") && <Button variant="outline" onClick={() => onAction("HOLD")} icon={<Hand className="size-4" />}>Retener</Button>}
          {a.has("RELEASE") && <Button variant="outline" onClick={() => onAction("RELEASE")} icon={<Play className="size-4" />}>Liberar</Button>}
          {a.has("PDF") && <Button variant="outline" onClick={onPdf} icon={<FileText className="size-4" />}>PDF</Button>}
          {!g.status.match(/ENTREGADA|CANCELADA/) && <Button variant="ghost" onClick={() => onAction("NOTE")} icon={<MessageSquarePlus className="size-4" />}>Observación</Button>}
          {a.has("CANCEL") && <Button variant="ghost" className="text-red-600" onClick={() => onAction("CANCEL")} icon={<Ban className="size-4" />}>Cancelar</Button>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-subtle">Remitente</h3>
              <p className="font-bold text-ink">{g.sender.name}</p>
              {g.sender.contact && <p className="text-sm text-muted">{g.sender.contact}</p>}
              <p className="text-sm text-muted">{g.sender.phone ?? ""}</p>
              <p className="mt-1 text-sm text-ink-soft">{joinAddress(g.sender.address)}</p>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-subtle">Consignatario</h3>
              <p className="font-bold text-ink">{g.recipient.name}</p>
              <p className="text-sm text-muted">{g.recipient.phone ?? "Sin teléfono"}</p>
              <p className="mt-1 text-sm text-ink-soft">{joinAddress(g.recipient.address) || "Sin dirección"}</p>
              {g.recipient.address.references && <p className="text-[13px] text-muted">Ref.: {g.recipient.address.references}</p>}
            </Card>
          </div>
          <Card>
            <CardHeader title="Mercancía" icon={ClipboardList} />
            <div className="overflow-x-auto p-5 pt-3">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[12px] uppercase tracking-wider text-subtle"><th className="py-2">Descripción</th><th>Cantidad</th><th>Unidad</th><th>Peso</th></tr></thead>
                <tbody className="divide-y divide-line-soft">
                  {g.items.map((i) => <tr key={i.id}><td className="py-2 font-semibold text-ink">{i.description}</td><td>{i.quantity}</td><td>{i.unit}</td><td>{i.weightKg != null ? `${i.weightKg} kg` : "—"}</td></tr>)}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="grid gap-4 p-5 sm:grid-cols-3">
            <InfoRow label="Ruta">{g.shipping?.originCode || g.shipping?.destinationCode ? `${g.shipping.originCode ?? "—"} → ${g.shipping.destinationCode ?? "—"}` : "—"}</InfoRow>
            <InfoRow label="Servicio">{g.shipping?.serviceType ? `Servicio ${g.shipping.serviceType.toLowerCase()}` : "—"}</InfoRow>
            <InfoRow label="Fecha compromiso">{g.shipping?.commitmentDate ? fmtDate(g.shipping.commitmentDate) : g.status === "BORRADOR" ? "Se calcula al confirmar" : "—"}</InfoRow>
            <InfoRow label="Piezas">{g.packageCount}</InfoRow>
            <InfoRow label="Peso">{g.totalWeightKg != null ? `${g.totalWeightKg} kg` : "—"}</InfoRow>
            <InfoRow label="Dimensiones">{g.shipping?.dimensions ?? "—"}</InfoRow>
            <InfoRow label="Clave CD">{g.cdReference ?? "—"}</InfoRow>
            <InfoRow label="Pedido">{g.orderReference ?? "—"}</InfoRow>
            <InfoRow label="Turno">{g.shift?.name ?? "—"}</InfoRow>
            <InfoRow label="Elaboró">{g.createdBy.name} · {fmtDateTime(g.createdAt)}</InfoRow>
            <InfoRow label="Confirmó">{g.confirmedBy ? `${g.confirmedBy.name} · ${fmtDateTime(g.confirmedAt)}` : "—"}</InfoRow>
            {g.notes && <div className="sm:col-span-3"><InfoRow label="Observaciones">{g.notes}</InfoRow></div>}
            {g.cancelReason && <div className="sm:col-span-3"><InfoRow label="Motivo de cancelación">{g.cancelReason}</InfoRow></div>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-subtle">Operación</h3>
            <div className="text-sm">
              <p className="font-semibold text-ink">Manifiesto</p>
              {g.manifest ? <Link href={`/manifiestos/${g.manifest.id}`} className="inline-flex items-center gap-2 text-brand-700">{g.manifest.number} <ManifestStatusBadge status={g.manifest.status} /></Link> : <p className="text-muted">Sin manifiesto</p>}
            </div>
            <div className="text-sm"><p className="font-semibold text-ink">Repartidor</p><p className="text-muted">{g.assignment ? `${g.assignment.courierName} · desde ${fmtDateTime(g.assignment.assignedAt)}` : "Sin asignar"}</p></div>
            <div className="text-sm"><p className="font-semibold text-ink">Recepción en destino</p><p className="text-muted">{g.reception ? `${fmtDateTime(g.reception.receivedAt)}${g.reception.location ? ` · ${g.reception.location}` : ""}${g.reception.hasDifferences ? ` · Diferencias: ${g.reception.differences}` : ""}` : "Pendiente"}</p></div>
            <div className="text-sm"><p className="font-semibold text-ink">Entrega final</p><p className="text-muted">{g.delivery ? `${fmtDateTime(g.delivery.deliveredAt)} · Recibió ${g.delivery.receivedByName}` : "Pendiente"}</p></div>
            {g.openIncidentId && <ButtonLink href={`/incidencias?id=${g.openIncidentId}`} variant="soft" size="sm" icon={<TriangleAlert className="size-4" />}>Ver incidencia abierta</ButtonLink>}
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-subtle">Historial</h3>
            <MovementTimeline movements={g.movements} />
          </Card>
        </div>
      </div>
    </>
  );
}
