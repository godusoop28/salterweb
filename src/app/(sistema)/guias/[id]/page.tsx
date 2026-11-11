import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideDetail } from "@/components/guias/guide-detail";

export const metadata: Metadata = { title: "Detalle de guía" };

export default async function GuiaPage({ params }: PageProps<"/guias/[id]">) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <GuideDetail id={n} />;
}
