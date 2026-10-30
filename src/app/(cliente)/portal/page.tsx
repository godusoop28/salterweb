import type { Metadata } from "next";
import { PortalHome } from "@/components/remitentes/client-portal";

export const metadata: Metadata = { title: "Portal del remitente" };

export default function Page() {
  return <PortalHome />;
}
