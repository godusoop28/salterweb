"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CircleCheck, FilePlus2, FileText, Keyboard, Plus, Save, Search, Trash2, UserPlus, UserRound, X,
} from "lucide-react";
import { InlineError, ProvisionalNote } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, downloadFile, errorMessage } from "@/lib/api/client";
import { useConcepts, useInvalidateOperation, useRecipients, useSenders, useShifts } from "@/lib/api/hooks";
import type { Address, DuplicateMatch, Guide, GuideRequest, Recipient } from "@/lib/api/types";
import { joinAddress, uuid } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDebounced } from "@/hooks/use-debounced";
import { cn } from "@/lib/utils";

interface ItemRow { key: string; conceptId: string; description: string; quantity: string; unit: string; weightKg: string }
interface NewRcpt { firstName: string; lastName: string; phone: string; email: string; street: string; neighborhood: string; city: string; state: string; zip: string; references: string }

const EMPTY_RCPT: NewRcpt = { firstName: "", lastName: "", phone: "", email: "", street: "", neighborhood: "", city: "", state: "", zip: "", references: "" };
const SENDER_KEY = "salter.guia.remitente";

const AUTO = "auto";

function rcptFromDraft(draft: Guide): NewRcpt {
  const a = draft.recipient.address;
  const [first, ...rest] = draft.recipient.name.split(" ");
  return { firstName: first ?? "", lastName: rest.join(" "), phone: draft.recipient.phone ?? "", email: draft.recipient.email ?? "",
    street: a.street ?? "", neighborhood: a.neighborhood ?? "", city: a.city ?? "", state: a.state ?? "", zip: a.zip ?? "", references: a.references ?? "" };
}

function newItem(conceptId = AUTO): ItemRow {
  return { key: uuid(), conceptId, description: "", quantity: "1", unit: "", weightKg: "" };
}


/** Captura rápida de guías (alta y edición de borradores). */
export function GuideForm({ draft }: { draft?: Guide }) {
  const { me, can } = useSession();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const restricted = !can("SENDERS_VIEW");
  const senders = useSenders({ active: true });
  const shifts = useShifts();
  const concepts = useConcepts();

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
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [allowProbable, setAllowProbable] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const [cd, setCd] = useState(draft?.cdReference ?? "");
  const [order, setOrder] = useState(draft?.orderReference ?? "");
  const [packages, setPackages] = useState(String(draft?.packageCount ?? 1));
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    draft?.items.length
      ? draft.items.map((i) => ({ key: uuid(), conceptId: i.conceptId ? String(i.conceptId) : "", description: i.description, quantity: String(i.quantity), unit: i.unit, weightKg: i.weightKg != null ? String(i.weightKg) : "" }))
      : [newItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<Guide | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Remitente por defecto: el asignado al usuario o el último usado (preferencia local de interfaz, no dato operativo).
  const defaultSender = useMemo(() => {
    const list = senders.data?.content ?? [];
    if (!list.length) return undefined;
    const saved = typeof window !== "undefined" ? Number(window.localStorage.getItem(SENDER_KEY)) : NaN;
    return (list.find((x) => x.id === saved) ?? list[0]).id;
  }, [senders.data]);
  const senderId = chosenSender ?? me?.sender?.id ?? (restricted ? undefined : defaultSender);
  // Turno actual por defecto.
  const shiftId = chosenShift ?? String(shifts.data?.find((x) => x.current)?.id ?? "");
  // Concepto por defecto: el primero activo del catálogo.
  const firstConcept = concepts.data?.find((c) => c.active);
  const conceptOf = (i: ItemRow) => (i.conceptId === AUTO ? (firstConcept ? String(firstConcept.id) : "") : i.conceptId);

  const mutation = useMutation({
    mutationFn: async (confirm: boolean) => {
      const body = buildBody(confirm);
      return draft ? api.put<Guide>(`/guides/${draft.id}`, { ...body, version: draft.version }) : api.post<Guide>("/guides", body);
    },
    onSuccess: async (g) => {
      if (senderId && !restricted) localStorage.setItem(SENDER_KEY, String(senderId));
      await invalidate();
      toast.success(g.folio ? `Guía ${g.folio} confirmada` : "Borrador guardado", g.folio ? "El folio quedó asignado." : "Puedes confirmarlo después.");
      if (draft) router.push(`/guias/${g.id}`);
      else setDone(g);
    },
    onError: (e) => {
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
      newRecipient: mode === "new" ? { firstName: rcpt.firstName, lastName: rcpt.lastName, phone: rcpt.phone, email: rcpt.email, address, saveToCatalog, allowProbableDuplicate: allowProbable } : undefined,
      cdReference: cd, orderReference: order, packageCount: Number(packages) || 1, notes,
      items: items.map((i) => ({
        conceptId: conceptOf(i) ? Number(conceptOf(i)) : undefined, description: i.description || undefined,
        quantity: Number(i.quantity), unit: i.unit || undefined, weightKg: i.weightKg ? Number(i.weightKg) : undefined,
      })),
      confirm,
    };
  }

  function validate(confirm: boolean): boolean {
    const e: Record<string, string> = {};
    if (!senderId) e.sender = "Selecciona el remitente.";
    if (mode === "search" && !recipient) e.recipient = "Busca y selecciona un destinatario o captura uno nuevo.";
    if (mode === "new") {
      if (!rcpt.firstName.trim()) e.firstName = "Escribe el nombre.";
      if (rcpt.zip && !/^\d{5}$/.test(rcpt.zip)) e.zip = "5 dígitos.";
      if (rcpt.phone && rcpt.phone.replace(/\D/g, "").length < 7) e.phone = "Teléfono incompleto.";
      if (rcpt.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rcpt.email)) e.email = "Correo no válido.";
      if (confirm && !rcpt.street.trim()) e.street = "Necesaria para confirmar.";
      if (confirm && !rcpt.city.trim()) e.city = "Necesaria para confirmar.";
    }
    if (!(Number(packages) >= 1)) e.packages = "Mínimo 1.";
    items.forEach((i, idx) => {
      if (!(Number(i.quantity) > 0)) e[`item${idx}`] = "Cantidad mayor a cero.";
      if (!conceptOf(i) && !i.description.trim()) e[`item${idx}`] = "Elige un concepto o descríbelo.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(confirm: boolean) {
    setServerError(null);
    if (mutation.isPending) return; // evita doble envío
    if (!validate(confirm)) return;
    mutation.mutate(confirm);
  }

  function reset() {
    setDone(null);
    setRequestId(uuid());
    setRecipient(null);
    setMode("search");
    setRcpt(EMPTY_RCPT);
    setSaveToCatalog(false);
    setAllowProbable(false);
    setMatches(null);
    setOrder("");
    setPackages("1");
    setNotes("");
    setItems([newItem()]);
    setErrors({});
    setServerError(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  // Atajo: Ctrl/Cmd + Enter confirma (o guarda si no hay permiso).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !done) {
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
        <p className="mt-2 font-mono text-3xl font-bold text-brand-700">{done.folio ?? done.reference}</p>
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

  const senderName = me?.sender?.name ?? senders.data?.content.find((s) => s.id === senderId)?.name;

  return (
    <form className="grid gap-5 xl:grid-cols-[1fr_340px]" onSubmit={(e) => { e.preventDefault(); submit(can("GUIDES_CONFIRM")); }} noValidate>
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Remitente" error={errors.sender} required>
              {restricted ? (
                <Input value={senderName ?? "Sin remitente asignado"} readOnly className="bg-canvas" />
              ) : (
                <Select value={senderId ?? ""} onChange={(e) => { setSenderId(Number(e.target.value)); setRecipient(null); }}>
                  {senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Turno">
              <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                <option value="">Automático</option>
                {shifts.data?.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}{s.current ? " (actual)" : ""}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-ink">Destinatario</h3>
            <div className="inline-flex rounded-xl bg-canvas p-1 text-sm font-semibold">
              <button type="button" onClick={() => setMode("search")} className={cn("rounded-lg px-3 py-1.5", mode === "search" ? "bg-white text-brand-700 shadow-card" : "text-muted")}>
                <Search className="mr-1 inline size-4" />Buscar
              </button>
              <button type="button" onClick={() => setMode("new")} className={cn("rounded-lg px-3 py-1.5", mode === "new" ? "bg-white text-brand-700 shadow-card" : "text-muted")}>
                <UserPlus className="mr-1 inline size-4" />Nuevo
              </button>
            </div>
          </div>
          {mode === "search" ? (
            recipient ? (
              <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                <UserRound className="mt-0.5 size-5 text-brand-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{recipient.fullName}</p>
                  <p className="text-sm text-muted">{recipient.phone ?? "Sin teléfono"}</p>
                  <p className="text-sm text-ink-soft">{joinAddress(recipient.address) || "Sin dirección registrada"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setRecipient(null); setTimeout(() => searchRef.current?.focus(), 30); }} icon={<X className="size-4" />}>Cambiar</Button>
              </div>
            ) : (
              <RecipientSearch inputRef={searchRef} senderId={senderId} error={errors.recipient}
                onSelect={(r) => { setRecipient(r); setErrors((e) => ({ ...e, recipient: "" })); }}
                onCreate={(text) => { setMode("new"); const [f, ...l] = text.trim().split(/\s+/); setRcpt({ ...EMPTY_RCPT, firstName: f ?? "", lastName: l.join(" ") }); }} />
            )
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre(s)" error={errors.firstName} required><Input value={rcpt.firstName} autoFocus onChange={(e) => setRcpt({ ...rcpt, firstName: e.target.value })} /></Field>
                <Field label="Apellidos"><Input value={rcpt.lastName} onChange={(e) => setRcpt({ ...rcpt, lastName: e.target.value })} /></Field>
                <Field label="Teléfono" error={errors.phone}><Input inputMode="tel" value={rcpt.phone} onChange={(e) => setRcpt({ ...rcpt, phone: e.target.value })} /></Field>
                <Field label="Correo" error={errors.email}><Input type="email" value={rcpt.email} onChange={(e) => setRcpt({ ...rcpt, email: e.target.value })} /></Field>
                <Field label="Calle y número" error={errors.street} className="sm:col-span-2"><Input value={rcpt.street} onChange={(e) => setRcpt({ ...rcpt, street: e.target.value })} /></Field>
                <Field label="Colonia"><Input value={rcpt.neighborhood} onChange={(e) => setRcpt({ ...rcpt, neighborhood: e.target.value })} /></Field>
                <Field label="Ciudad / municipio" error={errors.city}><Input value={rcpt.city} onChange={(e) => setRcpt({ ...rcpt, city: e.target.value })} /></Field>
                <Field label="Estado"><Input value={rcpt.state} onChange={(e) => setRcpt({ ...rcpt, state: e.target.value })} /></Field>
                <Field label="C.P." error={errors.zip}><Input inputMode="numeric" maxLength={5} value={rcpt.zip} onChange={(e) => setRcpt({ ...rcpt, zip: e.target.value.replace(/\D/g, "") })} /></Field>
                <Field label="Referencias" className="sm:col-span-2"><Input value={rcpt.references} onChange={(e) => setRcpt({ ...rcpt, references: e.target.value })} /></Field>
              </div>
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Uso del destinatario</legend>
                <label className={cn("flex cursor-pointer gap-3 rounded-2xl border p-3", !saveToCatalog ? "border-brand-300 bg-brand-50" : "border-line")}>
                  <input type="radio" checked={!saveToCatalog} onChange={() => setSaveToCatalog(false)} className="mt-1" />
                  <span><span className="block text-sm font-bold text-ink">Usar sólo en esta guía</span><span className="text-[13px] text-muted">No se agrega al catálogo.</span></span>
                </label>
                <label className={cn("flex gap-3 rounded-2xl border p-3", !can("RECIPIENTS_MANAGE") ? "cursor-not-allowed opacity-50" : "cursor-pointer", saveToCatalog ? "border-brand-300 bg-brand-50" : "border-line")}>
                  <input type="radio" checked={saveToCatalog} disabled={!can("RECIPIENTS_MANAGE")} onChange={() => setSaveToCatalog(true)} className="mt-1" />
                  <span><span className="block text-sm font-bold text-ink">Guardar para futuros envíos</span><span className="text-[13px] text-muted">Queda disponible en el buscador.</span></span>
                </label>
              </fieldset>
              {matches && matches.length > 0 && (
                <div className="rounded-2xl border border-accent-100 bg-accent-50 p-3 text-sm">
                  <p className="font-bold text-accent-700">Coincidencias en el catálogo</p>
                  <ul className="mt-1 space-y-1 text-ink-soft">
                    {matches.map((m, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                        <span>{m.name} — {m.reason} ({m.level === "EXACT" ? "duplicado" : "posible"})</span>
                        {m.recipientId && (
                          <Button size="sm" variant="outline" onClick={() => { void api.get<Recipient>(`/recipients/${m.recipientId}`).then((r) => { setRecipient(r); setMode("search"); setMatches(null); setServerError(null); }); }}>Usar este</Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!matches.some((m) => m.level === "EXACT") && (
                    <label className="mt-2 flex items-center gap-2 font-semibold text-ink"><input type="checkbox" checked={allowProbable} onChange={(e) => setAllowProbable(e.target.checked)} /> Es una persona distinta; guardar de todas formas</label>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-ink">Mercancía</h3>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={it.key} className="grid gap-2 rounded-2xl border border-line-soft p-3 sm:grid-cols-[1.4fr_1.4fr_0.7fr_0.8fr_0.8fr_auto] sm:items-end sm:border-0 sm:p-0">
                <Field label={idx === 0 ? "Concepto" : ""} className={idx ? "sm:[&_label]:hidden" : ""}>
                  <Select value={conceptOf(it)} onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, conceptId: e.target.value } : x)))} aria-label="Concepto">
                    <option value="">Otro (describir)</option>
                    {concepts.data?.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label={idx === 0 ? "Descripción" : ""}>
                  <Input value={it.description} placeholder={conceptOf(it) ? "Opcional" : "Describe la mercancía"} onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, description: e.target.value } : x)))} aria-label="Descripción" />
                </Field>
                <Field label={idx === 0 ? "Cantidad" : ""} error={errors[`item${idx}`]}>
                  <Input inputMode="decimal" value={it.quantity} onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, quantity: e.target.value } : x)))} aria-label="Cantidad" />
                </Field>
                <Field label={idx === 0 ? "Unidad" : ""}>
                  <Input value={it.unit} placeholder="Del concepto" onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, unit: e.target.value } : x)))} aria-label="Unidad" />
                </Field>
                <Field label={idx === 0 ? "Peso (kg)" : ""}>
                  <Input inputMode="decimal" value={it.weightKg} placeholder="Opcional" onChange={(e) => setItems(items.map((x) => (x.key === it.key ? { ...x, weightKg: e.target.value } : x)))} aria-label="Peso" />
                </Field>
                <Button variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems(items.filter((x) => x.key !== it.key))} aria-label="Quitar concepto"><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button variant="soft" size="sm" icon={<Plus className="size-4" />} onClick={() => setItems([...items, newItem()])}>Agregar concepto</Button>
          </div>
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <Card className="space-y-4 p-5">
          <Field label="Referencia CD" hint="Documento de origen (formato por confirmar)"><Input value={cd} onChange={(e) => setCd(e.target.value)} /></Field>
          <Field label="Pedido / referencia"><Input value={order} onChange={(e) => setOrder(e.target.value)} /></Field>
          <Field label="Bultos" error={errors.packages}><Input inputMode="numeric" value={packages} onChange={(e) => setPackages(e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Observaciones"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </Card>
        <Card className="space-y-3 p-5">
          <InlineError message={serverError} />
          {can("GUIDES_CONFIRM") && (
            <Button type="submit" size="lg" className="w-full" loading={mutation.isPending && mutation.variables === true} icon={<CircleCheck className="size-5" />}>
              Confirmar y asignar folio
            </Button>
          )}
          <Button variant={can("GUIDES_CONFIRM") ? "outline" : "primary"} size="lg" className="w-full" loading={mutation.isPending && mutation.variables === false}
            icon={<Save className="size-5" />} onClick={() => submit(false)}>
            Guardar borrador
          </Button>
          {!can("GUIDES_CONFIRM") && <p className="text-[13px] text-muted">Tu usuario no confirma guías: un supervisor las revisará y confirmará.</p>}
          <p className="flex items-center gap-1.5 text-[12px] text-subtle"><Keyboard className="size-3.5" /> Ctrl + Enter para {can("GUIDES_CONFIRM") ? "confirmar" : "guardar"}</p>
          {draft && <Link href={`/guias/${draft.id}`} className="block text-center text-sm font-semibold text-brand-600">Cancelar edición</Link>}
        </Card>
        <ProvisionalNote>el formato del documento y los campos obligatorios se ajustarán con los ejemplos reales de SALTER.</ProvisionalNote>
      </div>
    </form>
  );
}

function RecipientSearch({ senderId, onSelect, onCreate, error, inputRef }: {
  senderId?: number; onSelect: (r: Recipient) => void; onCreate: (text: string) => void; error?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim());
  const { data, isFetching } = useRecipients({ senderId, q: dq, size: 8 }, !!senderId && dq.length >= 2);
  const results = useMemo(() => (dq.length >= 2 ? data?.content ?? [] : []), [data, dq]);

  return (
    <div>
      <Field label="Buscar por nombre, apellido o teléfono" error={error}>
        <Input ref={inputRef} autoFocus value={q} icon={<Search className="size-4" />} placeholder="Ej. jose perez, 5512…"
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (results[active]) onSelect(results[active]);
              else if (q.trim()) onCreate(q);
            }
          }}
          role="combobox" aria-expanded={results.length > 0} aria-controls="rcpt-results" aria-autocomplete="list" />
      </Field>
      {dq.length >= 2 && (
        <ul id="rcpt-results" role="listbox" className="mt-2 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line">
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => onSelect(r)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left", i === active ? "bg-brand-50" : "hover:bg-canvas")}>
                <UserRound className="mt-0.5 size-4 text-brand-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{r.fullName} {r.phone && <span className="font-normal text-muted">· {r.phone}</span>}</span>
                  <span className="block truncate text-[13px] text-muted">{joinAddress(r.address) || "Sin dirección"}</span>
                </span>
              </button>
            </li>
          ))}
          {!isFetching && results.length === 0 && <li className="px-4 py-3 text-sm text-muted">Sin coincidencias.</li>}
          <li role="option" aria-selected={active === results.length}>
            <button type="button" onClick={() => onCreate(q)} onMouseEnter={() => setActive(results.length)}
              className={cn("flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-brand-700", active === results.length ? "bg-brand-50" : "hover:bg-canvas")}>
              <UserPlus className="size-4" /> Registrar «{q.trim()}» como nuevo destinatario
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
