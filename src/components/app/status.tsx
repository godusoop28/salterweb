import {
  Ban, CircleCheck, CircleDot, ClipboardCheck, FilePen, Hand, PackageCheck, Truck, TriangleAlert, Warehouse, type LucideIcon,
} from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import type { GuideStatus, IncidentSeverity, IncidentStatus, IncidentType, ManifestStatus } from "@/lib/api/types";

export const GUIDE_STATUS: Record<GuideStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  BORRADOR: { label: "Borrador", tone: "slate", icon: FilePen },
  CONFIRMADA: { label: "Confirmada", tone: "blue", icon: CircleCheck },
  LISTA_SALIDA: { label: "Lista para salida", tone: "indigo", icon: ClipboardCheck },
  EN_TRANSITO: { label: "En tránsito", tone: "sky", icon: Truck },
  RECIBIDA_DESTINO: { label: "Recibida en destino", tone: "navy", icon: Warehouse },
  ENTREGADA: { label: "Entregada", tone: "green", icon: PackageCheck },
  CON_INCIDENCIA: { label: "Con incidencia", tone: "red", icon: TriangleAlert },
  RETENIDA: { label: "Retenida", tone: "orange", icon: Hand },
  CANCELADA: { label: "Cancelada", tone: "slate", icon: Ban },
};

export const GUIDE_STATUS_ORDER: GuideStatus[] = [
  "BORRADOR", "CONFIRMADA", "LISTA_SALIDA", "EN_TRANSITO", "RECIBIDA_DESTINO", "ENTREGADA", "CON_INCIDENCIA", "RETENIDA", "CANCELADA",
];

export function GuideStatusBadge({ status, size }: { status: GuideStatus; size?: "sm" | "md" | "lg" }) {
  const m = GUIDE_STATUS[status] ?? { label: status, tone: "slate" as Tone, icon: CircleDot };
  return <Badge tone={m.tone} icon={m.icon} size={size}>{m.label}</Badge>;
}

export const MANIFEST_STATUS: Record<ManifestStatus, { label: string; tone: Tone }> = {
  BORRADOR: { label: "Borrador", tone: "slate" },
  CERRADO: { label: "Cerrado", tone: "indigo" },
  DESPACHADO: { label: "Despachado", tone: "green" },
};

export function ManifestStatusBadge({ status }: { status: ManifestStatus }) {
  return <Badge tone={MANIFEST_STATUS[status].tone}>{MANIFEST_STATUS[status].label}</Badge>;
}

export const INCIDENT_TYPE: Record<IncidentType, string> = {
  DESTINATARIO_AUSENTE: "Destinatario ausente",
  DIRECCION_INCORRECTA: "Dirección incorrecta",
  PAQUETE_DANADO: "Paquete dañado",
  RECHAZADO: "Rechazado",
  RETRASO: "Retraso",
  NO_LOCALIZADO: "No localizado",
  DIFERENCIA_RECEPCION: "Diferencia en recepción",
  FALTANTE: "Faltante",
  OTRO: "Otro",
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const tone: Tone = severity === "ALTA" ? "red" : severity === "MEDIA" ? "orange" : "slate";
  return <Badge tone={tone} size="sm">{severity === "ALTA" ? "Alta" : severity === "MEDIA" ? "Media" : "Baja"}</Badge>;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const map: Record<IncidentStatus, [string, Tone]> = { ABIERTA: ["Abierta", "red"], EN_REVISION: ["En revisión", "orange"], RESUELTA: ["Resuelta", "green"] };
  return <Badge tone={map[status][1]} size="sm">{map[status][0]}</Badge>;
}
