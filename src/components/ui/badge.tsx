import type { ReactNode } from "react";
import {
  Ban,
  Building2,
  CircleCheck,
  CircleDot,
  Clock,
  Coffee,
  PackageOpen,
  ClipboardList,
  Search,
  Truck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  COURIER_STATUS_LABEL,
  INCIDENT_STATUS_LABEL,
  ROLE_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  USER_STATUS_LABEL,
} from "@/lib/constants";
import type { CourierStatus, IncidentSeverity, IncidentStatus, Role, ShipmentStatus, UserStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Tone = "slate" | "blue" | "sky" | "indigo" | "green" | "orange" | "red" | "navy";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
  sky: "bg-sky-50 text-sky-800 ring-sky-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  orange: "bg-accent-50 text-accent-700 ring-accent-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  navy: "bg-navy text-white ring-navy",
};

export function Badge({
  tone = "slate",
  icon: Icon,
  children,
  className,
  size = "md",
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-[13px]",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />}
      {children}
    </span>
  );
}

export const STATUS_META: Record<ShipmentStatus, { tone: Tone; icon: LucideIcon }> = {
  registrado: { tone: "slate", icon: ClipboardList },
  en_proceso: { tone: "blue", icon: PackageOpen },
  en_transito: { tone: "sky", icon: Truck },
  en_ciudad_destino: { tone: "indigo", icon: Building2 },
  entregado: { tone: "green", icon: CircleCheck },
  pendiente: { tone: "orange", icon: Clock },
  incidencia: { tone: "red", icon: TriangleAlert },
};

export function StatusBadge({ status, size, className }: { status: ShipmentStatus; size?: "sm" | "md" | "lg"; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon} size={size} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const SEVERITY_TONE: Record<IncidentSeverity, Tone> = { baja: "slate", media: "orange", alta: "red" };

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <Badge tone={SEVERITY_TONE[severity]} size="sm">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-1 rounded-full",
              i <= ["baja", "media", "alta"].indexOf(severity) ? "bg-current" : "bg-current opacity-25",
            )}
          />
        ))}
      </span>
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

const INCIDENT_STATUS_META: Record<IncidentStatus, { tone: Tone; icon: LucideIcon }> = {
  abierta: { tone: "red", icon: CircleDot },
  en_revision: { tone: "orange", icon: Search },
  resuelta: { tone: "green", icon: CircleCheck },
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const m = INCIDENT_STATUS_META[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {INCIDENT_STATUS_LABEL[status]}
    </Badge>
  );
}

const COURIER_META: Record<CourierStatus, { tone: Tone; icon: LucideIcon }> = {
  en_ruta: { tone: "blue", icon: Truck },
  disponible: { tone: "green", icon: CircleCheck },
  descanso: { tone: "orange", icon: Coffee },
  inactivo: { tone: "slate", icon: Ban },
};

export function CourierStatusBadge({ status, size }: { status: CourierStatus; size?: "sm" | "md" }) {
  const m = COURIER_META[status];
  return (
    <Badge tone={m.tone} icon={m.icon} size={size}>
      {COURIER_STATUS_LABEL[status]}
    </Badge>
  );
}

const ROLE_TONE: Record<Role, Tone> = { admin: "navy", supervisor: "blue", repartidor: "orange", remitente: "sky" };

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge tone={ROLE_TONE[role]} size="sm">
      {ROLE_LABEL[role]}
    </Badge>
  );
}

const USER_STATUS_TONE: Record<UserStatus, Tone> = { activo: "green", inactivo: "slate", pendiente: "orange" };

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge tone={USER_STATUS_TONE[status]} size="sm">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {USER_STATUS_LABEL[status]}
    </Badge>
  );
}
