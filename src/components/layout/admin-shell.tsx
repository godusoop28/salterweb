"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  ChartColumn,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  RotateCcw,
  Search,
  Settings,
  Smartphone,
  Store,
  Truck,
  TriangleAlert,
  UserCog,
  Radar,
  X,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { Avatar } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser, useDemoState } from "@/hooks/use-demo";
import { INCIDENT_TYPE_LABEL, ROLE_LABEL } from "@/lib/constants";
import { isOpenIncident } from "@/lib/services/analytics";
import { logout, resetDemo } from "@/lib/services/salter-service";
import { cn, normalize, relativeTime } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeTone?: "orange" | "blue";
}

function useNav(): { main: NavItem[]; views: NavItem[] } {
  const state = useDemoState();
  const openIncidents = state.incidents.filter(isOpenIncident).length;
  const active = state.shipments.filter((s) => ["registrado", "en_proceso"].includes(s.status)).length;
  return {
    main: [
      { href: "/dashboard", label: "Panel general", icon: LayoutDashboard },
      { href: "/paquetes", label: "Paquetes", icon: Package, badge: active, badgeTone: "blue" },
      { href: "/repartidores", label: "Repartidores", icon: Truck },
      { href: "/remitentes", label: "Remitentes", icon: Store },
      { href: "/incidencias", label: "Incidencias", icon: TriangleAlert, badge: openIncidents, badgeTone: "orange" },
      { href: "/reportes", label: "Reportes", icon: ChartColumn },
      { href: "/usuarios", label: "Usuarios", icon: UserCog },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
    views: [
      { href: "/rastreo", label: "Portal de rastreo", icon: Radar },
      { href: "/entregas", label: "App del repartidor", icon: Smartphone },
      { href: "/portal", label: "Portal del remitente", icon: Store },
    ],
  };
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas hover:text-ink",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-accent-500" aria-hidden />}
      <Icon className={cn("size-5 shrink-0", active ? "text-brand-600" : "text-subtle group-hover:text-ink-soft")} aria-hidden />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!!item.badge && !collapsed && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            item.badgeTone === "orange" ? "bg-accent-500 text-white" : "bg-brand-100 text-brand-700",
          )}
        >
          {item.badge}
        </span>
      )}
      {!!item.badge && collapsed && item.badgeTone === "orange" && (
        <span className="absolute top-2 right-2 size-2 rounded-full bg-accent-500" aria-hidden />
      )}
    </Link>
  );
}

function SidebarContent({ collapsed, onNavigate, onReset }: { collapsed: boolean; onNavigate?: () => void; onReset: () => void }) {
  const { main, views } = useNav();
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-[76px] items-center border-b border-line-soft", collapsed ? "justify-center px-2" : "px-6")}>
        <Link href="/dashboard" onClick={onNavigate} aria-label="Ir al panel general">
          {collapsed ? <Logo variant="isotipo" height={36} /> : <Logo variant="compacto" height={38} priority />}
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">Operación</p>}
        <div className="space-y-1">
          {main.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
        {!collapsed && <p className="mt-7 mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">Otras vistas</p>}
        {collapsed && <div className="my-4 border-t border-line-soft" />}
        <div className="space-y-1">
          {views.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
      {!collapsed ? (
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-navy p-4 text-white">
            <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <p className="text-sm font-bold">Entorno de demostración</p>
              <p className="mt-1 text-[13px] leading-snug text-white/70">Los cambios se guardan sólo en este navegador.</p>
              <button
                onClick={onReset}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[13px] font-semibold hover:bg-white/20"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Restaurar datos
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center p-3">
          <button onClick={onReset} className="grid size-10 place-items-center rounded-xl text-subtle hover:bg-canvas" title="Restaurar datos de demostración" aria-label="Restaurar datos de demostración">
            <RotateCcw className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const state = useDemoState();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const term = normalize(q.trim());
    if (term.length < 2) return [];
    return state.shipments
      .filter((s) => normalize(`${s.guia} ${s.recipient.name} ${s.sender.company}`).includes(term))
      .slice(-6)
      .reverse();
  }, [q, state.shipments]);

  const go = (guia: string) => {
    setQ("");
    setOpen(false);
    router.push(`/paquetes/${guia}`);
  };

  return (
    <div className="relative w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) go(results[0].guia);
          else if (q.trim()) router.push(`/rastreo?guia=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" aria-hidden />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar guía, destinatario o remitente…"
          aria-label="Búsqueda global"
          className="h-11 w-full rounded-xl border border-transparent bg-canvas pr-4 pl-10 text-[15px] outline-none placeholder:text-subtle focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />
      </form>
      {open && results.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-40 mt-2 animate-scale-in overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-subtle">Paquetes</p>
          {results.map((s) => (
            <button
              key={s.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(s.guia)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"
            >
              <Package className="size-4 text-brand-500" aria-hidden />
              <span className="font-mono text-sm font-semibold text-ink">{s.guia}</span>
              <span className="truncate text-sm text-muted">{s.recipient.name} · {s.destination.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const state = useDemoState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = state.incidents.filter(isOpenIncident).slice(0, 5);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-11 place-items-center rounded-xl text-ink-soft hover:bg-canvas"
        aria-label={`Notificaciones: ${items.length} incidencias abiertas`}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {items.length > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-accent-500 ring-2 ring-white" aria-hidden />}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-[340px] animate-scale-in overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="font-bold text-ink">Incidencias por atender</p>
            <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">{state.incidents.filter(isOpenIncident).length}</span>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={`/incidencias?id=${i.id}`} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-canvas">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                    <TriangleAlert className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{INCIDENT_TYPE_LABEL[i.type]}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {i.guia} · {relativeTime(i.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/incidencias" onClick={() => setOpen(false)} className="block border-t border-line-soft px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50">
            Ver todas las incidencias
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ onReset }: { onReset: () => void }) {
  const user = useCurrentUser("admin");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 rounded-xl p-1 pr-2 hover:bg-canvas" aria-expanded={open} aria-label="Menú de usuario">
        <Avatar name={user.name} />
        <span className="hidden text-left md:block">
          <span className="block text-sm font-bold leading-tight text-ink">{user.name}</span>
          <span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span>
        </span>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-64 animate-scale-in overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-pop">
          <div className="px-3 py-2">
            <p className="font-bold text-ink">{user.name}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
          </div>
          <div className="my-1 border-t border-line-soft" />
          <Link href="/login" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas">
            <Repeat className="size-4" aria-hidden /> Cambiar de perfil
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onReset();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas"
          >
            <RotateCcw className="size-4" aria-hidden /> Restaurar datos demo
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

const MOBILE_NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/paquetes", label: "Paquetes", icon: Package },
  { href: "/incidencias", label: "Incidencias", icon: TriangleAlert },
  { href: "/reportes", label: "Reportes", icon: ChartColumn },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const pathname = usePathname();
  const toast = useToast();

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Sidebar escritorio */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-white transition-[width] duration-200 lg:block",
          collapsed ? "w-[84px]" : "w-[272px]",
        )}
      >
        <SidebarContent collapsed={collapsed} onReset={() => setConfirmReset(true)} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-[60px] -right-3.5 grid size-7 place-items-center rounded-full border border-line bg-white text-muted shadow-card hover:text-brand-600"
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-navy/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative h-full w-[290px] max-w-[85vw] animate-slide-up bg-white shadow-pop">
            <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-3 z-10 grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} onReset={() => setConfirmReset(true)} />
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[84px]" : "lg:pl-[272px]")}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="grid size-11 place-items-center rounded-xl text-ink-soft hover:bg-canvas lg:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="sm:hidden" aria-label="Inicio">
            <Logo variant="isotipo" height={32} />
          </Link>
          <div className="hidden flex-1 sm:block">
            <GlobalSearch />
          </div>
          <div className="flex-1 sm:hidden" />
          <span className="hidden items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-700 ring-1 ring-accent-100 xl:inline-flex">
            <span className="size-1.5 animate-pulse rounded-full bg-accent-500" aria-hidden /> Demo · datos simulados
          </span>
          <Notifications />
          <UserMenu onReset={() => setConfirmReset(true)} />
        </header>

        <main key={pathname} className="mx-auto max-w-[1440px] animate-fade-in px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Navegación inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Navegación móvil">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-brand-600" : "text-muted")}>
                <span className={cn("grid h-7 w-12 place-items-center rounded-full", active && "bg-brand-50")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
          <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted">
            <span className="grid h-7 w-12 place-items-center rounded-full">
              <MoreHorizontal className="size-5" aria-hidden />
            </span>
            Más
          </button>
        </div>
      </nav>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          toast.success("Datos restaurados", "La demostración volvió a su estado original.");
        }}
        title="¿Restaurar datos de demostración?"
        description="Se eliminarán los paquetes, incidencias y cambios que hayas hecho en esta demo. Esta acción no se puede deshacer."
        confirmLabel="Sí, restaurar"
      />
    </div>
  );
}
