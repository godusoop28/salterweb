"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ClipboardList, Eye, EyeOff, FlaskConical, Lock, Mail, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { InlineError } from "@/components/app/common";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";
import type { LoginResponse } from "@/lib/api/types";
import { homeFor } from "@/lib/session";

const schema = z.object({
  email: z.string().trim().min(1, "Escribe tu correo electrónico.").email("Revisa el formato del correo."),
  password: z.string().min(1, "Escribe tu contraseña."),
});
type FormValues = z.infer<typeof schema>;

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", values);
      qc.clear();
      qc.setQueryData(["me"], res.user);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(res.user));
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <div className="bg-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative"><Logo variant="oscuro" height={64} priority /></div>
        <div className="relative mt-auto max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-400">Sistema de operación</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight">Guías, manifiestos y salidas en un solo lugar.</h1>
          <ul className="mt-8 space-y-4 text-white/80">
            <li className="flex gap-3"><ClipboardList className="size-5 text-accent-400" aria-hidden /> Elaboración rápida de guías con folio único.</li>
            <li className="flex gap-3"><Truck className="size-5 text-accent-400" aria-hidden /> Manifiestos por turno y salidas autorizadas.</li>
            <li className="flex gap-3"><PackageCheck className="size-5 text-accent-400" aria-hidden /> Recepción, entrega e historial de cada envío.</li>
            <li className="flex gap-3"><ShieldCheck className="size-5 text-accent-400" aria-hidden /> Acceso por roles y permisos.</li>
          </ul>
        </div>
      </section>

      <section className="flex flex-col justify-center bg-white px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo variant="horizontal" height={56} priority /></div>
          <h2 className="font-display text-3xl font-bold text-ink">Iniciar sesión</h2>
          <p className="mt-2 text-muted">Usa la cuenta que te asignó administración.</p>
          {params.get("expirada") && <p className="mt-4 rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-700">Tu sesión expiró. Vuelve a iniciar sesión.</p>}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <Field label="Correo electrónico" error={formState.errors.email?.message} required>
              <Input type="email" autoComplete="username" autoFocus icon={<Mail className="size-4" />} {...register("email")} />
            </Field>
            <Field label="Contraseña" error={formState.errors.password?.message} required>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} autoComplete="current-password" icon={<Lock className="size-4" />} {...register("password")} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 text-subtle hover:text-ink" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <InlineError message={serverError} />
            <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting} iconRight={<ArrowRight className="size-4" />}>Entrar</Button>
          </form>
          <DemoAccess />
          <p className="mt-8 text-center text-sm text-muted">
            ¿Buscas un envío? <Link href="/rastreo" className="font-semibold text-brand-600 hover:underline">Rastrear guía</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

type DemoInfo = { enabled: boolean; roles: { code: string; name: string; description: string }[] };

/** Acceso de pruebas: entrar con un clic como cada rol. Sólo aparece si la API lo tiene activo (SALTER_DEMO_ACCESS). */
function DemoAccess() {
  const router = useRouter();
  const qc = useQueryClient();
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.get<DemoInfo>("/auth/demo").then((d) => alive && setInfo(d)).catch(() => alive && setInfo(null));
    return () => { alive = false; };
  }, []);

  if (!info?.enabled || info.roles.length === 0) return null;

  const enter = async (role: string) => {
    setError(null);
    setBusy(role);
    try {
      const res = await api.post<LoginResponse>("/auth/demo-login", { role });
      qc.clear();
      qc.setQueryData(["me"], res.user);
      router.replace(homeFor(res.user));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-accent-400 bg-accent-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-accent-700">
        <FlaskConical className="size-4" aria-hidden /> Acceso rápido de pruebas
      </p>
      <p className="mt-1 text-xs text-muted">Entra con un clic como cualquier rol. Para cambiar de rol, cierra sesión y elige otro.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {info.roles.map((r) => (
          <button
            key={r.code}
            type="button"
            title={r.description}
            disabled={busy !== null}
            onClick={() => void enter(r.code)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-left text-sm font-semibold text-ink shadow-sm transition hover:border-brand-600 hover:text-brand-600 disabled:opacity-60"
          >
            {busy === r.code ? "Entrando…" : r.name.replace(" (pruebas)", "")}
          </button>
        ))}
      </div>
      <InlineError message={error} />
    </div>
  );
}
