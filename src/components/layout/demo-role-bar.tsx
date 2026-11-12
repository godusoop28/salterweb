"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { api, errorMessage } from "@/lib/api/client";
import type { LoginResponse } from "@/lib/api/types";
import { homeFor, useSession } from "@/lib/session";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Roles del acceso de pruebas, en el orden del flujo operativo. */
const ROLES = [
  { code: "REMITENTE", label: "Remitente" },
  { code: "ADMIN", label: "Admin" },
  { code: "RECEPCION", label: "Receptor" },
  { code: "REPARTIDOR", label: "Repartidor" },
] as const;

export const DEMO_EMAIL_SUFFIX = ".demo@salter.test";

/**
 * Barra de PRUEBAS: cambia de rol con un solo clic, sin cerrar sesión.
 * Sólo aparece para los usuarios de prueba (*.demo@salter.test).
 */
export function DemoRoleBar({ className }: { className?: string }) {
  const { me } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (!me || !me.email.endsWith(DEMO_EMAIL_SUFFIX)) return null;

  const switchTo = async (role: string) => {
    if (role === me.role || busy) return;
    setBusy(role);
    try {
      const res = await api.post<LoginResponse>("/auth/demo-login", { role });
      qc.clear();
      qc.setQueryData(["me"], res.user);
      router.replace(homeFor(res.user));
    } catch (e) {
      toast.error("No se pudo cambiar de rol", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto bg-accent-50 px-3 py-1.5 text-[13px] [scrollbar-width:none]", className)} role="toolbar" aria-label="Cambiar de rol (pruebas)">
      <span className="flex shrink-0 items-center gap-1 font-bold text-accent-700"><FlaskConical className="size-3.5" aria-hidden /> Probar como:</span>
      {ROLES.map((r) => {
        const active = r.code === me.role;
        return (
          <button
            key={r.code}
            type="button"
            onClick={() => void switchTo(r.code)}
            disabled={busy !== null}
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 font-semibold transition",
              active ? "bg-accent-600 text-white" : "bg-white text-ink-soft ring-1 ring-accent-100 hover:text-accent-700 hover:ring-accent-400",
              busy === r.code && "opacity-60",
            )}
          >
            {busy === r.code ? "…" : r.label}
          </button>
        );
      })}
    </div>
  );
}
