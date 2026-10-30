import type { Metadata } from "next";
import { SettingsView } from "@/components/usuarios/settings-view";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return <SettingsView />;
}
