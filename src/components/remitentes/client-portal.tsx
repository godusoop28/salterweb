"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, CircleCheck, Clock, ExternalLink, Headphones, History, Package, PackagePlus, PackageSearch, Search, Truck, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Card, CardHeader, EmptyState, Pagination, Tabs } from "@/components/ui/primitives";
import { StatusStepper, Timeline } from "@/components/shared/timeline";
import { NewShipmentForm, ShipmentCreated } from "@/components/paquetes/new-shipment-form";
import { useClientSender } from "@/components/layout/client-shell";
import { useDemoState } from "@/hooks/use-demo";
import { STATUS_FLOW, STATUS_HINT } from "@/lib/constants";
import type { Shipment } from "@/lib/types";
import { cn, daysAgo, formatDate, normalize, relativeTime } from "@/lib/utils";

function useMyShipments() {
  const state = useDemoState();
  const { sender, user } = useClientSender();
  const mine = useMemo(() => state.shipments.filter((s) => s.senderId === sender.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.shipments, sender.id]);
  return { mine, sender, user, settings: state.settings };
}

function progressOf(s: Shipment) {
  if (s.status === "entregado") return 100;
  const idx = s.status === "pendiente" || s.status === "incidencia" ? 3 : STATUS_FLOW.indexOf(s.status);
  return (idx / 4) * 100;
}

function ShipmentRow({ s, onOpen }: { s: Shipment; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex w-full flex-col gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-all hover:border-brand-200 hover:shadow-card sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", s.status === "entregado" ? "bg-emerald-50 text-emerald-600" : s.status === "incidencia" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600")}>
          {s.status === "entregado" ? <CircleCheck className="size-5" aria-hidden /> : <Package className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[15px] font-bold text-ink">{s.guia}</p>
          <p className="truncate text-sm text-muted">
            Para {s.recipient.name} · {s.destination.city}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:w-[340px]">
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
            <div className={cn("h-full rounded-full", s.status === "incidencia" ? "bg-red-500" : s.status === "pendiente" ? "bg-accent-500" : "bg-brand-gradient")} style={{ width: `${Math.max(8, progressOf(s))}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{s.status === "entregado" ? `Entregado ${relativeTime(s.deliveredAt!)}` : `Registrado ${relativeTime(s.createdAt)}`}</p>
        </div>
        <StatusBadge status={s.status} size="sm" />
      </div>
    </button>
  );
}

function ShipmentDrawer({ shipment, onClose }: { shipment: Shipment | null; onClose: () => void }) {
  return (
    <Drawer
      open={!!shipment}
      onClose={onClose}
      title={shipment?.guia ?? ""}
      description={shipment ? `${shipment.origin.city} → ${shipment.destination.city} · Para ${shipment.recipient.name}` : undefined}
      footer={shipment && <ButtonLink href={`/rastreo?guia=${shipment.guia}`} variant="secondary" icon={<ExternalLink className="size-4" />}>Abrir en rastreo público</ButtonLink>}
    >
      {shipment && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-canvas p-5">
            <StatusBadge status={shipment.status} size="lg" />
            <p className="mt-3 text-[15px] text-ink-soft">{STATUS_HINT[shipment.status]}</p>
            <div className="mt-6">
              <StatusStepper status={shipment.status} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-line p-3"><dt className="text-xs text-muted">Contenido</dt><dd className="font-bold text-ink">{shipment.description}</dd></div>
            <div className="rounded-2xl border border-line p-3"><dt className="text-xs text-muted">Peso</dt><dd className="font-bold text-ink">{shipment.weightKg} kg</dd></div>
            <div className="rounded-2xl border border-line p-3"><dt className="text-xs text-muted">Registrado</dt><dd className="font-bold text-ink">{formatDate(shipment.createdAt)}</dd></div>
            <div className="rounded-2xl border border-line p-3"><dt className="text-xs text-muted">{shipment.deliveredAt ? "Entregado" : "Entrega estimada"}</dt><dd className="font-bold text-ink">{formatDate(shipment.deliveredAt ?? shipment.estimatedDelivery)}</dd></div>
          </dl>
          <div>
            <h3 className="mb-4 font-bold text-ink">Movimientos</h3>
            <Timeline events={shipment.events.filter((e) => !e.description.startsWith("Asignado al repartidor"))} compact />
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ───────────────────────── Inicio del portal ───────────────────────── */

export function PortalHome() {
  const { mine, sender, user, settings } = useMyShipments();
  const router = useRouter();
  const [guia, setGuia] = useState("");
  const [selected, setSelected] = useState<Shipment | null>(null);

  const active = mine.filter((s) => s.status !== "entregado");
  const deliveredMonth = mine.filter((s) => s.deliveredAt && daysAgo(s.deliveredAt) < 30).length;
  const attention = mine.filter((s) => s.status === "pendiente" || s.status === "incidencia").length;
  const recentDelivered = mine.filter((s) => s.status === "entregado").slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-brand-gradient p-6 text-white shadow-[0_24px_50px_-24px_rgb(11_92_213/0.8)] sm:p-9">
        <svg className="absolute -right-10 -bottom-16 h-72 w-72 text-white/10" viewBox="0 0 100 100" fill="none" aria-hidden>
          <rect x="8" y="8" width="84" height="84" rx="18" stroke="currentColor" strokeWidth="6" />
          <path d="M66 38h26M66 50h30M66 62h26" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-white/80">{sender.name}</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">¡Hola, {user.name.split(" ")[0]}!</h1>
            <p className="mt-2 max-w-md text-[17px] text-white/85">
              Tienes <strong className="text-white">{active.length - attention} envíos en camino</strong>. Aquí puedes registrar nuevos paquetes y ver dónde está cada uno.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/nuevo-envio" size="lg" icon={<PackagePlus className="size-5" />}>
                Nuevo envío
              </ButtonLink>
              <ButtonLink href="/mis-envios" size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:border-white hover:bg-white/20 hover:text-white" icon={<History className="size-5" />}>
                Ver mis envíos
              </ButtonLink>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (guia.trim()) router.push(`/rastreo?guia=${encodeURIComponent(guia.trim().toUpperCase())}`);
            }}
            className="rounded-3xl bg-white p-5 text-ink shadow-pop"
          >
            <label htmlFor="portal-guia" className="font-bold">Rastrear un envío</label>
            <p className="text-sm text-muted">Escribe el número de guía.</p>
            <div className="mt-3 flex gap-2">
              <input id="portal-guia" value={guia} onChange={(e) => setGuia(e.target.value.toUpperCase())} placeholder="SAL-000000" className="h-12 min-w-0 flex-1 rounded-xl border border-line px-4 font-mono font-bold tracking-wider outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
              <button type="submit" className="grid size-12 place-items-center rounded-xl bg-brand-500 text-white hover:bg-brand-600" aria-label="Rastrear">
                <Search className="size-5" />
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "En camino", value: active.length - attention, icon: Truck, tone: "bg-brand-50 text-brand-600" },
          { label: "Entregados (30 días)", value: deliveredMonth, icon: CircleCheck, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Requieren atención", value: attention, icon: TriangleAlert, tone: "bg-accent-50 text-accent-600" },
          { label: "Envíos totales", value: mine.length, icon: Package, tone: "bg-sky-50 text-sky-700" },
        ].map((m) => (
          <Card key={m.label} className="p-5">
            <span className={cn("grid size-11 place-items-center rounded-2xl", m.tone)}>
              <m.icon className="size-5" aria-hidden />
            </span>
            <p className="mt-4 font-display text-3xl font-bold text-ink">{m.value.toLocaleString("es-MX")}</p>
            <p className="text-sm font-medium text-muted">{m.label}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Envíos en curso"
            description="Toca un envío para ver su detalle"
            icon={Truck}
            action={<Link href="/mis-envios" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Ver todos <ArrowRight className="size-4" aria-hidden /></Link>}
          />
          <div className="space-y-2.5 p-4 sm:p-5">
            {active.length ? active.slice(0, 5).map((s) => <ShipmentRow key={s.id} s={s} onOpen={() => setSelected(s)} />) : <EmptyState icon={Package} title="Sin envíos en curso" description="Registra un nuevo envío y aquí podrás seguirlo." className="py-8" />}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Entregados recientemente" icon={CircleCheck} />
            <ul className="space-y-1 p-3 sm:p-4">
              {recentDelivered.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelected(s)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-canvas">
                    <CircleCheck className="size-5 text-emerald-500" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-bold text-ink">{s.guia}</span>
                      <span className="block truncate text-[13px] text-muted">{s.recipient.name} · {relativeTime(s.deliveredAt!)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex items-start gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-600">
              <Headphones className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold text-ink">¿Necesitas ayuda?</p>
              <p className="text-sm text-muted">Llámanos al <strong className="text-ink">{settings.phone}</strong> · {settings.hours}</p>
            </div>
          </Card>
        </div>
      </div>
      <ShipmentDrawer shipment={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ───────────────────────── Mis envíos ───────────────────────── */

type Group = "todos" | "camino" | "entregados" | "atencion";
const PAGE_SIZE = 10;

export function MyShipments() {
  const { mine } = useMyShipments();
  const [group, setGroup] = useState<Group>("todos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Shipment | null>(null);

  const inGroup = (s: Shipment, g: Group) =>
    g === "todos" ||
    (g === "entregados" && s.status === "entregado") ||
    (g === "atencion" && (s.status === "pendiente" || s.status === "incidencia")) ||
    (g === "camino" && ["registrado", "en_proceso", "en_transito", "en_ciudad_destino"].includes(s.status));

  const searched = mine.filter((s) => normalize(`${s.guia} ${s.recipient.name} ${s.destination.city} ${s.description}`).includes(normalize(query)));
  const filtered = searched.filter((s) => inGroup(s, group));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Mis envíos</h1>
          <p className="mt-1 text-[15px] text-muted">Historial completo de tus paquetes y su estado actual.</p>
        </div>
        <ButtonLink href="/nuevo-envio" icon={<PackagePlus className="size-5" />}>
          Nuevo envío
        </ButtonLink>
      </div>
      <Card>
        <div className="space-y-4 border-b border-line-soft p-4 sm:p-5">
          <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Buscar por guía, destinatario o ciudad…" label="Buscar mis envíos" />
          <Tabs
            value={group}
            onChange={(g) => { setGroup(g); setPage(1); }}
            items={[
              { value: "todos", label: "Todos", count: searched.length },
              { value: "camino", label: "En camino", count: searched.filter((s) => inGroup(s, "camino")).length },
              { value: "entregados", label: "Entregados", count: searched.filter((s) => inGroup(s, "entregados")).length },
              { value: "atencion", label: "Requieren atención", count: searched.filter((s) => inGroup(s, "atencion")).length },
            ]}
          />
        </div>
        {filtered.length ? (
          <>
            <div className="space-y-2.5 p-4 sm:p-5">
              {filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((s) => (
                <ShipmentRow key={s.id} s={s} onOpen={() => setSelected(s)} />
              ))}
            </div>
            <Pagination page={current} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        ) : (
          <EmptyState icon={PackageSearch} title="No hay envíos aquí" description="Prueba con otra búsqueda o cambia de pestaña." />
        )}
      </Card>
      <ShipmentDrawer shipment={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* ───────────────────────── Nuevo envío ───────────────────────── */

export function NewShipmentPage() {
  const { sender } = useClientSender();
  const [created, setCreated] = useState<Shipment | null>(null);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Nuevo envío</h1>
        <p className="mt-1 text-[15px] text-muted">Llena los datos y recibirás tu número de guía al instante. Pasaremos a recolectar el paquete a tu dirección.</p>
      </div>
      <ol className="mb-6 grid grid-cols-3 gap-2 text-center text-[13px] font-semibold">
        {["Datos del envío", "Confirmación", "Recolección"].map((s, i) => (
          <li key={s} className={cn("flex items-center justify-center gap-2 rounded-2xl px-2 py-2.5", (created ? i <= 1 : i === 0) ? "bg-brand-500 text-white" : "bg-white text-muted ring-1 ring-line")}>
            <span className={cn("grid size-5 place-items-center rounded-full text-[11px]", (created ? i <= 1 : i === 0) ? "bg-white/25" : "bg-canvas")}>{i + 1}</span>
            <span className="truncate">{s}</span>
          </li>
        ))}
      </ol>
      <Card className="p-5 sm:p-7">
        {created ? (
          <>
            <ShipmentCreated shipment={created} onAnother={() => setCreated(null)} detailHref={`/rastreo?guia=${created.guia}`} />
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>Un repartidor pasará a recolectar tu paquete en <strong>{sender.address.street}</strong>. Te avisaremos cuando salga a ruta.</p>
            </div>
          </>
        ) : (
          <NewShipmentForm fixedSenderId={sender.id} onCreated={setCreated} />
        )}
      </Card>
    </div>
  );
}
