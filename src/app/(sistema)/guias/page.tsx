import type { Metadata } from "next";
import { Suspense } from "react";
import { GuidesList } from "@/components/guias/guides-list";

export const metadata: Metadata = { title: "Guías" };

export default function GuiasPage() {
  return (
    <Suspense>
      <GuidesList />
    </Suspense>
  );
}
