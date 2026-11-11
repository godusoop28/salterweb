import { notFound } from "next/navigation";
import { CourierGuide } from "@/components/repartidores/courier-app";

export default async function EntregaPage({ params }: PageProps<"/entregas/[id]">) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <CourierGuide id={n} />;
}
