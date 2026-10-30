import { INCIDENT_TYPE_LABEL, STATUS_ORDER } from "@/lib/constants";
import type { Courier, Incident, IncidentType, Shipment, ShipmentStatus } from "@/lib/types";
import { DEMO_NOW, dayKey, daysAgo, formatMonth, formatShortDate, monthKey } from "@/lib/utils";

export type PeriodKey = "7d" | "30d" | "90d" | "6m";

export const PERIODS: { key: PeriodKey; label: string; short: string; days: number }[] = [
  { key: "7d", label: "Últimos 7 días", short: "7 días", days: 7 },
  { key: "30d", label: "Últimos 30 días", short: "30 días", days: 30 },
  { key: "90d", label: "Últimos 3 meses", short: "3 meses", days: 91 },
  { key: "6m", label: "Últimos 6 meses", short: "6 meses", days: 182 },
];

export const periodDays = (key: PeriodKey) => PERIODS.find((p) => p.key === key)!.days;

const within = (iso: string | undefined, days: number) => !!iso && daysAgo(iso) < days && daysAgo(iso) >= 0;

export const ACTIVE_STATUSES: ShipmentStatus[] = ["registrado", "en_proceso", "en_transito", "en_ciudad_destino"];
export const isOpenIncident = (i: Incident) => i.status !== "resuelta";

export function countByStatus(shipments: Shipment[]): Record<ShipmentStatus, number> {
  const out = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ShipmentStatus, number>;
  for (const s of shipments) out[s.status]++;
  return out;
}

export function isOnTime(s: Shipment) {
  return !!s.deliveredAt && Date.parse(s.deliveredAt) <= Date.parse(s.estimatedDelivery) + 6 * 3_600_000;
}

/** Indicadores generales de la operación. */
export function operationKpis(shipments: Shipment[], incidents: Incident[]) {
  const byStatus = countByStatus(shipments);
  const todayKey = dayKey(DEMO_NOW);
  const deliveredToday = shipments.filter((s) => s.deliveredAt && dayKey(s.deliveredAt) === todayKey).length;
  const toDeliverToday = shipments.filter((s) => s.courierId && (s.status === "en_ciudad_destino" || s.status === "pendiente")).length;
  const registeredToday = shipments.filter((s) => dayKey(s.createdAt) === todayKey).length;
  return {
    total: shipments.length,
    delivered: byStatus.entregado,
    inTransit: byStatus.en_transito + byStatus.en_ciudad_destino + byStatus.en_proceso + byStatus.registrado,
    pending: byStatus.pendiente,
    incidents: incidents.filter(isOpenIncident).length,
    deliveredToday,
    toDeliverToday,
    registeredToday,
    byStatus,
  };
}

/** Resumen de un periodo para reportes. */
export function periodSummary(shipments: Shipment[], incidents: Incident[], days: number) {
  const registered = shipments.filter((s) => within(s.createdAt, days));
  const delivered = shipments.filter((s) => within(s.deliveredAt, days));
  const prevRegistered = shipments.filter((s) => {
    const a = daysAgo(s.createdAt);
    return a >= days && a < days * 2;
  }).length;
  const periodIncidents = incidents.filter((i) => within(i.createdAt, days));
  const onTime = delivered.filter(isOnTime).length;
  const avgHours = delivered.length
    ? delivered.reduce((sum, s) => sum + (Date.parse(s.deliveredAt!) - Date.parse(s.createdAt)) / 3_600_000, 0) / delivered.length
    : 0;
  return {
    registered: registered.length,
    delivered: delivered.length,
    incidents: periodIncidents.length,
    resolvedIncidents: periodIncidents.filter((i) => i.status === "resuelta").length,
    onTimeRate: delivered.length ? (onTime / delivered.length) * 100 : 0,
    avgHours,
    growth: prevRegistered ? ((registered.length - prevRegistered) / prevRegistered) * 100 : 0,
    incidentRate: registered.length ? (periodIncidents.length / registered.length) * 100 : 0,
    declaredValue: registered.reduce((s, x) => s + x.declaredValue, 0),
  };
}

export interface SeriesPoint {
  key: string;
  label: string;
  registrados: number;
  entregados: number;
  incidencias: number;
}

/** Serie temporal adaptada al periodo: diaria (≤31 días), semanal (≤3 meses) o mensual. */
export function timeSeries(shipments: Shipment[], incidents: Incident[], days: number): SeriesPoint[] {
  const mode: "day" | "week" | "month" = days <= 31 ? "day" : days <= 92 ? "week" : "month";
  const buckets = new Map<string, SeriesPoint>();

  const bucketOf = (iso: string): { key: string; label: string } | null => {
    const age = daysAgo(iso);
    if (age < 0 || age >= days) return null;
    if (mode === "day") return { key: dayKey(iso), label: formatShortDate(iso) };
    if (mode === "week") {
      const idx = Math.floor(age / 7);
      const start = new Date(DEMO_NOW.getTime() - (idx * 7 + 6) * 86_400_000).toISOString();
      return { key: `w${String(99 - idx).padStart(2, "0")}`, label: formatShortDate(start) };
    }
    return { key: monthKey(iso), label: formatMonth(iso) };
  };

  // Pre-crear cubetas para que no haya huecos.
  for (let i = days - 1; i >= 0; i--) {
    const iso = new Date(DEMO_NOW.getTime() - i * 86_400_000).toISOString();
    const b = bucketOf(iso);
    if (b && !buckets.has(b.key)) buckets.set(b.key, { ...b, registrados: 0, entregados: 0, incidencias: 0 });
  }
  for (const s of shipments) {
    const r = bucketOf(s.createdAt);
    if (r) buckets.get(r.key)!.registrados++;
    if (s.deliveredAt) {
      const d = bucketOf(s.deliveredAt);
      if (d) buckets.get(d.key)!.entregados++;
    }
  }
  for (const i of incidents) {
    const b = bucketOf(i.createdAt);
    if (b) buckets.get(b.key)!.incidencias++;
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface CourierStats {
  courier: Courier;
  delivered: number;
  deliveredToday: number;
  assigned: number;
  pending: number;
  incidents: number;
  successRate: number;
  onTimeRate: number;
  avgHours: number;
}

export function courierStats(courier: Courier, shipments: Shipment[], incidents: Incident[], days: number): CourierStats {
  const mine = shipments.filter((s) => s.courierId === courier.id);
  const delivered = mine.filter((s) => within(s.deliveredAt, days));
  const todayKey = dayKey(DEMO_NOW);
  const inc = incidents.filter((i) => i.courierId === courier.id && within(i.createdAt, days)).length;
  const onTime = delivered.filter(isOnTime).length;
  return {
    courier,
    delivered: delivered.length,
    deliveredToday: mine.filter((s) => s.deliveredAt && dayKey(s.deliveredAt) === todayKey).length,
    assigned: mine.filter((s) => s.status === "en_ciudad_destino" || s.status === "en_transito").length,
    pending: mine.filter((s) => s.status === "pendiente" || s.status === "incidencia").length,
    incidents: inc,
    successRate: delivered.length + inc ? (delivered.length / (delivered.length + inc)) * 100 : 100,
    onTimeRate: delivered.length ? (onTime / delivered.length) * 100 : 0,
    avgHours: delivered.length
      ? delivered.reduce((sum, s) => sum + (Date.parse(s.deliveredAt!) - Date.parse(s.events.find((e) => e.status === "en_ciudad_destino")?.date ?? s.createdAt)) / 3_600_000, 0) / delivered.length
      : 0,
  };
}

export function incidentsByType(incidents: Incident[], days: number) {
  const counts = new Map<IncidentType, number>();
  for (const i of incidents) if (within(i.createdAt, days)) counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, label: INCIDENT_TYPE_LABEL[type], count }))
    .sort((a, b) => b.count - a.count);
}

export function shipmentsByCity(shipments: Shipment[], days: number) {
  const counts = new Map<string, number>();
  for (const s of shipments) if (within(s.createdAt, days)) counts.set(s.destination.city, (counts.get(s.destination.city) ?? 0) + 1);
  return [...counts.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
}
