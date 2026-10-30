import { CourierDeliveryDetail } from "@/components/repartidores/courier-app";

export default async function EntregaDetallePage({ params }: PageProps<"/entregas/[guia]">) {
  const { guia } = await params;
  return <CourierDeliveryDetail guia={decodeURIComponent(guia)} />;
}
