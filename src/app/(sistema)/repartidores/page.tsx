import type { Metadata } from "next";
import { CouriersView } from "@/components/repartidores/couriers-view";

export const metadata: Metadata = { title: "Repartidores" };

export default function RepartidoresPage() {
  return (
    <CouriersView />
  );
}
