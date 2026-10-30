import type { Metadata } from "next";
import { Suspense } from "react";
import { PackagesView } from "@/components/paquetes/packages-view";
import { Card, LoadingState } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Paquetes" };

export default function PaquetesPage() {
  return (
    <Suspense fallback={<Card><LoadingState rows={8} /></Card>}>
      <PackagesView />
    </Suspense>
  );
}
