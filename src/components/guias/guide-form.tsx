"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown, CircleCheck, ClipboardCheck, FilePlus2, PackagePlus, Route, Save, Search, Trash2, UserPlus, UserRound, X,
} from "lucide-react";
import { InlineError } from "@/components/app/common";
import { RecipientEditor } from "@/components/destinatarios/recipient-editor";
import { GuidePrintButtons } from "@/components/guias/guide-print";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, errorMessage } from "@/lib/api/client";
import {
  useConcepts, useGuideServices, useInvalidateOperation, useRecipients, useSenders, useShifts, useShippingRoutes,
} from "@/lib/api/hooks";
import type { Address, DuplicateMatch, Guide, GuideRequest, Recipient } from "@/lib/api/types";
import { joinAddress, printedFolio, todayKey, uuid } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDebounced } from "@/hooks/use-debounced";
import { cn, routeForClient } from "@/lib/utils";

interface NewRcpt { firstName: string; lastName: string; phone: string; email: string; street: string; neighborhood: string; city: string; state: string; zip: string; references: string }
/** Renglón del carrito de bultos. La cantidad inicia VACÍA: nunca se asume 1. */
export interface CartLine { key: string; type: string; qty: string; detail: string; weight: string }

const EMPTY_RCPT: NewRcpt = { firstName: "", lastName: "", phone: "", email: "", street: "", neighborhood: "", city: "", state: "", zip: "", references: "" };
const SENDER_KEY = "salter.guia.remitente";
/** Tipos de bulto que maneja el cliente; se completan con los conceptos activos del catálogo. */
export const PACK_TYPES = ["Caja", "Sobre", "Atado", "Acumulador", "Tambo", "Tarima"];

const plaza = (v: string) => v.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase();
export const sameName = (a: string, b: string) => a.trim().localeCompare(b.trim(), "es", { sensitivity: "base" }) === 0;
export const qtyOf = (l: CartLine) => (/^\d+$/.test(l.qty) ? Number(l.qty) : 0);
export const piecesLabel = (n: number) => `${n} ${n === 1 ? "pieza" : "piezas"}`;

/** Fecha (YYYY-MM-DD) sumando días a hoy en la zona horaria del negocio. */
function addDaysKey(days: number): string {
  const [y, m, d] = todayKey().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function rcptFromDraft(draft: Guide): NewRcpt {
  const a = draft.recipient.address;
  const [first, ...rest] = draft.recipient.name.split(" ");
  return { firstName: first ?? "", lastName: rest.join(" "), phone: draft.recipient.phone ?? "", email: draft.recipient.email ?? "",
    street: a.street ?? "", neighborhood: a.neighborhood ?? "", city: a.city ?? "", state: a.state ?? "", zip: a.zip ?? "", references: a.references ?? "" };
}

export function cartFromDraft(draft?: Guide): CartLine[] {
  if (!draft?.items.length) return [];
  return draft.items.map((i) => ({ key: uuid(), type: i.description, qty: String(Math.trunc(i.quantity)), detail: i.detail ?? "",
    weight: i.weightKg != null ? String(i.weightKg) : "" }));
}

/**
 * Captura de guías: cliente → pedido(s) → carrito de bultos → revisión → confirmación explícita.
 * Enter NUNCA confirma: el folio sólo se genera con el botón «Confirmar y generar folio» de la pantalla de revisión.
 */
export function GuideForm({ draft }: { draft?: Guide }) {
  const { me, can } = useSession();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const restricted = !can("SENDERS_VIEW");
  const pickSender = !restricted && !me?.sender;
  const senders = useSenders({ active: true });
  const shifts = useShifts();
  const concepts = useConcepts();
  const services = useGuideServices();
  const routes = useShippingRoutes(true);
  const canConfirm = can("GUIDES_CONFIRM");
  const canReroute = can("ROUTES_REASSIGN");

  const [chosenSender, setSenderId] = useState<number | undefined>(draft?.senderId);
  const [chosenShift, setShiftId] = useState<string | null>(draft ? (draft.shift ? String(draft.shift.id) : "") : null);
  const [requestId, setRequestId] = useState(uuid);
  const draftRecipient = useQuery({
    queryKey: ["recipients", "draft", draft?.recipientId],
    queryFn: () => api.get<Recipient>(`/recipients/${draft!.recipientId}`),
    enabled: !!draft && !draft.recipientOneTime && !!draft.recipientId,
  });
  const [chosenRecipient, setRecipient] = useState<Recipient | null | undefined>(undefined);
  const recipient = chosenRecipient === undefined ? (draftRecipient.data ?? null) : chosenRecipient;
  const [mode, setMode] = useState<"search" | "new">(draft && draft.recipientOneTime ? "new" : "search");
  const [rcpt, setRcpt] = useState<NewRcpt>(() => (draft && (draft.recipientOneTime || !draft.recipientId) ? rcptFromDraft(draft) : EMPTY_RCPT));
  const [adding, setAdding] = useState<string | null>(null);
  const [allowProbable, setAllowProbable] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const [dupOrder, setDupOrder] = useState<{ message: string; guides: { id: number; reference: string; recipient: string; status: string }[] } | null>(null);
  const [allowDupOrder, setAllowDupOrder] = useState(false);
  const [cd, setCd] = useState(draft?.cdReference ?? "");
  const [subRoute, setSubRoute] = useState(draft?.subRoute ?? "");
  const [order, setOrder] = useState(draft?.orderReference ?? "");
  const [cart, setCart] = useState<CartLine[]>(() => cartFromDraft(draft));
  const [weightNA, setWeightNA] = useState(draft?.shipping?.weightNotApplicable ?? false);
  const [dimsNA, setDimsNA] = useState(draft?.shipping?.dimensionsNotApplicable ?? false);
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [moreOpen, setMoreOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(draft?.shipping?.originCode ?? null);
  const [destination, setDestination] = useState(draft?.shipping?.destinationCode ?? "");
  const [dimensions, setDimensions] = useState(draft?.shipping?.dimensions ?? "");
  const [service, setService] = useState(draft?.shipping?.serviceType ?? "");
  const [commitment, setCommitment] = useState(draft?.shipping?.commitmentDate ?? "");
  // Ruta de embarque: la predeterminada del remitente salvo cambio autorizado y con motivo.
  const [routeOverride, setRouteOverride] = useState<{ id: number; reason: string } | null>(
    draft?.shippingRoute ? { id: draft.shippingRoute.id, reason: "" } : null);
  const [routeDialog, setRouteDialog] = useState<{ id: number; reason: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState<Guide | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const defaultSender = useMemo(() => {
    const list = senders.data?.content ?? [];
    if (!list.length) return undefined;
    const saved = typeof window !== "undefined" ? Number(window.localStorage.getItem(SENDER_KEY)) : NaN;
    return (list.find((x) => x.id === saved) ?? list[0]).id;
  }, [senders.data]);
  const senderId = chosenSender ?? me?.sender?.id ?? (restricted ? undefined : defaultSender);
  const currentSender = senders.data?.content.find((s) => s.id === senderId);
  const defaultRoute = currentSender?.defaultShippingRoute;
  // Sin predeterminada, el backend asigna la ruta de embarque con la RUTA del cliente (ej. 74).
  const clientRoute = !defaultRoute ? routeForClient(routes.data, recipient?.route) : undefined;
  const routeId = routeOverride?.id ?? defaultRoute?.id ?? clientRoute?.id;
  const routeName = routes.data?.find((r) => r.id === routeId);
  const routeChanged = !!routeOverride && !!defaultRoute && routeOverride.id !== defaultRoute.id;
  const originCode = origin ?? currentSender?.plazaCode ?? "";
  const serviceCode = service || services.data?.[0]?.code || "ORDINARIO";
  const serviceDays = services.data?.find((s) => s.code === serviceCode)?.days ?? 1;
  const shiftId = chosenShift ?? String(shifts.data?.find((x) => x.current)?.id ?? "");
  const packTypes = useMemo(() => {
    const fromCatalog = (concepts.data ?? []).filter((c) => c.active).map((c) => c.name);
    const all = [...PACK_TYPES];
    for (const n of [...fromCatalog, ...cart.map((l) => l.type)]) if (n && !all.some((t) => sameName(t, n))) all.push(n);
    return all;
  }, [concepts.data, cart]);
  const conceptFor = (name: string) => concepts.data?.find((c) => c.active && sameName(c.name, name));
  // Totales: piezas = suma de cantidades; partidas = renglones con tipo. Nunca se mezclan con pedidos ni guías.
  const pieces = cart.reduce((s, l) => s + qtyOf(l), 0);
  const orders = order.split(/[^A-Za-z0-9-]+/).filter((o) => o.length >= 3);
  const totalWeight = weightNA ? null : cart.reduce((s, l) => s + (Number(l.weight) || 0), 0);

  const mutation = useMutation({
    mutationFn: async ({ confirm, allowDup }: { confirm: boolean; allowDup: boolean }) => {
      const body = { ...buildBody(confirm), allowDuplicateOrder: allowDup };
      return draft ? api.put<Guide>(`/guides/${draft.id}`, { ...body, version: draft.version }) : api.post<Guide>("/guides", body);
    },
    onSuccess: async (g) => {
      if (senderId && pickSender) localStorage.setItem(SENDER_KEY, String(senderId));
      await invalidate();
      setReviewing(false);
      toast.success(g.folio ? `Guía ${printedFolio(g.folio)} confirmada` : "Borrador guardado",
        g.folio ? (g.manifest ? `Agregada al manifiesto ${g.manifest.number}.` : "El folio quedó asignado.") : "Puedes confirmarlo después.");
      if (draft) router.push(`/guias/${g.id}`);
      else setDone(g);
    },
    onError: (e) => {
      setReviewing(false);
      if (e instanceof ApiError && e.code === "DUPLICATE_ORDER") {
        setDupOrder({ message: e.message, guides: (e.data.guides as { id: number; reference: string; recipient: string; status: string }[]) ?? [] });
        return;
      }
      if (e instanceof ApiError && (e.code === "RECIPIENT_DUPLICATE" || e.code === "RECIPIENT_PROBABLE_DUPLICATE")) {
        setMatches((e.data.matches as DuplicateMatch[]) ?? []);
      }
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      setServerError(errorMessage(e));
    },
  });

  function buildBody(confirm: boolean): GuideRequest {
    const address: Address = { street: rcpt.street, neighborhood: rcpt.neighborhood, city: rcpt.city, state: rcpt.state, zip: rcpt.zip, references: rcpt.references };
    return {
      clientRequestId: draft ? undefined : requestId,
      senderId,
      shiftId: shiftId ? Number(shiftId) : undefined,
      recipientId: mode === "search" ? recipient?.id : undefined,
      newRecipient: mode === "new" ? { firstName: rcpt.firstName, lastName: rcpt.lastName, phone: rcpt.phone, email: rcpt.email, address, saveToCatalog: false, allowProbableDuplicate: allowProbable } : undefined,
      cdReference: cd || undefined, orderReference: order.trim() || undefined, subRoute: subRoute || undefined, notes,
      shippingRouteId: routeOverride ? routeOverride.id : undefined,
      routeChangeReason: routeChanged ? routeOverride?.reason : undefined,
      shipping: {
        originCode: originCode || undefined, destinationCode: destination || undefined,
        dimensions: dimsNA ? undefined : dimensions || undefined, dimensionsNotApplicable: dimsNA, weightNotApplicable: weightNA,
        serviceType: serviceCode, commitmentDate: commitment || undefined,
      },
      items: cart.filter((l) => l.type.trim() && qtyOf(l) > 0).map((l) => {
        const c = conceptFor(l.type);
        return {
          conceptId: c?.id, description: c ? undefined : l.type.trim(), quantity: qtyOf(l), unit: c ? undefined : "PIEZA",
          detail: l.detail.trim() || undefined, weightKg: !weightNA && l.weight ? Number(l.weight) : undefined,
        };
      }),
      confirm,
    };
  }

  function validate(confirm: boolean): boolean {
    const e: Record<string, string> = {};
    if (!senderId) e.sender = pickSender ? "Selecciona el remitente." : "Tu usuario no tiene remitente asignado. Pide al administrador que lo asigne.";
    if (mode === "search" && !recipient) e.recipient = "Escribe el nombre del cliente y elígelo de la lista, o agrégalo.";
    if (mode === "new") {
      if (!rcpt.firstName.trim()) e.firstName = "Escribe el nombre.";
      if (rcpt.zip && !/^\d{5}$/.test(rcpt.zip)) e.zip = "5 dígitos.";
      if (confirm && !rcpt.street.trim()) e.street = "Necesaria para confirmar.";
      if (confirm && !rcpt.city.trim()) e.city = "Necesaria para confirmar.";
    }
    const badLine = cart.find((l) => !l.type.trim() || !/^\d+$/.test(l.qty) || Number(l.qty) < 1);
    if (badLine) e.cart = !badLine.type.trim() ? "Elige el tipo de bulto de cada renglón." : "Escribe la cantidad de cada renglón (número entero, mínimo 1).";
    else if (confirm && pieces < 1) e.cart = "Agrega al menos un bulto con su cantidad.";
    if (cart.some((l) => l.weight && !(Number(l.weight) >= 0))) e.cart = "El peso debe ser un número.";
    if (originCode && originCode.length < 2) e.origin = "2 a 5 letras.";
    if (destination && destination.length < 2) e.destination = "2 a 5 letras.";
    if (confirm && !destination) e.destination = "Necesaria para confirmar.";
    if (routeChanged && !routeOverride?.reason.trim()) e.route = "Indica el motivo del cambio de ruta.";
    setErrors(e);
    if (e.origin || e.destination) setMoreOpen(true);
    return Object.keys(e).length === 0;
  }

  function openReview() {
    setServerError(null);
    if (!validate(true)) return;
    setVerified(false);
    setReviewing(true);
  }

  function saveDraft() {
    setServerError(null);
    if (mutation.isPending || !validate(false)) return;
    mutation.mutate({ confirm: false, allowDup: allowDupOrder });
  }

  function confirmFromReview() {
    if (mutation.isPending || !verified) return; // evita doble envío; el clientRequestId protege además en el servidor
    mutation.mutate({ confirm: true, allowDup: allowDupOrder });
  }

  function chooseRecipient(r: Recipient) {
    setRecipient(r);
    setMode("search");
    setErrors((e) => ({ ...e, recipient: "", destination: "" }));
    setDestination(r.destinationCode ?? "");
    setSubRoute(r.subRoute ?? "");
    if (!r.destinationCode) setMoreOpen(true);
    setTimeout(() => orderRef.current?.focus(), 30);
  }

  /** Agrega un renglón del tipo elegido (o enfoca el existente) con la cantidad VACÍA. */
  function addLine(type: string) {
    setErrors((e) => ({ ...e, cart: "" }));
    const existing = cart.find((l) => sameName(l.type, type));
    if (existing) {
      setTimeout(() => qtyRefs.current[existing.key]?.focus(), 20);
      return;
    }
    const line: CartLine = { key: uuid(), type, qty: "", detail: "", weight: "" };
    setCart((c) => [...c, line]);
    setTimeout(() => qtyRefs.current[line.key]?.focus(), 30);
  }
  const updateLine = (key: string, patch: Partial<CartLine>) => setCart((c) => c.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setCart((c) => c.filter((l) => l.key !== key));

  function reset() {
    setDone(null);
    setRequestId(uuid());
    setRecipient(null);
    setMode("search");
    setRcpt(EMPTY_RCPT);
    setAllowProbable(false);
    setMatches(null);
    setDupOrder(null);
    setAllowDupOrder(false);
    setOrder("");
    setCd("");
    setSubRoute("");
    setDestination("");
    setCart([]);
    setWeightNA(false);
    setDimsNA(false);
    setNotes("");
    setDimensions("");
    setCommitment("");
    setRouteOverride(null);
    setMoreOpen(false);
    setErrors({});
    setServerError(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CircleCheck className="size-8" /></div>
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">{done.folio ? "Guía confirmada" : "Borrador guardado"}</h2>
        <p className="mt-2 font-mono text-3xl font-bold text-brand-700">{done.folio ? printedFolio(done.folio) : done.reference}</p>
        {done.shipping?.destinationCode && (
          <p className="mt-1 text-lg font-semibold text-ink">{done.shipping.originCode ?? "—"} → {done.shipping.destinationCode}{done.subRoute ? ` · ${done.subRoute}` : ""}</p>
        )}
        <p className="mt-2 text-muted">{done.recipient.name} · {piecesLabel(done.packageCount ?? 0)}</p>
        {done.manifest && <p className="mt-1 text-sm text-muted">Manifiesto en preparación: <b className="text-ink">{done.manifest.number}</b>{done.manifest.shippingRoute ? ` · ruta ${done.manifest.shippingRoute.name}` : ""}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} icon={<FilePlus2 className="size-4" />} autoFocus>Nueva guía</Button>
          <Button variant="outline" onClick={() => router.push(`/guias/${done.id}`)}>Ver guía</Button>
        </div>
        {done.folio && <div className="mt-4 flex justify-center"><GuidePrintButtons guide={done} /></div>}
      </Card>
    );
  }

  const canAdd = can("RECIPIENTS_MANAGE") && !!senderId;
  // Enter en un campo de texto no envía ni confirma nada (sólo en áreas de texto agrega renglón).
  const blockEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
  };

  return (
    <form className="grid gap-5 xl:grid-cols-[1fr_340px]" onSubmit={(e) => e.preventDefault()} onKeyDown={blockEnter} noValidate>
      <div className="space-y-5">
        <Card className="space-y-5 p-5 sm:p-6">
          {pickSender && (
            <Field label="Remitente" error={errors.sender} required hint="Sólo en punto de venta: los usuarios con remitente asignado no ven este campo.">
              <Select value={senderId ?? ""} onChange={(e) => { setSenderId(Number(e.target.value)); setRecipient(null); setRouteOverride(null); }}>
                {senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          )}
          {!pickSender && errors.sender && <InlineError message={errors.sender} />}

          {/* 1. Cliente */}
          {mode === "search" ? (
            recipient ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-ink-soft">Nombre del cliente</p>
                <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                  <UserRound className="mt-0.5 size-5 text-brand-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{recipient.clientCode && <span className="mr-2 font-mono text-sm font-semibold text-muted">#{recipient.clientCode}</span>}{recipient.fullName}</p>
                    {recipient.subRoute && <p className="mt-1 text-sm font-semibold text-brand-700">Subruta {recipient.subRoute} · Destino {recipient.destinationCode}</p>}
                    <p className="text-sm text-ink-soft">{joinAddress(recipient.address) || "Sin dirección registrada"}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setRecipient(null); setDestination(""); setSubRoute(""); setTimeout(() => searchRef.current?.focus(), 30); }} icon={<X className="size-4" />}>Cambiar</Button>
                </div>
              </div>
            ) : (
              <RecipientSearch inputRef={searchRef} senderId={senderId} error={errors.recipient} canAdd={canAdd}
                onSelect={chooseRecipient} onAdd={(text) => setAdding(text)} />
            )
          ) : (
            <OneTimeRecipient rcpt={rcpt} setRcpt={setRcpt} errors={errors} />
          )}
          {matches && matches.length > 0 && (
            <div className="rounded-2xl border border-accent-100 bg-accent-50 p-3 text-sm">
              <p className="font-bold text-accent-700">Coincidencias en el catálogo</p>
              <ul className="mt-1 space-y-1 text-ink-soft">
                {matches.map((m, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{m.name} — {m.reason} ({m.level === "EXACT" ? "duplicado" : "posible"})</span>
                    {m.recipientId && (
                      <Button size="sm" variant="outline" onClick={() => { void api.get<Recipient>(`/recipients/${m.recipientId}`).then((r) => { chooseRecipient(r); setMatches(null); setServerError(null); }); }}>Usar este</Button>
                    )}
                  </li>
                ))}
              </ul>
              {!matches.some((m) => m.level === "EXACT") && (
                <label className="mt-2 flex items-center gap-2 font-semibold text-ink"><input type="checkbox" checked={allowProbable} onChange={(e) => setAllowProbable(e.target.checked)} /> Es una persona distinta; guardar de todas formas</label>
              )}
            </div>
          )}

          {/* 2. Pedido(s) */}
          <Field label="Número de pedido" hint="Si son varios, sepáralos con coma (ej. 4501, 4502)">
            <Input ref={orderRef} value={order} maxLength={80} placeholder="Ej. 4501"
              onChange={(e) => { setOrder(e.target.value); setDupOrder(null); setAllowDupOrder(false); }} />
          </Field>

          {dupOrder && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm" role="alert">
              <p className="font-bold text-red-700">Posible guía duplicada</p>
              <p className="mt-1 text-ink-soft">{dupOrder.message}</p>
              <ul className="mt-2 space-y-1">
                {dupOrder.guides.map((g) => (
                  <li key={g.id}><Link href={`/guias/${g.id}`} target="_blank" className="font-semibold text-brand-700 underline">{g.reference}</Link> · {g.recipient} · {g.status}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setDupOrder(null); setTimeout(() => orderRef.current?.focus(), 30); }}>Corregir el pedido</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAllowDupOrder(true); setDupOrder(null); setServerError(null); }}>
                  Es otro envío: permitir y volver a revisar
                </Button>
              </div>
            </div>
          )}

          {/* 3. Carrito de bultos */}
          <PackageCart cart={cart} packTypes={packTypes} weightNA={weightNA} error={errors.cart} qtyRefs={qtyRefs}
            onAdd={addLine} onUpdate={updateLine} onRemove={removeLine} pieces={pieces} />
        </Card>

        {/* Ruta de embarque */}
        <Card className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-base font-bold text-ink"><Route className="size-5 text-brand-600" /> Ruta de embarque</p>
              <p className="text-[13px] text-muted">Organiza el manifiesto de salida. Al confirmar, la guía se agrega sola al manifiesto en preparación de esta ruta.</p>
            </div>
            {routeName ? <Badge tone={routeChanged ? "orange" : "blue"}>{routeName.code} · {routeName.name}{routeChanged ? " (cambiada)" : ""}</Badge>
              : <Badge tone="slate">Sin ruta asignada</Badge>}
          </div>
          {defaultRoute && <p className="text-[13px] text-muted">Predeterminada del remitente: <b className="text-ink">{defaultRoute.name}</b></p>}
          {!defaultRoute && !routeOverride && clientRoute && <p className="text-[13px] text-muted">Asignada por la ruta del cliente: <b className="text-ink">{clientRoute.code}</b></p>}
          {canReroute ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Cambiar ruta" className="min-w-56 flex-1" error={errors.route}>
                <Select value={routeId ?? ""} onChange={(e) => {
                  const id = Number(e.target.value);
                  if (!id) return;
                  if (defaultRoute && id === defaultRoute.id) { setRouteOverride(null); return; }
                  if (!defaultRoute) { setRouteOverride({ id, reason: "" }); return; }
                  setRouteDialog({ id, reason: "" });
                }}>
                  <option value="" disabled>Selecciona…</option>
                  {routes.data?.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
                </Select>
              </Field>
              {routeChanged && <Button variant="ghost" size="sm" onClick={() => setRouteOverride(null)}>Volver a la predeterminada</Button>}
            </div>
          ) : !defaultRoute ? (
            <p className="text-[13px] text-accent-700">El remitente no tiene ruta predeterminada: la guía quedará disponible para que Operaciones la asigne.</p>
          ) : null}
          {routeChanged && routeOverride?.reason && <p className="rounded-xl bg-accent-50 px-3 py-2 text-[13px] text-accent-700">Motivo del cambio: {routeOverride.reason}</p>}
        </Card>

        {/* Más datos */}
        <Card className="p-0">
          <button type="button" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}
            className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left sm:px-6">
            <span>
              <span className="block text-base font-bold text-ink">Datos de la guía <span className="font-normal text-muted">(se llenan solos)</span></span>
              <span className="block text-[13px] text-muted">
                {originCode || "—"} → {destination || "—"} · {serviceCode}{subRoute ? ` · Subruta ${subRoute}` : ""}
                {" · Peso "}{weightNA ? "no aplica" : totalWeight ? `${totalWeight} kg` : "—"}{" · Dim. "}{dimsNA ? "no aplica" : dimensions || "—"}
              </span>
            </span>
            <ChevronDown className={cn("size-5 text-muted transition", moreOpen && "rotate-180")} aria-hidden />
          </button>
          {moreOpen && (
            <div className="space-y-4 border-t border-line-soft px-5 pb-5 pt-4 sm:px-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <Field label="Plaza de origen" error={errors.origin} hint={currentSender?.plazaCode ? `Del remitente: ${currentSender.plazaCode}` : "Ej. PBA"}>
                  <Input value={originCode} maxLength={5} placeholder="PBA" className="font-mono text-lg uppercase" onChange={(e) => setOrigin(plaza(e.target.value))} />
                </Field>
                <span className="hidden pb-3 text-2xl text-brand-400 sm:block" aria-hidden>→</span>
                <Field label="Plaza de destino" error={errors.destination} required hint="Sale de la subruta del cliente (ej. OAX)">
                  <Input value={destination} maxLength={5} placeholder="OAX" className="font-mono text-lg uppercase" onChange={(e) => setDestination(plaza(e.target.value))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Subruta" hint="Código del cliente (ej. CVA-01). Se imprime junto a las piezas">
                  <Input value={subRoute} placeholder="CVA-01" maxLength={20} className="font-mono uppercase" onChange={(e) => setSubRoute(e.target.value.toUpperCase())} />
                </Field>
                <Field label="Referencia CD" hint="Documento de origen (opcional). No es la subruta">
                  <Input value={cd} maxLength={80} onChange={(e) => setCd(e.target.value)} />
                </Field>
                <Field label="Servicio">
                  <Select value={serviceCode} onChange={(e) => { setService(e.target.value); setCommitment(""); }}>
                    {(services.data ?? [{ code: "ORDINARIO", days: 1 }]).map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </Select>
                </Field>
                <Field label="Fecha compromiso" hint={commitment ? "Capturada manualmente" : `Automática: ${serviceDays === 0 ? "mismo día" : `+${serviceDays} día(s)`}`}>
                  <Input type="date" value={commitment || addDaysKey(serviceDays)} min={todayKey()} onChange={(e) => setCommitment(e.target.value)} />
                </Field>
                <div className="space-y-2">
                  <Field label="Dimensiones (cm)" hint="Largo x ancho x alto">
                    <Input value={dimsNA ? "" : dimensions} disabled={dimsNA} placeholder={dimsNA ? "NO APLICA" : "30 x 20 x 15"} onChange={(e) => setDimensions(e.target.value)} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><input type="checkbox" checked={dimsNA} onChange={(e) => setDimsNA(e.target.checked)} /> No aplica</label>
                </div>
                <div className="space-y-2">
                  <Field label="Peso total (kg)" hint={weightNA ? "Se imprimirá NO APLICA" : "Suma del peso de los renglones"}>
                    <Input value={weightNA ? "" : totalWeight ? String(totalWeight) : ""} readOnly disabled placeholder={weightNA ? "NO APLICA" : "Captúralo en cada renglón"} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><input type="checkbox" checked={weightNA} onChange={(e) => setWeightNA(e.target.checked)} /> No aplica</label>
                </div>
                <Field label="Turno">
                  <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                    <option value="">Automático</option>
                    {shifts.data?.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}{s.current ? " (actual)" : ""}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Observaciones"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <Card className="space-y-3 p-5">
          <div className="rounded-2xl bg-canvas p-4 text-center">
            <p className="text-[12px] font-bold uppercase tracking-wider text-subtle">Total de la guía</p>
            <p className="font-display text-4xl font-bold text-ink" aria-live="polite">{pieces}</p>
            <p className="text-sm text-muted">{pieces === 1 ? "pieza" : "piezas"} · {cart.length} {cart.length === 1 ? "tipo de bulto" : "tipos de bulto"} · {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}</p>
          </div>
          <InlineError message={serverError} />
          {canConfirm && (
            <Button size="lg" className="w-full" icon={<ClipboardCheck className="size-5" />} onClick={openReview} disabled={mutation.isPending}>
              Revisar y confirmar
            </Button>
          )}
          <Button variant={canConfirm ? "outline" : "primary"} size="lg" className="w-full" loading={mutation.isPending && mutation.variables?.confirm === false}
            icon={<Save className="size-5" />} onClick={saveDraft}>
            Guardar borrador
          </Button>
          {!canConfirm && <p className="text-[13px] text-muted">Tu usuario no confirma guías: el administrador las revisará y confirmará.</p>}
          <p className="text-[12px] text-subtle">La tecla Enter no confirma: el folio sólo se genera desde la pantalla de revisión.</p>
          {draft && <Link href={`/guias/${draft.id}`} className="block text-center text-sm font-semibold text-brand-600">Cancelar edición</Link>}
        </Card>
      </div>

      {/* Revisión final antes de generar el folio */}
      <Modal open={reviewing} onClose={() => !mutation.isPending && setReviewing(false)} size="lg" icon={<ClipboardCheck className="size-5 text-brand-600" />}
        title="Revisa la guía antes de confirmar" description="Verifica cliente, pedidos, bultos y piezas. Al confirmar se genera el folio definitivo."
        footer={
          <>
            <Button variant="outline" onClick={() => setReviewing(false)} disabled={mutation.isPending} autoFocus>Volver a editar</Button>
            <Button icon={<CircleCheck className="size-4" />} loading={mutation.isPending} disabled={!verified || mutation.isPending} onClick={confirmFromReview}>
              Confirmar y generar folio
            </Button>
          </>
        }>
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="Cliente">{mode === "search" ? recipient?.fullName : `${rcpt.firstName} ${rcpt.lastName}`.trim()}</ReviewItem>
            <ReviewItem label="Ruta">{originCode || "—"} → {destination || "—"}{subRoute ? ` · Subruta ${subRoute}` : ""}</ReviewItem>
            <ReviewItem label={`Pedidos (${orders.length})`}>{orders.length ? orders.join(", ") : "Sin número de pedido"}</ReviewItem>
            <ReviewItem label="Ruta de embarque">{routeName ? `${routeName.code} · ${routeName.name}${routeChanged ? " (cambiada)" : ""}` : "Sin ruta"}</ReviewItem>
            <ReviewItem label="Peso">{weightNA ? "NO APLICA" : totalWeight ? `${totalWeight} kg` : "—"}</ReviewItem>
            <ReviewItem label="Dimensiones">{dimsNA ? "NO APLICA" : dimensions || "—"}</ReviewItem>
          </div>
          <table className="w-full text-left">
            <thead><tr className="border-b border-line text-[12px] uppercase tracking-wider text-subtle"><th className="py-2">Tipo de bulto</th><th className="py-2">Descripción</th><th className="py-2 text-right">Cantidad</th></tr></thead>
            <tbody className="divide-y divide-line-soft">
              {cart.map((l) => <tr key={l.key}><td className="py-2 font-semibold text-ink">{l.type}</td><td className="py-2 text-muted">{l.detail || "—"}</td><td className="py-2 text-right font-bold">{qtyOf(l)}</td></tr>)}
            </tbody>
            <tfoot><tr className="border-t-2 border-line"><td className="py-2 font-bold" colSpan={2}>Total</td><td className="py-2 text-right text-lg font-bold text-brand-700">{piecesLabel(pieces)}</td></tr></tfoot>
          </table>
          {allowDupOrder && <p className="rounded-xl bg-accent-50 px-3 py-2 text-accent-700">Se generará aunque el pedido ya esté en otra guía (lo indicaste como otro envío).</p>}
          <label className="flex items-start gap-2 rounded-xl border border-line p-3 font-semibold text-ink">
            <input type="checkbox" className="mt-1" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            Verifiqué que el cliente, los pedidos, los bultos y las {piecesLabel(pieces)} son correctos.
          </label>
        </div>
      </Modal>

      <Modal open={!!routeDialog} onClose={() => setRouteDialog(null)} size="sm" icon={<Route className="size-5 text-accent-600" />}
        title="¿Cambiar la ruta de embarque?"
        description={`La ruta predeterminada del remitente es ${defaultRoute?.name ?? "—"}. El cambio queda registrado con tu nombre, la fecha y el motivo.`}
        footer={<>
          <Button variant="outline" onClick={() => setRouteDialog(null)}>Cancelar</Button>
          <Button disabled={!routeDialog?.reason.trim()} onClick={() => { if (routeDialog) setRouteOverride(routeDialog); setRouteDialog(null); setErrors((e) => ({ ...e, route: "" })); }}>Cambiar ruta</Button>
        </>}>
        <Field label="Motivo del cambio" required>
          <Textarea rows={2} value={routeDialog?.reason ?? ""} onChange={(e) => setRouteDialog((d) => (d ? { ...d, reason: e.target.value } : d))} />
        </Field>
      </Modal>

      {adding !== null && (
        <RecipientEditor modal recipient={null} senderId={senderId} initialName={adding}
          onClose={() => { setAdding(null); setTimeout(() => searchRef.current?.focus(), 30); }}
          onSaved={(r) => { setAdding(null); chooseRecipient(r); }} />
      )}
    </form>
  );
}

function ReviewItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-subtle">{label}</p>
      <p className="font-semibold text-ink">{children || "—"}</p>
    </div>
  );
}

/** Carrito de bultos: varios tipos en una misma guía; agregar, editar o quitar renglones antes de confirmar. */
export function PackageCart({ cart, packTypes, weightNA, error, qtyRefs, onAdd, onUpdate, onRemove, pieces }: {
  cart: CartLine[]; packTypes: string[]; weightNA: boolean; error?: string; pieces: number;
  qtyRefs: React.RefObject<Record<string, HTMLInputElement | null>>;
  onAdd: (type: string) => void; onUpdate: (key: string, patch: Partial<CartLine>) => void; onRemove: (key: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink-soft">Bultos<span className="ml-0.5 text-accent-600" aria-hidden>*</span> <span className="font-normal text-muted">· agrega cada tipo y escribe su cantidad</span></p>
        <p className="text-sm font-bold text-brand-700">{piecesLabel(pieces)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Agregar tipo de bulto">
        {packTypes.map((t) => {
          const on = cart.some((l) => sameName(l.type, t));
          return (
            <button key={t} type="button" onClick={() => onAdd(t)}
              className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
                on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-soft hover:border-brand-400 hover:text-brand-700")}>
              <PackagePlus className="size-4" aria-hidden />{t}
            </button>
          );
        })}
      </div>
      {cart.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">Aún no hay bultos. Toca un tipo para agregarlo.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-canvas text-[12px] font-bold uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2">Tipo</th><th className="px-3 py-2 w-28">Cantidad</th><th className="px-3 py-2">Descripción (opcional)</th>{!weightNA && <th className="px-3 py-2 w-28">Peso kg</th>}<th className="w-10" /></tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {cart.map((l) => (
                <tr key={l.key}>
                  <td className="px-3 py-2">
                    <Select className="h-9" value={l.type} aria-label="Tipo de bulto" onChange={(e) => onUpdate(l.key, { type: e.target.value })}>
                      {packTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input ref={(el) => { qtyRefs.current[l.key] = el; }} inputMode="numeric" value={l.qty} placeholder="—" aria-label={`Cantidad de ${l.type}`}
                      className="h-9 text-center text-base font-bold" onChange={(e) => onUpdate(l.key, { qty: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                  </td>
                  <td className="px-3 py-2"><Input className="h-9" value={l.detail} maxLength={300} aria-label="Descripción" onChange={(e) => onUpdate(l.key, { detail: e.target.value })} /></td>
                  {!weightNA && (
                    <td className="px-3 py-2"><Input className="h-9" inputMode="decimal" value={l.weight} aria-label="Peso en kg" onChange={(e) => onUpdate(l.key, { weight: e.target.value.replace(/[^\d.]/g, "") })} /></td>
                  )}
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-600" aria-label={`Quitar ${l.type}`} onClick={() => onRemove(l.key)} icon={<Trash2 className="size-4" />} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-canvas/60"><td className="px-3 py-2 font-bold">Total</td><td className="px-3 py-2 text-center text-base font-bold text-brand-700">{pieces}</td><td className="px-3 py-2 text-muted" colSpan={weightNA ? 2 : 3}>{piecesLabel(pieces)} en esta guía</td></tr>
            </tfoot>
          </table>
        </div>
      )}
      {error && <p className="mt-1.5 text-[13px] font-semibold text-red-600" role="alert">{error}</p>}
    </div>
  );
}

/** Destinatario capturado sólo para una guía (borradores hechos antes del alta en ventana). */
function OneTimeRecipient({ rcpt, setRcpt, errors }: { rcpt: NewRcpt; setRcpt: (r: NewRcpt) => void; errors: Record<string, string> }) {
  const set = (k: keyof NewRcpt) => (e: React.ChangeEvent<HTMLInputElement>) => setRcpt({ ...rcpt, [k]: e.target.value });
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-soft">Cliente (sólo para esta guía)</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre(s)" error={errors.firstName} required><Input value={rcpt.firstName} onChange={set("firstName")} /></Field>
        <Field label="Apellidos"><Input value={rcpt.lastName} onChange={set("lastName")} /></Field>
        <Field label="Calle y número" error={errors.street} className="sm:col-span-2"><Input value={rcpt.street} onChange={set("street")} /></Field>
        <Field label="Ciudad / municipio" error={errors.city}><Input value={rcpt.city} onChange={set("city")} /></Field>
        <Field label="C.P." error={errors.zip}><Input inputMode="numeric" maxLength={5} value={rcpt.zip} onChange={(e) => setRcpt({ ...rcpt, zip: e.target.value.replace(/\D/g, "") })} /></Field>
      </div>
    </div>
  );
}

function RecipientSearch({ senderId, onSelect, onAdd, canAdd, error, inputRef }: {
  senderId?: number; onSelect: (r: Recipient) => void; onAdd: (text: string) => void; canAdd: boolean; error?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim());
  const { data, isFetching } = useRecipients({ senderId, q: dq, size: 8 }, !!senderId && dq.length >= 2);
  const results = useMemo(() => (dq.length >= 2 ? data?.content ?? [] : []), [data, dq]);

  return (
    <div>
      <div className="flex items-start gap-2">
        <Field label="Nombre del cliente" error={error} required className="flex-1" hint={error ? undefined : "Escribe las primeras letras o el número de cliente y elige de la lista"}>
          <Input ref={inputRef} autoFocus value={q} icon={<Search className="size-4" />} placeholder="Ej. camacho, jorges, 11081…" autoComplete="off"
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, canAdd ? results.length : results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") {
                // Enter sólo elige al cliente resaltado; nunca envía la guía.
                e.preventDefault();
                if (results[active]) onSelect(results[active]);
                else if (q.trim() && canAdd) onAdd(q);
              }
            }}
            role="combobox" aria-expanded={results.length > 0} aria-controls="rcpt-results" aria-autocomplete="list" />
        </Field>
        {canAdd && (
          <Button variant="soft" className="mt-[26px] shrink-0" icon={<UserPlus className="size-4" />} onClick={() => onAdd(q)}>Agregar</Button>
        )}
      </div>
      {dq.length >= 2 && (
        <ul id="rcpt-results" role="listbox" className="mt-2 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line">
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => onSelect(r)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left", i === active ? "bg-brand-50" : "hover:bg-canvas")}>
                <UserRound className="mt-0.5 size-4 text-brand-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{r.clientCode && <span className="mr-1.5 font-mono text-[13px] font-normal text-muted">#{r.clientCode}</span>}{r.fullName}{r.subRoute && <span className="ml-2 rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[12px] font-bold text-brand-700">{r.subRoute}</span>}</span>
                  <span className="block truncate text-[13px] text-muted">{joinAddress(r.address) || "Sin dirección"}</span>
                </span>
              </button>
            </li>
          ))}
          {!isFetching && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No se encontró «{q.trim()}».{!canAdd && " Pide al administrador que lo dé de alta."}</li>
          )}
          {canAdd && (
            <li role="option" aria-selected={active === results.length}>
              <button type="button" onClick={() => onAdd(q)} onMouseEnter={() => setActive(results.length)}
                className={cn("flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-brand-700", active === results.length ? "bg-brand-50" : "hover:bg-canvas")}>
                <UserPlus className="size-4" /> Agregar «{q.trim()}» como cliente nuevo
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

