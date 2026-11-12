"use client";

import { DemoRoleBar } from "@/components/layout/demo-role-bar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CircleCheck, Clock, ListChecks, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { Avatar, LoadingState } from "@/components/ui/primitives";
import { SessionProvider, homeFor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/entregas", label: "Mis asignaciones", icon: ListChecks },
  { href: "/historial", label: "Historial", icon: Clock },
];

function Inner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, can, logout } = useSession();
  const hideNav = pathname.includes("/evidencia");

  // Sólo usuarios con envíos asignados usan esta app.
  useEffect(() => {
    if (me && !can("DELIVERIES_OWN")) router.replace(homeFor(me));
  }, [me, can, router]);

  if (loading || !me) return <div className="grid min-h-dvh place-items-center"><div className="w-full max-w-sm"><LoadingState rows={3} /></div></div>;

  return (
    <div className="min-h-dvh bg-canvas lg:flex lg:items-center lg:justify-center lg:gap-16 lg:bg-navy lg:p-6">
      <aside className="relative hidden max-w-sm text-white lg:block">
        <div className="bg-grid pointer-events-none absolute -inset-20 opacity-50" aria-hidden />
        <div className="relative">
          <Logo variant="oscuro" height={150} />
          <h1 className="mt-8 font-display text-3xl font-bold leading-tight">App del repartidor</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/70">Pensada para el celular: envíos asignados, recepción, entrega e incidencias.</p>
          <ul className="mt-8 space-y-3 text-[15px] text-white/85">
            <li className="flex items-center gap-3"><Smartphone className="size-5 text-sky-brand" aria-hidden /> Botones grandes y lectura clara</li>
            <li className="flex items-center gap-3"><CircleCheck className="size-5 text-sky-brand" aria-hidden /> Confirmación de entrega en segundos</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-sky-brand" aria-hidden /> Sólo ves lo que tienes asignado</li>
          </ul>
        </div>
      </aside>

      <div className="relative mx-auto flex h-dvh w-full flex-col bg-canvas lg:mx-0 lg:h-[min(880px,calc(100dvh-48px))] lg:w-[420px] lg:overflow-hidden lg:rounded-[44px] lg:border-[10px] lg:border-[#0b1730] lg:shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)]">
        <DemoRoleBar className="shrink-0" />
        <header className="z-20 flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-3">
          <Logo variant="compacto" height={28} priority className="shrink-0" />
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-bold leading-tight text-ink">{me.courier?.name ?? me.fullName}</p>
              <p className="truncate text-xs text-muted">{me.roleName}</p>
            </div>
            <Avatar name={me.fullName} size="sm" />
            <button onClick={() => void logout()} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Cerrar sesión"><LogOut className="size-4" /></button>
          </div>
        </header>
        <main key={pathname} className="scrollbar-thin flex-1 animate-fade-in overflow-y-auto overscroll-contain">{children}</main>
        {!hideNav && (
          <nav className="z-20 shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]" aria-label="App del repartidor">
            <div className="grid grid-cols-2">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-xs font-semibold", active ? "text-brand-600" : "text-muted")}>
                    <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-brand-50")}><Icon className="size-[22px]" aria-hidden /></span>
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

export function CourierShell({ children }: { children: ReactNode }) {
  return <SessionProvider><Inner>{children}</Inner></SessionProvider>;
}
