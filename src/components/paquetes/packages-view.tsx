"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, Eye, FilterX, PackagePlus, PackageSearch, RefreshCw, SlidersHorizontal, UserRoundCheck, Zap } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { SearchBar, Select } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Avatar, Card, EmptyState, PageHeader, Pagination, Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { CITY_NAMES, STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import type { ShipmentStatus } from "@/lib/types";
import { cn, daysAgo, downloadFile, formatDate, formatTime, normalize } from "@/lib/utils";
import { NewShipmentModal } from "./new-shipment-form";
import { AssignCourierModal, UpdateStatusModal } from "./shipment-actions";
import { ShipmentQuickView } from "./shipment-detail";

type Group = "todos" | "activos" | "entregados" | "pendientes" | "incidencias";
const GROUP_STATUSES: Record<Group, ShipmentStatus[] | null> = {
  todos: null,
  activos: ["registrado", "en_proceso", "en_transito", "en_ciudad_destino"],
  entregados: ["entregado"],
  pendientes: ["pendiente"],
  incidencias: ["incidencia"],
};

const DATE_FILTERS = [
  { value: "all", label: "Cualquier fecha" },
  { value: "0", label: "Hoy" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 3 meses" },
];

const PAGE_SIZE = 12;

export function PackagesView() {
  const state = useDemoState();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [group, setGroup] = useState<Group>((params.get("grupo") as Group) ?? "todos");
  const [status, setStatus] = useState<ShipmentStatus | "all">("all");
  const [courierId, setCourierId] = useState("all");
  const [city, setCity] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(params.get("nuevo") === "1");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"assign" | "status" | null>(null);

  const selected = state.shipments.find((s) => s.id === selectedId) ?? null;

  const base = useMemo(() => {
    const term = normalize(query.trim());
    return state.shipments.filter((s) => {
      if (term && !normalize(`${s.guia} ${s.recipient.name} ${s.sender.company} ${s.destination.city} ${s.description}`).includes(term)) return false;
      if (status !== "all" && s.status !== status) return false;
      if (courierId === "unassigned" ? s.courierId : courierId !== "all" && s.courierId !== courierId) return false;
      if (city !== "all" && s.destination.city !== city) return false;
      if (dateRange !== "all" && daysAgo(s.createdAt) > Number(dateRange)) return false;
      return true;
    });
  }, [state.shipments, query, status, courierId, city, dateRange]);

  const counts = useMemo(() => {
    const c = { todos: base.length, activos: 0, entregados: 0, pendientes: 0, incidencias: 0 };
    for (const s of base) {
      if (GROUP_STATUSES.activos!.includes(s.status)) c.activos++;
      else if (s.status === "entregado") c.entregados++;
      else if (s.status === "pendiente") c.pendientes++;
      else if (s.status === "incidencia") c.incidencias++;
    }
    return c;
  }, [base]);

  const filtered = useMemo(() => {
    const allowed = GROUP_STATUSES[group];
    return base.filter((s) => !allowed || allowed.includes(s.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [base, group]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilters = [status !== "all", courierId !== "all", city !== "all", dateRange !== "all"].filter(Boolean).length;

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setCourierId("all");
    setCity("all");
    setDateRange("all");
    setGroup("todos");
    setPage(1);
  };

  const exportCsv = () => {
    const header = ["Guía", "Estado", "Remitente", "Destinatario", "Ciudad destino", "Repartidor", "Fecha de registro", "Peso (kg)", "Valor declarado"];
    const lines = filtered.map((s) =>
      [s.guia, STATUS_LABEL[s.status], s.sender.company, s.recipient.name, s.destination.city, state.couriers.find((c) => c.id === s.courierId)?.name ?? "Sin asignar", formatDate(s.createdAt), s.weightKg, s.declaredValue]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadFile("salter-paquetes.csv", [header.join(","), ...lines].join("\n"));
    toast.success("Exportación lista", `${filtered.length.toLocaleString("es-MX")} paquetes descargados en CSV.`);
  };

  const courierName = (id: string | null) => state.couriers.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Gestión de paquetes"
        description="Consulta, filtra y da seguimiento a todos los envíos. Haz clic en un paquete para ver su detalle."
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
              Exportar
            </Button>
            <Button icon={<PackagePlus className="size-5" />} onClick={() => setCreating(true)}>
              Nuevo paquete
            </Button>
          </>
        }
      />

      <Card>
        <div className="space-y-4 border-b border-line-soft p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchBar value={query} onChange={resetPage(setQuery)} placeholder="Buscar por guía, destinatario, remitente o ciudad…" className="flex-1" label="Buscar paquetes" />
            <div className="flex gap-2">
              <Button variant={showFilters || activeFilters ? "soft" : "outline"} icon={<SlidersHorizontal className="size-4" />} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
                Filtros
                {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-xs text-white">{activeFilters}</span>}
              </Button>
              {(activeFilters > 0 || query || group !== "todos") && (
                <Button variant="ghost" icon={<FilterX className="size-4" />} onClick={clearFilters}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid animate-slide-up gap-3 rounded-2xl bg-canvas p-3 sm:grid-cols-2 xl:grid-cols-4">
              <Select aria-label="Filtrar por estado" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as ShipmentStatus | "all")}>
                <option value="all">Todos los estados</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
              <Select aria-label="Filtrar por repartidor" value={courierId} onChange={(e) => resetPage(setCourierId)(e.target.value)}>
                <option value="all">Todos los repartidores</option>
                <option value="unassigned">Sin asignar</option>
                {state.couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select aria-label="Filtrar por ciudad destino" value={city} onChange={(e) => resetPage(setCity)(e.target.value)}>
                <option value="all">Todas las ciudades</option>
                {CITY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Select aria-label="Filtrar por fecha" value={dateRange} onChange={(e) => resetPage(setDateRange)(e.target.value)}>
                {DATE_FILTERS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Tabs
            value={group}
            onChange={resetPage(setGroup)}
            items={[
              { value: "todos", label: "Todos", count: counts.todos },
              { value: "activos", label: "En curso", count: counts.activos },
              { value: "entregados", label: "Entregados", count: counts.entregados },
              { value: "pendientes", label: "Pendientes", count: counts.pendientes },
              { value: "incidencias", label: "Incidencias", count: counts.incidencias },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No hay paquetes que coincidan"
            description="Prueba con otra búsqueda o limpia los filtros para ver todos los envíos."
            action={
              <Button variant="outline" icon={<FilterX className="size-4" />} onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <>
            {/* Tabla escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line-soft text-xs font-bold uppercase tracking-wider text-muted">
                    <th className="px-5 py-3.5">Guía</th>
                    <th className="px-4 py-3.5">Destinatario</th>
                    <th className="hidden px-4 py-3.5 xl:table-cell">Remitente</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5">Repartidor</th>
                    <th className="hidden px-4 py-3.5 lg:table-cell">Registro</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={cn("cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-brand-50/40", selectedId === s.id && "bg-brand-50/60")}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[14px] font-bold text-ink">{s.guia}</span>
                          {s.service === "express" && <Zap className="size-3.5 text-accent-500" aria-label="Express" />}
                        </div>
                        <p className="text-[13px] text-muted">{s.description}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="whitespace-nowrap font-semibold text-ink">{s.recipient.name}</p>
                        <p className="text-[13px] text-muted">{s.destination.city}</p>
                      </td>
                      <td className="hidden px-4 py-3.5 xl:table-cell">
                        <p className="font-medium text-ink-soft">{s.sender.company}</p>
                        <p className="text-[13px] text-muted">{s.origin.city}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {s.courierId ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={courierName(s.courierId)!} size="sm" />
                            <span className="whitespace-nowrap text-sm font-medium text-ink-soft">{courierName(s.courierId)}</span>
                          </span>
                        ) : s.status !== "entregado" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(s.id);
                              setDialog("assign");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 px-2.5 py-1 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
                          >
                            <UserRoundCheck className="size-3.5" aria-hidden /> Asignar
                          </button>
                        ) : (
                          <span className="text-sm text-subtle">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <p className="whitespace-nowrap text-sm font-medium text-ink-soft">{formatDate(s.createdAt)}</p>
                        <p className="text-[13px] text-muted">{formatTime(s.createdAt)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setSelectedId(s.id)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-600" title="Vista rápida" aria-label={`Vista rápida de ${s.guia}`}>
                            <Eye className="size-[18px]" />
                          </button>
                          {s.status !== "entregado" && (
                            <button
                              onClick={() => {
                                setSelectedId(s.id);
                                setDialog("status");
                              }}
                              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-600"
                              title="Actualizar estado"
                              aria-label={`Actualizar estado de ${s.guia}`}
                            >
                              <RefreshCw className="size-[18px]" />
                            </button>
                          )}
                          <Link href={`/paquetes/${s.guia}`} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                            Detalle
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas móvil */}
            <ul className="divide-y divide-line-soft md:hidden">
              {rows.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelectedId(s.id)} className="flex w-full flex-col gap-2 p-4 text-left active:bg-brand-50/50">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-mono font-bold text-ink">{s.guia}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <p className="text-[15px] font-semibold text-ink">{s.recipient.name}</p>
                    <p className="text-[13px] text-muted">
                      {s.origin.city} → {s.destination.city} · {formatDate(s.createdAt)}
                    </p>
                    <p className="text-[13px] text-muted">Repartidor: {courierName(s.courierId) ?? "Sin asignar"}</p>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={currentPage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </Card>

      <Drawer
        open={!!selected && dialog === null}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.guia : ""}
        description={selected ? `${selected.origin.city} → ${selected.destination.city} · ${selected.recipient.name}` : undefined}
        footer={
          selected && (
            <>
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                Cerrar
              </Button>
              <ButtonLink href={`/paquetes/${selected.guia}`} variant="secondary">
                Ver detalle completo
              </ButtonLink>
            </>
          )
        }
      >
        {selected && <ShipmentQuickView shipment={selected} onAssign={() => setDialog("assign")} onStatus={() => setDialog("status")} />}
      </Drawer>

      <AssignCourierModal shipment={selected} open={dialog === "assign"} onClose={() => setDialog(null)} />
      <UpdateStatusModal shipment={selected} open={dialog === "status"} onClose={() => setDialog(null)} />
      <NewShipmentModal
        open={creating}
        onClose={() => {
          setCreating(false);
          if (params.get("nuevo")) router.replace("/paquetes");
        }}
      />
    </>
  );
}

