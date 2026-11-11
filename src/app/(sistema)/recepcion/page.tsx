import type { Metadata } from "next";
import { ReceptionView } from "@/components/operacion/reception-view";

export const metadata: Metadata = { title: "Recepción" };

export default function RecepcionPage() {
  return (
    <ReceptionView />
  );
}
