"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, CircleCheck, CircleX, FileSpreadsheet, LoaderCircle, Plus, Trash2, TriangleAlert, Upload } from "lucide-react";
import { InlineError } from "@/components/app/common";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useInvalidateOperation, useSenders, useShippingRoutes } from "@/lib/api/hooks";
import type { Address, Recipient } from "@/lib/api/types";
import { printedFolio } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn, routeForClient } from "@/lib/utils";

interface PackageLine { lpn?: string; type: string; order?: string }
interface ImportGroup {
  requestId: string; clientName: string; orders: string[]; addressText: string; address: Address; packages: number;
  types: { name: string; quantity: number }[]; lpns: string[]; route?: string; notes?: string;
  matchType?: "EXACT" | "WORDS"; recipient?: Recipient; suggestions?: Recipient[]; existingGuideId?: number; existingFolio?: string;
  duplicateOrders?: string[]; packageLines: PackageLine[];
}
interface ImportPreview {
  fileName: string; senderId: number; senderName: string; load?: string; route?: string; declaredPackages?: number;
  totalPackages: number; defaultDestination?: string; groups: ImportGroup[]; fileKey: string; defaultShippingRouteId?: number;
}
/** Renglón editable: lo que el usuario revisó y corrigió antes de generar. */
interface EditRow {
  include: boolean; recipientId: number | "new"; clientName: string; orders: string; address: Address; route: string;
  subRoute: string; destination: string; items: { type: string; qty: string }[]; notes: string; allowDuplicate: boolean;
}
interface CommitRow { requestId: string; clientName: string; outcome: "CREATED" | "SKIPPED_EXISTING" | "SKIPPED_DUPLICATE" | "EXCLUDED" | "REJECTED"; message?: string; guideId?: number; folio?: string; pieces: number; warning?: string }
interface CommitResult { batchId: number; created: number; skipped: number; excluded: number; rejected: number; declaredPackages?: number; committedPieces: number; excludedPieces: number; rows: CommitRow[] }

const plaza = (v: string) => v.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase();
const qty = (s: string) => (/^\d+$/.test(s) ? Number(s) : 0);
const OUTCOME: Record<CommitRow["outcome"], { label: string; tone: "green" | "orange" | "red" | "slate" }> = {
  CREATED: { label: "Creada", tone: "green" }, SKIPPED_EXISTING: { label: "Ya existía", tone: "orange" },
  SKIPPED_DUPLICATE: { label: "Duplicada (omitida)", tone: "orange" }, EXCLUDED: { label: "No seleccionada", tone: "slate" },
  REJECTED: { label: "Rechazada", tone: "red" },
};

/**
 * Guías desde el reporte de carga (Excel): subir → detectar estructura → previsualizar → corregir por renglón →
 * validar duplicados y cantidades → resumen → confirmar → guías reales. La previsualización NO guarda nada.
 */
export function GuideImport() {
  const { me, can } = useSession();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const pickSender = can("SENDERS_VIEW") && !me?.sender;
  const senders = useSenders({ active: true });
  const routes = useShippingRoutes(true);
  const [senderId, setSenderId] = useState<number | undefined>(undefined);
  const effectiveSender = me?.sender?.id ?? senderId ?? senders.data?.content[0]?.id;
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<Record<string, EditRow>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [defaultDest, setDefaultDest] = useState("");
  const [keepLpn, setKeepLpn] = useState(true);
  const [notesFromFile, setNotesFromFile] = useState(true);
  const [routeOverride, setRouteOverride] = useState<{ id: number; reason: string } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const confirm = can("GUIDES_CONFIRM");
  const canReroute = can("ROUTES_REASSIGN");

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post<ImportPreview>("/guides/import/preview", fd, pickSender && effectiveSender ? { senderId: effectiveSender } : undefined);
    },
    onSuccess: (p) => {
      setPreview(p);
      setResult(null);
      setRouteOverride(null);
      setDefaultDest(p.defaultDestination ?? "");
      setRows(Object.fromEntries(p.groups.map((g) => [g.requestId, {
        include: !g.existingFolio,
        recipientId: g.recipient?.id ?? "new",
        clientName: g.clientName,
        orders: g.orders.join(", "),
        address: g.address ?? {},
        route: g.route ?? "",
        subRoute: g.recipient?.subRoute ?? "",
        destination: g.recipient?.destinationCode ?? "",
        items: g.types.map((t) => ({ type: t.name, qty: String(t.quantity) })),
        notes: g.notes ?? "",
        allowDuplicate: false,
      } satisfies EditRow])));
    },
  });

  const groups = preview?.groups ?? [];
  const set = (id: string, patch: Partial<EditRow>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const piecesOf = (r?: EditRow) => (r ? r.items.reduce((s, i) => s + qty(i.qty), 0) : 0);
  const destOf = (g: ImportGroup) => rows[g.requestId]?.destination || defaultDest;
  // Validación por renglón (antes de enviar): cliente, cantidades enteras, destino y pedidos duplicados.
  const problems = (g: ImportGroup): string[] => {
    const r = rows[g.requestId];
    if (!r?.include) return [];
    const p: string[] = [];
    if (!r.clientName.trim()) p.push("Falta el nombre del cliente");
    if (r.items.length === 0 || r.items.some((i) => !i.type.trim() || qty(i.qty) < 1)) p.push("Cada tipo de bulto necesita cantidad (mínimo 1)");
    if (!destOf(g) && confirm) p.push("Falta la plaza destino");
    if (g.duplicateOrders?.length && !r.allowDuplicate) p.push(`Pedido ${g.duplicateOrders.join(", ")} ya está en ${printedFolio(g.existingFolio)}`);
    return p;
  };
  const selected = groups.filter((g) => rows[g.requestId]?.include);
  const withProblems = selected.filter((g) => problems(g).length > 0);
  const selectedPieces = selected.reduce((s, g) => s + piecesOf(rows[g.requestId]), 0);
  const excludedPieces = groups.filter((g) => !rows[g.requestId]?.include).reduce((s, g) => s + piecesOf(rows[g.requestId]), 0);
  const filePieces = groups.reduce((s, g) => s + piecesOf(rows[g.requestId]), 0);
  const declared = preview?.declaredPackages;
  const defaultRouteId = preview?.defaultShippingRouteId;
  // Sin predeterminada, cada guía toma la ruta de embarque de la RUTA del cliente (la del archivo, ej. 74).
  const fileRoute = !defaultRouteId ? routeForClient(routes.data, preview?.route) : undefined;
  const routeId = routeOverride?.id ?? defaultRouteId ?? fileRoute?.id;
  const routeChanged = !!routeOverride && !!defaultRouteId && routeOverride.id !== defaultRouteId;
  const routeLabel = routes.data?.find((r) => r.id === routeId);
  const totalOrders = useMemo(() => selected.reduce((s, g) => s + rows[g.requestId].orders.split(/[^A-Za-z0-9-]+/).filter((o) => o.length >= 3).length, 0), [selected, rows]);

  const commit = useMutation({
    mutationFn: () => api.post<CommitResult>("/guides/import/commit", {
      senderId: preview!.senderId, fileKey: preview!.fileKey, fileName: preview!.fileName, load: preview!.load,
      declaredPackages: preview!.declaredPackages, confirm,
      groups: groups.map((g) => {
        const r = rows[g.requestId];
        return {
          requestId: g.requestId, include: r.include, recipientId: r.recipientId === "new" ? undefined : r.recipientId,
          clientName: r.clientName.trim(), address: r.address, orders: r.orders.trim().slice(0, 80) || undefined, route: r.route || undefined,
          subRoute: r.subRoute || undefined, destinationCode: destOf(g) || undefined,
          shippingRouteId: routeOverride?.id, routeChangeReason: routeChanged ? routeOverride?.reason : undefined,
          items: r.items.filter((i) => i.type.trim() && qty(i.qty) > 0).map((i) => ({ type: i.type.trim(), quantity: qty(i.qty) })),
          packages: keepLpn ? g.packageLines : [], notes: notesFromFile ? r.notes || undefined : undefined, allowDuplicateOrder: r.allowDuplicate,
        };
      }),
    }),
    onSuccess: async (res) => {
      setResult(res);
      setReviewOpen(false);
      await invalidate();
      if (res.rejected === 0) toast.success(`${res.created} guías generadas`, res.skipped ? `${res.skipped} ya existían y no se duplicaron.` : confirm ? "Con folio y en su manifiesto." : "Quedaron como borrador.");
      else toast.error(`${res.created} creadas · ${res.rejected} rechazadas`, "Revisa el detalle por renglón.");
    },
  });

  const resultFor = (id: string) => result?.rows.find((r) => r.requestId === id);
  const locked = commit.isPending || !!result;

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        {pickSender && (
          <Field label="Remitente" className="mb-3 max-w-md">
            <Select value={effectiveSender ?? ""} onChange={(e) => { setSenderId(Number(e.target.value)); setPreview(null); setResult(null); }}>
              {senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}
        <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40",
          (upload.isPending || commit.isPending) && "pointer-events-none opacity-60")}>
          {upload.isPending ? <LoaderCircle className="size-8 animate-spin text-brand-600" /> : <Upload className="size-8 text-brand-600" />}
          <span className="font-bold text-ink">{upload.isPending ? "Leyendo archivo…" : preview ? "Subir otro archivo" : "Selecciona el reporte de carga (Excel)"}</span>
          <span className="text-sm text-muted">Se detectan solas las columnas «Nombre de cliente», «Pedido», «Dirección», «LPN», «Tipo LPN», «Carga» y «Ruta». Se propone una guía por cliente.</span>
          <input type="file" className="sr-only" accept=".xlsx,.xls" disabled={commit.isPending}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
        </label>
        <div className="mt-3"><InlineError message={upload.error ? errorMessage(upload.error) : null} /></div>
      </Card>

      {preview && (
        <>
          <Card className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2 font-bold text-ink"><FileSpreadsheet className="size-5 text-brand-600" />{preview.fileName}</span>
              {preview.load && <span className="text-muted">Carga <b className="text-ink">{preview.load}</b></span>}
              {preview.route && <span className="text-muted">Ruta del archivo <b className="text-ink">{preview.route}</b></span>}
              <span className="text-muted"><b className="text-ink">{groups.length}</b> clientes · <b className="text-ink">{preview.totalPackages}</b> bultos (LPN)</span>
              {declared != null && (declared === preview.totalPackages
                ? <Badge tone="green" icon={CircleCheck}>Coincide con el total declarado ({declared})</Badge>
                : <Badge tone="red" icon={CircleX}>El archivo declara {declared} bultos y se leyeron {preview.totalPackages}</Badge>)}
              {groups.some((g) => g.existingFolio) && <Badge tone="orange">{groups.filter((g) => g.existingFolio).length} ya tienen guía o pedido duplicado</Badge>}
            </div>
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field label="Plaza destino por defecto" hint="Para clientes sin subruta">
                <Input value={defaultDest} maxLength={5} placeholder="CVA" className="font-mono uppercase" disabled={locked} onChange={(e) => setDefaultDest(plaza(e.target.value))} />
              </Field>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="font-semibold text-ink sm:col-span-2">Datos del archivo que se conservan</p>
                <label className="flex items-center gap-2"><input type="checkbox" checked={keepLpn} disabled={locked} onChange={(e) => setKeepLpn(e.target.checked)} /> Guardar los LPN de cada bulto (relación con pedido)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={notesFromFile} disabled={locked} onChange={(e) => setNotesFromFile(e.target.checked)} /> Agregar carga y LPN en observaciones</label>
                <p className="text-[13px] text-muted sm:col-span-2">Los clientes del catálogo conservan su dirección y subruta; los nuevos se dan de alta con la dirección del archivo (puedes corregirla en cada renglón).</p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-4 text-sm">
              <div>
                <p className="font-semibold text-ink">Ruta de embarque</p>
                <p className="text-muted">{routeLabel ? `${routeLabel.code} · ${routeLabel.name}${routeChanged ? " (cambiada)" : routeOverride ? "" : defaultRouteId ? " (predeterminada)" : ` (ruta ${preview?.route} del archivo)`}` : "Sin ruta de embarque: se asignará después"}</p>
              </div>
              {canReroute && !locked && (
                <>
                  <Select className="h-9 w-auto" value={routeId ?? ""} onChange={(e) => { const id = Number(e.target.value); setRouteOverride(id && id !== defaultRouteId ? { id, reason: routeOverride?.reason ?? "" } : null); }}>
                    <option value="" disabled>Ruta…</option>
                    {routes.data?.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
                  </Select>
                  {routeChanged && <Input className="h-9 max-w-sm" placeholder="Motivo del cambio de ruta (obligatorio)" value={routeOverride?.reason ?? ""} onChange={(e) => setRouteOverride((o) => (o ? { ...o, reason: e.target.value } : o))} />}
                </>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-canvas text-left text-[12px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" aria-label="Seleccionar todas" disabled={locked}
                        checked={groups.length > 0 && groups.filter((g) => !g.existingFolio).every((g) => rows[g.requestId]?.include)}
                        onChange={(e) => setRows((rs) => Object.fromEntries(Object.entries(rs).map(([k, v]) => [k, { ...v, include: e.target.checked && !groups.find((g) => g.requestId === k)?.existingFolio }])))} />
                    </th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Pedido(s)</th>
                    <th className="px-3 py-3">Bultos</th>
                    <th className="px-3 py-3 text-right">Piezas</th>
                    <th className="px-3 py-3">Subruta</th>
                    <th className="px-3 py-3">Destino</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {groups.map((g) => {
                    const r = rows[g.requestId];
                    if (!r) return null;
                    const res = resultFor(g.requestId);
                    const probs = problems(g);
                    const options = [g.recipient, ...(g.suggestions ?? [])].filter((x): x is Recipient => !!x);
                    const pcs = piecesOf(r);
                    const open = expanded === g.requestId;
                    return (
                      <Fragment key={g.requestId}>
                        <tr className={cn(!r.include && !res && "opacity-60", probs.length > 0 && "bg-red-50/50", res?.outcome === "REJECTED" && "bg-red-50")}>
                          <td className="px-4 py-3 align-top">
                            <input type="checkbox" aria-label={`Generar guía de ${r.clientName}`} checked={r.include} disabled={locked}
                              onChange={(e) => set(g.requestId, { include: e.target.checked })} />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <Input className="h-8 min-w-48 text-[13px] font-semibold" value={r.clientName} disabled={locked} maxLength={120} aria-label="Cliente"
                              onChange={(e) => set(g.requestId, { clientName: e.target.value })} />
                            {options.length > 0 ? (
                              <Select className="mt-1 h-8 text-[12px]" value={String(r.recipientId)} disabled={locked}
                                onChange={(e) => {
                                  const id = e.target.value === "new" ? "new" : Number(e.target.value);
                                  const rec = options.find((o) => o.id === id);
                                  set(g.requestId, { recipientId: id, subRoute: rec?.subRoute ?? r.subRoute, destination: rec?.destinationCode ?? r.destination });
                                }}>
                                <option value="new">Cliente nuevo (se da de alta)</option>
                                {options.map((o) => <option key={o.id} value={o.id}>{g.recipient?.id === o.id && g.matchType === "EXACT" ? "En catálogo: " : "Es: "}{o.fullName}{o.subRoute ? ` · ${o.subRoute}` : ""}</option>)}
                              </Select>
                            ) : <p className="mt-1 text-[12px] text-accent-700">Cliente nuevo: se dará de alta</p>}
                            <button type="button" className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700" onClick={() => setExpanded(open ? null : g.requestId)}>
                              <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} /> Dirección, ruta y notas
                            </button>
                          </td>
                          <td className="px-3 py-3 align-top"><Input className="h-8 w-36 font-mono text-[13px]" value={r.orders} disabled={locked} aria-label="Pedidos" onChange={(e) => set(g.requestId, { orders: e.target.value })} /></td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1">
                              {r.items.map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Input className="h-8 w-14 text-center text-[13px] font-bold" inputMode="numeric" value={it.qty} disabled={locked} aria-label={`Cantidad de ${it.type}`}
                                    onChange={(e) => set(g.requestId, { items: r.items.map((x, j) => (j === idx ? { ...x, qty: e.target.value.replace(/\D/g, "").slice(0, 4) } : x)) })} />
                                  <Input className="h-8 w-28 text-[13px]" value={it.type} disabled={locked} aria-label="Tipo de bulto"
                                    onChange={(e) => set(g.requestId, { items: r.items.map((x, j) => (j === idx ? { ...x, type: e.target.value } : x)) })} />
                                  {!locked && <button type="button" aria-label="Quitar tipo" className="text-red-600" onClick={() => set(g.requestId, { items: r.items.filter((_, j) => j !== idx) })}><Trash2 className="size-3.5" /></button>}
                                </div>
                              ))}
                              {!locked && <button type="button" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700" onClick={() => set(g.requestId, { items: [...r.items, { type: "Caja", qty: "" }] })}><Plus className="size-3.5" /> Tipo</button>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right align-top">
                            <span className="text-base font-bold text-ink">{pcs}</span>
                            {pcs !== g.packages && <p className="text-[11px] font-semibold text-accent-700">Archivo: {g.packages}</p>}
                          </td>
                          <td className="px-3 py-3 align-top"><Input className="h-8 w-24 font-mono text-[13px] uppercase" value={r.subRoute} disabled={locked} maxLength={20} aria-label="Subruta" onChange={(e) => set(g.requestId, { subRoute: e.target.value.toUpperCase() })} /></td>
                          <td className="px-3 py-3 align-top"><Input className="h-8 w-20 font-mono uppercase" value={r.destination || defaultDest} disabled={locked} maxLength={5} aria-label="Destino" onChange={(e) => set(g.requestId, { destination: plaza(e.target.value) })} /></td>
                          <td className="px-4 py-3 align-top text-[13px]">
                            {res ? (
                              <div>
                                <Badge tone={OUTCOME[res.outcome].tone} size="sm">{OUTCOME[res.outcome].label}</Badge>
                                {res.guideId && <Link href={`/guias/${res.guideId}`} className="mt-1 block font-semibold text-brand-700">{res.folio ? printedFolio(res.folio) : "Ver borrador"}</Link>}
                                {!res.guideId && res.folio && <span className="mt-1 block text-muted">{res.folio}</span>}
                                {res.message && res.outcome !== "EXCLUDED" && <p className="mt-1 text-muted">{res.message}</p>}
                                {res.warning && <p className="mt-1 text-accent-700">{res.warning}</p>}
                              </div>
                            ) : g.existingFolio ? (
                              <div>
                                <Badge tone="orange" size="sm">{g.duplicateOrders?.length ? "Pedido duplicado" : "Ya generada"}</Badge>
                                <Link href={`/guias/${g.existingGuideId}`} className="mt-1 block font-semibold text-brand-600">{printedFolio(g.existingFolio)}</Link>
                                {!!g.duplicateOrders?.length && r.include && (
                                  <label className="mt-1 flex items-center gap-1"><input type="checkbox" checked={r.allowDuplicate} disabled={locked} onChange={(e) => set(g.requestId, { allowDuplicate: e.target.checked })} /> Es otro envío</label>
                                )}
                              </div>
                            ) : probs.length > 0 ? (
                              <ul className="space-y-0.5 text-red-700">{probs.map((p) => <li key={p} className="flex gap-1"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{p}</li>)}</ul>
                            ) : r.include ? <span className="text-emerald-700">Lista</span> : <span className="text-muted">No se generará</span>}
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-canvas/50">
                            <td />
                            <td colSpan={7} className="px-3 pb-4">
                              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                                <Field label="Calle y número"><Input value={r.address.street ?? ""} disabled={locked} onChange={(e) => set(g.requestId, { address: { ...r.address, street: e.target.value } })} /></Field>
                                <Field label="Colonia"><Input value={r.address.neighborhood ?? ""} disabled={locked} onChange={(e) => set(g.requestId, { address: { ...r.address, neighborhood: e.target.value } })} /></Field>
                                <Field label="Ciudad"><Input value={r.address.city ?? ""} disabled={locked} onChange={(e) => set(g.requestId, { address: { ...r.address, city: e.target.value } })} /></Field>
                                <Field label="Estado"><Input value={r.address.state ?? ""} disabled={locked} onChange={(e) => set(g.requestId, { address: { ...r.address, state: e.target.value } })} /></Field>
                                <Field label="C.P."><Input value={r.address.zip ?? ""} maxLength={5} disabled={locked} onChange={(e) => set(g.requestId, { address: { ...r.address, zip: e.target.value.replace(/\D/g, "") } })} /></Field>
                                <Field label="Ruta del cliente" hint="Ruta del listado del remitente (no es la ruta de embarque)"><Input value={r.route} maxLength={20} disabled={locked} onChange={(e) => set(g.requestId, { route: e.target.value })} /></Field>
                                <Field label="Notas" className="sm:col-span-3"><Textarea rows={2} value={r.notes} disabled={locked} onChange={(e) => set(g.requestId, { notes: e.target.value })} /></Field>
                                <p className="text-[12px] text-muted sm:col-span-3">Dirección original: {g.addressText || "—"} · LPN: {g.packageLines.map((l) => `${l.lpn ?? "—"} (${l.type}${l.order ? ` / ${l.order}` : ""})`).join(", ")}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm">
              {result ? (
                <span className="font-semibold text-ink">Resultado: {result.created} creadas · {result.skipped} omitidas (ya existían o duplicadas) · {result.rejected} rechazadas · {result.excluded} no seleccionadas</span>
              ) : (
                <>
                  <p className="font-semibold text-ink">{selected.length} guías · {totalOrders} pedidos · {selectedPieces} piezas seleccionadas{excludedPieces ? ` · ${excludedPieces} piezas excluidas` : ""}</p>
                  <p className={cn("text-[13px]", declared != null && declared !== filePieces ? "font-semibold text-accent-700" : "text-muted")}>
                    {declared != null ? `Total declarado en el archivo: ${declared} · capturado en la tabla: ${filePieces}${declared !== filePieces ? ` (diferencia ${declared - filePieces})` : ""}` : `Total capturado: ${filePieces} piezas`}
                  </p>
                  {withProblems.length > 0 && <p className="font-semibold text-red-700">{withProblems.length} renglón(es) con datos por corregir.</p>}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {result && <ButtonLink href="/guias" variant="outline">Ver guías</ButtonLink>}
              {result && <Button variant="outline" onClick={() => { setPreview(null); setResult(null); }}>Importar otro archivo</Button>}
              {!result && (
                <Button size="lg" icon={<CircleCheck className="size-5" />} disabled={selected.length === 0 || withProblems.length > 0 || (routeChanged && !routeOverride?.reason.trim())}
                  onClick={() => setReviewOpen(true)}>
                  Revisar y generar {selected.length} guía{selected.length === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </Card>

          <Modal open={reviewOpen} onClose={() => !commit.isPending && setReviewOpen(false)} title="Confirmar importación" size="md"
            description="Revisa el resumen. Cada guía se genera por separado: si una falla, las demás continúan. Volver a confirmar el mismo archivo no duplica."
            footer={<>
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={commit.isPending} autoFocus>Volver</Button>
              <Button loading={commit.isPending} disabled={commit.isPending} icon={<CircleCheck className="size-4" />} onClick={() => commit.mutate()}>
                {confirm ? "Generar guías con folio" : "Generar borradores"}
              </Button>
            </>}>
            <ul className="space-y-1.5 text-sm">
              <li><b>{selected.length}</b> guías para <b>{selected.length}</b> clientes · <b>{totalOrders}</b> pedidos</li>
              <li><b>{selectedPieces}</b> piezas{declared != null ? <> de <b>{declared}</b> declaradas en el archivo</> : null}{excludedPieces ? <> · {excludedPieces} excluidas</> : null}</li>
              <li>Ruta de embarque: <b>{routeLabel ? routeLabel.name : "sin ruta (se asignará después)"}</b>{routeChanged ? ` · cambio: ${routeOverride?.reason}` : ""}</li>
              <li>{keepLpn ? "Se guardan los LPN de cada bulto." : "No se guardan los LPN."}</li>
              {groups.filter((g) => g.existingFolio && !rows[g.requestId]?.include).length > 0 && <li className="text-accent-700">{groups.filter((g) => g.existingFolio && !rows[g.requestId]?.include).length} clientes ya tienen guía y no se volverán a generar.</li>}
            </ul>
            <div className="mt-3"><InlineError message={commit.error ? errorMessage(commit.error) : null} /></div>
          </Modal>
        </>
      )}
    </div>
  );
}
