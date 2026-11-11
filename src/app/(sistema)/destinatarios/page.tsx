import type { Metadata } from "next";
import { RecipientsView } from "@/components/destinatarios/recipients-view";

export const metadata: Metadata = { title: "Destinatarios" };

export default function DestinatariosPage() {
  return (
    <RecipientsView />
  );
}
