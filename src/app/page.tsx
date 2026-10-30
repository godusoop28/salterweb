import Link from "next/link";
import { ArrowRight, LayoutDashboard, Radar, Smartphone, Store } from "lucide-react";
import { Logo } from "@/components/branding/logo";

const ENTRIES = [
  {
    href: "/login",
    title: "Administración",
    text: "Panel general, paquetes, repartidores, incidencias y reportes.",
    icon: LayoutDashboard,
    tone: "bg-brand-500 text-white",
  },
  {
    href: "/entregas",
    title: "App del repartidor",
    text: "Entregas del día, ruta, evidencia fotográfica y firma.",
    icon: Smartphone,
    tone: "bg-accent-600 text-white",
  },
  {
    href: "/portal",
    title: "Portal del remitente",
    text: "Registra envíos, consulta tu historial y su estado.",
    icon: Store,
    tone: "bg-sky-brand text-white",
  },
  {
    href: "/rastreo",
    title: "Rastreo público",
    text: "Consulta cualquier envío con su número de guía.",
    icon: Radar,
    tone: "bg-navy text-white",
  },
];

const MODULES = ["Paquetes", "Repartidores", "Remitentes", "Rastreo por guía", "Evidencia y firma", "Incidencias", "Reportes", "Usuarios y roles"];

export default function WelcomePage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-white">
      <div className="bg-dots absolute inset-0 opacity-70" aria-hidden />
      <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-brand-50 blur-3xl" aria-hidden />
      <div className="absolute -bottom-40 -left-32 size-[420px] rounded-full bg-accent-50 blur-3xl" aria-hidden />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_1.1fr]">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Logo variant="vertical" height={220} priority className="drop-shadow-sm" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-accent-600">Propuesta de producto · Prototipo interactivo</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Tu paquetería, <span className="text-brand-gradient">organizada</span> de principio a fin.
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">
            Deja atrás el papel y los mensajes sueltos. Registra, asigna, rastrea y confirma cada envío desde la computadora o el celular.
          </p>
          <ul className="mt-6 flex max-w-lg flex-wrap justify-center gap-2 lg:justify-start">
            {MODULES.map((m) => (
              <li key={m} className="rounded-full border border-line bg-white px-3 py-1 text-[13px] font-semibold text-ink-soft">
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Elige una vista">
          <p className="mb-4 text-sm font-semibold text-muted">Elige cómo quieres explorar el sistema:</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ENTRIES.map((e, i) => {
              const Icon = e.icon;
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className="group relative animate-slide-up overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-pop"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className={`grid size-14 place-items-center rounded-2xl ${e.tone}`}>
                    <Icon className="size-7" aria-hidden />
                  </div>
                  <h2 className="mt-5 text-lg font-bold text-ink">{e.title}</h2>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{e.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                    Entrar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="mt-6 rounded-2xl bg-accent-50 px-4 py-3 text-sm text-accent-700 ring-1 ring-accent-100">
            <strong>Entorno de demostración.</strong> Los datos son ficticios y los cambios se guardan sólo en este navegador.
          </p>
        </section>
      </div>
    </div>
  );
}
