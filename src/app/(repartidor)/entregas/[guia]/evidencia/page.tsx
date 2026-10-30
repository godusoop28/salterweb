import { CourierEvidence } from "@/components/repartidores/courier-app";

export default async function EvidenciaPage({ params }: PageProps<"/entregas/[guia]/evidencia">) {
  const { guia } = await params;
  return <CourierEvidence guia={decodeURIComponent(guia)} />;
}
