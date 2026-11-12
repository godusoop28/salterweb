import type { Metadata } from "next";
import { GuideImport } from "@/components/guias/guide-import";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Guías desde archivo" };

export default function ImportarGuiasPage() {
  return (
    <>
      <PageHeader eyebrow="Elaboración" title="Guías desde archivo" description="Sube el reporte de carga en Excel y se genera una guía por cliente con sus pedidos y bultos." />
      <GuideImport />
    </>
  );
}
