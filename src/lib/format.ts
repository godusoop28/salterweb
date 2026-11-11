const TZ = "America/Mexico_City";

const dt = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const d = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const t = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const key = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const num = new Intl.NumberFormat("es-MX");

export const fmtDateTime = (iso?: string | null) => (iso ? dt.format(new Date(iso)).replace(/\./g, "") : "—");
export const fmtDate = (iso?: string | null) => (iso ? d.format(new Date(iso.length === 10 ? iso + "T12:00:00" : iso)).replace(/\./g, "") : "—");
export const fmtTime = (iso?: string | null) => (iso ? t.format(new Date(iso)) : "—");
export const fmtNumber = (n?: number | null) => (n == null ? "—" : num.format(n));

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio. */
export const todayKey = () => key.format(new Date());
export const daysAgoKey = (days: number) => key.format(new Date(Date.now() - days * 86_400_000));

export function joinAddress(a?: { street?: string; neighborhood?: string; city?: string; state?: string; zip?: string }) {
  if (!a) return "";
  return [a.street, a.neighborhood, [a.city, a.state].filter(Boolean).join(", "), a.zip ? `C.P. ${a.zip}` : ""].filter(Boolean).join(" · ");
}

/**
 * Normaliza un folio tecleado o leído con escáner. El código PDF417 de la guía trae
 * "FOLIO|ORIGEN|DESTINO|…" y el documento lo imprime con espacio ("ATM 000000001").
 */
export function normalizeFolio(raw: string): string {
  let f = raw.trim().split("|")[0].replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z]{2,6}-\d{7,}$/.test(f)) f = f.replace("-", "");
  return f;
}

/** ATM000000001 → "ATM 000000001", como se imprime en la guía. */
export function printedFolio(folio?: string | null): string {
  if (!folio) return "";
  const m = /^([A-Z]+)-?(\d+)$/.exec(folio);
  return m ? `${m[1]} ${m[2]}` : folio;
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
