import { createDemoState, DEMO_VERSION } from "@/lib/mock-data/generate";
import type { DemoState } from "@/lib/types";

/**
 * Almacén de la demostración.
 * Mantiene el estado en memoria, lo persiste en localStorage y notifica a React
 * mediante useSyncExternalStore. Al conectar la API real, este módulo se reemplaza
 * por llamadas HTTP sin tocar los componentes (ver salter-service.ts).
 */

const STORAGE_KEY = "salter-demo-state";
const listeners = new Set<() => void>();
let serverSnapshot: DemoState | null = null;
let state: DemoState | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function getServerSnapshot(): DemoState {
  if (!serverSnapshot) serverSnapshot = createDemoState();
  return serverSnapshot;
}

function load(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === DEMO_VERSION) return parsed;
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se usan los datos iniciales.
  }
  return getServerSnapshot();
}

export function getSnapshot(): DemoState {
  if (typeof window === "undefined") return getServerSnapshot();
  if (!state) state = load();
  return state;
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  state = load();
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function persist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[SALTER demo] No se pudo guardar el estado local", err);
    }
  }, 120);
}

export function setState(updater: (prev: DemoState) => DemoState) {
  state = updater(getSnapshot());
  persist();
  emit();
}

/** Restaura los datos originales conservando la sesión activa. */
export function resetState() {
  const session = getSnapshot().session;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
  state = { ...createDemoState(), session };
  persist();
  emit();
}
