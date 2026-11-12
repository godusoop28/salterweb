"use client";

import { DemoRoleBar } from "@/components/layout/demo-role-bar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChartColumn, ChevronsLeft, ChevronsRight, ClipboardList, FilePlus2, FileSpreadsheet, LayoutDashboard, LogOut, Menu, MoreHorizontal,
  Package, Search, Settings, Store, Truck, TriangleAlert, UserCog, Users, Warehouse, X, type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/branding/logo";
import { Avatar, LoadingState } from "@/components/ui/primitives";
import type { Permission } from "@/lib/api/types";
import { SessionProvider, homeFor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface NavItem { href: string; label: string; icon: LucideIcon; perms: Permission[]; mobile?: boolean }

function useNav(): { operation: NavItem[]; admin: NavItem[] } {
  const { me, can } = useSession();
  const guidesLabel = can("GUIDES_VIEW_ALL") ? "Guías" : can("SHIPMENTS_OWN") ? "Mis envíos" : "Mis guías";
  const operation: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perms: ["DASHBOARD_VIEW"], mobile: true },
    { href: "/guias/nueva", label: "Nueva guía", icon: FilePlus2, perms: ["GUIDES_CREATE"], mobile: true },
    { href: "/guias/importar", label: "Guías desde archivo", icon: FileSpreadsheet, perms: ["GUIDES_CREATE"] },
    { href: "/guias", label: guidesLabel, icon: Package, perms: ["GUIDES_VIEW_ALL", "GUIDES_VIEW_OWN", "SHIPMENTS_OWN"], mobile: true },
    { href: "/destinatarios", label: "Destinatarios", icon: Users, perms: ["RECIPIENTS_VIEW"] },
    { href: "/manifiestos", label: "Manifiestos y salidas", icon: ClipboardList, perms: ["MANIFESTS_VIEW", "MANIFESTS_MANAGE", "DISPATCH_AUTHORIZE"], mobile: true },
    { href: "/recepcion", label: "Recepción", icon: Warehouse, perms: ["RECEPTION_CONFIRM"], mobile: true },
    { href: "/repartidores", label: "Repartidores y asignaciones", icon: Truck, perms: ["COURIERS_VIEW", "COURIERS_MANAGE", "ASSIGNMENTS_MANAGE"] },
    { href: "/incidencias", label: "Incidencias", icon: TriangleAlert, perms: ["INCIDENTS_VIEW", "INCIDENTS_RESOLVE", "INCIDENTS_CREATE"] },
    { href: "/reportes", label: "Reportes", icon: ChartColumn, perms: ["REPORTS_VIEW", "REPORTS_OWN"] },
  ];
  const admin: NavItem[] = [
    { href: "/remitentes", label: "Remitentes", icon: Store, perms: ["SENDERS_MANAGE"] },
    { href: "/usuarios", label: "Usuarios y permisos", icon: UserCog, perms: ["USERS_MANAGE"] },
    { href: "/configuracion", label: "Configuración", icon: Settings, perms: ["SETTINGS_MANAGE", "CATALOGS_MANAGE"] },
  ];
  if (!me) return { operation: [], admin: [] };
  return { operation: operation.filter((i) => can(...i.perms)), admin: admin.filter((i) => can(...i.perms)) };
}

function isActive(pathname: string, href: string) {
  if (href === "/guias") return pathname === "/guias" || (/^\/guias\/\d+/.test(pathname));
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined}
      className={cn("group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas hover:text-ink", collapsed && "justify-center px-0")}>
      {active && <span className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-accent-500" aria-hidden />}
      <Icon className={cn("size-5 shrink-0", active ? "text-brand-600" : "text-subtle group-hover:text-ink-soft")} aria-hidden />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { operation, admin } = useNav();
  const { me } = useSession();
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-[76px] items-center border-b border-line-soft", collapsed ? "justify-center px-2" : "px-6")}>
        <Link href={me ? homeFor(me) : "/"} onClick={onNavigate} aria-label="Inicio">
          {collapsed ? <Logo variant="isotipo" height={36} /> : <Logo variant="compacto" height={38} priority />}
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">Operación</p>}
        <div className="space-y-1">{operation.map((i) => <NavLink key={i.href} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}</div>
        {admin.length > 0 && (
          <>
            {!collapsed ? <p className="mt-7 mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">Administración</p>
              : <div className="my-4 border-t border-line-soft" />}
            <div className="space-y-1">{admin.map((i) => <NavLink key={i.href} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}</div>
          </>
        )}
      </nav>
    </div>
  );
}

function QuickSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form className="relative w-full max-w-md" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/guias?q=${encodeURIComponent(q.trim())}`); }}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar folio, destinatario o referencia…" aria-label="Buscar guías"
        className="h-11 w-full rounded-xl border border-transparent bg-canvas pr-4 pl-10 text-[15px] outline-none placeholder:text-subtle focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100" />
    </form>
  );
}

function UserMenu() {
  const { me, logout } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  if (!me) return null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 rounded-xl p-1 pr-2 hover:bg-canvas" aria-expanded={open} aria-label="Menú de usuario">
        <Avatar name={me.fullName} />
        <span className="hidden text-left md:block">
          <span className="block text-sm font-bold leading-tight text-ink">{me.fullName}</span>
          <span className="block text-xs text-muted">{me.roleName}{me.sender ? ` · ${me.sender.name}` : ""}</span>
        </span>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 animate-scale-in overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-pop">
          <div className="px-3 py-2">
            <p className="font-bold text-ink">{me.fullName}</p>
            <p className="truncate text-[13px] text-muted">{me.email}</p>
            <p className="mt-1 text-[13px] text-muted">{me.roleName}{me.sender ? ` · Remitente: ${me.sender.name}` : ""}</p>
          </div>
          <div className="my-1 border-t border-line-soft" />
          <button onClick={() => void logout()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, can } = useSession();
  const { operation } = useNav();
  const mobile = operation.filter((i) => i.mobile).slice(0, 4);

  // El repartidor usa su propia app móvil.
  useEffect(() => {
    if (me && me.role === "REPARTIDOR") router.replace("/entregas");
  }, [me, router]);

  if (loading || !me) {
    return <div className="grid min-h-dvh place-items-center bg-canvas"><div className="w-full max-w-md"><LoadingState rows={3} label="Cargando sesión…" /></div></div>;
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-white transition-[width] duration-200 lg:block", collapsed ? "w-[84px]" : "w-[272px]")}>
        <SidebarContent collapsed={collapsed} />
        <button onClick={() => setCollapsed((v) => !v)} className="absolute top-[60px] -right-3.5 grid size-7 place-items-center rounded-full border border-line bg-white text-muted shadow-card hover:text-brand-600" aria-label={collapsed ? "Expandir menú" : "Contraer menú"}>
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-navy/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative h-full w-[290px] max-w-[85vw] animate-slide-up bg-white shadow-pop">
            <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-3 z-10 grid size-9 place-items-center rounded-xl text-muted hover:bg-canvas" aria-label="Cerrar menú"><X className="size-5" /></button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[84px]" : "lg:pl-[272px]")}>
        <div className="sticky top-0 z-20">
        <DemoRoleBar />
        <header className="flex h-[76px] items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="grid size-11 place-items-center rounded-xl text-ink-soft hover:bg-canvas lg:hidden" aria-label="Abrir menú"><Menu className="size-5" /></button>
          <Link href={homeFor(me)} className="sm:hidden" aria-label="Inicio"><Logo variant="isotipo" height={32} /></Link>
          <div className="hidden flex-1 sm:block">{can("GUIDES_VIEW_ALL", "GUIDES_VIEW_OWN", "SHIPMENTS_OWN") && <QuickSearch />}</div>
          <div className="flex-1 sm:hidden" />
          <UserMenu />
        </header>
        </div>
        <main key={pathname} className="mx-auto max-w-[1440px] animate-fade-in px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Navegación móvil">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobile.length + 1}, minmax(0, 1fr))` }}>
          {mobile.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-brand-600" : "text-muted")}>
                <span className={cn("grid h-7 w-12 place-items-center rounded-full", active && "bg-brand-50")}><Icon className="size-5" aria-hidden /></span>
                <span className="truncate px-1">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted">
            <span className="grid h-7 w-12 place-items-center rounded-full"><MoreHorizontal className="size-5" aria-hidden /></span>Más
          </button>
        </div>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ShellInner>{children}</ShellInner>
    </SessionProvider>
  );
}
