import type { Metadata } from "next";
import { GuideForm } from "@/components/guias/guide-form";
import { FileSpreadsheet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Nueva guía" };

export default function NuevaGuiaPage() {
  return (
    <>
      <PageHeader eyebrow="Elaboración" title="Nueva guía" description="Cliente, pedido, bultos y tipo de bulto. El folio lo asigna el sistema."
        actions={<ButtonLink href="/guias/importar" variant="outline" icon={<FileSpreadsheet className="size-4" />}>Desde archivo</ButtonLink>} />
      <GuideForm />
    </>
  );
}
