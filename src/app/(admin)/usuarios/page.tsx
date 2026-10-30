import type { Metadata } from "next";
import { UsersView } from "@/components/usuarios/users-view";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsuariosPage() {
  return <UsersView />;
}
