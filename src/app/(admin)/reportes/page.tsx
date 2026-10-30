import type { Metadata } from "next";
import { ReportsView } from "@/components/reportes/reports-view";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesPage() {
  return <ReportsView />;
}
