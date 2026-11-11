/**
 * Cliente HTTP centralizado. Todas las llamadas pasan por /api (proxy de Next.js hacia salterapi),
 * envían la cookie de sesión y la cabecera anti-CSRF, y convierten los errores RFC 7807 en ApiError.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;
  readonly data: Record<string, unknown>;

  constructor(status: number, code: string, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.fieldErrors = (data.errors as Record<string, string>) ?? {};
  }
}

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export function buildQuery(params?: Query): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

let onUnauthorized: (() => void) | null = null;
/** El proveedor de sesión registra qué hacer cuando la sesión expira. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown, init?: { query?: Query; raw?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "X-Requested-With": "salter-web", Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}${buildQuery(init?.query)}`, { method, headers, body: payload, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError(0, "NETWORK", "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    const code = (data.code as string) ?? (res.status >= 500 ? "SERVER" : "HTTP_" + res.status);
    const message = (data.detail as string) ?? (res.status >= 500 ? "El servidor no está disponible. Intenta más tarde." : "No se pudo completar la operación.");
    if (res.status === 401 && path !== "/auth/login") onUnauthorized?.();
    throw new ApiError(res.status, code, message, data);
  }
  if (init?.raw) return (await res.blob()) as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>("POST", path, body, { query }),
  put: <T>(path: string, body?: unknown, query?: Query) => request<T>("PUT", path, body, { query }),
  del: <T>(path: string, query?: Query) => request<T>("DELETE", path, undefined, { query }),
  blob: (path: string, query?: Query) => request<Blob>("GET", path, undefined, { query, raw: true }),
};

/** Descarga un archivo (PDF, CSV, XLSX) generado por la API respetando la sesión. */
export async function downloadFile(path: string, filename: string, query?: Query, openInTab = false) {
  const blob = await api.blob(path, query);
  const url = URL.createObjectURL(blob);
  if (openInTab) {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Ocurrió un error inesperado.";
}
