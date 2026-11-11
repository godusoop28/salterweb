"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PackageSearch, ScanLine, Warehouse } from "lucide-react";
import { InlineError } from "@/components/app/common";
import { GuideStatusBadge } from "@/components/app/status";
import { GuideActionDialog } from "@/components/guias/guide-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Card, InfoRow, PageHeader } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api/client";
import type { Guide } from "@/lib/api/types";
import { fmtDateTime, joinAddress } from "@/lib/format";

/**
 * Recepción en destino por folio. El campo acepta lo que "escriba" un lector de código de barras/QR
 * (que se comporta como teclado + Enter), sin depender de él.
 */
export function ReceptionView() {
  const [folio, setFolio] = useState("");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    const f = folio.trim().toUpperCase();
    if (!f) return;
    setLoading(true);
    setError(null);
    setGuide(null);
    try {
      setGuide(await api.get<Guide>(`/guides/by-folio/${encodeURIComponent(f)}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const canReceive = guide?.allowedActions.includes("RECEIVE");

  return (
    <>
      <PageHeader title="Recepción en destino" description="Busca la guía por folio y confirma la llegada de la mercancía. Una guía sólo puede recibirse una vez." />
      <Card className="mb-5 p-5">
        <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
          <Input ref={inputRef} autoFocus value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="Folio (ej. SAL-000123) o escanea el código" icon={<ScanLine className="size-4" />} aria-label="Folio" className="font-mono" />
          <Button type="submit" loading={loading} icon={<PackageSearch className="size-4" />}>Buscar</Button>
        </form>
        <div className="mt-3"><InlineError message={error} /></div>
      </Card>
      {guide && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href={`/guias/${guide.id}`} className="font-mono text-2xl font-bold text-brand-700">{guide.reference}</Link>
              <div className="mt-2"><GuideStatusBadge status={guide.status} /></div>
            </div>
            {canReceive ? (
              <Button size="lg" icon={<Warehouse className="size-5" />} onClick={() => setOpen(true)}>Confirmar recepción</Button>
            ) : (
              <p className="max-w-xs text-sm text-muted">{guide.reception ? `Ya se recibió el ${fmtDateTime(guide.reception.receivedAt)}.` : "Esta guía no está en tránsito, por lo que no puede recibirse."}</p>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <InfoRow label="Destinatario">{guide.recipient.name}</InfoRow>
            <InfoRow label="Destino">{joinAddress(guide.recipient.address) || "—"}</InfoRow>
            <InfoRow label="Remitente">{guide.sender.name}</InfoRow>
            <InfoRow label="Bultos esperados">{guide.packageCount}</InfoRow>
            <InfoRow label="Mercancía">{guide.items.map((i) => `${i.quantity} ${i.unit} ${i.description}`).join(", ")}</InfoRow>
            <InfoRow label="Manifiesto">{guide.manifest?.number ?? "—"}</InfoRow>
          </div>
        </Card>
      )}
      {guide && open && (
        <GuideActionDialog guide={guide} kind="RECEIVE" onClose={() => setOpen(false)}
          onDone={(g) => { if (g) setGuide(g); setFolio(""); setTimeout(() => inputRef.current?.focus(), 50); }} />
      )}
    </>
  );
}
