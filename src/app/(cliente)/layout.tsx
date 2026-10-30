import { ClientShell } from "@/components/layout/client-shell";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
