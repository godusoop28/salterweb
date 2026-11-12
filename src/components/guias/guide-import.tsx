"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleX, FileSpreadsheet, FileText, LoaderCircle, Upload } from "lucide-react";
import { InlineError } from "@/components/app/common";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, downloadFile, errorMessage } from "@/lib/api/client";
import { useConcepts, useInvalidateOperation, useSenders } from "@/lib/api/hooks";
import type { Address, Guide, Recipient } from "@/lib/api/types";
import { printedFolio } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

interface ImportGroup {
  requestId: string; clientName: string; orders: string[]; addressText: string; address: Address; packages: number;
  types: { name: string; quantity: number }[]; lpns: string[]; route?: string; notes?: string;
  matchType?: "EXACT" | "WORDS"; recipient?: Recipient; suggestions?: Recipient[]; existingGuideId?: number; existingFolio?: string;
}
interface ImportPreview {
  fileName: string; senderId: number; senderName: string; load?: string; route?: string; declaredPackages?: number;
  totalPackages: number; defaultDestination?: string; groups: ImportGroup[];
}
/** Elección por fila: el cliente del catálogo (id) o "new" para darlo de alta. */
interface RowChoice { include: boolean; recipientId: number | "new"; destination: string }
interface RowResult { ok: boolean; guide?: Guide; message?: string }

const plaza = (v: string) => v.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase();
const sameName = (a: string, b: string) => a.trim().localeCompare(b.trim(), "es", { sensitivity: "base" }) === 0;

/** Genera una guía por cliente a partir del reporte de carga en Excel. */
export function GuideImport() {
  const { me, can } = useSession();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const concepts = useConcepts();
  const pickSender = can("SENDERS_VIEW") && !me?.sender;
  const senders = useSenders({ active: true });
  const [senderId, setSenderId] = useState<number | undefined>(undefined);
  const effectiveSender = me?.sender?.id ?? senderId ?? senders.data?.content[0]?.id;
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, RowChoice>>({});
  const [defaultDest, setDefaultDest] = useState("");
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const confirm = can("GUIDES_CONFIRM");

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post<ImportPreview>("/guides/import/preview", fd, pickSender && effectiveSender ? { senderId: effectiveSender } : undefined);
    },
    onSuccess: (p) => {
      setPreview(p);
      setResults({});
      setDefaultDest(p.defaultDestination ?? "");
      setChoices(Object.fromEntries(p.groups.map((g) => [g.requestId, {
        include: !g.existingFolio,
        recipientId: g.recipient?.id ?? "new",
        destination: g.recipient?.destinationCode ?? "",
      }])));
    },
  });

  const rows = preview?.groups ?? [];
  const selected = rows.filter((g) => choices[g.requestId]?.include && !results[g.requestId]?.ok);
  const destFor = (g: ImportGroup) => {
    const c = choices[g.requestId];
    const chosen = c?.recipientId === "new" ? undefined : [g.recipient, ...(g.suggestions ?? [])].find((r) => r?.id === c?.recipientId);
    return c?.destination || chosen?.destinationCode || defaultDest;
  };
  const missingDest = selected.filter((g) => !destFor(g));
  const setChoice = (id: string, patch: Partial<RowChoice>) => setChoices((c) => ({ ...c, [id]: { ...c[id], ...patch } }));

  async function generateOne(g: ImportGroup): Promise<RowResult> {
    const c = choices[g.requestId];
    let recipientId = c.recipientId === "new" ? undefined : c.recipientId;
    const chosen = [g.recipient, ...(g.suggestions ?? [])].find((r) => r?.id === recipientId);
    if (!recipientId) {
      try {
        const r = await api.post<Recipient>("/recipients", {
          senderId: preview!.senderId, firstName: g.clientName.slice(0, 120), address: g.address, route: g.route,
          allowProbableDuplicate: true,
        });
        recipientId = r.id;
      } catch (e) {
        const match = e instanceof ApiError ? (e.data.matches as { recipientId?: number }[] | undefined)?.find((m) => m.recipientId) : undefined;
        if (!match?.recipientId) return { ok: false, message: `No se pudo dar de alta al cliente: ${errorMessage(e)}` };
        recipientId = match.recipientId;
      }
    }
    try {
      const guide = await api.post<Guide>("/guides", {
        clientRequestId: g.requestId,
        senderId: preview!.senderId,
        recipientId,
        orderReference: g.orders.join(", ").slice(0, 80),
        packageCount: g.packages,
        cdReference: chosen?.subRoute,
        notes: g.notes,
        shipping: { destinationCode: destFor(g) || undefined },
        items: g.types.map((t) => {
          const concept = concepts.data?.find((x) => x.active && sameName(x.name, t.name));
          return { conceptId: concept?.id, description: concept ? undefined : t.name, quantity: t.quantity, unit: concept ? undefined : "PIEZA" };
        }),
        confirm,
      });
      return { ok: true, guide };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  }

  async function generateAll() {
    const list = selected;
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const r = await generateOne(list[i]);
      if (r.ok) ok++;
      setResults((prev) => ({ ...prev, [list[i].requestId]: r }));
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    await invalidate();
    if (ok === list.length) toast.success(`${ok} guías generadas`, confirm ? "Ya tienen folio asignado." : "Quedaron como borrador.");
    else toast.error(`${ok} de ${list.length} guías generadas`, "Revisa las filas marcadas en rojo.");
  }

  const generated = rows.map((g) => results[g.requestId]?.guide).filter((g): g is Guide => !!g);
  const busy = progress !== null;

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          {pickSender ? (
            <Field label="Remitente">
              <Select value={effectiveSender ?? ""} onChange={(e) => { setSenderId(Number(e.target.value)); setPreview(null); }}>
                {senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          ) : <div />}
        </div>
        <label className={cn("mt-1 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40",
          upload.isPending && "pointer-events-none opacity-60")}>
          {upload.isPending ? <LoaderCircle className="size-8 animate-spin text-brand-600" /> : <Upload className="size-8 text-brand-600" />}
          <span className="font-bold text-ink">{upload.isPending ? "Leyendo archivo…" : preview ? "Subir otro archivo" : "Selecciona el reporte de carga (Excel)"}</span>
          <span className="text-sm text-muted">Columnas: Nombre de cliente, Pedido, Dirección, LPN, Tipo LPN. Se genera una guía por cliente.</span>
          <input type="file" className="sr-only" accept=".xlsx,.xls" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
        </label>
        <div className="mt-3"><InlineError message={upload.error ? errorMessage(upload.error) : null} /></div>
      </Card>

      {preview && (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2 font-bold text-ink"><FileSpreadsheet className="size-5 text-brand-600" />{preview.fileName}</span>
              {preview.load && <span className="text-muted">Carga <b className="text-ink">{preview.load}</b></span>}
              {preview.route && <span className="text-muted">Ruta <b className="text-ink">{preview.route}</b></span>}
              <span className="text-muted"><b className="text-ink">{rows.length}</b> clientes · <b className="text-ink">{preview.totalPackages}</b> bultos</span>
              {preview.declaredPackages != null && (
                preview.declaredPackages === preview.totalPackages
                  ? <Badge tone="green" icon={CircleCheck}>Coincide con el total del archivo</Badge>
                  : <Badge tone="red" icon={CircleX}>El archivo dice {preview.declaredPackages} bultos</Badge>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
              <Field label="Plaza destino por defecto" hint="Para clientes nuevos o sin subruta">
                <Input value={defaultDest} maxLength={5} placeholder="CVA" className="font-mono uppercase" onChange={(e) => setDefaultDest(plaza(e.target.value))} />
              </Field>
              <p className="text-[13px] text-muted">
                Los clientes que ya están en tu catálogo toman su destino y Clave CD. Los nuevos se dan de alta solos con la dirección del archivo.
                Si vuelves a subir el mismo archivo, las guías ya generadas no se duplican.
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-canvas text-left text-[12px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" aria-label="Seleccionar todas" disabled={busy}
                        checked={rows.filter((g) => !g.existingFolio && !results[g.requestId]?.ok).every((g) => choices[g.requestId]?.include)}
                        onChange={(e) => setChoices((c) => Object.fromEntries(Object.entries(c).map(([k, v]) => {
                          const g = rows.find((x) => x.requestId === k);
                          return [k, { ...v, include: e.target.checked && !g?.existingFolio && !results[k]?.ok }];
                        })))} />
                    </th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Pedido(s)</th>
                    <th className="px-3 py-3 text-right">Bultos</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Destino</th>
                    <th className="px-4 py-3">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {rows.map((g) => {
                    const c = choices[g.requestId];
                    const res = results[g.requestId];
                    const locked = !!g.existingFolio || !!res?.ok || busy;
                    const options = [g.recipient, ...(g.suggestions ?? [])].filter((r): r is Recipient => !!r);
                    return (
                      <tr key={g.requestId} className={cn(!c?.include && !res && "opacity-60", res && !res.ok && "bg-red-50/60")}>
                        <td className="px-4 py-3 align-top">
                          <input type="checkbox" aria-label={`Generar guía de ${g.clientName}`} checked={!!c?.include && !res?.ok} disabled={locked}
                            onChange={(e) => setChoice(g.requestId, { include: e.target.checked })} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-ink">{g.clientName}</p>
                          {g.recipient && c?.recipientId === g.recipient.id ? (
                            <p className="mt-0.5 text-[12px] text-emerald-700">
                              En catálogo{g.recipient.clientCode ? ` · #${g.recipient.clientCode}` : ""}{g.recipient.subRoute ? ` · ${g.recipient.subRoute}` : ""}
                              {g.matchType === "WORDS" && ` (${g.recipient.fullName})`}
                            </p>
                          ) : options.length > 0 ? (
                            <Select className="mt-1 h-8 text-[13px]" value={String(c?.recipientId ?? "new")} disabled={locked}
                              onChange={(e) => setChoice(g.requestId, { recipientId: e.target.value === "new" ? "new" : Number(e.target.value), destination: "" })}>
                              <option value="new">Cliente nuevo (se da de alta)</option>
                              {options.map((r) => <option key={r.id} value={r.id}>Es: {r.fullName}{r.subRoute ? ` · ${r.subRoute}` : ""}</option>)}
                            </Select>
                          ) : (
                            <p className="mt-0.5 text-[12px] text-accent-700">Cliente nuevo: se dará de alta</p>
                          )}
                          <p className="mt-0.5 max-w-xs truncate text-[12px] text-muted" title={g.addressText}>{g.addressText}</p>
                        </td>
                        <td className="px-3 py-3 align-top font-mono text-[13px]">{g.orders.join(", ")}</td>
                        <td className="px-3 py-3 text-right align-top text-base font-bold text-ink">{g.packages}</td>
                        <td className="px-3 py-3 align-top text-[13px] text-ink-soft">{g.types.map((t) => `${t.quantity} ${t.name}`).join(" · ")}</td>
                        <td className="px-3 py-3 align-top">
                          <Input value={c?.destination || destFor(g)} maxLength={5} disabled={locked} aria-label={`Destino de ${g.clientName}`}
                            className={cn("h-8 w-20 font-mono uppercase", !destFor(g) && c?.include && "ring-2 ring-red-300")}
                            onChange={(e) => setChoice(g.requestId, { destination: plaza(e.target.value) })} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          {g.existingFolio && !res && (
                            <Link href={`/guias/${g.existingGuideId}`} className="text-[13px] font-semibold text-brand-600">Ya generada · {printedFolio(g.existingFolio)}</Link>
                          )}
                          {res?.ok && res.guide && (
                            <div className="flex items-center gap-2">
                              <Link href={`/guias/${res.guide.id}`} className="flex items-center gap-1 text-[13px] font-semibold text-emerald-700">
                                <CircleCheck className="size-4" />{res.guide.folio ? printedFolio(res.guide.folio) : "Borrador"}
                              </Link>
                              {res.guide.folio && (
                                <Button variant="ghost" size="sm" icon={<FileText className="size-4" />} aria-label={`PDF de la guía ${res.guide.folio}`}
                                  onClick={() => downloadFile(`/guides/${res.guide!.id}/pdf`, `guia-${res.guide!.folio}.pdf`, undefined, true).catch((e) => toast.error("No se pudo abrir el PDF", errorMessage(e)))}>
                                  PDF
                                </Button>
                              )}
                            </div>
                          )}
                          {res && !res.ok && <p className="flex items-start gap-1 text-[13px] text-red-700"><CircleX className="mt-0.5 size-4 shrink-0" />{res.message}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm">
              {busy ? (
                <span className="flex items-center gap-2 font-semibold text-ink"><LoaderCircle className="size-4 animate-spin text-brand-600" />Generando {progress.done} de {progress.total}…</span>
              ) : missingDest.length > 0 ? (
                <span className="font-semibold text-red-700">Falta la plaza destino en {missingDest.length} guía(s). Escríbela arriba o en la fila.</span>
              ) : (
                <span className="text-muted">{selected.length} guía(s) seleccionadas{confirm ? ", se confirman con folio." : ", quedan como borrador."}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {generated.length > 0 && !busy && <ButtonLink href="/guias" variant="outline">Ver guías</ButtonLink>}
              <Button size="lg" icon={<CircleCheck className="size-5" />} loading={busy}
                disabled={selected.length === 0 || missingDest.length > 0 || !concepts.data}
                onClick={() => void generateAll()}>
                Generar {selected.length} guía{selected.length === 1 ? "" : "s"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
