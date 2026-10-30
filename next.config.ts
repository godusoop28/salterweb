import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El prototipo es una aplicación cliente con estado local (sin datos de servidor que cachear),
  // por eso no se activan Cache Components. Al integrar la API real puede habilitarse `cacheComponents: true`.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
