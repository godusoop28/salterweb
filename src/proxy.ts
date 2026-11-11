import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección de rutas privadas: sin cookie de sesión se redirige al inicio de sesión.
 * Es sólo una primera barrera de navegación; la autorización real (rol, permisos y alcance
 * de datos) la valida el backend en cada solicitud.
 */
const SESSION_COOKIE = "SALTER_SESSION";
const PUBLIC_PATHS = ["/", "/login", "/rastreo"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|branding|favicon|icon|apple-icon|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
