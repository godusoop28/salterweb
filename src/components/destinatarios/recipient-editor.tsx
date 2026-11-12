"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Drawer, Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, errorMessage } from "@/lib/api/client";
import { qk } from "@/lib/api/hooks";
import type { DuplicateMatch, Recipient } from "@/lib/api/types";

/**
 * Alta / edición de un cliente (destinatario) del remitente.
 * Se usa en el catálogo (panel lateral) y desde «Nueva guía» como ventana, sin salir de la captura.
 */
export function RecipientEditor({ recipient, senderId, onClose, onSaved, initialName = "", modal = false }: {
  recipient: Recipient | null; senderId?: number; onClose: () => void;
  onSaved?: (r: Recipient) => void; initialName?: string; modal?: boolean;
}) {
  const [first0, ...last0] = initialName.trim().split(/\s+/);
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({
    firstName: recipient?.firstName ?? first0 ?? "", lastName: recipient?.lastName ?? last0.join(" "), phone: recipient?.phone ?? "", email: recipient?.email ?? "",
    street: recipient?.address.street ?? "", neighborhood: recipient?.address.neighborhood ?? "", city: recipient?.address.city ?? "",
    state: recipient?.address.state ?? "", zip: recipient?.address.zip ?? "", references: recipient?.address.references ?? "", notes: recipient?.notes ?? "",
    clientCode: recipient?.clientCode ?? "", route: recipient?.route ?? "", subRoute: recipient?.subRoute ?? "",
  });
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const [allow, setAllow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body = { senderId, firstName: f.firstName, lastName: f.lastName, phone: f.phone, email: f.email || undefined, notes: f.notes, clientCode: f.clientCode, route: f.route, subRoute: f.subRoute,
        address: { street: f.street, neighborhood: f.neighborhood, city: f.city, state: f.state, zip: f.zip, references: f.references },
        allowProbableDuplicate: allow, version: recipient?.version };
      return recipient ? api.put<Recipient>(`/recipients/${recipient.id}`, body) : api.post<Recipient>("/recipients", body);
    },
    onSuccess: async (r) => { await qc.invalidateQueries({ queryKey: qk.recipients }); toast.success("Cliente guardado"); if (onSaved) onSaved(r); else onClose(); },
    onError: (e) => {
      if (e instanceof ApiError && e.data.matches) setMatches(e.data.matches as DuplicateMatch[]);
      setError(errorMessage(e));
    },
  });
  const Shell = modal ? Modal : Drawer;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Shell open onClose={onClose} size={modal ? "lg" : "md"} title={recipient ? "Editar cliente" : "Agregar cliente"}
      description={modal ? "Se guarda en tu catálogo y queda seleccionado en la guía." : undefined}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={save.isPending} disabled={!f.firstName.trim() || !senderId} onClick={() => { setError(null); save.mutate(); }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre(s) / razón social" required><Input value={f.firstName} onChange={set("firstName")} autoFocus /></Field>
        <Field label="Apellidos"><Input value={f.lastName} onChange={set("lastName")} /></Field>
        <Field label="Número de cliente"><Input value={f.clientCode} onChange={set("clientCode")} placeholder="Ej. 11081" /></Field>
        <Field label="Subruta / Clave CD" hint="Define la plaza destino de la guía"><Input value={f.subRoute} onChange={set("subRoute")} placeholder="Ej. CVA-01" className="uppercase" /></Field>
        <Field label="Teléfono"><Input value={f.phone} onChange={set("phone")} inputMode="tel" /></Field>
        <Field label="Correo"><Input value={f.email} onChange={set("email")} type="email" /></Field>
        <Field label="Calle y número" className="sm:col-span-2"><Input value={f.street} onChange={set("street")} /></Field>
        <Field label="Colonia"><Input value={f.neighborhood} onChange={set("neighborhood")} /></Field>
        <Field label="Ciudad"><Input value={f.city} onChange={set("city")} /></Field>
        <Field label="Estado"><Input value={f.state} onChange={set("state")} /></Field>
        <Field label="C.P."><Input value={f.zip} onChange={set("zip")} maxLength={5} inputMode="numeric" /></Field>
        <Field label="Ruta"><Input value={f.route} onChange={set("route")} placeholder="Ej. 74" /></Field>
        <Field label="Referencias" className="sm:col-span-2"><Input value={f.references} onChange={set("references")} /></Field>
        <Field label="Notas" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
      </div>
      {matches && matches.length > 0 && (
        <div className="mt-4 rounded-2xl border border-accent-100 bg-accent-50 p-3 text-sm">
          <p className="font-bold text-accent-700">Coincidencias</p>
          <ul className="mt-1 list-disc pl-5 text-ink-soft">{matches.map((m, i) => <li key={i}>{m.name}: {m.reason} ({m.level === "EXACT" ? "duplicado" : "posible"})</li>)}</ul>
          {!matches.some((m) => m.level === "EXACT") && <label className="mt-2 flex items-center gap-2 font-semibold"><input type="checkbox" checked={allow} onChange={(e) => setAllow(e.target.checked)} /> Es una persona distinta</label>}
        </div>
      )}
      <div className="mt-4"><InlineError message={error} /></div>
    </Shell>
  );
}
