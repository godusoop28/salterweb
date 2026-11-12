"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown, CircleCheck, FilePlus2, FileText, Keyboard, Save, Search, UserPlus, UserRound, X,
} from "lucide-react";
import { InlineError } from "@/components/app/common";
import { RecipientEditor } from "@/components/destinatarios/recipient-editor";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, downloadFile, errorMessage } from "@/lib/api/client";
import { useConcepts, useGuideServices, useInvalidateOperation, useRecipients, useSenders, useShifts } from "@/lib/api/hooks";
import type { Address, DuplicateMatch, Guide, GuideRequest, Recipient } from "@/lib/api/types";
import { joinAddress, printedFolio, todayKey, uuid } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDebounced } from "@/hooks/use-debounced";
import { cn } from "@/lib/utils";

interface NewRcpt { firstName: string; lastName: string; phone: string; email: string; street: string; neighborhood: string; city: string; state: string; zip: string; references: string }
/** Tipo de bulto seleccionado y su cantidad (la cantidad por tipo sólo se pide cuando hay varios). */
interface Pack { name: string; qty: string }

const EMPTY_RCPT: NewRcpt = { firstName: "", lastName: "", phone: "", email: "", street: "", neighborhood: "", city: "", state: "", zip: "", references: "" };
const SENDER_KEY = "salter.guia.remitente";
/** Tipos de bulto que maneja el cliente, en el orden en que los pidió. */
const PACK_TYPES = ["Caja", "Sobre", "Acumulador", "Tambo", "Tarima"];
const DEFAULT_PACKS: Pack[] = [{ name: "Caja", qty: "1" }];

const plaza = (v: string) => v.replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase();
const sameName = (a: string, b: string) => a.trim().localeCompare(b.trim(), "es", { sensitivity: "base" }) === 0;

/** Fecha (YYYY-MM-DD) sumando días a hoy en la zona horaria del negocio. */
function addDaysKey(days: number): string {
  const [y, m, d] = todayKey().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function rcptFromDraft(draft: Guide): NewRcpt {
  const a = draft.recipient.address;
  const [first, ...rest] = draft.recipient.name.split(" ");
  return { firstName: first ?? "", lastName: rest.join(" "), phone: draft.recipient.phone ?? "", email: draft.recipient.email ?? "",
    street: a.street ?? "", neighborhood: a.neighborhood ?? "", city: a.city ?? "", state: a.state ?? "", zip: a.zip ?? "", references: a.references ?? "" };
}

/** Captura rápida de guías (alta y edición de borradores): cliente → pedido(s) → bultos → tipo de bulto. */
export function GuideForm({ draft }: { draft?: Guide }) {
  const { me, can } = useSession();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const restricted = !can("SENDERS_VIEW");
  // El remitente sale del registro del usuario; sólo se elige cuando el usuario no tiene uno asignado (punto de venta / administración).
  const pickSender = !restricted && !me?.sender;
  const senders = useSenders({ active: true });
  const shifts = useShifts();
  const concepts = useConcepts();
  const services = useGuideServices();

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
  // "new": destinatario capturado sólo para una guía (borradores anteriores). Las guías nuevas usan el catálogo.
  const [mode, setMode] = useState<"search" | "new">(draft && draft.recipientOneTime ? "new" : "search");
  const [rcpt, setRcpt] = useState<NewRcpt>(() => (draft && (draft.recipientOneTime || !draft.recipientId) ? rcptFromDraft(draft) : EMPTY_RCPT));
  const [adding, setAdding] = useState<string | null>(null);
  const [allowProbable, setAllowProbable] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  // Pedido repetido: guías vigentes que ya lo tienen; el usuario decide si es otro envío.
  const [dupOrder, setDupOrder] = useState<{ message: string; guides: { id: number; reference: string; recipient: string; status: string }[] } | null>(null);
  const [allowDupOrder, setAllowDupOrder] = useState(false);
  const [cd, setCd] = useState(draft?.cdReference ?? "");
  const [order, setOrder] = useState(draft?.orderReference ?? "");
  const [packages, setPackages] = useState(String(draft?.packageCount ?? 1));
  const [packs, setPacks] = useState<Pack[]>(() =>
    draft?.items.length ? draft.items.map((i) => ({ name: i.description, qty: String(i.quantity) })) : DEFAULT_PACKS);
  const [weight, setWeight] = useState(() => {
    const w = draft?.items.reduce((sum, i) => sum + (i.weightKg ?? 0), 0) ?? 0;
    return w > 0 ? String(w) : "";
  });
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [moreOpen, setMoreOpen] = useState(false);
  // Formato oficial de guía: PBA → OAX, dimensiones, servicio y fecha compromiso
  const [origin, setOrigin] = useState<string | null>(draft?.shipping?.originCode ?? null);
  const [destination, setDestination] = useState(draft?.shipping?.destinationCode ?? "");
  const [dimensions, setDimensions] = useState(draft?.shipping?.dimensions ?? "");
  const [service, setService] = useState(draft?.shipping?.serviceType ?? "");
  const [commitment, setCommitment] = useState(draft?.shipping?.commitmentDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<Guide | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);

  // Remitente por defecto: el asignado al usuario o, en punto de venta, el último usado (preferencia local de interfaz).
  const defaultSender = useMemo(() => {
    const list = senders.data?.content ?? [];
    if (!list.length) return undefined;
    const saved = typeof window !== "undefined" ? Number(window.localStorage.getItem(SENDER_KEY)) : NaN;
    return (list.find((x) => x.id === saved) ?? list[0]).id;
  }, [senders.data]);
  const senderId = chosenSender ?? me?.sender?.id ?? (restricted ? undefined : defaultSender);
  const currentSender = senders.data?.content.find((s) => s.id === senderId);
  // Plaza de origen: la capturada o la del remitente
  const originCode = origin ?? currentSender?.plazaCode ?? "";
  const serviceCode = service || services.data?.[0]?.code || "ORDINARIO";
  const serviceDays = services.data?.find((s) => s.code === serviceCode)?.days ?? 1;
  // Turno actual por defecto.
  const shiftId = chosenShift ?? String(shifts.data?.find((x) => x.current)?.id ?? "");
  // Con varios tipos de bulto, el total de bultos es la suma de cada tipo.
  const several = packs.length > 1;
  const totalPackages = several ? packs.reduce((sum, p) => sum + (Number(p.qty) || 0), 0) : Number(packages) || 0;
  const packTypes = [...PACK_TYPES, ...packs.map((p) => p.name).filter((n) => !PACK_TYPES.some((t) => sameName(t, n)))];
  const conceptFor = (name: string) => concepts.data?.find((c) => c.active && sameName(c.name, name));

  const mutation = useMutation({
    mutationFn: async ({ confirm, allowDup }: { confirm: boolean; allowDup: boolean }) => {
      const body = { ...buildBody(confirm), allowDuplicateOrder: allowDup };
      return draft ? api.put<Guide>(`/guides/${draft.id}`, { ...body, version: draft.version }) : api.post<Guide>("/guides", body);
    },
    onSuccess: async (g) => {
      if (senderId && pickSender) localStorage.setItem(SENDER_KEY, String(senderId));
      await invalidate();
      toast.success(g.folio ? `Guía ${g.folio} confirmada` : "Borrador guardado", g.folio ? "El folio quedó asignado." : "Puedes confirmarlo después.");
      if (draft) router.push(`/guias/${g.id}`);
      else setDone(g);
    },
    onError: (e) => {
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
      cdReference: cd, orderReference: order.trim(), packageCount: totalPackages || 1, notes,
      shipping: {
        originCode: originCode || undefined, destinationCode: destination || undefined, dimensions: dimensions || undefined,
        serviceType: serviceCode, commitmentDate: commitment || undefined,
      },
      items: packs.map((p, idx) => {
        const c = conceptFor(p.name);
        return {
          conceptId: c?.id, description: c ? undefined : p.name,
          quantity: several ? Number(p.qty) : totalPackages, unit: c ? undefined : "PIEZA",
          weightKg: idx === 0 && weight ? Number(weight) : undefined,
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
    if (!several && !(Number(packages) >= 1)) e.packages = "Mínimo 1.";
    if (packs.length === 0) e.packs = "Elige el tipo de bulto.";
    if (several && packs.some((p) => !(Number(p.qty) >= 1))) e.packs = "Indica cuántos bultos de cada tipo.";
    if (originCode && originCode.length < 2) e.origin = "2 a 5 letras.";
    if (destination && destination.length < 2) e.destination = "2 a 5 letras.";
    if (confirm && !destination) e.destination = "Necesaria para confirmar.";
    setErrors(e);
    if (e.origin || e.destination) setMoreOpen(true);
    return Object.keys(e).length === 0;
  }

  function submit(confirm: boolean) {
    setServerError(null);
    if (mutation.isPending) return; // evita doble envío
    if (!validate(confirm)) return;
    mutation.mutate({ confirm, allowDup: allowDupOrder });
  }

  function chooseRecipient(r: Recipient) {
    setRecipient(r);
    setMode("search");
    setErrors((e) => ({ ...e, recipient: "", destination: "" }));
    setDestination(r.destinationCode ?? "");
    setCd(r.subRoute ?? "");
    if (!r.destinationCode) setMoreOpen(true);
    setTimeout(() => orderRef.current?.focus(), 30);
  }

  function togglePack(name: string) {
    setErrors((e) => ({ ...e, packs: "" }));
    setPacks((list) => {
      if (list.some((p) => sameName(p.name, name))) return list.filter((p) => !sameName(p.name, name));
      // Al pasar de uno a varios tipos, el primero conserva los bultos ya capturados.
      const base = list.length === 1 ? [{ ...list[0], qty: packages || "1" }] : list;
      return [...base, { name, qty: list.length === 0 ? packages || "1" : "1" }];
    });
  }

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
    setDestination("");
    setPackages("1");
    setPacks(DEFAULT_PACKS);
    setWeight("");
    setNotes("");
    setDimensions("");
    setCommitment("");
    setMoreOpen(false);
    setErrors({});
    setServerError(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  // Atajo: Ctrl/Cmd + Enter confirma (o guarda si no hay permiso).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !done && adding === null) {
        e.preventDefault();
        submit(can("GUIDES_CONFIRM"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CircleCheck className="size-8" /></div>
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">{done.folio ? "Guía confirmada" : "Borrador guardado"}</h2>
        <p className="mt-2 font-mono text-3xl font-bold text-brand-700">{done.folio ? printedFolio(done.folio) : done.reference}</p>
        {done.shipping?.destinationCode && (
          <p className="mt-1 text-lg font-semibold text-ink">{done.shipping.originCode ?? "—"} → {done.shipping.destinationCode}</p>
        )}
        <p className="mt-2 text-muted">{done.recipient.name} · {done.recipient.address.city ?? ""}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} icon={<FilePlus2 className="size-4" />} autoFocus>Nueva guía</Button>
          <Button variant="outline" onClick={() => router.push(`/guias/${done.id}`)}>Ver guía</Button>
          {done.folio && (
            <Button variant="outline" icon={<FileText className="size-4" />}
              onClick={() => downloadFile(`/guides/${done.id}/pdf`, `guia-${done.folio}.pdf`, undefined, true).catch((e) => toast.error("No se pudo abrir el PDF", errorMessage(e)))}>
              Documento PDF
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const canAdd = can("RECIPIENTS_MANAGE") && !!senderId;

  return (
    <form className="grid gap-5 xl:grid-cols-[1fr_340px]" onSubmit={(e) => { e.preventDefault(); submit(can("GUIDES_CONFIRM")); }} noValidate>
      <div className="space-y-5">
        <Card className="space-y-5 p-5 sm:p-6">
          {pickSender && (
            <Field label="Remitente" error={errors.sender} required hint="Sólo en punto de venta: los usuarios con remitente asignado no ven este campo.">
              <Select value={senderId ?? ""} onChange={(e) => { setSenderId(Number(e.target.value)); setRecipient(null); }}>
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
                    {recipient.subRoute && <p className="mt-1 text-sm font-semibold text-brand-700">Clave CD {recipient.subRoute} · Destino {recipient.destinationCode}</p>}
                    <p className="text-sm text-ink-soft">{joinAddress(recipient.address) || "Sin dirección registrada"}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setRecipient(null); setDestination(""); setCd(""); setTimeout(() => searchRef.current?.focus(), 30); }} icon={<X className="size-4" />}>Cambiar</Button>
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

          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            {/* 2. Pedido(s) */}
            <Field label="Número de pedido" hint="Si son varios, sepáralos con coma (ej. 4501, 4502)">
              <Input ref={orderRef} value={order} maxLength={80} placeholder="Ej. 4501"
                onChange={(e) => { setOrder(e.target.value); setDupOrder(null); setAllowDupOrder(false); }} />
            </Field>
            {/* 3. Bultos */}
            <Field label="Cantidad de bultos" error={errors.packages} required hint={several ? "Suma de cada tipo" : undefined}>
              <Input inputMode="numeric" value={several ? String(totalPackages) : packages} readOnly={several} className={cn("text-lg font-bold", several && "bg-canvas")}
                onChange={(e) => setPackages(e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>

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
                <Button size="sm" variant="ghost" onClick={() => { setAllowDupOrder(true); setDupOrder(null); setServerError(null); if (validate(can("GUIDES_CONFIRM"))) mutation.mutate({ confirm: can("GUIDES_CONFIRM"), allowDup: true }); }}>
                  Es otro envío: generar de todas formas
                </Button>
              </div>
            </div>
          )}

          {/* 4. Tipo de bulto (uno o varios) */}
          <div>
            <p className="text-sm font-semibold text-ink-soft">Tipo de bulto<span className="ml-0.5 text-accent-600" aria-hidden>*</span> <span className="font-normal text-muted">· puedes elegir varios</span></p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tipo de bulto">
              {packTypes.map((t) => {
                const on = packs.some((p) => sameName(p.name, t));
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => togglePack(t)}
                    className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition",
                      on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-400 hover:text-brand-700")}>
                    {t}
                  </button>
                );
              })}
            </div>
            {several && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {packs.map((p) => (
                  <Field key={p.name} label={`¿Cuántos? ${p.name}`}>
                    <Input inputMode="numeric" value={p.qty}
                      onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setPacks((list) => list.map((x) => (x.name === p.name ? { ...x, qty: v } : x))); }} />
                  </Field>
                ))}
              </div>
            )}
            {errors.packs && <p className="mt-1.5 text-[13px] font-semibold text-red-600">{errors.packs}</p>}
          </div>
        </Card>

        {/* Más datos: se llenan solos con el cliente y el remitente */}
        <Card className="p-0">
          <button type="button" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}
            className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left sm:px-6">
            <span>
              <span className="block text-base font-bold text-ink">Más datos <span className="font-normal text-muted">(se llenan solos)</span></span>
              <span className="block text-[13px] text-muted">
                {originCode || "—"} → {destination || "—"} · {serviceCode}{cd ? ` · Clave CD ${cd}` : ""}
              </span>
            </span>
            <ChevronDown className={cn("size-5 text-muted transition", moreOpen && "rotate-180")} aria-hidden />
          </button>
          {moreOpen && (
            <div className="space-y-4 border-t border-line-soft px-5 pb-5 pt-4 sm:px-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <Field label="Plaza de origen" error={errors.origin} hint={currentSender?.plazaCode ? `Del remitente: ${currentSender.plazaCode}` : "Ej. PBA"}>
                  <Input value={originCode} maxLength={5} placeholder="PBA" className="font-mono text-lg uppercase"
                    onChange={(e) => setOrigin(plaza(e.target.value))} />
                </Field>
                <span className="hidden pb-3 text-2xl text-brand-400 sm:block" aria-hidden>→</span>
                <Field label="Plaza de destino" error={errors.destination} required hint="Sale de la subruta del cliente (ej. OAX)">
                  <Input value={destination} maxLength={5} placeholder="OAX" className="font-mono text-lg uppercase"
                    onChange={(e) => setDestination(plaza(e.target.value))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="Servicio">
                  <Select value={serviceCode} onChange={(e) => { setService(e.target.value); setCommitment(""); }}>
                    {(services.data ?? [{ code: "ORDINARIO", days: 1 }]).map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </Select>
                </Field>
                <Field label="Fecha compromiso" hint={commitment ? "Capturada manualmente" : `Automática: ${serviceDays === 0 ? "mismo día" : `+${serviceDays} día(s)`}`}>
                  <Input type="date" value={commitment || addDaysKey(serviceDays)} min={todayKey()}
                    onChange={(e) => setCommitment(e.target.value)} />
                </Field>
                <Field label="Clave CD" hint="Se imprime junto a las piezas">
                  <Input value={cd} placeholder="CVA-01" className="uppercase" onChange={(e) => setCd(e.target.value.toUpperCase())} />
                </Field>
                <Field label="Dimensiones (cm)" hint="Largo x ancho x alto">
                  <Input value={dimensions} placeholder="30 x 20 x 15" onChange={(e) => setDimensions(e.target.value)} />
                </Field>
                <Field label="Peso total (kg)">
                  <Input inputMode="decimal" value={weight} placeholder="Opcional" onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} />
                </Field>
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
          <InlineError message={serverError} />
          {can("GUIDES_CONFIRM") && (
            <Button type="submit" size="lg" className="w-full" loading={mutation.isPending && mutation.variables?.confirm === true} icon={<CircleCheck className="size-5" />}>
              Confirmar y asignar folio
            </Button>
          )}
          <Button variant={can("GUIDES_CONFIRM") ? "outline" : "primary"} size="lg" className="w-full" loading={mutation.isPending && mutation.variables?.confirm === false}
            icon={<Save className="size-5" />} onClick={() => submit(false)}>
            Guardar borrador
          </Button>
          {!can("GUIDES_CONFIRM") && <p className="text-[13px] text-muted">Tu usuario no confirma guías: el administrador las revisará y confirmará.</p>}
          <p className="flex items-center gap-1.5 text-[12px] text-subtle"><Keyboard className="size-3.5" /> Ctrl + Enter para {can("GUIDES_CONFIRM") ? "confirmar" : "guardar"}</p>
          {draft && <Link href={`/guias/${draft.id}`} className="block text-center text-sm font-semibold text-brand-600">Cancelar edición</Link>}
        </Card>
      </div>

      {adding !== null && (
        <RecipientEditor modal recipient={null} senderId={senderId} initialName={adding}
          onClose={() => { setAdding(null); setTimeout(() => searchRef.current?.focus(), 30); }}
          onSaved={(r) => { setAdding(null); chooseRecipient(r); }} />
      )}
    </form>
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
              else if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
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
