import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManifestDetail } from "@/components/manifiestos/manifests";

export const metadata: Metadata = { title: "Manifiesto" };

export default async function ManifiestoPage({ params }: PageProps<"/manifiestos/[id]">) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <ManifestDetail id={n} />;
}
