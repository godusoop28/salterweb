import type { NextConfig } from "next";

/**
 * URL del backend (salterapi). El navegador sólo habla con este mismo dominio en /api/*
 * y Next.js reenvía la solicitud a la API: la cookie de sesión queda como cookie propia
 * (SameSite=Lax) y no hace falta exponer el backend al navegador.
 */
const API_URL = (process.env.SALTER_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  async redirects() {
    // Rutas del prototipo sustituidas por los módulos operativos.
    return [
      { source: "/paquetes", destination: "/guias", permanent: false },
      { source: "/paquetes/:path*", destination: "/guias", permanent: false },
      { source: "/portal", destination: "/guias", permanent: false },
      { source: "/mis-envios", destination: "/guias", permanent: false },
      { source: "/nuevo-envio", destination: "/guias", permanent: false },
      { source: "/ruta", destination: "/entregas", permanent: false },
    ];
  },
};

export default nextConfig;
