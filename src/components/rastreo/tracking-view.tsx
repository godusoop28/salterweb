"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CalendarCheck, CalendarClock, CircleHelp, LoaderCircle, LogIn, MapPin, Package, PackageSearch, Phone, Scale, Search, Truck, Zap } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { STATUS_META } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/primitives";
import { StatusStepper, Timeline } from "@/components/shared/timeline";
import { useDemoState, useHydrated } from "@/hooks/use-demo";
import { PACKAGE_TYPE_LABEL, SERVICE_LABEL, STATUS_HINT, STATUS_LABEL } from "@/lib/constants";
import type { Shipment } from "@/lib/types";
import { cn, formatDate, formatLongDate, formatTime } from "@/lib/utils";

const TONE_BG: Record<string, string> = {
  slate: "from-slate-500 to-slate-600",
  blue: "from-brand-500 to-brand-600",
  sky: "from-brand-500 to-sky-brand",
  indigo: "from-indigo-500 to-brand-600",
  green: "from-emerald-500 to-emerald-600",
  orange: "from-accent-500 to-accent-600",
  red: "from-red-500 to-red-600",
};

/** Muestra sólo el nombre y la inicial del apellido para proteger datos personales. */
const privateName = (name: string) => {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
};

export function TrackingView() {
  const state = useDemoState();
  const params = useSearchParams();
  const router = useRouter();
  const guiaParam = params.get("guia")?.trim().toUpperCase() ?? "";
  const [value, setValue] = useState(guiaParam);
  const [searching, setSearching] = useState(false);
  const hydrated = useHydrated();

  const result = guiaParam ? state.shipments.find((s) => s.guia.toUpperCase() === guiaParam) : undefined;

  const examples = [
    state.shipments.findLast((s) => s.status === "en_transito"),
    state.shipments.findLast((s) => s.status === "en_ciudad_destino"),
    state.shipments.findLast((s) => s.status === "entregado"),
    state.shipments.findLast((s) => s.status === "incidencia"),
  ].filter(Boolean) as Shipment[];

  const search = (guia: string) => {
    const g = guia.trim().toUpperCase();
    if (!g) return;
    setValue(g);
    setSearching(true);
    // Breve espera para mostrar el estado de búsqueda.
    setTimeout(() => {
      setSearching(false);
      router.replace(`/rastreo?guia=${encodeURIComponent(g)}`, { scroll: false });
    }, 400);
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Inicio" className="rounded-xl bg-white px-3 py-1.5 shadow-card">
            <Logo variant="compacto" height={30} priority />
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <a href={`tel:${state.settings.phone.replace(/\s/g, "")}`} className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-white/85 hover:bg-white/10 sm:inline-flex">
              <Phone className="size-4" aria-hidden /> {state.settings.phone}
            </a>
            <Link href="/login" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-white ring-1 ring-white/20 hover:bg-white/20">
              <LogIn className="size-4" aria-hidden /> Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative -mt-[73px] overflow-hidden bg-navy pt-[73px] pb-28 text-white">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute -top-24 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-brand-500/35 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">Rastreo de envíos</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">¿Dónde está mi paquete?</h1>
          <p className="mx-auto mt-3 max-w-xl text-[17px] text-white/75">Escribe tu número de guía y conoce al instante en qué etapa va tu envío.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(value);
            }}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-3xl bg-white p-2 shadow-pop sm:flex-row"
            role="search"
          >
            <label htmlFor="guia" className="sr-only">Número de guía</label>
            <div className="relative flex-1">
              <Package className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-brand-500" aria-hidden />
              <input
                id="guia"
                value={value}
                onChange={(e) => setValue(e.target.value.toUpperCase())}
                placeholder="Ej. SAL-001230"
                autoComplete="off"
                spellCheck={false}
                className="h-14 w-full rounded-2xl pr-4 pl-13 font-mono text-lg font-bold tracking-wider text-ink outline-none placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:text-subtle focus:bg-brand-50/50"
              />
            </div>
            <button type="submit" disabled={searching} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent-600 px-7 text-base font-bold text-white shadow-glow hover:bg-accent-700 disabled:opacity-70">
              {searching ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Search className="size-5" aria-hidden />}
              Rastrear
            </button>
          </form>
          {examples.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-white/60">Prueba con:</span>
              {examples.map((s) => (
                <button key={s.id} onClick={() => search(s.guia)} className="rounded-full bg-white/10 px-3 py-1 font-mono font-semibold text-white ring-1 ring-white/15 hover:bg-white/20">
                  {s.guia}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="relative mx-auto -mt-16 max-w-5xl px-4 pb-16 sm:px-6">
        {!state.settings.publicTracking ? (
          <Card>
            <EmptyState icon={CircleHelp} title="Rastreo no disponible" description="El rastreo público está desactivado temporalmente. Comunícate con nosotros para conocer el estado de tu envío." />
          </Card>
        ) : searching || (guiaParam && !hydrated) ? (
          <Card className="p-10">
            <div className="flex flex-col items-center gap-3 text-muted">
              <LoaderCircle className="size-8 animate-spin text-brand-500" aria-hidden />
              <p className="font-semibold">Buscando tu envío…</p>
            </div>
          </Card>
        ) : !guiaParam ? (
          <HowItWorks />
        ) : !result ? (
          <Card>
            <EmptyState
              icon={PackageSearch}
              title={`No encontramos la guía ${guiaParam}`}
              description="Revisa que el número esté completo (por ejemplo SAL-001230). Si lo registraste hace unos minutos, intenta de nuevo más tarde."
              action={
                <a href={`tel:${state.settings.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas">
                  <Phone className="size-4" aria-hidden /> ¿Necesitas ayuda? {state.settings.phone}
                </a>
              }
            />
          </Card>
        ) : (
          <TrackingResult shipment={result} />
        )}
      </main>

      <footer className="border-t border-line bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6">
          <Logo variant="compacto" height={26} />
          <p>{state.settings.hours} · {state.settings.email}</p>
        </div>
      </footer>
    </div>
  );
}

function TrackingResult({ shipment: s }: { shipment: Shipment }) {
  const meta = STATUS_META[s.status];
  const Icon = meta.icon;
  const last = s.events[s.events.length - 1];
  const delivered = s.status === "entregado";

  return (
    <div className="animate-slide-up space-y-6">
      <Card className="overflow-hidden">
        <div className={cn("relative bg-gradient-to-r p-6 text-white sm:p-8", TONE_BG[meta.tone])}>
          <svg className="absolute top-0 right-0 h-full w-1/2 text-white/10" viewBox="0 0 200 100" preserveAspectRatio="xMaxYMid slice" aria-hidden>
            <path d="M120 30h80M110 50h90M120 70h80" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
          </svg>
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
              <Icon className="size-8" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/80">Guía <span className="font-mono">{s.guia}</span></p>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">{STATUS_LABEL[s.status]}</h2>
              <p className="mt-1 text-[15px] text-white/90">{STATUS_HINT[s.status]}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/20 sm:text-right">
              <p className="text-xs font-semibold text-white/75">{delivered ? "Entregado el" : "Entrega estimada"}</p>
              <p className="text-lg font-bold">{formatLongDate(s.deliveredAt ?? s.estimatedDelivery)}</p>
              {delivered && <p className="text-sm text-white/85">{formatTime(s.deliveredAt!)}</p>}
            </div>
          </div>
        </div>
        <div className="px-4 py-7 sm:px-10">
          <StatusStepper status={s.status} />
        </div>
        <div className="flex items-center gap-2 border-t border-line-soft bg-canvas/60 px-6 py-3.5 text-sm text-ink-soft">
          <MapPin className="size-4 shrink-0 text-accent-600" aria-hidden />
          <span>
            <strong className="text-ink">Ubicación actual:</strong> {last.location} · {formatDate(last.date)}, {formatTime(last.date)}
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card className="h-fit p-6">
          <h3 className="text-base font-bold text-ink">Información del envío</h3>
          <div className="mt-5 flex items-stretch gap-4">
            <div className="flex flex-col items-center py-1" aria-hidden>
              <span className="size-3 rounded-full border-2 border-brand-500 bg-white" />
              <span className="my-1 w-0.5 flex-1 bg-brand-gradient" />
              <span className="size-3 rounded-full bg-accent-500" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-semibold text-muted">Origen</p>
                <p className="font-bold text-ink">{s.origin.city}, {s.origin.state}</p>
                <p className="text-[13px] text-muted">{s.sender.company}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Destino</p>
                <p className="font-bold text-ink">{s.destination.city}, {s.destination.state}</p>
                <p className="text-[13px] text-muted">Para {privateName(s.recipient.name)}</p>
              </div>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5">
            {[
              { label: "Fecha de registro", value: formatDate(s.createdAt), icon: CalendarClock },
              { label: delivered ? "Fecha de entrega" : "Entrega estimada", value: formatDate(s.deliveredAt ?? s.estimatedDelivery), icon: CalendarCheck },
              { label: "Servicio", value: SERVICE_LABEL[s.service], icon: s.service === "express" ? Zap : Truck },
              { label: "Paquete", value: `${PACKAGE_TYPE_LABEL[s.type]} · ${s.weightKg} kg`, icon: Scale },
            ].map((d) => (
              <div key={d.label} className="rounded-2xl bg-canvas p-3">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <d.icon className="size-3.5" aria-hidden /> {d.label}
                </dt>
                <dd className="mt-0.5 text-sm font-bold text-ink">{d.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="mb-5 text-base font-bold text-ink">Historial del envío</h3>
          <Timeline events={s.events.filter((e) => !e.description.startsWith("Asignado al repartidor"))} />
        </Card>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Search, title: "Escribe tu guía", text: "La encuentras en tu comprobante o en el mensaje de confirmación." },
    { icon: Truck, title: "Consulta la etapa", text: "Verás si tu paquete está en proceso, en camino o en tu ciudad." },
    { icon: CalendarCheck, title: "Recibe tu paquete", text: "Al entregarlo, registramos la firma de quien lo recibe." },
  ];
  return (
    <Card className="p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex gap-4 sm:flex-col">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <s.icon className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold text-accent-600">Paso {i + 1}</p>
              <p className="font-bold text-ink">{s.title}</p>
              <p className="mt-1 text-[15px] text-muted">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
        ¿Eres remitente? Entra a tu portal para ver todos tus envíos <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}
