"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Box,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  History,
  MapPin,
  MessageSquareText,
  Package,
  PackageSearch,
  Phone,
  RefreshCw,
  Scale,
  ShieldCheck,
  Store,
  Trash2,
  TriangleAlert,
  Truck,
  User,
  UserRoundCheck,
  Zap,
} from "lucide-react";
import { Badge, CourierStatusBadge, IncidentStatusBadge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Avatar, Card, CardHeader, EmptyState, InfoRow, LoadingState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { StatusStepper, Timeline } from "@/components/shared/timeline";
import { EvidenceView } from "@/components/shared/evidence";
import { ReportIncidentModal } from "@/components/incidencias/report-incident-modal";
import { useCurrentUser, useDemoState, useHydrated } from "@/hooks/use-demo";
import { INCIDENT_TYPE_LABEL, PACKAGE_TYPE_LABEL, SERVICE_LABEL, STATUS_HINT } from "@/lib/constants";
import { deleteShipment } from "@/lib/services/salter-service";
import type { Shipment } from "@/lib/types";
import { formatAddress, formatDate, formatDateTime, formatMoney, relativeTime } from "@/lib/utils";
import { AssignCourierModal, UpdateStatusModal } from "./shipment-actions";

type Dialog = "assign" | "status" | "incident" | "delete" | null;

function useShipmentDialogs() {
  const [dialog, setDialog] = useState<Dialog>(null);
  return { dialog, open: (d: Dialog) => setDialog(d), close: () => setDialog(null) };
}

export function ShipmentDetail({ guia }: { guia: string }) {
  const state = useDemoState();
  const user = useCurrentUser("admin");
  const router = useRouter();
  const toast = useToast();
  const { dialog, open, close } = useShipmentDialogs();
  const shipment = state.shipments.find((s) => s.guia.toLowerCase() === guia.toLowerCase());
  const hydrated = useHydrated();

  if (!shipment) {
    if (!hydrated) return <Card><LoadingState rows={6} /></Card>;
    return (
      <Card>
        <EmptyState
          icon={PackageSearch}
          title="No encontramos este paquete"
          description={`La guía ${guia} no existe o fue eliminada de la demostración.`}
          action={<ButtonLink href="/paquetes" variant="secondary">Volver a paquetes</ButtonLink>}
        />
      </Card>
    );
  }

  const courier = state.couriers.find((c) => c.id === shipment.courierId);
  const incidents = state.incidents.filter((i) => i.shipmentId === shipment.id);
  const delivered = shipment.status === "entregado";

  return (
    <div className="space-y-6">
      <Link href="/paquetes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-600">
        <ArrowLeft className="size-4" aria-hidden /> Volver a paquetes
      </Link>

      {/* Encabezado */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-brand-gradient" aria-hidden />
        <div className="flex flex-col gap-5 p-6 pl-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Número de guía</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-3xl font-bold tracking-wide text-ink">{shipment.guia}</h1>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(shipment.guia);
                  toast.info("Guía copiada");
                }}
                className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas"
                aria-label="Copiar guía"
              >
                <Copy className="size-4" />
              </button>
              <StatusBadge status={shipment.status} size="lg" />
              {shipment.service === "express" && (
                <Badge tone="orange" icon={Zap} size="lg">
                  Express
                </Badge>
              )}
            </div>
            <p className="mt-2 text-[15px] text-muted">
              {shipment.origin.city} → {shipment.destination.city} · Registrado el {formatDateTime(shipment.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!delivered && (
              <>
                <Button variant="secondary" icon={<UserRoundCheck className="size-4" />} onClick={() => open("assign")}>
                  {courier ? "Reasignar" : "Asignar repartidor"}
                </Button>
                <Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => open("status")}>
                  Actualizar estado
                </Button>
                <Button variant="outline" icon={<TriangleAlert className="size-4" />} onClick={() => open("incident")}>
                  Reportar incidencia
                </Button>
              </>
            )}
            <ButtonLink href={`/rastreo?guia=${shipment.guia}`} variant="ghost" icon={<ExternalLink className="size-4" />}>
              Ver como cliente
            </ButtonLink>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" icon={<Trash2 className="size-4" />} onClick={() => open("delete")}>
              Eliminar
            </Button>
          </div>
        </div>
        <div className="border-t border-line-soft px-6 py-6 sm:px-10">
          <StatusStepper status={shipment.status} />
          <p className="mt-5 text-center text-[15px] text-ink-soft">{STATUS_HINT[shipment.status]}</p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Historial de movimientos" description={`${shipment.events.length} movimientos registrados`} icon={History} />
            <div className="px-5 pt-5 pb-6 sm:px-6">
              <Timeline events={shipment.events} />
            </div>
          </Card>

          {delivered && shipment.evidence && (
            <Card>
              <CardHeader title="Evidencia de entrega" description="Fotografía y firma capturadas por el repartidor" icon={ShieldCheck} />
              <div className="p-5 sm:p-6">
                <EvidenceView evidence={shipment.evidence} seed={Number(shipment.id.replace(/\D/g, ""))} />
              </div>
            </Card>
          )}

          {incidents.length > 0 && (
            <Card>
              <CardHeader title="Incidencias del envío" icon={TriangleAlert} />
              <ul className="divide-y divide-line-soft px-5 pb-3 sm:px-6">
                {incidents.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <span className="font-mono text-sm font-bold text-ink">{i.folio}</span>
                    <span className="flex-1 text-[15px] text-ink-soft">{INCIDENT_TYPE_LABEL[i.type]}</span>
                    <IncidentStatusBadge status={i.status} />
                    <Link href={`/incidencias?id=${i.id}`} className="text-sm font-semibold text-brand-600 hover:underline">
                      Ver
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Repartidor asignado" icon={Truck} />
            <div className="p-5 sm:p-6">
              {courier ? (
                <div className="flex items-center gap-3">
                  <Avatar name={courier.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{courier.name}</p>
                    <p className="text-sm text-muted">
                      {courier.zone} · {courier.vehicle}
                    </p>
                  </div>
                  <CourierStatusBadge status={courier.status} size="sm" />
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-canvas p-4">
                  <p className="text-[15px] text-ink-soft">Este paquete todavía no tiene repartidor.</p>
                  <Button size="sm" variant="secondary" onClick={() => open("assign")} icon={<UserRoundCheck className="size-4" />}>
                    Asignar ahora
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Remitente" icon={Store} />
            <dl className="px-5 pb-4 sm:px-6">
              <InfoRow label="Empresa / persona" icon={Store}>{shipment.sender.company}</InfoRow>
              <InfoRow label="Contacto" icon={User}>{shipment.sender.name}</InfoRow>
              <InfoRow label="Teléfono" icon={Phone}>{shipment.sender.phone}</InfoRow>
              <InfoRow label="Dirección de origen" icon={MapPin}>
                <span className="font-medium">{formatAddress(shipment.origin)}</span>
              </InfoRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Destinatario" icon={User} />
            <dl className="px-5 pb-4 sm:px-6">
              <InfoRow label="Nombre" icon={User}>{shipment.recipient.name}</InfoRow>
              <InfoRow label="Teléfono" icon={Phone}>{shipment.recipient.phone}</InfoRow>
              <InfoRow label="Dirección de entrega" icon={MapPin}>
                <span className="font-medium">{formatAddress(shipment.destination)}</span>
              </InfoRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Datos del paquete" icon={Package} />
            <dl className="grid grid-cols-2 gap-x-4 px-5 pb-4 sm:px-6">
              <InfoRow label="Tipo" icon={Box}>{PACKAGE_TYPE_LABEL[shipment.type]}</InfoRow>
              <InfoRow label="Peso" icon={Scale}>{shipment.weightKg.toLocaleString("es-MX")} kg</InfoRow>
              <InfoRow label="Valor declarado" icon={CircleDollarSign}>{formatMoney(shipment.declaredValue)}</InfoRow>
              <InfoRow label="Servicio" icon={Zap}>{SERVICE_LABEL[shipment.service]}</InfoRow>
              <div className="col-span-2">
                <InfoRow label="Contenido" icon={FileText}>{shipment.description}</InfoRow>
              </div>
              <div className="col-span-2">
                <InfoRow label={delivered ? "Entregado" : "Entrega estimada"} icon={CalendarClock}>
                  {formatDate(shipment.deliveredAt ?? shipment.estimatedDelivery)}
                </InfoRow>
              </div>
              {shipment.notes && (
                <div className="col-span-2">
                  <InfoRow label="Observaciones" icon={MessageSquareText}>{shipment.notes}</InfoRow>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <AssignCourierModal shipment={shipment} open={dialog === "assign"} onClose={close} />
      <UpdateStatusModal shipment={shipment} open={dialog === "status"} onClose={close} />
      <ReportIncidentModal open={dialog === "incident"} onClose={close} shipmentId={shipment.id} reportedBy={user.name} />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={close}
        onConfirm={() => {
          deleteShipment(shipment.id);
          toast.success("Paquete eliminado", `La guía ${shipment.guia} se eliminó de la demostración.`);
          router.push("/paquetes");
        }}
        title={`¿Eliminar el paquete ${shipment.guia}?`}
        description="Se eliminará el paquete, su historial y sus incidencias de la demostración. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
      />
    </div>
  );
}

/** Vista rápida para el panel lateral de la tabla de paquetes. */
export function ShipmentQuickView({ shipment, onAssign, onStatus }: { shipment: Shipment; onAssign: () => void; onStatus: () => void }) {
  const state = useDemoState();
  const courier = state.couriers.find((c) => c.id === shipment.courierId);
  const last = shipment.events[shipment.events.length - 1];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-canvas p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={shipment.status} size="lg" />
          <span className="text-[13px] text-muted">Actualizado {relativeTime(last.date)}</span>
        </div>
        <div className="mt-6">
          <StatusStepper status={shipment.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-3.5">
          <p className="text-xs font-semibold text-muted">Remitente</p>
          <p className="mt-0.5 font-bold text-ink">{shipment.sender.company}</p>
          <p className="text-[13px] text-muted">{shipment.origin.city}</p>
        </div>
        <div className="rounded-2xl border border-line p-3.5">
          <p className="text-xs font-semibold text-muted">Destinatario</p>
          <p className="mt-0.5 font-bold text-ink">{shipment.recipient.name}</p>
          <p className="text-[13px] text-muted">{shipment.destination.city}</p>
        </div>
        <div className="rounded-2xl border border-line p-3.5">
          <p className="text-xs font-semibold text-muted">Paquete</p>
          <p className="mt-0.5 font-bold text-ink">{PACKAGE_TYPE_LABEL[shipment.type]}</p>
          <p className="text-[13px] text-muted">{shipment.weightKg} kg · {formatMoney(shipment.declaredValue)}</p>
        </div>
        <div className="rounded-2xl border border-line p-3.5">
          <p className="text-xs font-semibold text-muted">Repartidor</p>
          <p className="mt-0.5 font-bold text-ink">{courier?.name ?? "Sin asignar"}</p>
          <p className="text-[13px] text-muted">{courier?.zone ?? "—"}</p>
        </div>
      </div>

      {shipment.status !== "entregado" && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onAssign} icon={<UserRoundCheck className="size-4" />}>
            {courier ? "Reasignar" : "Asignar"}
          </Button>
          <Button variant="outline" onClick={onStatus} icon={<RefreshCw className="size-4" />}>
            Actualizar estado
          </Button>
        </div>
      )}

      <div>
        <h3 className="mb-4 flex items-center gap-2 font-bold text-ink">
          <ClipboardList className="size-4 text-brand-500" aria-hidden /> Línea de tiempo
        </h3>
        <Timeline events={shipment.events} compact />
      </div>
    </div>
  );
}
