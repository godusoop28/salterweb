import type { Metadata } from "next";
import { ReportsView } from "@/components/reportes/reports-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <ReportsView mode="dashboard" />
  );
}
