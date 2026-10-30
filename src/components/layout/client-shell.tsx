"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { History, House, LogOut, PackagePlus, Radar, Repeat } from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { Avatar } from "@/components/ui/primitives";
import { useCurrentUser, useDemoState } from "@/hooks/use-demo";
import { logout } from "@/lib/services/salter-service";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", label: "Inicio", icon: House },
  { href: "/mis-envios", label: "Mis envíos", icon: History },
  { href: "/nuevo-envio", label: "Nuevo envío", icon: PackagePlus, cta: true },
  { href: "/rastreo", label: "Rastrear", icon: Radar },
];

/** Hook auxiliar: remitente vinculado a la sesión del portal. */
export function useClientSender() {
  const user = useCurrentUser("remitente");
  const state = useDemoState();
  const sender = state.senders.find((s) => s.id === user.linkedId) ?? state.senders[0];
  return { user, sender };
}

export function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, sender } = useClientSender();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/portal" aria-label="Inicio del portal">
            <Logo variant="compacto" height={34} priority />
          </Link>
          <span className="hidden rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-100 lg:inline">Portal de remitentes</span>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Portal">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              if (item.cta)
                return (
                  <Link key={item.href} href={item.href} className="ml-2 inline-flex h-10 items-center gap-2 rounded-xl bg-accent-600 px-4 text-sm font-semibold text-white shadow-glow hover:bg-accent-700">
                    <Icon className="size-4" aria-hidden /> {item.label}
                  </Link>
                );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold", active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas")}
                >
                  <Icon className="size-4" aria-hidden /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-tight text-ink">{sender.name}</p>
              <p className="text-xs text-muted">{user.name}</p>
            </div>
            <Avatar name={sender.name} />
            <Link href="/login" className="grid size-10 place-items-center rounded-xl text-muted hover:bg-canvas" title="Cambiar de perfil" aria-label="Cambiar de perfil">
              <Repeat className="size-[18px]" />
            </Link>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="hidden size-10 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600 sm:grid"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main key={pathname} className="mx-auto max-w-6xl animate-fade-in px-4 pt-6 pb-28 sm:px-6 md:pb-14">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Portal móvil">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-brand-600" : "text-muted")}>
                <span className={cn("grid h-7 w-12 place-items-center rounded-full", item.cta ? "bg-accent-600 text-white" : active && "bg-brand-50")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
