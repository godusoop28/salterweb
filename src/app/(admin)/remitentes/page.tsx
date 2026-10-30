import type { Metadata } from "next";
import { SendersView } from "@/components/remitentes/senders-view";

export const metadata: Metadata = { title: "Remitentes" };

export default function RemitentesPage() {
  return <SendersView />;
}
