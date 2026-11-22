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
import { useQuery } from "@tanstack/react-query";

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
    latitude: recipient?.latitude != null ? String(recipient.latitude) : "", longitude: recipient?.longitude != null ? String(recipient.longitude) : "",
  });
  const [verified, setVerified] = useState(recipient?.locationVerified ?? false);
  const [locating, setLocating] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const [allow, setAllow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body = { senderId, firstName: f.firstName, lastName: f.lastName, phone: f.phone, email: f.email || undefined, notes: f.notes, clientCode: f.clientCode, route: f.route, subRoute: f.subRoute,
        address: { street: f.street, neighborhood: f.neighborhood, city: f.city, state: f.state, zip: f.zip, references: f.references },
        allowProbableDuplicate: allow, version: recipient?.version,
        latitude: f.latitude ? Number(f.latitude) : undefined, longitude: f.longitude ? Number(f.longitude) : undefined,
        locationVerified: f.latitude && f.longitude ? verified : false };
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
        <Field label="Subruta" hint="Define la plaza destino de la guía"><Input value={f.subRoute} onChange={set("subRoute")} placeholder="Ej. CVA-01" className="uppercase" /></Field>
        <Field label="Teléfono"><Input value={f.phone} onChange={set("phone")} inputMode="tel" /></Field>
        <Field label="Correo"><Input value={f.email} onChange={set("email")} type="email" /></Field>
        <Field label="Calle y número" className="sm:col-span-2"><Input value={f.street} onChange={set("street")} /></Field>
        <Field label="Colonia"><Input value={f.neighborhood} onChange={set("neighborhood")} /></Field>
        <Field label="Ciudad / municipio"><Input value={f.city} onChange={set("city")} /></Field>
        <Field label="Estado"><Input value={f.state} onChange={set("state")} /></Field>
        <Field label="C.P."><Input value={f.zip} onChange={set("zip")} maxLength={5} inputMode="numeric" /></Field>
        <Field label="Ruta"><Input value={f.route} onChange={set("route")} placeholder="Ej. 74" /></Field>
        <Field label="Referencias" className="sm:col-span-2"><Input value={f.references} onChange={set("references")} /></Field>
        <Field label="Notas" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
        <div className="space-y-2 rounded-2xl border border-line p-3 sm:col-span-2">
          <p className="text-sm font-semibold text-ink">Ubicación del local <span className="font-normal text-muted">(opcional)</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Latitud"><Input value={f.latitude} inputMode="decimal" placeholder="Ej. 17.0732" onChange={(e) => setF({ ...f, latitude: e.target.value.replace(/[^\d.-]/g, "") })} /></Field>
            <Field label="Longitud"><Input value={f.longitude} inputMode="decimal" placeholder="Ej. -96.7266" onChange={(e) => setF({ ...f, longitude: e.target.value.replace(/[^\d.-]/g, "") })} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Button size="sm" variant="soft" loading={locating} onClick={() => {
              if (!navigator.geolocation) { setError("Este dispositivo no permite obtener la ubicación."); return; }
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => { setF((x) => ({ ...x, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); setLocating(false); },
                () => { setError("No se pudo obtener la ubicación (permiso denegado o sin señal)."); setLocating(false); },
                { enableHighAccuracy: true, timeout: 15000 });
            }}>Usar mi ubicación actual (estando en el local)</Button>
            {(f.latitude && f.longitude) || f.street ? (
              <a className="font-semibold text-brand-700" target="_blank" rel="noopener noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.latitude && f.longitude ? `${f.latitude},${f.longitude}` : [f.street, f.neighborhood, f.city, f.state, f.zip].filter(Boolean).join(", "))}`}>
                Abrir en Google Maps
              </a>
            ) : null}
          </div>
          {f.latitude && f.longitude && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Ubicación verificada en el lugar</label>}
          <p className="text-[12px] text-subtle">Sólo se guarda la ubicación del local; no es seguimiento GPS del repartidor.</p>
        </div>
        {recipient && <StorefrontPhoto recipientId={recipient.id} />}
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

interface AttachmentMeta { id: number; category: string; filename: string; createdAt: string }

/** Foto del comercio o local de entrega (almacenamiento de archivos existente, con validación de tipo y tamaño). */
function StorefrontPhoto({ recipientId }: { recipientId: number }) {
  const toast = useToast();
  const list = useQuery({ queryKey: ["attachments", "RECIPIENT", recipientId], queryFn: () => api.get<AttachmentMeta[]>(`/attachments/RECIPIENT/${recipientId}`) });
  const photos = (list.data ?? []).filter((a) => a.category === "FACHADA");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const last = photos[photos.length - 1];
  return (
    <div className="space-y-2 rounded-2xl border border-line p-3 sm:col-span-2">
      <p className="text-sm font-semibold text-ink">Foto del local</p>
      {last && (
        <Button size="sm" variant="outline" onClick={() => api.blob(`/attachments/file/${last.id}`).then((b) => setPreview(URL.createObjectURL(b))).catch((e) => toast.error("No se pudo abrir la foto", errorMessage(e)))}>
          Ver foto ({photos.length})
        </Button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada servida como blob */}
      {preview && <img src={preview} alt="Foto del local de entrega" className="max-h-64 rounded-xl border border-line" />}
      <label className="block text-sm">
        <span className="font-semibold text-brand-700">{busy ? "Subiendo…" : last ? "Reemplazar con otra foto" : "Subir foto (JPG, PNG o WEBP, máx. 5 MB)"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              const fd = new FormData();
              fd.append("file", file);
              await api.post(`/attachments/RECIPIENT/${recipientId}?category=FACHADA`, fd);
              await list.refetch();
              toast.success("Foto guardada");
            } catch (err) {
              toast.error("No se pudo subir la foto", errorMessage(err));
            } finally {
              setBusy(false);
            }
          }} />
      </label>
    </div>
  );
}
