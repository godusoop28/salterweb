"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search } from "lucide-react";
import { ErrorBox } from "@/components/app/common";
import { GUIDE_STATUS, GuideStatusBadge } from "@/components/app/status";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Card, LoadingState } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import type { Tracking } from "@/lib/api/types";
import { fmtDateTime } from "@/lib/format";

/** Rastreo público: sólo estado, eventos generales y ciudad de destino (sin datos personales). */
export function TrackingView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("guia") ?? "";
  const [value, setValue] = useState(initial);
  const folio = initial.trim().toUpperCase();
  const q = useQuery({
    queryKey: ["tracking", folio],
    queryFn: () => api.get<Tracking>(`/public/tracking/${encodeURIComponent(folio)}`),
    enabled: folio.length > 0,
    retry: false,
  });

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="bg-navy px-6 pt-8 pb-24 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" aria-label="Inicio"><Logo variant="oscuro" height={56} /></Link>
          <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white">Acceso personal</Link>
        </div>
        <div className="mx-auto mt-10 max-w-3xl">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Rastrea tu envío</h1>
          <p className="mt-2 text-white/70">Escribe el folio de tu guía.</p>
          <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (value.trim()) router.replace(`/rastreo?guia=${encodeURIComponent(value.trim())}`); }}>
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ej. ATM 000000001" aria-label="Folio"
              className="h-13 flex-1 rounded-2xl border-0 bg-white px-5 font-mono text-lg text-ink outline-none focus:ring-4 focus:ring-accent-400/50" />
            <Button type="submit" size="lg" icon={<Search className="size-5" />}>Buscar</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto -mt-14 max-w-3xl px-6 pb-16">
        {!folio && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center"><PackageSearch className="size-10 text-brand-500" /><p className="text-muted">Ingresa un folio para ver el estado de tu envío.</p></Card>
        )}
        {folio && q.isLoading && <Card><LoadingState rows={3} /></Card>}
        {folio && q.error && <ErrorBox error={q.error} />}
        {q.data && (
          <Card className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">Folio</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-3xl font-bold text-ink">{q.data.folio}</h2>
              <GuideStatusBadge status={q.data.status} size="lg" />
            </div>
            <p className="mt-2 text-muted">Destino: {[q.data.destinationCity, q.data.destinationState].filter(Boolean).join(", ") || "—"} · {q.data.packageCount} bulto(s)</p>
            <ol className="relative mt-8 space-y-5 border-l-2 border-line-soft pl-6">
              {[...q.data.events].reverse().map((e, i) => {
                const meta = Object.values(GUIDE_STATUS).find((m) => m.label === e.status);
                const Icon = meta?.icon ?? PackageSearch;
                return (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[37px] grid size-7 place-items-center rounded-full ring-4 ring-white ${i === 0 ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"}`}><Icon className="size-3.5" /></span>
                    <p className="font-bold text-ink">{e.label}</p>
                    <p className="text-sm text-muted">{fmtDateTime(e.occurredAt)}</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}
      </main>
    </div>
  );
}
