import type { Metadata } from "next";
import { NewShipmentPage } from "@/components/remitentes/client-portal";

export const metadata: Metadata = { title: "Nuevo envío" };

export default function Page() {
  return <NewShipmentPage />;
}
