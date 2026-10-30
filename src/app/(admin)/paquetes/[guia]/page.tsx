import type { Metadata } from "next";
import { ShipmentDetail } from "@/components/paquetes/shipment-detail";

export async function generateMetadata({ params }: PageProps<"/paquetes/[guia]">): Promise<Metadata> {
  const { guia } = await params;
  return { title: `Paquete ${decodeURIComponent(guia)}` };
}

export default async function PaqueteDetallePage({ params }: PageProps<"/paquetes/[guia]">) {
  const { guia } = await params;
  return <ShipmentDetail guia={decodeURIComponent(guia)} />;
}
