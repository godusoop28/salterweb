import type { Metadata } from "next";
import { Suspense } from "react";
import { IncidentsView } from "@/components/incidencias/incidents-view";
import { Card, LoadingState } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Incidencias" };

export default function IncidenciasPage() {
  return (
    <Suspense fallback={<Card><LoadingState rows={6} /></Card>}>
      <IncidentsView />
    </Suspense>
  );
}
