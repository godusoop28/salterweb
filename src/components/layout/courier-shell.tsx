"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CircleCheck, Clock, ListChecks, Map as MapIcon, Repeat, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { Avatar } from "@/components/ui/primitives";
import { useCurrentUser, useDemoState } from "@/hooks/use-demo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/entregas", label: "Entregas", icon: ListChecks },
  { href: "/ruta", label: "Ruta del día", icon: MapIcon },
  { href: "/historial", label: "Historial", icon: Clock },
];

/** Repartidor vinculado a la sesión activa. */
export function useCourier() {
  const user = useCurrentUser("repartidor");
  const state = useDemoState();
  const courier = state.couriers.find((c) => c.id === user.linkedId) ?? state.couriers[0];
  return { user, courier, state };
}

/**
 * App del repartidor: diseñada primero para celular. En pantallas grandes se muestra
 * dentro de un marco de teléfono para presentar la experiencia real.
 */
export function CourierShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { courier } = useCourier();
  const hideNav = pathname.includes("/evidencia");

  return (
    <div className="min-h-dvh bg-canvas lg:flex lg:items-center lg:justify-center lg:gap-16 lg:bg-navy lg:p-6">
      <aside className="relative hidden max-w-sm text-white lg:block">
        <div className="bg-grid pointer-events-none absolute -inset-20 opacity-50" aria-hidden />
        <div className="relative">
          <Logo variant="oscuro" height={150} />
          <h1 className="mt-8 font-display text-3xl font-bold leading-tight">App del repartidor</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/70">
            Diseñada para usarse con una mano desde el celular: entregas del día, ruta, evidencia fotográfica y firma del destinatario.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-white/85">
            <li className="flex items-center gap-3"><Smartphone className="size-5 text-sky-brand" aria-hidden /> Botones grandes y lectura clara</li>
            <li className="flex items-center gap-3"><CircleCheck className="size-5 text-sky-brand" aria-hidden /> Confirmación con foto y firma</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-sky-brand" aria-hidden /> Reporte de incidencias en segundos</li>
          </ul>
          <Link href="/dashboard" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20">
            ← Volver al panel de administración
          </Link>
        </div>
      </aside>

      <div className="relative mx-auto flex h-dvh w-full flex-col bg-canvas lg:mx-0 lg:h-[min(880px,calc(100dvh-48px))] lg:w-[420px] lg:overflow-hidden lg:rounded-[44px] lg:border-[10px] lg:border-[#0b1730] lg:shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)]">
        <header className="z-20 flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-3">
          <Logo variant="compacto" height={28} priority className="shrink-0" />
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-bold leading-tight text-ink">{courier.name}</p>
              <p className="truncate text-xs text-muted">
                {courier.zone}<span className="hidden min-[400px]:inline"> · {courier.plate}</span>
              </p>
            </div>
            <Avatar name={courier.name} size="sm" />
            <Link href="/login" className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Cambiar de perfil">
              <Repeat className="size-4" />
            </Link>
          </div>
        </header>

        <main key={pathname} className="scrollbar-thin flex-1 animate-fade-in overflow-y-auto overscroll-contain">
          {children}
        </main>

        {!hideNav && (
          <nav className="z-20 shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]" aria-label="App del repartidor">
            <div className="grid grid-cols-3">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-xs font-semibold", active ? "text-brand-600" : "text-muted")}>
                    <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-brand-50")}>
                      <Icon className="size-[22px]" aria-hidden />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
