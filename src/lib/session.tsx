"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, setUnauthorizedHandler } from "@/lib/api/client";
import type { Me, Permission, RoleCode } from "@/lib/api/types";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (count, err) => !(err instanceof ApiError && [401, 403, 404].includes(err.status)) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

interface SessionValue {
  me: Me | undefined;
  loading: boolean;
  can: (...perms: Permission[]) => boolean;
  logout: () => Promise<void>;
  refresh: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useMeQuery() {
  return useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/auth/me"), staleTime: 60_000, retry: false });
}

/** Sesión del usuario: datos del backend (/auth/me). Redirige al login si expira. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const meQuery = useMeQuery();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.clear();
      router.replace(`/login?expirada=1&next=${encodeURIComponent(pathname)}`);
    });
    return () => setUnauthorizedHandler(null);
  }, [qc, router, pathname]);

  const value = useMemo<SessionValue>(() => {
    const perms = new Set(meQuery.data?.permissions ?? []);
    return {
      me: meQuery.data,
      loading: meQuery.isLoading,
      can: (...ps) => ps.some((p) => perms.has(p)),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          qc.clear();
          router.replace("/login");
        }
      },
      refresh: () => void meQuery.refetch(),
    };
  }, [meQuery, qc, router]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}

/** Muestra el contenido sólo si el usuario tiene alguno de los permisos (ayuda visual; el backend valida). */
export function Can({ perm, children, fallback = null }: { perm: Permission | Permission[]; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return <>{can(...(Array.isArray(perm) ? perm : [perm])) ? children : fallback}</>;
}

/** Pantalla inicial según rol. */
export function homeFor(me: Pick<Me, "role" | "permissions">): string {
  const p = new Set(me.permissions);
  const role: RoleCode = me.role;
  if (role === "REPARTIDOR" || (p.has("DELIVERIES_OWN") && !p.has("GUIDES_VIEW_ALL"))) return "/entregas";
  if (p.has("DASHBOARD_VIEW")) return "/dashboard";
  if (role === "REMITENTE" || p.has("GUIDES_CREATE")) return "/guias/nueva";
  if (p.has("RECEPTION_CONFIRM")) return "/recepcion";
  return "/guias";
}
