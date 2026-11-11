import type { Metadata } from "next";
import { ManifestsList } from "@/components/manifiestos/manifests";

export const metadata: Metadata = { title: "Manifiestos" };

export default function ManifiestosPage() {
  return (
    <ManifestsList />
  );
}
