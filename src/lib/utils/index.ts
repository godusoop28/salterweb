import { DEMO_NOW_ISO, TIME_ZONE } from "@/lib/constants";

type ClassValue = string | false | null | undefined | 0;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

const dateFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, month: "short" });
const monthLongFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, month: "long", year: "numeric" });
const numberFmt = new Intl.NumberFormat("es-MX");
const moneyFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const clean = (s: string) => s.replace(/\./g, "").replace(/ /g, " ");

export const formatDate = (iso: string) => clean(dateFmt.format(new Date(iso)));
export const formatShortDate = (iso: string) => clean(shortDateFmt.format(new Date(iso)));
export const formatLongDate = (iso: string) => {
  const s = longDateFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const formatTime = (iso: string) => clean(timeFmt.format(new Date(iso))).replace("a m", "a. m.").replace("p m", "p. m.");
export const formatDateTime = (iso: string) => `${formatDate(iso)} · ${formatTime(iso)}`;
export const formatMonth = (iso: string) => clean(monthFmt.format(new Date(iso)));
export const formatMonthLong = (iso: string) => monthLongFmt.format(new Date(iso));
export const formatNumber = (n: number) => numberFmt.format(n);
export const formatMoney = (n: number) => moneyFmt.format(n);
export const formatPercent = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

/** Clave de día (YYYY-MM-DD) en horario del centro de México. */
export const dayKey = (iso: string | Date) => keyFmt.format(typeof iso === "string" ? new Date(iso) : iso);
export const monthKey = (iso: string) => dayKey(iso).slice(0, 7);

export const DEMO_NOW = new Date(DEMO_NOW_ISO);
export const TODAY_KEY = dayKey(DEMO_NOW);

const DAY_MS = 86_400_000;

/** Días completos entre una fecha y el "hoy" de la demo. */
export function daysAgo(iso: string): number {
  const a = Date.parse(dayKey(iso));
  const b = Date.parse(TODAY_KEY);
  return Math.round((b - a) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

export function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}

/**
 * Hora actual para acciones de la demo: conserva el día de referencia (29 oct 2026)
 * con la hora real del reloj, así todos los indicadores siguen siendo coherentes.
 */
export function demoNow(): string {
  const real = new Date();
  const base = new Date(DEMO_NOW);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "numeric", hourCycle: "h23" })
    .formatToParts(real)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const minutesNow = Number(parts.hour) * 60 + Number(parts.minute);
  const baseMinutes = 17 * 60 + 30;
  return new Date(base.getTime() + (minutesNow - baseMinutes) * 60_000).toISOString();
}

export function relativeTime(iso: string): string {
  const diffMin = Math.round((DEMO_NOW.getTime() - Date.parse(iso)) / 60_000);
  if (diffMin < 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = daysAgo(iso);
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  return formatDate(iso);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function formatAddress(a: { street: string; neighborhood: string; city: string; state: string; zip: string }) {
  return `${a.street}, Col. ${a.neighborhood}, ${a.city}, ${a.state}, C.P. ${a.zip}`;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reduce una imagen a JPEG ligero para guardarla en la demo sin saturar localStorage. */
export function compressImage(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagen no compatible"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
