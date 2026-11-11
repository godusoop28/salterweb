import type { Metadata } from "next";
import { GuideForm } from "@/components/guias/guide-form";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Nueva guía" };

export default function NuevaGuiaPage() {
  return (
    <>
      <PageHeader eyebrow="Elaboración" title="Nueva guía" description="Busca al destinatario, agrega la mercancía y confirma. El folio lo asigna el sistema." />
      <GuideForm />
    </>
  );
}
