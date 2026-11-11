import { notFound } from "next/navigation";
import { CourierDelivery } from "@/components/repartidores/courier-app";

export default async function EvidenciaPage({ params }: PageProps<"/entregas/[id]/evidencia">) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <CourierDelivery id={n} />;
}
