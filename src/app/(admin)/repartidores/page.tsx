import type { Metadata } from "next";
import { Suspense } from "react";
import { CouriersView } from "@/components/repartidores/couriers-view";
import { Card, LoadingState } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Repartidores" };

export default function RepartidoresPage() {
  return (
    <Suspense fallback={<Card><LoadingState rows={6} /></Card>}>
      <CouriersView />
    </Suspense>
  );
}
