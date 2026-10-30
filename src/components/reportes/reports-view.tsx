"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleCheck, Clock, Download, FileText, Lightbulb, MapPin, Package, PieChart, Timer, TrendingUp, TriangleAlert, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHART_COLORS, ChartCard, ChartTooltip } from "@/components/ui/chart-card";
import { Select } from "@/components/ui/form";
import { Avatar, Card, CardHeader, PageHeader, ProgressBar, Tabs } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { CITY_NAMES, STATUS_CHART_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { PERIODS, courierStats, incidentsByType, periodDays, periodSummary, shipmentsByCity, timeSeries, type PeriodKey } from "@/lib/services/analytics";
import { daysAgo, downloadFile, formatNumber, formatPercent } from "@/lib/utils";

const axisTick = { fill: CHART_COLORS.axis, fontSize: 12 };

export function ReportsView() {
  const state = useDemoState();
  const toast = useToast();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [city, setCity] = useState("all");
  const days = periodDays(period);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  const shipments = useMemo(() => (city === "all" ? state.shipments : state.shipments.filter((s) => s.destination.city === city)), [state.shipments, city]);
  const incidents = useMemo(() => {
    if (city === "all") return state.incidents;
    const ids = new Set(shipments.map((s) => s.id));
    return state.incidents.filter((i) => ids.has(i.shipmentId));
  }, [state.incidents, shipments, city]);

  const summary = useMemo(() => periodSummary(shipments, incidents, days), [shipments, incidents, days]);
  const series = useMemo(() => timeSeries(shipments, incidents, days), [shipments, incidents, days]);
  const byStatus = useMemo(() => {
    const inPeriod = shipments.filter((s) => daysAgo(s.createdAt) < days);
    return STATUS_ORDER.map((st) => ({ status: st, label: STATUS_LABEL[st], value: inPeriod.filter((s) => s.status === st).length })).filter((x) => x.value > 0);
  }, [shipments, days]);
  const couriers = useMemo(
    () =>
      state.couriers
        .filter((c) => city === "all" || c.zone === city)
        .map((c) => courierStats(c, shipments, incidents, days))
        .sort((a, b) => b.delivered - a.delivered),
    [state.couriers, shipments, incidents, days, city],
  );
  const incTypes = useMemo(() => incidentsByType(incidents, days), [incidents, days]);
  const cities = useMemo(() => shipmentsByCity(shipments, days), [shipments, days]);

  const bestCourier = couriers[0];
  const topCity = cities[0];
  const topIncident = incTypes[0];

  const exportReport = () => {
    const lines = [
      `Reporte SALTER — ${PERIODS.find((p) => p.key === period)!.label}${city !== "all" ? ` — ${city}` : ""}`,
      "Datos de demostración",
      "",
      "Indicador,Valor",
      `Envíos registrados,${summary.registered}`,
      `Envíos entregados,${summary.delivered}`,
      `Entregas a tiempo,${summary.onTimeRate.toFixed(1)}%`,
      `Tiempo promedio de entrega (h),${summary.avgHours.toFixed(1)}`,
      `Incidencias,${summary.incidents}`,
      `Tasa de incidencias,${summary.incidentRate.toFixed(2)}%`,
      "",
      "Repartidor,Zona,Entregas,A tiempo,Éxito,Incidencias",
      ...couriers.map((c) => `${c.courier.name},${c.courier.zone},${c.delivered},${c.onTimeRate.toFixed(1)}%,${c.successRate.toFixed(1)}%,${c.incidents}`),
      "",
      "Periodo,Registrados,Entregados,Incidencias",
      ...series.map((p) => `${p.label},${p.registrados},${p.entregados},${p.incidencias}`),
    ];
    downloadFile(`reporte-salter-${period}.csv`, lines.join("\n"));
    toast.success("Reporte exportado", "Se descargó el archivo CSV (compatible con Excel).");
  };

  return (
    <>
      <PageHeader
        eyebrow="Indicadores"
        title="Reportes"
        description="Mide el desempeño de la operación. Cambia el periodo o la ciudad y todos los datos se actualizan."
        actions={
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportReport}>
            Exportar reporte
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={period} onChange={setPeriod} items={PERIODS.map((p) => ({ value: p.key, label: p.short }))} />
        <Select aria-label="Filtrar por ciudad destino" value={city} onChange={(e) => setCity(e.target.value)} className="sm:w-60">
          <option value="all">Todas las ciudades</option>
          {CITY_NAMES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard featured className="col-span-2 xl:col-span-1" label="Envíos registrados" value={formatNumber(summary.registered)} icon={Package} delta={{ value: `${summary.growth >= 0 ? "+" : ""}${summary.growth.toFixed(1)}%`, positive: summary.growth >= 0 }} hint="vs. periodo anterior" />
        <StatCard label="Entregados" value={formatNumber(summary.delivered)} icon={CircleCheck} tone="green" hint={`En ${periodLabel}`} />
        <StatCard label="Entregas a tiempo" value={formatPercent(summary.onTimeRate)} icon={Clock} tone="blue" hint="Dentro de la fecha estimada" />
        <StatCard label="Tiempo promedio" value={`${summary.avgHours.toFixed(1)} h`} icon={Timer} tone="sky" hint="Del registro a la entrega" />
        <StatCard label="Incidencias" value={formatNumber(summary.incidents)} icon={TriangleAlert} tone="orange" hint={`${formatPercent(summary.incidentRate, 2)} de los envíos`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Tendencia de envíos"
          description={days <= 31 ? "Registrados y entregados por día" : days <= 92 ? "Registrados y entregados por semana" : "Registrados y entregados por mes"}
          icon={TrendingUp}
          legend={[
            { label: "Registrados", color: CHART_COLORS.blue },
            { label: "Entregados", color: CHART_COLORS.orange },
          ]}
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={12} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#EEF5FF" }} />
              <Bar dataKey="registrados" name="Registrados" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="entregados" name="Entregados" fill={CHART_COLORS.orange} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="relative overflow-hidden bg-navy text-white">
          <div className="bg-grid absolute inset-0" aria-hidden />
          <div className="absolute -right-20 -bottom-20 size-56 rounded-full bg-accent-500/25 blur-3xl" aria-hidden />
          <div className="relative p-6">
            <p className="flex items-center gap-2 text-sm font-bold text-accent-300">
              <FileText className="size-4" aria-hidden /> Resumen ejecutivo
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold leading-tight">
              {summary.growth >= 0 ? "La operación creció" : "La operación bajó"} {Math.abs(summary.growth).toFixed(1)}% en {periodLabel}.
            </h3>
            <ul className="mt-5 space-y-3.5 text-[15px] leading-relaxed text-white/85">
              <li className="flex gap-3">
                <CircleCheck className="mt-1 size-4 shrink-0 text-sky-brand" aria-hidden />
                <span>
                  Se entregaron <strong className="text-white">{formatNumber(summary.delivered)}</strong> paquetes; el <strong className="text-white">{formatPercent(summary.onTimeRate)}</strong> llegó a tiempo.
                </span>
              </li>
              {bestCourier && (
                <li className="flex gap-3">
                  <Truck className="mt-1 size-4 shrink-0 text-sky-brand" aria-hidden />
                  <span>
                    <strong className="text-white">{bestCourier.courier.name}</strong> lidera con {bestCourier.delivered} entregas y {formatPercent(bestCourier.successRate)} de éxito.
                  </span>
                </li>
              )}
              {topCity && (
                <li className="flex gap-3">
                  <MapPin className="mt-1 size-4 shrink-0 text-sky-brand" aria-hidden />
                  <span>
                    <strong className="text-white">{topCity.city}</strong> es el destino principal ({formatNumber(topCity.count)} envíos).
                  </span>
                </li>
              )}
              <li className="flex gap-3">
                <TriangleAlert className="mt-1 size-4 shrink-0 text-accent-400" aria-hidden />
                <span>
                  {summary.incidents
                    ? <>Se registraron <strong className="text-white">{summary.incidents}</strong> incidencias{topIncident ? <>, sobre todo por <strong className="text-white">{topIncident.label.toLowerCase()}</strong></> : null}.</>
                    : "No se registraron incidencias en el periodo."}
                </span>
              </li>
            </ul>
            {topIncident && (
              <div className="mt-6 flex gap-3 rounded-2xl bg-white/10 p-4 text-sm ring-1 ring-white/10">
                <Lightbulb className="size-5 shrink-0 text-accent-400" aria-hidden />
                <p>
                  <strong>Recomendación:</strong>{" "}
                  {topIncident.type === "destinatario_ausente"
                    ? "confirmar por teléfono el horario de entrega antes de salir a ruta."
                    : topIncident.type === "direccion_incorrecta"
                      ? "validar código postal y referencias al registrar cada paquete."
                      : "revisar el empaque y la manipulación en el centro de distribución."}
                </p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Envíos por estado" description={`Estado actual de los registrados en ${periodLabel}`} icon={PieChart} height={Math.max(180, byStatus.length * 44)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ ...axisTick, fill: "#33415C", fontWeight: 600 }} width={130} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F4F7FB" }} />
              <Bar dataKey="value" name="Envíos" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {byStatus.map((d) => (
                  <Cell key={d.status} fill={STATUS_CHART_COLOR[d.status]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fill: "#0F1B33", fontSize: 13, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Incidencias por periodo" description="Número de incidencias registradas" icon={TriangleAlert} height={Math.max(180, byStatus.length * 44)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={12} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#FFF5EB" }} />
              <Bar dataKey="incidencias" name="Incidencias" fill={CHART_COLORS.orange} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Productividad de repartidores" description={`Entregas y calidad del servicio · ${periodLabel}`} icon={Truck} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-y border-line-soft bg-canvas/60 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Repartidor</th>
                  <th className="px-4 py-3">Entregas</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">A tiempo</th>
                  <th className="px-4 py-3 text-right">Éxito</th>
                  <th className="px-6 py-3 text-right">Incidencias</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => {
                  const max = couriers[0]?.delivered || 1;
                  return (
                    <tr key={c.courier.id} className="border-b border-line-soft last:border-0">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.courier.name} size="sm" />
                          <div>
                            <p className="whitespace-nowrap text-sm font-semibold text-ink">{c.courier.name}</p>
                            <p className="text-[13px] text-muted">{c.courier.zone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="w-56 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={(c.delivered / max) * 100} label={`Entregas de ${c.courier.name}`} />
                          <span className="w-9 text-right text-sm font-bold text-ink tabular-nums">{c.delivered}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-ink-soft tabular-nums">{formatPercent(c.onTimeRate, 0)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-ink-soft tabular-nums">{formatPercent(c.successRate, 0)}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-ink-soft tabular-nums">{c.incidents}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Motivos de incidencia" icon={TriangleAlert} />
            <ul className="space-y-3 p-5 sm:p-6">
              {incTypes.length === 0 && <li className="text-sm text-muted">Sin incidencias en el periodo.</li>}
              {incTypes.map((t) => (
                <li key={t.type}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-ink-soft">{t.label}</span>
                    <span className="font-bold text-ink">{t.count}</span>
                  </div>
                  <ProgressBar value={(t.count / incTypes[0].count) * 100} tone="orange" label={t.label} />
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Envíos por ciudad destino" icon={MapPin} />
            <ul className="space-y-3 p-5 sm:p-6">
              {cities.map((c) => (
                <li key={c.city}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-ink-soft">{c.city}</span>
                    <span className="font-bold text-ink">{formatNumber(c.count)}</span>
                  </div>
                  <ProgressBar value={(c.count / cities[0].count) * 100} label={c.city} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </>
  );
}
