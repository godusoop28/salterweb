"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "@/components/shared/photo-picker";
import { useDemoState } from "@/hooks/use-demo";
import { INCIDENT_TYPE_LABEL, SEVERITY_LABEL } from "@/lib/constants";
import { createIncident } from "@/lib/services/salter-service";
import type { Incident, IncidentSeverity, IncidentType } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  shipmentId: z.string().min(1, "Selecciona el paquete relacionado."),
  type: z.enum(["destinatario_ausente", "direccion_incorrecta", "paquete_danado", "rechazado", "retraso", "no_localizado"]),
  severity: z.enum(["baja", "media", "alta"]),
  description: z.string().trim().min(10, "Describe lo ocurrido (mínimo 10 caracteres)."),
});
type Values = z.infer<typeof schema>;

const DEFAULT_SEVERITY: Record<IncidentType, IncidentSeverity> = {
  destinatario_ausente: "baja",
  direccion_incorrecta: "media",
  paquete_danado: "alta",
  rechazado: "media",
  retraso: "baja",
  no_localizado: "alta",
};

export function ReportIncidentModal({
  open,
  onClose,
  shipmentId,
  reportedBy,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Paquete fijo (desde detalle o app del repartidor). */
  shipmentId?: string;
  reportedBy: string;
  onCreated?: (i: Incident) => void;
}) {
  const state = useDemoState();
  const toast = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const fixed = state.shipments.find((s) => s.id === shipmentId);
  const candidates = state.shipments.filter((s) => s.status !== "entregado" && s.status !== "incidencia").slice(-40).reverse();

  const { register, handleSubmit, setValue, control, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { shipmentId: shipmentId ?? "", type: "destinatario_ausente", severity: "baja", description: "" },
  });
  const severity = useWatch({ control, name: "severity" });

  const close = () => {
    reset({ shipmentId: shipmentId ?? "", type: "destinatario_ausente", severity: "baja", description: "" });
    setPhoto(null);
    onClose();
  };

  const submit = (v: Values) => {
    const inc = createIncident({ ...v, evidence: photo, reportedBy });
    toast.success("Incidencia registrada", `Folio ${inc.folio}. El equipo de operación ya fue notificado.`);
    onCreated?.(inc);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reportar incidencia"
      description={fixed ? `Paquete ${fixed.guia} · ${fixed.recipient.name}` : "Registra un problema con un envío."}
      icon={<TriangleAlert className="size-5 text-accent-600" />}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(submit)} icon={<TriangleAlert className="size-4" />}>
            Registrar incidencia
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        {!fixed && (
          <Field label="Paquete relacionado" required error={formState.errors.shipmentId?.message}>
            {(id, desc) => (
              <Select id={id} aria-describedby={desc} aria-invalid={!!formState.errors.shipmentId} {...register("shipmentId")}>
                <option value="">Selecciona una guía…</option>
                {candidates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.guia} · {s.recipient.name} · {s.destination.city}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Motivo" required>
          {(id) => (
            <Select
              id={id}
              {...register("type", {
                onChange: (e) => setValue("severity", DEFAULT_SEVERITY[e.target.value as IncidentType]),
              })}
            >
              {(Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[]).map((t) => (
                <option key={t} value={t}>
                  {INCIDENT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-soft">Severidad *</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["baja", "media", "alta"] as const).map((s) => (
              <label
                key={s}
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-xl border-2 text-sm font-bold transition-all",
                  severity === s
                    ? s === "alta"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : s === "media"
                        ? "border-accent-500 bg-accent-50 text-accent-700"
                        : "border-slate-400 bg-slate-50 text-slate-700"
                    : "border-line text-muted hover:border-slate-300",
                )}
              >
                <input type="radio" value={s} className="sr-only" {...register("severity")} />
                {SEVERITY_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="¿Qué ocurrió?" required error={formState.errors.description?.message}>
          {(id, desc) => (
            <Textarea id={id} rows={3} aria-describedby={desc} aria-invalid={!!formState.errors.description} placeholder="Ej. Se tocó en el domicilio dos veces y nadie respondió." {...register("description")} />
          )}
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-soft">Evidencia fotográfica (opcional)</p>
          <PhotoPicker value={photo} onChange={setPhoto} compact />
        </div>
      </form>
    </Modal>
  );
}
