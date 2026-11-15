import type { Metadata } from "next";
import { RoutesView } from "@/components/rutas/routes-view";

export const metadata: Metadata = { title: "Rutas y operaciones" };

export default function RutasPage() {
  return <RoutesView />;
}
