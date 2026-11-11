"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true sólo en el cliente (evita discrepancias de hidratación con portales). */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
