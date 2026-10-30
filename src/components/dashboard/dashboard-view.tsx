"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Clock,
  Layers,
  Package,
  PackageCheck,
  PackagePlus,
  Radar,
  Smartphone,
  TrendingUp,
  Truck,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import { SeverityBadge, STATUS_META, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHART_COLORS, ChartCard, ChartTooltip } from "@/components/ui/chart-card";
import { Avatar, Card, CardHeader, PageHeader, ProgressBar, Tabs } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { NewShipmentModal } from "@/components/paquetes/new-shipment-form";
import { ReportIncidentModal } from "@/components/incidencias/report-incident-modal";
import { useCurrentUser, useDemoState } from "@/hooks/use-demo";
import { INCIDENT_TYPE_LABEL, STATUS_CHART_COLOR, STATUS_LABEL } from "@/lib/constants";
import { courierStats, isOpenIncident, operationKpis, periodSummary, timeSeries } from "@/lib/services/analytics";
import type { ShipmentStatus } from "@/lib/types";
import { DEMO_NOW, cn, formatLongDate, formatNumber, formatTime, relativeTime } from "@/lib/utils";

const ACTIVE_ORDER: ShipmentStatus[] = ["registrado", "en_proceso", "en_transito", "en_ciudad_destino", "pendiente", "incidencia"];

export function DashboardView() {
  const state = useDemoState();
  const user = useCurrentUser("admin");
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const [creating, setCreating] = useState(false);
  const [reporting, setReporting] = useState(false);

  const kpis = useMemo(() => operationKpis(state.shipments, state.incidents), [state.shipments, state.incidents]);
  const month = useMemo(() => periodSummary(state.shipments, state.incidents, 30), [state.shipments, state.incidents]);
  const series = useMemo(() => timeSeries(state.shipments, state.incidents, Number(range)), [state.shipments, state.incidents, range]);
  const couriers = useMemo(() => state.couriers.map((c) => courierStats(c, state.shipments, state.incidents, 1)), [state.couriers, state.shipments, state.incidents]);

  const activeTotal = ACTIVE_ORDER.reduce((s, k) => s + kpis.byStatus[k], 0);
  const todayTotal = kpis.deliveredToday + kpis.toDeliverToday;

  const activity = useMemo(
    () =>
      state.shipments
        .flatMap((s) => s.events.map((e) => ({ ...e, guia: s.guia, recipient: s.recipient.name })))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7),
    [state.shipments],
  );

  const recentDeliveries = useMemo(
    () => state.shipments.filter((s) => s.deliveredAt).sort((a, b) => b.deliveredAt!.localeCompare(a.deliveredAt!)).slice(0, 6),
    [state.shipments],
  );

  const openIncidents = state.incidents.filter(isOpenIncident).slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(DEMO_NOW.toISOString())}
        title={`Buenas tardes, ${user.name.split(" ")[0]}`}
        description="Este es el resumen de tu operación. Todo lo importante del día, en un vistazo."
        actions={
          <>
            <Button variant="outline" icon={<TriangleAlert className="size-4" />} onClick={() => setReporting(true)}>
              Reportar incidencia
            </Button>
            <Button icon={<PackagePlus className="size-5" />} onClick={() => setCreating(true)}>
              Nuevo paquete
            </Button>
          </>
        }
      />

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5" aria-label="Indicadores generales">
        <StatCard
          featured
          className="col-span-2 xl:col-span-1"
          label="Envíos totales"
          value={formatNumber(kpis.total)}
          icon={Package}
          hint="Mayo – octubre 2026"
          delta={{ value: `${month.growth >= 0 ? "+" : ""}${month.growth.toFixed(1)}%`, positive: month.growth >= 0 }}
          href="/paquetes"
        />
        <StatCard label="Entregados" value={formatNumber(kpis.delivered)} icon={CircleCheck} tone="green" hint={`${((kpis.delivered / kpis.total) * 100).toFixed(1)}% del total`} href="/paquetes?grupo=entregados" />
        <StatCard label="En tránsito" value={formatNumber(kpis.inTransit)} icon={Truck} tone="sky" hint="Registrados, en proceso o en camino" href="/paquetes?grupo=activos" />
        <StatCard label="Pendientes" value={formatNumber(kpis.pending)} icon={Clock} tone="orange" hint="Entregas reprogramadas" href="/paquetes?grupo=pendientes" />
        <StatCard label="Incidencias abiertas" value={formatNumber(kpis.incidents)} icon={TriangleAlert} tone="red" hint="Requieren seguimiento" href="/incidencias" />
      </section>

      {/* Gráficas */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Movimiento de envíos"
          description="Paquetes registrados y entregados por día"
          icon={TrendingUp}
          legend={[
            { label: "Registrados", color: CHART_COLORS.blue },
            { label: "Entregados", color: CHART_COLORS.orange },
          ]}
          action={
            <Tabs
              size="sm"
              value={range}
              onChange={setRange}
              items={[
                { value: "7", label: "7 días" },
                { value: "14", label: "14 días" },
                { value: "30", label: "30 días" },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.orange} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} allowDecimals={false} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#B8D4FD", strokeWidth: 1.5 }} />
              <Area type="monotone" dataKey="registrados" name="Registrados" stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#gReg)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
              <Area type="monotone" dataKey="entregados" name="Entregados" stroke={CHART_COLORS.orange} strokeWidth={2} fill="url(#gEnt)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader title="Envíos en curso por estado" description={`${formatNumber(activeTotal)} paquetes aún no entregados`} icon={Layers} />
          <div className="px-5 pt-4 sm:px-6">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {ACTIVE_ORDER.map((s) =>
                kpis.byStatus[s] ? <span key={s} style={{ width: `${(kpis.byStatus[s] / activeTotal) * 100}%`, background: STATUS_CHART_COLOR[s] }} /> : null,
              )}
            </div>
          </div>
          <ul className="flex-1 space-y-1 px-3 py-3 sm:px-4">
            {ACTIVE_ORDER.map((s) => {
              const Icon = STATUS_META[s].icon;
              const n = kpis.byStatus[s];
              return (
                <li key={s}>
                  <Link href={`/paquetes?grupo=${s === "pendiente" ? "pendientes" : s === "incidencia" ? "incidencias" : "activos"}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
                    <span className="grid size-8 place-items-center rounded-lg" style={{ background: `${STATUS_CHART_COLOR[s]}1F`, color: STATUS_CHART_COLOR[s] }}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex-1 text-[15px] font-medium text-ink-soft">{STATUS_LABEL[s]}</span>
                    <span className="text-[13px] text-muted tabular-nums">{activeTotal ? Math.round((n / activeTotal) * 100) : 0}%</span>
                    <span className="w-8 text-right font-bold text-ink tabular-nums">{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Operación del día */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden bg-navy text-white lg:col-span-1">
          <div className="bg-grid absolute inset-0" aria-hidden />
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-brand-500/40 blur-2xl" aria-hidden />
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <CalendarDays className="size-4" aria-hidden /> Entregas de hoy
              </p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{formatTime(DEMO_NOW.toISOString())}</span>
            </div>
            <p className="mt-5 font-display text-5xl font-bold">
              {kpis.deliveredToday}
              <span className="text-2xl text-white/50"> / {todayTotal}</span>
            </p>
            <p className="mt-1 text-[15px] text-white/75">entregas completadas · {kpis.toDeliverToday} por entregar</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${todayTotal ? (kpis.deliveredToday / todayTotal) * 100 : 0}%` }} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <p className="text-xs text-white/60">Registrados hoy</p>
                <p className="mt-1 text-xl font-bold">{kpis.registeredToday}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <p className="text-xs text-white/60">A tiempo (30 días)</p>
                <p className="mt-1 text-xl font-bold">{month.onTimeRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Repartidores hoy"
            description="Avance de entregas por repartidor"
            icon={Truck}
            action={
              <Link href="/repartidores" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                Ver todos <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <ul className="grid gap-x-8 gap-y-1 px-5 py-4 sm:grid-cols-2 sm:px-6">
            {couriers.map((c) => {
              const total = c.deliveredToday + c.assigned + c.pending;
              const pct = total ? (c.deliveredToday / total) * 100 : 0;
              return (
                <li key={c.courier.id}>
                  <Link href={`/repartidores?id=${c.courier.id}`} className="flex items-center gap-3 rounded-xl py-2.5 hover:bg-canvas sm:px-2">
                    <Avatar name={c.courier.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold text-ink">{c.courier.name}</p>
                        <p className="shrink-0 text-[13px] text-muted">
                          <span className="font-bold text-ink">{c.deliveredToday}</span> / {total}
                        </p>
                      </div>
                      <p className="mb-1.5 text-[13px] text-muted">{c.courier.zone}</p>
                      <ProgressBar value={pct} label={`Avance de ${c.courier.name}`} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Tablas y actividad */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Entregas recientes"
            description="Últimos paquetes entregados"
            icon={PackageCheck}
            action={
              <Link href="/paquetes?grupo=entregados" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                Ver todas <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-y border-line-soft bg-canvas/60 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Guía</th>
                  <th className="px-4 py-3">Destinatario</th>
                  <th className="px-4 py-3">Repartidor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Hora</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveries.map((s) => (
                  <tr key={s.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/40">
                    <td className="px-6 py-3">
                      <Link href={`/paquetes/${s.guia}`} className="font-mono text-sm font-bold text-ink hover:text-brand-600">
                        {s.guia}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{s.recipient.name}</p>
                      <p className="text-[13px] text-muted">{s.destination.city}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-soft">{state.couriers.find((c) => c.id === s.courierId)?.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-muted">{relativeTime(s.deliveredAt!)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Incidencias por atender"
            icon={TriangleAlert}
            action={
              <Link href="/incidencias" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                Ver todas <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <ul className="space-y-2 p-4 sm:px-5">
            {openIncidents.map((i) => (
              <li key={i.id}>
                <Link href={`/incidencias?id=${i.id}`} className="flex items-start gap-3 rounded-2xl border border-line-soft p-3 transition-colors hover:border-red-100 hover:bg-red-50/40">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                    <TriangleAlert className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">{INCIDENT_TYPE_LABEL[i.type]}</span>
                      <SeverityBadge severity={i.severity} />
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {i.folio} · {i.guia} · {relativeTime(i.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {openIncidents.length === 0 && <li className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">¡Todo en orden! No hay incidencias abiertas.</li>}
          </ul>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Accesos rápidos" icon={Activity} />
          <div className="grid grid-cols-2 gap-3 p-5 sm:p-6">
            {[
              { label: "Nuevo paquete", icon: PackagePlus, onClick: () => setCreating(true), tone: "bg-accent-50 text-accent-600" },
              { label: "Asignar repartidor", icon: UserRoundCheck, href: "/paquetes?grupo=activos", tone: "bg-brand-50 text-brand-600" },
              { label: "Rastrear guía", icon: Radar, href: "/rastreo", tone: "bg-sky-50 text-sky-700" },
              { label: "Ver reportes", icon: ChartColumn, href: "/reportes", tone: "bg-indigo-50 text-indigo-600" },
              { label: "Reportar incidencia", icon: TriangleAlert, onClick: () => setReporting(true), tone: "bg-red-50 text-red-600" },
              { label: "App repartidor", icon: Smartphone, href: "/entregas", tone: "bg-emerald-50 text-emerald-600" },
            ].map((a) => {
              const inner = (
                <>
                  <span className={cn("grid size-11 place-items-center rounded-2xl", a.tone)}>
                    <a.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-ink">{a.label}</span>
                </>
              );
              const cls = "flex flex-col items-start gap-3 rounded-2xl border border-line p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card";
              return a.href ? (
                <Link key={a.label} href={a.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button key={a.label} onClick={a.onClick} className={cls}>
                  {inner}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Actividad reciente" description="Últimos movimientos registrados en el sistema" icon={Clock} />
          <ul className="px-5 py-4 sm:px-6">
            {activity.map((e, idx) => {
              const Icon = STATUS_META[e.status].icon;
              return (
                <li key={`${e.id}-${idx}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {idx < activity.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-line" aria-hidden />}
                  <span className="relative grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `${STATUS_CHART_COLOR[e.status]}1F`, color: STATUS_CHART_COLOR[e.status] }}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink-soft">
                      <Link href={`/paquetes/${e.guia}`} className="font-mono font-bold text-ink hover:text-brand-600">
                        {e.guia}
                      </Link>{" "}
                      · {e.description}
                    </p>
                    <p className="text-[13px] text-muted">
                      {relativeTime(e.date)} · {e.location}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <NewShipmentModal open={creating} onClose={() => setCreating(false)} />
      <ReportIncidentModal open={reporting} onClose={() => setReporting(false)} reportedBy={user.name} />
    </>
  );
}
