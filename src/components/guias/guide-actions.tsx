"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { InlineError } from "@/components/app/common";
import { INCIDENT_TYPE } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useCouriers, useInvalidateOperation } from "@/lib/api/hooks";
import type { Guide, IncidentSeverity, IncidentType } from "@/lib/api/types";

export type ActionKind = "CANCEL" | "HOLD" | "RELEASE" | "RECEIVE" | "DELIVER" | "REPORT_INCIDENT" | "ASSIGN" | "NOTE";

const TITLES: Record<ActionKind, string> = {
  CANCEL: "Cancelar guía", HOLD: "Retener guía", RELEASE: "Liberar guía", RECEIVE: "Confirmar recepción en destino",
  DELIVER: "Confirmar entrega final", REPORT_INCIDENT: "Reportar incidencia", ASSIGN: "Asignar repartidor", NOTE: "Agregar observación",
};

/** Diálogo único para las operaciones sobre una guía; el backend valida estado y permisos. */
export function GuideActionDialog({ guide, kind, onClose, onDone }: { guide: Guide; kind: ActionKind | null; onClose: () => void; onDone?: (g?: Guide) => void }) {
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const couriers = useCouriers(true, kind === "ASSIGN");
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [count, setCount] = useState(String(guide.packageCount));
  const [hasDiff, setHasDiff] = useState(false);
  const [diff, setDiff] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [type, setType] = useState<IncidentType>("DESTINATARIO_AUSENTE");
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIA");
  const [courierId, setCourierId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: async (): Promise<Guide | undefined> => {
      const id = guide.id;
      switch (kind) {
        case "CANCEL": return api.post<Guide>(`/guides/${id}/cancel`, { reason: text });
        case "HOLD": return api.post<Guide>(`/guides/${id}/hold`, { reason: text });
        case "RELEASE": return api.post<Guide>(`/guides/${id}/release`, text ? { notes: text } : undefined);
        case "NOTE": return api.post<Guide>(`/guides/${id}/notes`, { notes: text, location: location || undefined });
        case "RECEIVE": return api.post<Guide>(`/guides/${id}/reception`, { location: location || undefined, receivedCount: count === "" ? undefined : Number(count), hasDifferences: hasDiff, differences: diff || undefined, notes: text || undefined });
        case "DELIVER": return api.post<Guide>(`/guides/${id}/delivery`, { receivedByName: receivedBy, notes: text || undefined });
        case "REPORT_INCIDENT": await api.post(`/incidents`, { guideId: id, type, severity, description: text }); return undefined;
        case "ASSIGN": await api.post(`/assignments`, { courierId: Number(courierId), guideIds: [id] }); return undefined;
        default: return undefined;
      }
    },
    onSuccess: async (g) => {
      await invalidate();
      toast.success(TITLES[kind!], "Operación registrada.");
      onDone?.(g);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (!kind) return null;
  const needsText = kind === "CANCEL" || kind === "HOLD" || kind === "NOTE" || kind === "REPORT_INCIDENT";
  const disabled = (needsText && !text.trim()) || (kind === "DELIVER" && !receivedBy.trim()) || (kind === "ASSIGN" && !courierId) || (kind === "RECEIVE" && hasDiff && !diff.trim());

  return (
    <Modal open onClose={onClose} title={TITLES[kind]} description={`Guía ${guide.reference} · ${guide.recipient.name}`}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
        <Button variant={kind === "CANCEL" ? "danger" : "primary"} loading={m.isPending} disabled={disabled} onClick={() => { setError(null); m.mutate(); }}>Confirmar</Button>
      </>}>
      <div className="space-y-4">
        {kind === "ASSIGN" && (
          <Field label="Repartidor" required>
            <Select value={courierId} onChange={(e) => setCourierId(e.target.value)}>
              <option value="">Selecciona…</option>
              {couriers.data?.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.activeAssignments} asignadas</option>)}
            </Select>
          </Field>
        )}
        {kind === "RECEIVE" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ubicación / instalación"><Input value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
              <Field label={`Bultos recibidos (esperados: ${guide.packageCount})`}><Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={hasDiff} onChange={(e) => setHasDiff(e.target.checked)} /> Hay diferencias (se abrirá una incidencia)</label>
            {hasDiff && <Field label="Describe las diferencias" required><Textarea rows={2} value={diff} onChange={(e) => setDiff(e.target.value)} /></Field>}
          </>
        )}
        {kind === "DELIVER" && <Field label="Nombre de quien recibe" required><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} autoFocus /></Field>}
        {kind === "REPORT_INCIDENT" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo"><Select value={type} onChange={(e) => setType(e.target.value as IncidentType)}>{Object.entries(INCIDENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Severidad"><Select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}><option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option></Select></Field>
          </div>
        )}
        {kind === "NOTE" && <Field label="Ubicación (opcional)"><Input value={location} onChange={(e) => setLocation(e.target.value)} /></Field>}
        {kind !== "ASSIGN" && (
          <Field label={kind === "CANCEL" || kind === "HOLD" ? "Motivo" : kind === "REPORT_INCIDENT" ? "Descripción" : "Observaciones"} required={needsText}>
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}
        <InlineError message={error} />
      </div>
    </Modal>
  );
}
