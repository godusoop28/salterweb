"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, MapPin, MessageSquarePlus, PackageCheck, Phone, TriangleAlert, Warehouse } from "lucide-react";
import { InlineError, MovementTimeline, QueryState } from "@/components/app/common";
import { GuideStatusBadge } from "@/components/app/status";
import { GuideActionDialog, type ActionKind } from "@/components/guias/guide-actions";
import { PhotoPicker } from "@/components/shared/photo-picker";
import { SignaturePad } from "@/components/shared/signature-pad";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Card, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useGuide, useInvalidateOperation, useMyAssignments, useMyHistory } from "@/lib/api/hooks";
import type { Guide } from "@/lib/api/types";
import { fmtDateTime, joinAddress } from "@/lib/format";

export function CourierAssignments() {
  const q = useMyAssignments();
  const list = q.data ?? [];
  const pending = list.filter((a) => a.guide.status !== "ENTREGADA");
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Mis asignaciones</h1>
        <p className="text-sm text-muted">{pending.length} envío(s) por atender</p>
      </div>
      <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {list.length === 0 ? <EmptyState icon={PackageCheck} title="Sin envíos asignados" description="Cuando te asignen guías aparecerán aquí." /> : (
          <ul className="space-y-3">
            {list.map((a) => (
              <li key={a.assignmentId}>
                <Link href={`/entregas/${a.guide.id}`} className="block rounded-3xl border border-line bg-white p-4 shadow-card active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-brand-700">{a.routeOrder ? `#${a.routeOrder} · ` : ""}{a.guide.reference}</span>
                    <GuideStatusBadge status={a.guide.status} size="sm" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-ink">{a.guide.recipientName}</p>
                  <p className="flex items-start gap-1.5 text-sm text-muted"><MapPin className="mt-0.5 size-4 shrink-0" />{[a.street, a.neighborhood, a.guide.recipientCity].filter(Boolean).join(", ") || "Sin dirección"}</p>
                  <div className="mt-2 flex items-center justify-between text-sm text-ink-soft"><span>{a.guide.packageCount} bulto(s)</span><ChevronRight className="size-5 text-subtle" /></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}

export function CourierGuide({ id }: { id: number }) {
  const q = useGuide(id);
  const [action, setAction] = useState<ActionKind | null>(null);
  const g = q.data;
  return (
    <div className="space-y-4 p-4">
      <Link href="/entregas" className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" /> Asignaciones</Link>
      <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {g && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between"><span className="font-mono font-bold text-brand-700">{g.reference}</span><GuideStatusBadge status={g.status} size="sm" /></div>
              <p className="mt-3 text-xl font-bold text-ink">{g.recipient.name}</p>
              <p className="mt-1 flex items-start gap-1.5 text-[15px] text-ink-soft"><MapPin className="mt-0.5 size-4 shrink-0" />{joinAddress(g.recipient.address) || "Sin dirección"}</p>
              {g.recipient.address.references && <p className="mt-1 text-sm text-muted">Referencias: {g.recipient.address.references}</p>}
              {g.notes && <p className="mt-2 rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-700">{g.notes}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {g.recipient.phone && <a href={`tel:${g.recipient.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-50 font-semibold text-brand-700"><Phone className="size-5" /> Llamar</a>}
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(joinAddress(g.recipient.address))}`} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-50 font-semibold text-brand-700"><MapPin className="size-5" /> Cómo llegar</a>
              </div>
            </Card>
            <Card className="p-4 text-sm">
              <p className="font-semibold text-ink">Mercancía</p>
              <ul className="mt-1 text-ink-soft">{g.items.map((i) => <li key={i.id}>{i.quantity} {i.unit} · {i.description}</li>)}</ul>
              <p className="mt-2 text-muted">{g.packageCount} bulto(s) · Remitente: {g.sender.name}</p>
            </Card>
            <div className="grid gap-2">
              {g.allowedActions.includes("DELIVER") && <Link href={`/entregas/${g.id}/evidencia`} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent-600 text-lg font-bold text-white shadow-card"><PackageCheck className="size-6" /> Confirmar entrega</Link>}
              {g.allowedActions.includes("RECEIVE") && <Button size="lg" onClick={() => setAction("RECEIVE")} icon={<Warehouse className="size-5" />}>Recibir en destino</Button>}
              {g.allowedActions.includes("REPORT_INCIDENT") && <Button size="lg" variant="outline" onClick={() => setAction("REPORT_INCIDENT")} icon={<TriangleAlert className="size-5" />}>Reportar incidencia</Button>}
              {g.status !== "ENTREGADA" && g.status !== "CANCELADA" && <Button size="lg" variant="ghost" onClick={() => setAction("NOTE")} icon={<MessageSquarePlus className="size-5" />}>Agregar observación</Button>}
              {g.status === "EN_TRANSITO" && !g.allowedActions.includes("DELIVER") && <p className="text-center text-sm text-muted">La entrega se habilita cuando la guía se registra como recibida en destino.</p>}
            </div>
            <Card className="p-4"><h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-subtle">Historial</h3><MovementTimeline movements={g.movements} /></Card>
            <GuideActionDialog guide={g} kind={action} onClose={() => setAction(null)} />
          </>
        )}
      </QueryState>
    </div>
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Confirmación de entrega. Foto y firma son OPCIONALES hasta que el cliente defina si son obligatorias. */
export function CourierDelivery({ id }: { id: number }) {
  const q = useGuide(id);
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deliver = useMutation({
    mutationFn: async () => {
      const g = await api.post<Guide>(`/guides/${id}/delivery`, { receivedByName: receivedBy, notes: notes || undefined });
      const uploads: [string | null, string, string][] = [[photo, "EVIDENCIA_ENTREGA", "foto.jpg"], [signature, "FIRMA", "firma.png"]];
      for (const [data, category, name] of uploads) {
        if (!data) continue;
        const fd = new FormData();
        fd.append("file", dataUrlToBlob(data), name);
        try {
          await api.post(`/attachments/GUIDE/${id}`, fd, { category });
        } catch (e) {
          toast.error("La entrega quedó registrada, pero no se pudo subir un archivo", errorMessage(e));
        }
      }
      return g;
    },
    onSuccess: async () => { await invalidate(); toast.success("Entrega confirmada"); router.replace("/entregas"); },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <div className="space-y-4 p-4">
      <Link href={`/entregas/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft className="size-4" /> Volver</Link>
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <div><h1 className="font-display text-2xl font-bold text-ink">Confirmar entrega</h1><p className="text-sm text-muted">{q.data.reference} · {q.data.recipient.name}</p></div>
            <Field label="Nombre de quien recibe" required><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} autoFocus className="h-13 text-lg" /></Field>
            <div><p className="mb-1.5 text-sm font-semibold text-ink-soft">Fotografía (opcional)</p><PhotoPicker value={photo} onChange={setPhoto} /></div>
            <div><p className="mb-1.5 text-sm font-semibold text-ink-soft">Firma (opcional)</p><SignaturePad onChange={setSignature} /></div>
            <Field label="Observaciones"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <InlineError message={error} />
            <Button size="lg" className="h-14 w-full text-lg" disabled={!receivedBy.trim()} loading={deliver.isPending} icon={<PackageCheck className="size-6" />} onClick={() => { setError(null); deliver.mutate(); }}>Confirmar entrega</Button>
          </>
        )}
      </QueryState>
    </div>
  );
}

export function CourierHistory() {
  const q = useMyHistory(7);
  return (
    <div className="space-y-4 p-4">
      <h1 className="font-display text-2xl font-bold text-ink">Historial (7 días)</h1>
      <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {q.data?.length === 0 ? <EmptyState icon={PackageCheck} title="Sin actividad reciente" /> : (
          <ul className="space-y-2">
            {q.data?.map((h, i) => (
              <li key={i}>
                <Link href={`/entregas/${h.guide.id}`} className="block rounded-2xl border border-line bg-white p-3.5">
                  <div className="flex items-center justify-between"><span className="font-mono text-sm font-bold">{h.guide.reference}</span><GuideStatusBadge status={h.guide.status} size="sm" /></div>
                  <p className="mt-1 font-semibold text-ink">{h.guide.recipientName}</p>
                  <p className="text-[13px] text-muted">Asignada {fmtDateTime(h.assignedAt)}{h.releasedAt ? ` · cerrada ${fmtDateTime(h.releasedAt)}` : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
