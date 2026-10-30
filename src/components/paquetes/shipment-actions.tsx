"use client";

import { useState } from "react";
import { Check, RefreshCw, Sparkles, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourierStatusBadge, StatusBadge } from "@/components/ui/badge";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Avatar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { assignCourier, updateShipmentStatus } from "@/lib/services/salter-service";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssignCourierModal({ shipment, open, onClose }: { shipment: Shipment | null; open: boolean; onClose: () => void }) {
  const state = useDemoState();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  if (!shipment) return null;

  const current = selected ?? shipment.courierId ?? state.couriers.find((c) => c.zone === shipment.destination.city)?.id ?? null;
  const load = (id: string) => state.shipments.filter((s) => s.courierId === id && ["en_ciudad_destino", "pendiente", "en_transito"].includes(s.status)).length;
  const sorted = [...state.couriers].sort((a, b) => Number(b.zone === shipment.destination.city) - Number(a.zone === shipment.destination.city));

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Asignar repartidor"
      description={`Guía ${shipment.guia} · destino ${shipment.destination.city}`}
      icon={<UserRoundCheck className="size-5" />}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={!current || current === shipment.courierId}
            onClick={() => {
              if (!current) return;
              assignCourier(shipment.id, current);
              const c = state.couriers.find((x) => x.id === current);
              toast.success("Repartidor asignado", `${c?.name} recibirá el paquete ${shipment.guia} en su lista.`);
              close();
            }}
            icon={<Check className="size-4" />}
          >
            Confirmar asignación
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Repartidores" className="space-y-2.5">
        {sorted.map((c) => {
          const active = current === c.id;
          const recommended = c.zone === shipment.destination.city;
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(c.id)}
              disabled={c.status === "inactivo"}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all disabled:opacity-50",
                active ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200",
              )}
            >
              <Avatar name={c.name} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink">{c.name}</span>
                  {recommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">
                      <Sparkles className="size-3" aria-hidden /> Misma zona
                    </span>
                  )}
                  {shipment.courierId === c.id && <span className="text-xs font-semibold text-muted">(asignado)</span>}
                </span>
                <span className="block text-[13px] text-muted">
                  {c.zone} · {c.vehicle} · {load(c.id)} paquetes activos
                </span>
              </span>
              <CourierStatusBadge status={c.status} size="sm" />
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", active ? "border-brand-500 bg-brand-500 text-white" : "border-line")}>
                {active && <Check className="size-3.5" aria-hidden />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

const NEXT_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  registrado: "en_proceso",
  en_proceso: "en_transito",
  en_transito: "en_ciudad_destino",
  en_ciudad_destino: "entregado",
  pendiente: "en_ciudad_destino",
};

export function UpdateStatusModal({ shipment, open, onClose }: { shipment: Shipment | null; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<ShipmentStatus | "">("");
  const [note, setNote] = useState("");
  if (!shipment) return null;
  const value = status || NEXT_STATUS[shipment.status] || shipment.status;

  const close = () => {
    setStatus("");
    setNote("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Actualizar estado"
      description={`Guía ${shipment.guia}`}
      icon={<RefreshCw className="size-5" />}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={value === shipment.status}
            onClick={() => {
              updateShipmentStatus(shipment.id, value, note);
              toast.success("Estado actualizado", `${shipment.guia} ahora está "${STATUS_LABEL[value]}".`);
              close();
            }}
          >
            Guardar cambio
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
          <span className="text-sm font-semibold text-muted">Estado actual</span>
          <StatusBadge status={shipment.status} />
        </div>
        <Field label="Nuevo estado" required>
          {(id) => (
            <Select id={id} value={value} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Comentario para el historial" hint="Opcional. Se mostrará en la línea de tiempo.">
          {(id, desc) => <Textarea id={id} aria-describedby={desc} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Se recibió en bodega con empaque en buen estado." />}
        </Field>
      </div>
    </Modal>
  );
}
