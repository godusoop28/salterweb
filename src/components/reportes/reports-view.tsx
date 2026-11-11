"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CircleCheck, ClipboardCheck, Download, FilePen, Hourglass, PackageCheck, Truck, TriangleAlert, Warehouse, FileText, Sheet,
} from "lucide-react";
import { QueryState, Table } from "@/components/app/common";
import { GUIDE_STATUS, GUIDE_STATUS_ORDER } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { CHART_COLORS, ChartCard } from "@/components/ui/chart-card";
import { Input, Select } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { downloadFile, errorMessage } from "@/lib/api/client";
import { useCouriers, useReportSummary, useSenders, useShifts } from "@/lib/api/hooks";
import type { GuideStatus } from "@/lib/api/types";
import { daysAgoKey, fmtDate, fmtNumber, todayKey } from "@/lib/format";
import { useSession } from "@/lib/session";

/** Dashboard y reportes: todos los cálculos vienen del backend (SQL sobre guías y movimientos). */
export function ReportsView({ mode }: { mode: "dashboard" | "reports" }) {
  const { can } = useSession();
  const toast = useToast();
  const general = can("REPORTS_VIEW") || can("DASHBOARD_VIEW");
  const [from, setFrom] = useState(mode === "dashboard" ? daysAgoKey(6) : daysAgoKey(29));
  const [to, setTo] = useState(todayKey());
  const [senderId, setSenderId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [courierId, setCourierId] = useState("");
  const [status, setStatus] = useState<GuideStatus | "">("");
  const [destination, setDestination] = useState("");
  const senders = useSenders({});
  const shifts = useShifts();
  const couriers = useCouriers(undefined, general && can("COURIERS_VIEW", "ASSIGNMENTS_MANAGE", "COURIERS_MANAGE"));
  const params = { from, to, senderId: senderId || undefined, shiftId: shiftId || undefined, courierId: courierId || undefined, status: status || undefined, destination: destination || undefined };
  const q = useReportSummary(params);
  const s = q.data;

  const exportAs = (format: "csv" | "xlsx" | "pdf") =>
    downloadFile("/reports/guides/export", `reporte-guias-${from}_${to}.${format}`, { ...params, format }).catch((e) => toast.error("No se pudo exportar", errorMessage(e)));

  return (
    <>
      <PageHeader eyebrow={mode === "dashboard" ? "Operación" : undefined} title={mode === "dashboard" ? "Dashboard operativo" : "Reportes"}
        description={`Del ${fmtDate(from)} al ${fmtDate(to)}. Cifras calculadas sobre los movimientos registrados.`}
        actions={mode === "reports" && can("REPORTS_VIEW", "REPORTS_OWN") && <>
          <Button variant="outline" icon={<Download className="size-4" />} onClick={() => exportAs("csv")}>CSV</Button>
          <Button variant="outline" icon={<Sheet className="size-4" />} onClick={() => exportAs("xlsx")}>Excel</Button>
          <Button variant="outline" icon={<FileText className="size-4" />} onClick={() => exportAs("pdf")}>PDF</Button>
        </>} />
      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7">
        <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" />
        <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" />
        {general && (
          <Select value={senderId} onChange={(e) => setSenderId(e.target.value)} aria-label="Remitente">
            <option value="">Todos los remitentes</option>{senders.data?.content.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        )}
        <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)} aria-label="Turno"><option value="">Todos los turnos</option>{shifts.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as GuideStatus)} aria-label="Estado"><option value="">Todos los estados</option>{GUIDE_STATUS_ORDER.map((x) => <option key={x} value={x}>{GUIDE_STATUS[x].label}</option>)}</Select>
        {couriers.data && <Select value={courierId} onChange={(e) => setCourierId(e.target.value)} aria-label="Repartidor"><option value="">Todos los repartidores</option>{couriers.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
        <Input placeholder="Destino (ciudad/estado)" value={destination} onChange={(e) => setDestination(e.target.value)} aria-label="Destino" />
      </Card>
      <QueryState loading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {s && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Guías elaboradas" value={fmtNumber(s.generated)} icon={FilePen} tone="navy" hint="En el periodo" />
              <StatCard label="Confirmadas" value={fmtNumber(s.confirmed)} icon={CircleCheck} tone="blue" hint="En el periodo" />
              <StatCard label="Listas para salida" value={fmtNumber(s.readyForDispatch)} icon={ClipboardCheck} tone="sky" hint="Ahora" />
              <StatCard label="Despachadas" value={fmtNumber(s.dispatched)} icon={Truck} tone="blue" hint="En el periodo" />
              <StatCard label="En tránsito" value={fmtNumber(s.inTransit)} icon={Truck} tone="sky" hint="Ahora" />
              <StatCard label="Recibidas en destino" value={fmtNumber(s.received)} icon={Warehouse} tone="navy" hint="En el periodo" />
              <StatCard label="Entregadas" value={fmtNumber(s.delivered)} icon={PackageCheck} tone="green" hint="En el periodo" />
              <StatCard label="Pendientes" value={fmtNumber(s.pending)} icon={Hourglass} tone="orange" hint="Borrador, confirmadas o listas" />
              <StatCard label="Incidencias" value={fmtNumber(s.incidentsCreated)} icon={TriangleAlert} tone="red" hint={`${s.incidentsOpen} abiertas ahora`} />
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
              <ChartCard title="Movimientos por día" description="Eventos registrados en el historial" height={300}
                legend={[{ label: "Confirmadas", color: CHART_COLORS.blue }, { label: "Despachadas", color: CHART_COLORS.sky }, { label: "Entregadas", color: CHART_COLORS.orange }]}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.movementsByDay} margin={{ left: -16, right: 8 }}>
                    <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                    <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12, fill: CHART_COLORS.axis }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART_COLORS.axis }} />
                    <Tooltip />
                    <Bar dataKey="confirmed" name="Confirmadas" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dispatched" name="Despachadas" fill={CHART_COLORS.sky} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" name="Entregadas" fill={CHART_COLORS.orange} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Actividad por turno" description="Guías elaboradas en el periodo" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.byShift} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART_COLORS.axis }} />
                    <YAxis type="category" dataKey="shift" width={90} tick={{ fontSize: 12, fill: CHART_COLORS.axis }} />
                    <Tooltip /><Legend />
                    <Bar dataKey="guides" name="Elaboradas" fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="confirmed" name="Confirmadas" fill={CHART_COLORS.orange} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5">
                <h3 className="mb-3 font-bold text-ink">Estado actual</h3>
                <ul className="space-y-2 text-sm">
                  {GUIDE_STATUS_ORDER.map((st) => <li key={st} className="flex justify-between"><span className="text-ink-soft">{GUIDE_STATUS[st].label}</span><span className="font-bold">{fmtNumber(s.currentByStatus[st] ?? 0)}</span></li>)}
                </ul>
              </Card>
              {general && (
                <Card className="lg:col-span-2">
                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="p-5"><h3 className="mb-3 font-bold text-ink">Por repartidor</h3>
                      <Table className="[&_table]:min-w-0" head={["Repartidor", "Asignadas", "Entregadas"]}>
                        {s.byCourier.map((c) => <tr key={c.courier_id}><td className="px-4 py-2">{c.courier}</td><td className="px-4 py-2">{c.active_assignments}</td><td className="px-4 py-2">{c.delivered}</td></tr>)}
                      </Table>
                    </div>
                    <div className="p-5"><h3 className="mb-3 font-bold text-ink">Por remitente</h3>
                      <Table className="[&_table]:min-w-0" head={["Remitente", "Guías"]}>
                        {s.bySender.map((x) => <tr key={x.sender_id}><td className="px-4 py-2">{x.sender}</td><td className="px-4 py-2">{x.guides}</td></tr>)}
                      </Table>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </QueryState>
    </>
  );
}
