import type { Metadata, Viewport } from "next";
import { Exo_2, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { Providers } from "@/lib/session";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "SALTER · Alternativa en Movimiento",
    template: "%s · SALTER",
  },
  description: "Sistema de operación de paquetería de SALTER: guías, manifiestos, salidas, recepción y reportes.",
};

export const viewport: Viewport = {
  themeColor: "#0B5CD5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${jakarta.variable} ${exo.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
