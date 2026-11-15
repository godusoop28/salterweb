import type { Metadata } from "next";
import { ClientHome } from "@/components/inicio/client-home";

export const metadata: Metadata = { title: "Inicio" };

export default function InicioPage() {
  return <ClientHome />;
}
