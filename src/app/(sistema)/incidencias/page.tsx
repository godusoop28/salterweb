import type { Metadata } from "next";
import { Suspense } from "react";
import { IncidentsView } from "@/components/incidencias/incidents-view";

export const metadata: Metadata = { title: "Incidencias" };

export default function IncidenciasPage() {
  return (
    <Suspense>
      <IncidentsView />
    </Suspense>
  );
}
