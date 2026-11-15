"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Ban, CircleCheck, ClipboardList, Hand, MapPin, MessageSquarePlus, PackageCheck, Pencil, Play, Route, ShieldCheck, Truck,
  TriangleAlert, Warehouse,
} from "lucide-react";
import { InlineError, MovementTimeline, QueryState } from "@/components/app/common";
import { GuideStatusBadge, ManifestStatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Card, CardHeader, InfoRow } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useConcepts, useGuide, useInvalidateOperation, useShippingRoutes } from "@/lib/api/hooks";
import type { Guide } from "@/lib/api/types";
import { fmtDate, fmtDateTime, joinAddress, printedFolio, uuid } from "@/lib/format";
import { GuideActionDialog, type ActionKind } from "./guide-actions";
import { type CartLine, GuideForm, PACK_TYPES, PackageCart, cartFromDraft, piecesLabel, qtyOf, sameName } from "./guide-form";
import { GuidePrintButtons } from "./guide-print";

/** Enlace a Google Maps con la dirección (no es seguimiento GPS). */
export function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function GuideDetail({ id }: { id: number }) {
  const q = useGuide(id);
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const [action, setAction] = useState<ActionKind | null>(null);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<"route" | "correct" | null>(null);

  const confirm = useMutation({
    mutationFn: (g: Guide) => api.post<Guide>(`/guides/${g.id}/confirm`, undefined, { version: g.version }),
    onSuccess: async (g) => { await invalidate(); toast.success(`Guía ${printedFolio(g.folio)} confirmada`, g.manifest ? `Agregada al manifiesto ${g.manifest.number}.` : undefined); },
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
          onRoute={() => setDialog("route")} onCorrect={() => setDialog("correct")} />
      ))}
      {q.data && <GuideActionDialog guide={q.data} kind={action} onClose={() => setAction(null)} />}
      {q.data && dialog === "route" && <RouteChangeDialog guide={q.data} onClose={() => setDialog(null)} />}
      {q.data && dialog === "correct" && <CorrectionDialog guide={q.data} onClose={() => setDialog(null)} />}
    </QueryState>
  );
}

function Detail({ g, onAction, onEdit, onConfirm, confirming, onRoute, onCorrect }: {
  g: Guide; onAction: (k: ActionKind) => void; onEdit: () => void; onConfirm: () => void; confirming: boolean; onRoute: () => void; onCorrect: () => void;
}) {
  const a = new Set(g.allowedActions);
  const address = joinAddress(g.recipient.address);
  return (
    <>
      <Link href="/guias" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand-600"><ArrowLeft className="size-4" /> Guías</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">{g.folio ? "Folio" : "Borrador (sin folio)"}</p>
          <h1 className="font-mono text-3xl font-bold text-ink">{g.folio ? printedFolio(g.folio) : g.reference}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <GuideStatusBadge status={g.status} size="lg" />
            {g.manifest && !g.manifest.travels && <Badge tone="orange">No viaja</Badge>}
            {g.recipientOneTime && <span className="text-[13px] text-muted">Destinatario de un solo uso</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.has("CONFIRM") && <Button onClick={onConfirm} loading={confirming} icon={<CircleCheck className="size-4" />}>Confirmar y asignar folio</Button>}
          {a.has("EDIT") && <Button variant="outline" onClick={onEdit} icon={<Pencil className="size-4" />}>Editar</Button>}
          {a.has("CORRECT") && <Button variant="outline" onClick={onCorrect} icon={<ShieldCheck className="size-4" />}>Corregir (administrador)</Button>}
          {a.has("CHANGE_ROUTE") && <Button variant="outline" onClick={onRoute} icon={<Route className="size-4" />}>Cambiar ruta</Button>}
          {a.has("RECEIVE") && <Button onClick={() => onAction("RECEIVE")} icon={<Warehouse className="size-4" />}>Recibir en destino</Button>}
          {a.has("DELIVER") && <Button onClick={() => onAction("DELIVER")} icon={<PackageCheck className="size-4" />}>Confirmar entrega</Button>}
          {(a.has("ASSIGN") || a.has("REASSIGN")) && <Button variant="outline" onClick={() => onAction("ASSIGN")} icon={<Truck className="size-4" />}>{a.has("REASSIGN") ? "Reasignar" : "Asignar repartidor"}</Button>}
          {a.has("REPORT_INCIDENT") && <Button variant="outline" onClick={() => onAction("REPORT_INCIDENT")} icon={<TriangleAlert className="size-4" />}>Incidencia</Button>}
          {a.has("HOLD") && <Button variant="outline" onClick={() => onAction("HOLD")} icon={<Hand className="size-4" />}>Retener</Button>}
          {a.has("RELEASE") && <Button variant="outline" onClick={() => onAction("RELEASE")} icon={<Play className="size-4" />}>Liberar</Button>}
          {!g.status.match(/ENTREGADA|CANCELADA/) && <Button variant="ghost" onClick={() => onAction("NOTE")} icon={<MessageSquarePlus className="size-4" />}>Observación</Button>}
          {a.has("CANCEL") && <Button variant="ghost" className="text-red-600" onClick={() => onAction("CANCEL")} icon={<Ban className="size-4" />}>Cancelar</Button>}
        </div>
      </div>

      {a.has("PDF") && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm font-semibold text-ink">Documento de la guía</p>
          <GuidePrintButtons guide={g} />
        </Card>
      )}

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
              <p className="font-bold text-ink">{g.recipient.clientCode && <span className="mr-2 font-mono text-sm font-semibold text-muted">#{g.recipient.clientCode}</span>}{g.recipient.name}</p>
              {g.recipient.phone && <p className="text-sm text-muted">{g.recipient.phone}</p>}
              <p className="mt-1 text-sm text-ink-soft">{address || "Sin dirección"}</p>
              {g.recipient.address.references && <p className="text-[13px] text-muted">Ref.: {g.recipient.address.references}</p>}
              {address && (
                <a href={mapsLink(address)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                  <MapPin className="size-4" /> Abrir dirección en Google Maps
                </a>
              )}
            </Card>
          </div>
          <Card>
            <CardHeader title={`Bultos · ${piecesLabel(g.packageCount ?? 0)}`} icon={ClipboardList} />
            <div className="overflow-x-auto p-5 pt-3">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[12px] uppercase tracking-wider text-subtle"><th className="py-2">Tipo</th><th>Descripción</th><th className="text-right">Cantidad</th><th className="text-right">Peso</th></tr></thead>
                <tbody className="divide-y divide-line-soft">
                  {g.items.map((i) => <tr key={i.id}><td className="py-2 font-semibold text-ink">{i.description}</td><td className="text-muted">{i.detail ?? "—"}</td><td className="text-right font-bold">{i.quantity}</td><td className="text-right">{i.weightKg != null ? `${i.weightKg} kg` : "—"}</td></tr>)}
                </tbody>
                <tfoot><tr className="border-t-2 border-line"><td className="py-2 font-bold" colSpan={2}>Total</td><td className="text-right font-bold text-brand-700">{g.packageCount ?? "—"}</td><td /></tr></tfoot>
              </table>
              {g.packages.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-brand-700">Bultos del archivo de carga (LPN): {g.packages.length}</summary>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {g.packages.map((p, i) => <li key={i} className="font-mono text-[13px] text-ink-soft">{p.lpn ?? "—"} · {p.type}{p.order ? ` · pedido ${p.order}` : ""}</li>)}
                  </ul>
                </details>
              )}
            </div>
          </Card>
          <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
            <InfoRow label="Plazas">{g.shipping?.originCode || g.shipping?.destinationCode ? `${g.shipping.originCode ?? "—"} → ${g.shipping.destinationCode ?? "—"}` : "—"}</InfoRow>
            <InfoRow label="Subruta">{g.subRoute ?? "—"}</InfoRow>
            <InfoRow label="Ruta de embarque">{g.shippingRoute?.name ?? "Sin ruta"}</InfoRow>
            <InfoRow label="Servicio">{g.shipping?.serviceType ? `Servicio ${g.shipping.serviceType.toLowerCase()}` : "—"}</InfoRow>
            <InfoRow label="Fecha compromiso">{g.shipping?.commitmentDate ? fmtDate(g.shipping.commitmentDate) : g.status === "BORRADOR" ? "Se calcula al confirmar" : "—"}</InfoRow>
            <InfoRow label="Piezas">{g.packageCount ?? "Sin capturar"}</InfoRow>
            <InfoRow label="Peso">{g.shipping?.weightNotApplicable ? "No aplica" : g.totalWeightKg != null ? `${g.totalWeightKg} kg` : "—"}</InfoRow>
            <InfoRow label="Dimensiones">{g.shipping?.dimensionsNotApplicable ? "No aplica" : g.shipping?.dimensions ?? "—"}</InfoRow>
            <InfoRow label="Referencia CD">{g.cdReference ?? "—"}</InfoRow>
            <InfoRow label="Pedido(s)">{g.orderReference ?? "—"}</InfoRow>
            <InfoRow label="Turno">{g.shift?.name ?? "—"}</InfoRow>
            <div className="col-span-2 sm:col-span-1"><InfoRow label="Elaboró">{g.createdBy.name} · {fmtDateTime(g.createdAt)}</InfoRow></div>
            <div className="col-span-2 sm:col-span-1"><InfoRow label="Confirmó">{g.confirmedBy ? `${g.confirmedBy.name} · ${fmtDateTime(g.confirmedAt)}` : "—"}</InfoRow></div>
            {g.notes && <div className="col-span-2 sm:col-span-3"><InfoRow label="Observaciones">{g.notes}</InfoRow></div>}
            {g.cancelReason && <div className="col-span-2 sm:col-span-3"><InfoRow label="Motivo de cancelación">{g.cancelReason}</InfoRow></div>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-subtle">Operación</h3>
            <div className="text-sm">
              <p className="font-semibold text-ink">Manifiesto</p>
              {g.manifest ? (
                <Link href={`/manifiestos/${g.manifest.id}`} className="inline-flex flex-wrap items-center gap-2 text-brand-700">
                  {g.manifest.number} <ManifestStatusBadge status={g.manifest.status} />{!g.manifest.travels && <Badge tone="orange" size="sm">No viaja</Badge>}
                </Link>
              ) : <p className="text-muted">Sin manifiesto</p>}
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

/** Cambio de ruta de embarque: confirmación explícita con motivo; queda en el historial y en el manifiesto. */
function RouteChangeDialog({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const routes = useShippingRoutes(true);
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const [routeId, setRouteId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => api.post<Guide>(`/guides/${guide.id}/route`, { shippingRouteId: Number(routeId), reason, version: guide.version }),
    onSuccess: async (g) => {
      await invalidate();
      toast.success("Ruta cambiada", g.manifest ? `Ahora está en el manifiesto ${g.manifest.number}.` : "Quedó registrado en el historial.");
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} title="Cambiar ruta de embarque" size="sm" icon={<Route className="size-5 text-accent-600" />}
      description={`Ruta actual: ${guide.shippingRoute?.name ?? "sin ruta"}. Si está en un manifiesto en preparación se moverá al de la nueva ruta.`}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button loading={m.isPending} disabled={!routeId || !reason.trim()} onClick={() => { setError(null); m.mutate(); }}>Confirmar cambio</Button></>}>
      <div className="space-y-4">
        <Field label="Nueva ruta" required>
          <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            <option value="">Selecciona…</option>
            {routes.data?.filter((r) => r.id !== guide.shippingRoute?.id).map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
          </Select>
        </Field>
        <Field label="Motivo" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <InlineError message={error} />
      </div>
    </Modal>
  );
}

/** Corrección auditada (sólo administrador; el backend lo valida): guarda antes/después, usuario, fecha y motivo. */
function CorrectionDialog({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const concepts = useConcepts();
  const [reason, setReason] = useState("");
  const [order, setOrder] = useState(guide.orderReference ?? "");
  const [subRoute, setSubRoute] = useState(guide.subRoute ?? "");
  const [cd, setCd] = useState(guide.cdReference ?? "");
  const [destination, setDestination] = useState(guide.shipping.destinationCode ?? "");
  const [dimensions, setDimensions] = useState(guide.shipping.dimensions ?? "");
  const [dimsNA, setDimsNA] = useState(guide.shipping.dimensionsNotApplicable);
  const [weightNA, setWeightNA] = useState(guide.shipping.weightNotApplicable);
  const [notes, setNotes] = useState(guide.notes ?? "");
  const [cart, setCart] = useState<CartLine[]>(() => cartFromDraft(guide));
  const [error, setError] = useState<string | null>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const types = [...PACK_TYPES, ...(concepts.data ?? []).filter((c) => c.active).map((c) => c.name), ...cart.map((l) => l.type)]
    .filter((t, i, all) => all.findIndex((x) => sameName(x, t)) === i);
  const pieces = cart.reduce((s, l) => s + qtyOf(l), 0);
  const m = useMutation({
    mutationFn: () => api.post<Guide>(`/guides/${guide.id}/corrections`, {
      reason, orderReference: order, subRoute, cdReference: cd, notes, version: guide.version,
      shipping: { destinationCode: destination || undefined, dimensions: dimsNA ? undefined : dimensions || undefined, dimensionsNotApplicable: dimsNA, weightNotApplicable: weightNA },
      items: cart.filter((l) => l.type && qtyOf(l) > 0).map((l) => ({ description: l.type, quantity: qtyOf(l), detail: l.detail || undefined,
        weightKg: !weightNA && l.weight ? Number(l.weight) : undefined })),
    }),
    onSuccess: async () => { await invalidate(); toast.success("Corrección registrada", "El historial conserva los datos anteriores y los nuevos."); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const invalidCart = cart.length === 0 || cart.some((l) => qtyOf(l) < 1);
  return (
    <Modal open onClose={onClose} size="xl" title={`Corregir guía ${printedFolio(guide.folio)}`} icon={<ShieldCheck className="size-5 text-brand-600" />}
      description="Sólo el administrador. El folio no cambia; se registra quién corrige, cuándo, el motivo y los datos anteriores y nuevos."
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button loading={m.isPending} disabled={!reason.trim() || invalidCart} onClick={() => { setError(null); m.mutate(); }}>Guardar corrección</Button></>}>
      <div className="space-y-4" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}>
        <Field label="Motivo de la corrección" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pedido(s)"><Input value={order} maxLength={80} onChange={(e) => setOrder(e.target.value)} /></Field>
          <Field label="Subruta"><Input value={subRoute} maxLength={20} className="font-mono uppercase" onChange={(e) => setSubRoute(e.target.value.toUpperCase())} /></Field>
          <Field label="Referencia CD"><Input value={cd} maxLength={80} onChange={(e) => setCd(e.target.value)} /></Field>
          <Field label="Plaza destino"><Input value={destination} maxLength={5} className="font-mono uppercase" onChange={(e) => setDestination(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} /></Field>
          <div className="space-y-2">
            <Field label="Dimensiones"><Input value={dimsNA ? "" : dimensions} disabled={dimsNA} placeholder={dimsNA ? "NO APLICA" : ""} onChange={(e) => setDimensions(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={dimsNA} onChange={(e) => setDimsNA(e.target.checked)} /> No aplica</label>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold"><input type="checkbox" checked={weightNA} onChange={(e) => setWeightNA(e.target.checked)} /> Peso: no aplica</label>
        </div>
        <PackageCart cart={cart} packTypes={types} weightNA={weightNA} qtyRefs={qtyRefs} pieces={pieces}
          error={invalidCart ? "Cada renglón necesita tipo y cantidad (mínimo 1)." : undefined}
          onAdd={(t) => { if (!cart.some((l) => sameName(l.type, t))) setCart((c) => [...c, { key: uuid(), type: t, qty: "", detail: "", weight: "" }]); }}
          onUpdate={(k, p) => setCart((c) => c.map((l) => (l.key === k ? { ...l, ...p } : l)))}
          onRemove={(k) => setCart((c) => c.filter((l) => l.key !== k))} />
        <Field label="Observaciones"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <InlineError message={error} />
      </div>
    </Modal>
  );
}
