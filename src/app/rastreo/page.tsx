import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackingView } from "@/components/rastreo/tracking-view";

export const metadata: Metadata = { title: "Rastreo de envíos" };

export default function RastreoPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-navy" />}>
      <TrackingView />
    </Suspense>
  );
}
