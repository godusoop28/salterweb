"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  CircleCheck,
  Clock,
  FileText,
  MapPin,
  MessageSquareText,
  Navigation,
  Package,
  PackageCheck,
  PenLine,
  Phone,
  RefreshCw,
  Scale,
  TriangleAlert,
  UserCheck,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { EmptyState, LoadingState, Tabs } from "@/components/ui/primitives";
import { useHydrated } from "@/hooks/use-demo";
import { useToast } from "@/components/ui/toast";
import { useCourier } from "@/components/layout/courier-shell";
import { ReportIncidentModal } from "@/components/incidencias/report-incident-modal";
import { EvidenceView } from "@/components/shared/evidence";
import { PhotoPicker } from "@/components/shared/photo-picker";
import { SignaturePad } from "@/components/shared/signature-pad";
import { Timeline } from "@/components/shared/timeline";
import { PACKAGE_TYPE_LABEL } from "@/lib/constants";
import { confirmDelivery, updateShipmentStatus } from "@/lib/services/salter-service";
import type { Shipment } from "@/lib/types";
import { DEMO_NOW, cn, dayKey, daysAgo, formatDate, formatLongDate, formatMoney, formatTime, relativeTime } from "@/lib/utils";

const TODO = ["en_ciudad_destino", "pendiente", "incidencia"];

function useMyRoute() {
  const { courier, state } = useCourier();
  return useMemo(() => {
    const mine = state.shipments.filter((s) => s.courierId === courier.id);
    const todo = mine.filter((s) => TODO.includes(s.status)).sort((a, b) => (a.routeOrder ?? 99) - (b.routeOrder ?? 99));
    const today = dayKey(DEMO_NOW);
    const doneToday = mine.filter((s) => s.deliveredAt && dayKey(s.deliveredAt) === today).sort((a, b) => b.deliveredAt!.localeCompare(a.deliveredAt!));
    return { courier, mine, todo, doneToday };
  }, [courier, state.shipments]);
}

const mapsUrl = (s: Shipment) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.destination.street}, ${s.destination.neighborhood}, ${s.destination.city}`)}`;

/* ───────────────────────── Mis entregas ───────────────────────── */

export function CourierDeliveries() {
  const { courier, todo, doneToday } = useMyRoute();
  const [tab, setTab] = useState<"pendientes" | "completadas">("pendientes");
  const total = todo.length + doneToday.length;
  const pct = total ? Math.round((doneToday.length / total) * 100) : 0;
  const next = todo.find((s) => s.status !== "incidencia");

  return (
    <div className="space-y-5 p-4">
      <section className="relative overflow-hidden rounded-3xl bg-navy p-5 text-white">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-brand-500/50 blur-2xl" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="relative size-[86px] shrink-0">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#FF7A00" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-display text-xl font-bold">{pct}%</span>
          </div>
          <div>
            <p className="text-sm text-white/70">{formatLongDate(DEMO_NOW.toISOString())}</p>
            <p className="text-xl font-bold">¡Hola, {courier.name.split(" ")[0]}!</p>
            <p className="text-[15px] text-white/85">
              {doneToday.length} de {total} entregas completadas
            </p>
          </div>
        </div>
      </section>

      {next && (
        <Link href={`/entregas/${next.guia}`} className="block rounded-3xl border-2 border-accent-200 bg-accent-50 p-4 transition-colors active:bg-accent-100">
          <p className="text-xs font-bold uppercase tracking-wider text-accent-700">Siguiente parada</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-500 font-display text-lg font-bold text-white">{todo.indexOf(next) + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold text-ink">{next.recipient.name}</p>
              <p className="truncate text-sm text-ink-soft">{next.destination.street}, {next.destination.neighborhood}</p>
            </div>
            <ChevronRight className="size-6 text-accent-600" aria-hidden />
          </div>
        </Link>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        items={[
          { value: "pendientes", label: "Por entregar", count: todo.length },
          { value: "completadas", label: "Completadas", count: doneToday.length },
        ]}
      />

      {tab === "pendientes" ? (
        todo.length ? (
          <ul className="space-y-3">
            {todo.map((s, i) => (
              <li key={s.id}>
                <DeliveryCard s={s} n={i + 1} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={PackageCheck} title="¡Ruta completada!" description="Entregaste todos los paquetes de hoy. Buen trabajo." />
        )
      ) : doneToday.length ? (
        <ul className="space-y-3">
          {doneToday.map((s) => (
            <li key={s.id}>
              <Link href={`/entregas/${s.guia}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
                <CircleCheck className="size-7 shrink-0 text-emerald-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{s.recipient.name}</p>
                  <p className="text-sm text-muted">
                    {s.guia} · {formatTime(s.deliveredAt!)}
                  </p>
                </div>
                <ChevronRight className="size-5 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Clock} title="Aún no hay entregas completadas" description="Las entregas que confirmes hoy aparecerán aquí." />
      )}
    </div>
  );
}

function DeliveryCard({ s, n }: { s: Shipment; n: number }) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border bg-white shadow-card", s.status === "incidencia" ? "border-red-200" : "border-line")}>
      <Link href={`/entregas/${s.guia}`} className="block p-4 active:bg-canvas">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-base font-bold", s.status === "incidencia" ? "bg-red-50 text-red-600" : "bg-brand-500 text-white")}>
            {n}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[17px] font-bold leading-tight text-ink">{s.recipient.name}</p>
              <StatusBadge status={s.status} size="sm" />
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-[15px] text-ink-soft">
              <MapPin className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
              <span>
                {s.destination.street}, Col. {s.destination.neighborhood}
              </span>
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="font-mono font-semibold text-ink-soft">{s.guia}</span>
              <span>{PACKAGE_TYPE_LABEL[s.type]} · {s.weightKg} kg</span>
              {s.service === "express" && (
                <span className="inline-flex items-center gap-0.5 font-bold text-accent-600">
                  <Zap className="size-3.5" aria-hidden /> Express
                </span>
              )}
            </p>
            {s.notes && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-accent-50 px-2.5 py-1.5 text-[13px] text-accent-700">
                <MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {s.notes}
              </p>
            )}
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-3 border-t border-line-soft text-sm font-semibold">
        <a href={`tel:${s.recipient.phone.replace(/\s/g, "")}`} className="flex items-center justify-center gap-1.5 py-3 text-brand-600 active:bg-brand-50">
          <Phone className="size-4" aria-hidden /> Llamar
        </a>
        <a href={mapsUrl(s)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 border-x border-line-soft py-3 text-brand-600 active:bg-brand-50">
          <Navigation className="size-4" aria-hidden /> Mapa
        </a>
        <Link href={`/entregas/${s.guia}`} className="flex items-center justify-center gap-1 py-3 text-ink active:bg-canvas">
          Detalle <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────────── Detalle de entrega ───────────────────────── */

export function CourierDeliveryDetail({ guia }: { guia: string }) {
  const { courier, state } = useCourier();
  const toast = useToast();
  const [reporting, setReporting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [reason, setReason] = useState("");
  const s = state.shipments.find((x) => x.guia.toUpperCase() === guia.toUpperCase());
  const hydrated = useHydrated();

  if (!s) {
    if (!hydrated) return <LoadingState rows={4} />;
    return (
      <div className="p-4">
        <EmptyState icon={Package} title="Entrega no encontrada" description={`La guía ${guia} no está en tu lista.`} action={<ButtonLink href="/entregas" variant="secondary">Volver a mis entregas</ButtonLink>} />
      </div>
    );
  }

  const delivered = s.status === "entregado";

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-4 p-4">
        <Link href="/entregas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
          <ArrowLeft className="size-4" aria-hidden /> Mis entregas
        </Link>

        <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-muted">{s.guia}</span>
            <StatusBadge status={s.status} />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">Entregar a</p>
          <p className="text-2xl font-bold text-ink">{s.recipient.name}</p>
          <p className="mt-2 flex items-start gap-2 text-[15px] leading-snug text-ink-soft">
            <MapPin className="mt-0.5 size-5 shrink-0 text-accent-600" aria-hidden />
            <span>
              {s.destination.street}, Col. {s.destination.neighborhood}, {s.destination.city}, C.P. {s.destination.zip}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`tel:${s.recipient.phone.replace(/\s/g, "")}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-50 font-bold text-brand-700 active:bg-brand-100">
              <Phone className="size-5" aria-hidden /> {s.recipient.phone}
            </a>
            <a href={mapsUrl(s)} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-50 font-bold text-brand-700 active:bg-brand-100">
              <Navigation className="size-5" aria-hidden /> Cómo llegar
            </a>
          </div>
        </div>

        {s.notes && (
          <div className="flex gap-3 rounded-2xl bg-accent-50 p-4 text-[15px] text-accent-700 ring-1 ring-accent-100">
            <MessageSquareText className="size-5 shrink-0" aria-hidden />
            <p>
              <strong>Indicaciones:</strong> {s.notes}
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
          <p className="mb-3 font-bold text-ink">Información del paquete</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2"><Package className="mt-0.5 size-4 text-subtle" aria-hidden /><div><dt className="text-muted">Tipo</dt><dd className="font-bold text-ink">{PACKAGE_TYPE_LABEL[s.type]}</dd></div></div>
            <div className="flex items-start gap-2"><Scale className="mt-0.5 size-4 text-subtle" aria-hidden /><div><dt className="text-muted">Peso</dt><dd className="font-bold text-ink">{s.weightKg} kg</dd></div></div>
            <div className="col-span-2 flex items-start gap-2"><FileText className="mt-0.5 size-4 text-subtle" aria-hidden /><div><dt className="text-muted">Contenido</dt><dd className="font-bold text-ink">{s.description} · {formatMoney(s.declaredValue)}</dd></div></div>
            <div className="col-span-2 flex items-start gap-2"><UserCheck className="mt-0.5 size-4 text-subtle" aria-hidden /><div><dt className="text-muted">Remitente</dt><dd className="font-bold text-ink">{s.sender.company} · {s.origin.city}</dd></div></div>
          </dl>
        </div>

        {delivered && s.evidence && (
          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
            <p className="mb-3 font-bold text-ink">Evidencia de entrega</p>
            <EvidenceView evidence={s.evidence} seed={Number(s.id.replace(/\D/g, ""))} />
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
          <p className="mb-4 font-bold text-ink">Movimientos</p>
          <Timeline events={s.events.slice(-4)} compact />
        </div>
      </div>

      {!delivered && (
        <div className="sticky bottom-0 mt-auto space-y-2 border-t border-line bg-white/95 p-4 backdrop-blur">
          <ButtonLink href={`/entregas/${s.guia}/evidencia`} size="lg" className="h-14 w-full text-[17px]" icon={<PackageCheck className="size-6" />}>
            Confirmar entrega
          </ButtonLink>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" icon={<RefreshCw className="size-4" />} onClick={() => setRescheduling(true)}>
              Reprogramar
            </Button>
            <Button variant="outline" className="h-12 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" icon={<TriangleAlert className="size-4" />} onClick={() => setReporting(true)}>
              Incidencia
            </Button>
          </div>
        </div>
      )}

      <ReportIncidentModal open={reporting} onClose={() => setReporting(false)} shipmentId={s.id} reportedBy={courier.name} />
      <Modal
        open={rescheduling}
        onClose={() => setRescheduling(false)}
        size="sm"
        title="Reprogramar entrega"
        description="El paquete quedará como pendiente para otra visita."
        icon={<Clock className="size-5" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setRescheduling(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                updateShipmentStatus(s.id, "pendiente", reason || "Entrega reprogramada por el repartidor.");
                toast.success("Entrega reprogramada", `${s.guia} quedó como pendiente.`);
                setRescheduling(false);
                setReason("");
              }}
            >
              Marcar como pendiente
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {["Nadie en casa", "Pidió otro horario", "Negocio cerrado", "No hubo acceso"].map((r) => (
              <button key={r} onClick={() => setReason(r)} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold ring-1", reason === r ? "bg-brand-500 text-white ring-brand-500" : "bg-white text-ink-soft ring-line")}>
                {r}
              </button>
            ))}
          </div>
          <Field label="Motivo">
            {(id) => <Textarea id={id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Escribe el motivo…" />}
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/* ───────────────────────── Evidencia de entrega ───────────────────────── */

export function CourierEvidence({ guia }: { guia: string }) {
  const { state } = useCourier();
  const router = useRouter();
  const toast = useToast();
  const s = state.shipments.find((x) => x.guia.toUpperCase() === guia.toUpperCase());
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  // null = aún no se edita; se usa el nombre del destinatario cuando el paquete ya está disponible.
  const [receivedByInput, setReceivedBy] = useState<string | null>(null);
  const receivedBy = receivedByInput ?? s?.recipient.name ?? "";
  const hydrated = useHydrated();
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const { requirePhoto, requireSignature } = state.settings;

  if (!s) {
    if (!hydrated) return <LoadingState rows={4} />;
    return (
      <div className="p-4">
        <EmptyState icon={Package} title="Entrega no encontrada" action={<ButtonLink href="/entregas" variant="secondary">Volver</ButtonLink>} />
      </div>
    );
  }

  const nextStop = state.shipments
    .filter((x) => x.courierId === s.courierId && x.id !== s.id && TODO.includes(x.status) && x.status !== "incidencia")
    .sort((a, b) => (a.routeOrder ?? 99) - (b.routeOrder ?? 99))[0];

  if (done) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6 text-center">
        <div className="grid size-28 animate-scale-in place-items-center rounded-full bg-emerald-500 text-white shadow-[0_20px_40px_-12px_rgb(16_185_129/0.6)] ring-[14px] ring-emerald-100">
          <CircleCheck className="size-14" aria-hidden />
        </div>
        <h1 className="mt-8 font-display text-3xl font-bold text-ink">¡Entrega confirmada!</h1>
        <p className="mt-2 text-[17px] text-muted">
          {s.guia} entregado a <strong className="text-ink">{receivedBy}</strong> a las {formatTime(state.shipments.find((x) => x.id === s.id)?.deliveredAt ?? DEMO_NOW.toISOString())}.
        </p>
        <p className="mt-1 text-sm text-muted">El remitente ya puede ver la evidencia.</p>
        <div className="mt-8 w-full space-y-2">
          {nextStop ? (
            <ButtonLink href={`/entregas/${nextStop.guia}`} size="lg" className="h-14 w-full" iconRight={<ChevronRight className="size-5" />}>
              Siguiente: {nextStop.recipient.name}
            </ButtonLink>
          ) : (
            <ButtonLink href="/entregas" size="lg" className="h-14 w-full">
              Ver mis entregas
            </ButtonLink>
          )}
          <ButtonLink href="/entregas" variant="ghost" className="w-full">
            Volver a la lista
          </ButtonLink>
        </div>
      </div>
    );
  }

  const missing = [requirePhoto && !photo && "la foto", requireSignature && !signature && "la firma", !receivedBy.trim() && "el nombre de quien recibe"].filter(Boolean) as string[];

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link href={`/entregas/${s.guia}`} className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-canvas" aria-label="Regresar">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="font-bold text-ink">Evidencia de entrega</p>
          <p className="truncate text-[13px] text-muted">{s.guia} · {s.recipient.name}</p>
        </div>
      </div>

      <div className="space-y-6 p-4">
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-bold text-ink">
            <span className={cn("grid size-7 place-items-center rounded-full text-sm text-white", photo ? "bg-emerald-500" : "bg-brand-500")}>{photo ? "✓" : "1"}</span>
            <Camera className="size-4 text-muted" aria-hidden /> Foto del paquete entregado {requirePhoto && <span className="text-accent-600">*</span>}
          </h2>
          <PhotoPicker value={photo} onChange={setPhoto} />
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-bold text-ink">
            <span className={cn("grid size-7 place-items-center rounded-full text-sm text-white", receivedBy.trim() ? "bg-emerald-500" : "bg-brand-500")}>{receivedBy.trim() ? "✓" : "2"}</span>
            <UserCheck className="size-4 text-muted" aria-hidden /> ¿Quién recibe?
          </h2>
          <div className="mb-2 flex flex-wrap gap-2">
            {[s.recipient.name, "Familiar", "Recepción / vigilancia", "Vecino autorizado"].map((r) => (
              <button key={r} type="button" onClick={() => setReceivedBy(r)} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition-colors", receivedBy === r ? "bg-brand-500 text-white ring-brand-500" : "bg-white text-ink-soft ring-line")}>
                {r}
              </button>
            ))}
          </div>
          <Input aria-label="Nombre de quien recibe" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Nombre completo" className="h-12" />
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-bold text-ink">
            <span className={cn("grid size-7 place-items-center rounded-full text-sm text-white", signature ? "bg-emerald-500" : "bg-brand-500")}>{signature ? "✓" : "3"}</span>
            <PenLine className="size-4 text-muted" aria-hidden /> Firma del destinatario {requireSignature && <span className="text-accent-600">*</span>}
          </h2>
          <SignaturePad onChange={setSignature} />
        </section>

        <section>
          <label htmlFor="ev-notes" className="mb-2 block font-bold text-ink">Comentarios (opcional)</label>
          <Textarea id="ev-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Se dejó en recepción del edificio." />
        </section>
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-line bg-white/95 p-4 backdrop-blur">
        {missing.length > 0 && <p className="mb-2 text-center text-sm text-muted">Falta {missing.join(", ")}.</p>}
        <Button
          size="lg"
          className="h-14 w-full text-[17px]"
          disabled={missing.length > 0}
          loading={saving}
          icon={<PackageCheck className="size-6" />}
          onClick={() => {
            setSaving(true);
            setTimeout(() => {
              confirmDelivery(s.id, { receivedBy: receivedBy.trim(), photo, signature, notes: notes.trim() || undefined });
              setSaving(false);
              setDone(true);
              toast.success("Entrega confirmada", `${s.guia} marcado como entregado.`);
              router.prefetch("/entregas");
            }, 600);
          }}
        >
          Confirmar entrega
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Ruta del día ───────────────────────── */

/** Coordenadas ilustrativas para dibujar el recorrido (no representan ubicaciones GPS). */
const PIN_POSITIONS = [
  { x: 70, y: 250 },
  { x: 120, y: 175 },
  { x: 205, y: 205 },
  { x: 255, y: 125 },
  { x: 175, y: 85 },
  { x: 290, y: 55 },
  { x: 95, y: 70 },
  { x: 230, y: 270 },
  { x: 305, y: 280 },
  { x: 40, y: 165 },
  { x: 320, y: 175 },
  { x: 60, y: 30 },
];

export function CourierRoute() {
  const { courier, todo, doneToday } = useMyRoute();
  const stops = todo;
  const pins = stops.map((s, i) => ({ s, n: i + 1, ...PIN_POSITIONS[i % PIN_POSITIONS.length] }));
  const path = [{ x: 30, y: 300 }, ...pins].map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Ruta del día</h1>
        <p className="text-sm text-muted">
          {stops.length} paradas en {courier.zone} · {doneToday.length} completadas
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[#EAF1F8] shadow-card ring-1 ring-line">
        <svg viewBox="0 0 340 320" className="block h-auto w-full" role="img" aria-label="Mapa ilustrativo del recorrido">
          <defs>
            <pattern id="blocks" width="56" height="56" patternUnits="userSpaceOnUse">
              <rect width="56" height="56" fill="#EAF1F8" />
              <rect x="6" y="6" width="44" height="44" rx="6" fill="#DCE6F2" />
            </pattern>
          </defs>
          <rect width="340" height="320" fill="url(#blocks)" />
          <path d="M0 150 C 90 130, 160 170, 340 140" stroke="#FFFFFF" strokeWidth="14" fill="none" />
          <path d="M150 0 C 140 120, 190 200, 170 320" stroke="#FFFFFF" strokeWidth="12" fill="none" />
          <path d="M0 260 C 120 250, 230 290, 340 240" stroke="#FFFFFF" strokeWidth="10" fill="none" />
          <ellipse cx="300" cy="215" rx="30" ry="20" fill="#CFE8D5" />
          <path d={path} stroke="#0B5CD5" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 9" />
          <g>
            <circle cx="30" cy="300" r="10" fill="#011638" />
            <text x="30" y="304" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">B</text>
          </g>
          {pins.map(({ s, n, x, y }, i) => (
            <g key={s.id}>
              <circle cx={x} cy={y} r={i === 0 ? 17 : 14} fill={s.status === "incidencia" ? "#DC2626" : i === 0 ? "#FF7A00" : "#0B5CD5"} stroke="white" strokeWidth="3" />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="800" fill="white">
                {n}
              </text>
            </g>
          ))}
        </svg>
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-muted shadow-sm">Mapa ilustrativo · no es GPS</span>
      </div>

      <ol className="relative space-y-3">
        {pins.map(({ s, n }, i) => (
          <li key={s.id}>
            <Link href={`/entregas/${s.guia}`} className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3.5", i === 0 ? "border-accent-200 ring-2 ring-accent-100" : "border-line")}>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full font-bold text-white", s.status === "incidencia" ? "bg-red-600" : i === 0 ? "bg-accent-500" : "bg-brand-500")}>{n}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">{s.recipient.name}</span>
                <span className="block truncate text-[13px] text-muted">{s.destination.street}, {s.destination.neighborhood}</span>
              </span>
              {i === 0 ? <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">Siguiente</span> : <ChevronRight className="size-5 text-subtle" aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
      {pins.length === 0 && <EmptyState icon={PackageCheck} title="Sin paradas pendientes" description="Completaste la ruta de hoy." />}
      <p className="text-center text-xs text-muted">El orden de visita lo define el supervisor. La optimización automática de rutas no forma parte del alcance actual.</p>
    </div>
  );
}

/* ───────────────────────── Historial ───────────────────────── */

export function CourierHistory() {
  const { mine } = useMyRoute();
  const delivered = mine.filter((s) => s.deliveredAt && daysAgo(s.deliveredAt) < 7).sort((a, b) => b.deliveredAt!.localeCompare(a.deliveredAt!));
  const groups = delivered.reduce<Record<string, Shipment[]>>((acc, s) => {
    const k = dayKey(s.deliveredAt!);
    (acc[k] ??= []).push(s);
    return acc;
  }, {});
  const today = delivered.filter((s) => daysAgo(s.deliveredAt!) === 0).length;
  const incidents = mine.filter((s) => s.status === "incidencia").length;

  return (
    <div className="space-y-5 p-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Historial</h1>
        <p className="text-sm text-muted">Tus entregas de los últimos 7 días</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Hoy", value: today, tone: "text-emerald-600" },
          { label: "7 días", value: delivered.length, tone: "text-brand-600" },
          { label: "Incidencias", value: incidents, tone: "text-red-600" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl bg-white p-3 text-center shadow-card ring-1 ring-line">
            <p className={cn("font-display text-2xl font-bold", m.tone)}>{m.value}</p>
            <p className="text-xs font-medium text-muted">{m.label}</p>
          </div>
        ))}
      </div>
      {Object.entries(groups).map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-bold text-muted">{daysAgo(list[0].deliveredAt!) === 0 ? "Hoy" : daysAgo(list[0].deliveredAt!) === 1 ? "Ayer" : formatLongDate(list[0].deliveredAt!)}</h2>
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line">
            {list.map((s) => (
              <li key={s.id}>
                <Link href={`/entregas/${s.guia}`} className="flex items-center gap-3 p-3.5 active:bg-canvas">
                  <CircleCheck className="size-6 shrink-0 text-emerald-500" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{s.recipient.name}</span>
                    <span className="block text-[13px] text-muted">{s.guia} · {formatTime(s.deliveredAt!)}</span>
                  </span>
                  <span className="text-xs text-subtle">{relativeTime(s.deliveredAt!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {delivered.length === 0 && <EmptyState icon={Clock} title="Sin entregas recientes" />}
      <p className="text-center text-xs text-muted">Registros desde {formatDate(new Date(DEMO_NOW.getTime() - 6 * 86_400_000).toISOString())}</p>
    </div>
  );
}
