"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CircleCheck, Eye, EyeOff, Info, LayoutDashboard, Lock, Mail, MapPin, Package, Smartphone, Store, Truck } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { DEMO_PASSWORD } from "@/lib/constants";
import { DEMO_ACCOUNTS } from "@/lib/mock-data/catalogs";
import { operationKpis } from "@/lib/services/analytics";
import { login } from "@/lib/services/salter-service";
import type { Role, Shipment } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const schema = z.object({
  email: z.string().trim().min(1, "Escribe tu correo electrónico.").email("Revisa el formato del correo."),
  password: z.string().min(1, "Escribe tu contraseña."),
});
type FormValues = z.infer<typeof schema>;

const HOME: Record<Role, string> = { admin: "/dashboard", supervisor: "/dashboard", repartidor: "/entregas", remitente: "/portal" };

const PROFILES = [
  { key: "admin", label: "Administración", text: "Supervisa toda la operación", email: DEMO_ACCOUNTS.admin, icon: LayoutDashboard, tone: "bg-brand-50 text-brand-600" },
  { key: "repartidor", label: "Repartidor", text: "Juan Pérez · Cuernavaca", email: DEMO_ACCOUNTS.repartidor, icon: Smartphone, tone: "bg-accent-50 text-accent-600" },
  { key: "remitente", label: "Remitente", text: "Tienda El Sol", email: DEMO_ACCOUNTS.remitente, icon: Store, tone: "bg-sky-50 text-sky-700" },
] as const;

export function LoginView() {
  const router = useRouter();
  const toast = useToast();
  const state = useDemoState();
  const kpis = operationKpis(state.shipments, state.incidents);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const doLogin = (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    // Pequeña pausa para mostrar el estado de carga, como en un acceso real.
    setTimeout(() => {
      const res = login(values.email, values.password);
      if (!res.ok) {
        setServerError(res.error);
        setSubmitting(false);
        return;
      }
      toast.success(`¡Hola, ${res.data.name.split(" ")[0]}!`, "Bienvenida(o) a SALTER.");
      router.push(HOME[res.data.role]);
    }, 450);
  };

  const quickLogin = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
    doLogin({ email, password: DEMO_PASSWORD });
  };

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <section className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col" aria-label="SALTER">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute -top-32 -right-24 size-[460px] rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-20 size-[380px] rounded-full bg-accent-500/20 blur-3xl" aria-hidden />

        <div className="relative flex flex-1 flex-col px-14 py-10">
          <Logo variant="oscuro" height={104} priority className="rounded-2xl ring-1 ring-white/10 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.6)]" />
          <div className="mt-auto max-w-lg">
            <h1 className="font-display text-[36px] font-bold leading-[1.1] tracking-tight">
              Toda tu operación de paquetería <span className="text-accent-400">en un solo lugar.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-white/70">Registra, asigna y da seguimiento a cada envío, con evidencia de entrega y reportes claros.</p>
          </div>

          <RouteIllustration sample={state.shipments.findLast((s) => s.status === "en_transito")} />

          <div className="relative grid grid-cols-3 gap-3">
            {[
              { label: "Envíos registrados", value: formatNumber(kpis.total), icon: Package },
              { label: "Entregados", value: formatNumber(kpis.delivered), icon: CircleCheck },
              { label: "En camino", value: formatNumber(kpis.inTransit), icon: Truck },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <s.icon className="size-5 text-sky-brand" aria-hidden />
                <p className="mt-3 font-display text-2xl font-bold">{s.value}</p>
                <p className="text-[13px] text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulario */}
      <section className="flex flex-col px-6 py-10 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-muted hover:text-brand-600">
            ← Inicio
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-700 ring-1 ring-accent-100">
            <span className="size-1.5 rounded-full bg-accent-500" aria-hidden /> Entorno de demostración
          </span>
        </div>

        <div className="mx-auto my-auto w-full max-w-[420px] py-10">
          <Logo variant="horizontal" height={92} priority className="mx-auto" />
          <h2 className="mt-10 text-center font-display text-3xl font-bold tracking-tight text-ink">Inicia sesión</h2>
          <p className="mt-2 text-center text-[15px] text-muted">Ingresa con tu correo y contraseña para continuar.</p>

          <form onSubmit={handleSubmit(doLogin)} className="mt-8 space-y-5" noValidate>
            <Field label="Correo electrónico" error={formState.errors.email?.message}>
              {(id, desc) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.mx"
                  icon={<Mail className="size-[18px]" />}
                  aria-invalid={!!formState.errors.email}
                  aria-describedby={desc}
                  className="h-12"
                  {...register("email")}
                />
              )}
            </Field>
            <Field label="Contraseña" error={formState.errors.password?.message}>
              {(id, desc) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    icon={<Lock className="size-[18px]" />}
                    aria-invalid={!!formState.errors.password}
                    aria-describedby={desc}
                    className="h-12 pr-12"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-canvas"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              )}
            </Field>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 font-medium text-ink-soft">
                <input type="checkbox" defaultChecked className="size-4 rounded accent-brand-500" /> Recordarme
              </label>
              <button type="button" onClick={() => toast.info("Recuperación de contraseña", "En la versión final se enviará un enlace a tu correo.")} className="font-semibold text-brand-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {serverError && (
              <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100" role="alert">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {serverError}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={submitting} iconRight={!submitting && <ArrowRight className="size-5" />}>
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-9">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs font-bold uppercase tracking-wider text-subtle">Acceso rápido de demostración</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="mt-4 grid gap-2.5">
              {PROFILES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => quickLogin(p.email)}
                  disabled={submitting}
                  className="group flex items-center gap-3 rounded-2xl border border-line p-3 text-left transition-all hover:border-brand-200 hover:bg-brand-50/50 disabled:opacity-60"
                >
                  <span className={`grid size-11 place-items-center rounded-xl ${p.tone}`}>
                    <p.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{p.label}</span>
                    <span className="block truncate text-[13px] text-muted">{p.text} · {p.email}</span>
                  </span>
                  <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[13px] text-muted">
              Contraseña de todas las cuentas demo: <code className="rounded bg-canvas px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-subtle">© 2026 SALTER · Alternativa en Movimiento</p>
      </section>
    </div>
  );
}

/** Ilustración de red logística (decorativa, no representa ubicaciones reales). */
function RouteIllustration({ sample }: { sample?: Shipment }) {
  const nodes = [
    { x: 70, y: 150, label: "Guadalajara" },
    { x: 205, y: 60, label: "Querétaro" },
    { x: 285, y: 135, label: "Toluca" },
    { x: 365, y: 110, label: "CDMX" },
    { x: 440, y: 150, label: "Puebla" },
    { x: 350, y: 205, label: "Cuernavaca", hub: true },
  ];
  return (
    <div className="relative my-4 h-[210px]" aria-hidden>
      <svg viewBox="0 0 520 240" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="route" x1="0" x2="1">
            <stop offset="0" stopColor="#0B6FE0" />
            <stop offset="1" stopColor="#00A3F0" />
          </linearGradient>
        </defs>
        {[
          [0, 1],
          [1, 3],
          [2, 3],
          [3, 4],
          [3, 5],
          [2, 5],
          [5, 4],
        ].map(([a, b]) => (
          <path
            key={`${a}-${b}`}
            d={`M${nodes[a].x} ${nodes[a].y} Q ${(nodes[a].x + nodes[b].x) / 2} ${Math.min(nodes[a].y, nodes[b].y) - 30} ${nodes[b].x} ${nodes[b].y}`}
            stroke="url(#route)"
            strokeWidth="2.5"
            strokeDasharray="6 7"
            fill="none"
            opacity="0.75"
          />
        ))}
        {nodes.map((n) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r={n.hub ? 12 : 7} fill={n.hub ? "#FF7A00" : "#00A3F0"} opacity={n.hub ? 1 : 0.9} />
            {n.hub && <circle cx={n.x} cy={n.y} r="22" fill="none" stroke="#FF7A00" strokeOpacity="0.35" strokeWidth="2" />}
            <text x={n.x} y={n.y + (n.hub ? 36 : 24)} textAnchor="middle" fill="white" fillOpacity="0.7" fontSize="12" fontWeight="600">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute top-2 left-[44%] flex animate-[drive_3s_ease-in-out_infinite] items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-ink shadow-pop">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-500 text-white">
          <Truck className="size-5" />
        </span>
        <span>
          <span className="block font-mono text-xs font-bold">{sample?.guia ?? "SALTER"}</span>
          <span className="flex items-center gap-1 text-[12px] text-muted">
            <MapPin className="size-3" /> Rumbo a {sample?.destination.city ?? "su destino"}
          </span>
        </span>
      </div>
    </div>
  );
}
