import type { Metadata } from "next";
import { MyShipments } from "@/components/remitentes/client-portal";

export const metadata: Metadata = { title: "Mis envíos" };

export default function Page() {
  return <MyShipments />;
}
