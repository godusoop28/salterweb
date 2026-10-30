"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Car,
  Check,
  CircleCheck,
  Clock,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  PackagePlus,
  Phone,
  Star,
  Target,
  Timer,
  Truck,
  TriangleAlert,
} from "lucide-react";
import { CourierStatusBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar, Select } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Avatar, Card, EmptyState, PageHeader, ProgressBar, Tabs } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { COURIER_STATUS_LABEL } from "@/lib/constants";
import { courierStats, type CourierStats } from "@/lib/services/analytics";
import { assignCourier, updateCourier } from "@/lib/services/salter-service";
import type { CourierStatus } from "@/lib/types";
import { cn, formatDate, formatNumber, normalize, relativeTime } from "@/lib/utils";

export function CouriersView() {
  const state = useDemoState();
  const params = useSearchParams();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourierStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));

  const stats = useMemo(
    () =>
      state.couriers.map((c) => courierStats(c, state.shipments, state.incidents, 30)),
    [state.couriers, state.shipments, state.incidents],
  );

  const filtered = stats.filter(
    (s) => (statusFilter === "all" || s.courier.status === statusFilter) && normalize(`${s.courier.name} ${s.courier.zone}`).includes(normalize(query)),
  );

  const totals = useMemo(() => {
    const delivered = stats.reduce((a, s) => a + s.delivered, 0);
    const inc = stats.reduce((a, s) => a + s.incidents, 0);
    return {
      onRoute: state.couriers.filter((c) => c.status === "en_ruta").length,
      today: stats.reduce((a, s) => a + s.deliveredToday, 0),
      success: delivered + inc ? (delivered / (delivered + inc)) * 100 : 0,
      avgHours: stats.filter((s) => s.delivered).reduce((a, s) => a + s.avgHours, 0) / Math.max(1, stats.filter((s) => s.delivered).length),
    };
  }, [stats, state.couriers]);

  const selected = stats.find((s) => s.courier.id === selectedId);

  return (
    <>
      <PageHeader eyebrow="Equipo" title="Repartidores" description="Consulta el avance de cada repartidor, sus entregas asignadas y su productividad de los últimos 30 días." />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="En ruta ahora" value={`${totals.onRoute} de ${state.couriers.length}`} icon={Truck} tone="blue" hint="Repartidores con entregas en curso" />
        <StatCard label="Entregas de hoy" value={formatNumber(totals.today)} icon={CalendarCheck} tone="green" hint="Completadas por todo el equipo" />
        <StatCard label="Tasa de éxito" value={`${totals.success.toFixed(1)}%`} icon={Target} tone="orange" hint="Entregas sin incidencia · 30 días" />
        <StatCard label="Tiempo promedio" value={`${totals.avgHours.toFixed(1)} h`} icon={Timer} tone="sky" hint="Desde llegada a ciudad hasta entrega" />
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre o zona…" className="flex-1" label="Buscar repartidores" />
        <Select aria-label="Filtrar por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CourierStatus | "all")} className="sm:w-52">
          <option value="all">Todos los estados</option>
          {(Object.keys(COURIER_STATUS_LABEL) as CourierStatus[]).map((s) => (
            <option key={s} value={s}>
              {COURIER_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <div className="flex rounded-xl bg-white p-1 ring-1 ring-line" role="group" aria-label="Tipo de vista">
          <button onClick={() => setView("cards")} aria-pressed={view === "cards"} className={cn("grid size-9 place-items-center rounded-lg", view === "cards" ? "bg-brand-50 text-brand-600" : "text-muted")} aria-label="Ver tarjetas">
            <LayoutGrid className="size-[18px]" />
          </button>
          <button onClick={() => setView("table")} aria-pressed={view === "table"} className={cn("grid size-9 place-items-center rounded-lg", view === "table" ? "bg-brand-50 text-brand-600" : "text-muted")} aria-label="Ver tabla">
            <List className="size-[18px]" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-6">
          <EmptyState icon={Truck} title="Sin resultados" description="No hay repartidores que coincidan con tu búsqueda." />
        </Card>
      ) : view === "cards" ? (
        <section className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((s) => (
            <CourierCard key={s.courier.id} stats={s} onOpen={() => setSelectedId(s.courier.id)} />
          ))}
        </section>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-line-soft bg-canvas/60 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">Repartidor</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-right">Hoy</th>
                  <th className="px-4 py-3.5 text-right">Por entregar</th>
                  <th className="px-4 py-3.5 text-right">Entregas 30 d</th>
                  <th className="px-4 py-3.5">Éxito</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.courier.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.courier.name} />
                        <div>
                          <p className="font-semibold text-ink">{s.courier.name}</p>
                          <p className="text-[13px] text-muted">{s.courier.zone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><CourierStatusBadge status={s.courier.status} /></td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink tabular-nums">{s.deliveredToday}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink tabular-nums">{s.assigned + s.pending}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink tabular-nums">{s.delivered}</td>
                    <td className="w-48 px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={s.successRate} tone="green" label="Tasa de éxito" />
                        <span className="text-sm font-semibold text-ink-soft tabular-nums">{s.successRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="soft" onClick={() => setSelectedId(s.courier.id)}>
                        Ver ficha
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        size="lg"
        title={selected?.courier.name ?? ""}
        description={selected ? `Repartidor · ${selected.courier.zone}` : undefined}
      >
        {selected && <CourierProfile stats={selected} />}
      </Drawer>
    </>
  );
}

function CourierCard({ stats: s, onOpen }: { stats: CourierStats; onOpen: () => void }) {
  const todayTotal = s.deliveredToday + s.assigned + s.pending;
  return (
    <Card className="group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={s.courier.name} size="lg" />
          <span
            className={cn(
              "absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-white",
              s.courier.status === "en_ruta" ? "bg-brand-500" : s.courier.status === "disponible" ? "bg-emerald-500" : s.courier.status === "descanso" ? "bg-accent-500" : "bg-slate-400",
            )}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-ink">{s.courier.name}</p>
          <p className="flex items-center gap-1 text-[13px] text-muted">
            <MapPin className="size-3.5" aria-hidden /> {s.courier.zone}
          </p>
        </div>
        <CourierStatusBadge status={s.courier.status} size="sm" />
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-canvas px-3.5 py-2.5 text-[13px] text-ink-soft">
        <span className="flex items-center gap-1.5"><Car className="size-4 text-subtle" aria-hidden /> {s.courier.vehicle}</span>
        <span className="flex items-center gap-1.5"><Star className="size-4 fill-accent-400 text-accent-400" aria-hidden /> {s.courier.rating.toFixed(1)}</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Entregadas hoy", value: s.deliveredToday, tone: "text-emerald-600" },
          { label: "Por entregar", value: s.assigned, tone: "text-brand-600" },
          { label: "Pendientes", value: s.pending, tone: "text-accent-600" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-line-soft py-3">
            <dd className={cn("font-display text-2xl font-bold", m.tone)}>{m.value}</dd>
            <dt className="text-xs font-medium text-muted">{m.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[13px]">
          <span className="font-semibold text-ink-soft">Avance del día</span>
          <span className="font-bold text-ink">{todayTotal ? Math.round((s.deliveredToday / todayTotal) * 100) : 0}%</span>
        </div>
        <ProgressBar value={todayTotal ? (s.deliveredToday / todayTotal) * 100 : 0} label="Avance del día" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-4 text-[13px]">
        <span className="text-muted">
          <strong className="text-ink">{s.delivered}</strong> entregas · <strong className="text-ink">{s.successRate.toFixed(0)}%</strong> éxito (30 d)
        </span>
        <Button size="sm" variant="soft" onClick={onOpen}>
          Ver ficha
        </Button>
      </div>
    </Card>
  );
}

function CourierProfile({ stats: s }: { stats: CourierStats }) {
  const state = useDemoState();
  const toast = useToast();
  const [tab, setTab] = useState<"asignadas" | "historial" | "asignar">("asignadas");
  const [toAssign, setToAssign] = useState<string[]>([]);
  const c = s.courier;

  const assigned = state.shipments
    .filter((x) => x.courierId === c.id && x.status !== "entregado")
    .sort((a, b) => (a.routeOrder ?? 99) - (b.routeOrder ?? 99));
  const history = state.shipments
    .filter((x) => x.courierId === c.id && x.deliveredAt)
    .sort((a, b) => b.deliveredAt!.localeCompare(a.deliveredAt!))
    .slice(0, 10);
  const unassigned = state.shipments.filter((x) => !x.courierId && x.destination.city === c.zone && x.status !== "entregado").slice(-12).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-3xl bg-brand-gradient p-5 text-white">
        <Avatar name={c.name} size="xl" className="bg-white/90" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{c.name}</p>
          <p className="text-sm text-white/80">
            {c.vehicle} · Placas {c.plate}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
            <Star className="size-4 fill-accent-400 text-accent-400" aria-hidden /> {c.rating.toFixed(1)} · Desde {formatDate(c.joinedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-2xl border border-line p-3.5 hover:bg-canvas">
          <Phone className="size-5 text-brand-500" aria-hidden />
          <span className="text-[15px] font-semibold text-ink">{c.phone}</span>
        </a>
        <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line p-3.5 hover:bg-canvas">
          <Mail className="size-5 shrink-0 text-brand-500" aria-hidden />
          <span className="truncate text-[15px] font-semibold text-ink">{c.email}</span>
        </a>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas p-3.5">
        <span className="text-sm font-semibold text-ink-soft">Estado de trabajo</span>
        <Select
          aria-label="Cambiar estado de trabajo"
          value={c.status}
          className="h-10 w-48"
          onChange={(e) => {
            updateCourier(c.id, { status: e.target.value as CourierStatus });
            toast.success("Estado actualizado", `${c.name} ahora está "${COURIER_STATUS_LABEL[e.target.value as CourierStatus]}".`);
          }}
        >
          {(Object.keys(COURIER_STATUS_LABEL) as CourierStatus[]).map((st) => (
            <option key={st} value={st}>
              {COURIER_STATUS_LABEL[st]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <h3 className="mb-3 font-bold text-ink">Productividad · últimos 30 días</h3>
        <dl className="grid grid-cols-2 gap-3">
          {[
            { label: "Entregas realizadas", value: s.delivered, icon: CircleCheck },
            { label: "Entregadas a tiempo", value: `${s.onTimeRate.toFixed(0)}%`, icon: Clock },
            { label: "Tasa de éxito", value: `${s.successRate.toFixed(1)}%`, icon: Target },
            { label: "Incidencias", value: s.incidents, icon: TriangleAlert },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-line p-4">
              <m.icon className="size-5 text-brand-500" aria-hidden />
              <dd className="mt-2 font-display text-2xl font-bold text-ink">{m.value}</dd>
              <dt className="text-[13px] text-muted">{m.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "asignadas", label: "Asignadas", count: assigned.length },
          { value: "historial", label: "Historial" },
          { value: "asignar", label: "Asignar paquetes", count: unassigned.length },
        ]}
      />

      {tab === "asignadas" &&
        (assigned.length ? (
          <ul className="space-y-2">
            {assigned.map((x) => (
              <li key={x.id}>
                <Link href={`/paquetes/${x.guia}`} className="flex items-center gap-3 rounded-2xl border border-line p-3.5 hover:border-brand-200 hover:bg-brand-50/40">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{x.routeOrder ?? "–"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm font-bold text-ink">{x.guia}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {x.recipient.name} · {x.destination.street}
                    </span>
                  </span>
                  <StatusBadge status={x.status} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={CircleCheck} title="Sin entregas pendientes" description="Este repartidor no tiene paquetes por entregar." className="py-8" />
        ))}

      {tab === "historial" && (
        <ul className="divide-y divide-line-soft rounded-2xl border border-line">
          {history.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-3">
              <CircleCheck className="size-5 shrink-0 text-emerald-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <Link href={`/paquetes/${x.guia}`} className="font-mono text-sm font-bold text-ink hover:text-brand-600">
                  {x.guia}
                </Link>
                <span className="block truncate text-[13px] text-muted">{x.recipient.name}</span>
              </span>
              <span className="text-[13px] text-muted">{relativeTime(x.deliveredAt!)}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "asignar" &&
        (unassigned.length ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Paquetes sin repartidor con destino a {c.zone}. Selecciona los que quieres asignar.</p>
            <ul className="space-y-2">
              {unassigned.map((x) => {
                const checked = toAssign.includes(x.id);
                return (
                  <li key={x.id}>
                    <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-all", checked ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200")}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => setToAssign((l) => (checked ? l.filter((i) => i !== x.id) : [...l, x.id]))}
                      />
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg border-2", checked ? "border-brand-500 bg-brand-500 text-white" : "border-line")}>
                        {checked && <Check className="size-4" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-bold text-ink">{x.guia}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {x.recipient.name} · {x.destination.neighborhood}
                        </span>
                      </span>
                      <StatusBadge status={x.status} size="sm" />
                    </label>
                  </li>
                );
              })}
            </ul>
            <Button
              className="w-full"
              disabled={!toAssign.length}
              icon={<PackagePlus className="size-5" />}
              onClick={() => {
                toAssign.forEach((id) => assignCourier(id, c.id));
                toast.success("Paquetes asignados", `${toAssign.length} paquete(s) agregados a la lista de ${c.name}.`);
                setToAssign([]);
                setTab("asignadas");
              }}
            >
              Asignar {toAssign.length || ""} paquete{toAssign.length === 1 ? "" : "s"}
            </Button>
          </div>
        ) : (
          <EmptyState icon={PackagePlus} title="Nada por asignar" description={`No hay paquetes sin repartidor con destino a ${c.zone}.`} className="py-8" />
        ))}
    </div>
  );
}
