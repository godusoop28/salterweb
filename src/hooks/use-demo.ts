"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/services/demo-store";
import type { Role, User } from "@/lib/types";

/** Estado completo de la demostración, compartido por todas las pantallas. */
export function useDemoState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const DEFAULT_USER: Record<Role, string> = {
  admin: "usr-01",
  supervisor: "usr-02",
  repartidor: "usr-r1",
  remitente: "usr-c1",
};

/**
 * Usuario activo. Al ser un prototipo sin autenticación real, si no hay sesión
 * se muestra el perfil de demostración correspondiente al área visitada.
 */
export function useCurrentUser(area: Role): User {
  const state = useDemoState();
  const sessionUser = state.users.find((u) => u.id === state.session?.userId);
  const matchesArea =
    sessionUser &&
    (area === "admin" ? sessionUser.role === "admin" || sessionUser.role === "supervisor" : sessionUser.role === area);
  return matchesArea ? sessionUser : state.users.find((u) => u.id === DEFAULT_USER[area]) ?? state.users[0];
}

const noop = () => () => {};

/** true sólo en el navegador tras la hidratación (útil para gráficas y canvas). */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
