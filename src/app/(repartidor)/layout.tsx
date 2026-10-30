import type { Metadata } from "next";
import { CourierShell } from "@/components/layout/courier-shell";

export const metadata: Metadata = { title: "App del repartidor" };

export default function RepartidorLayout({ children }: { children: React.ReactNode }) {
  return <CourierShell>{children}</CourierShell>;
}
