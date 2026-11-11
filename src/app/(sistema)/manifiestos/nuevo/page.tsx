import type { Metadata } from "next";
import { ManifestBuilder } from "@/components/manifiestos/manifests";

export const metadata: Metadata = { title: "Nuevo manifiesto" };

export default function NuevoManifiestoPage() {
  return (
    <ManifestBuilder />
  );
}
