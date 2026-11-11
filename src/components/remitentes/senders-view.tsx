"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Store } from "lucide-react";
import { InlineError, QueryState, Table } from "@/components/app/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { qk, useSenders } from "@/lib/api/hooks";
import type { Sender } from "@/lib/api/types";
import { joinAddress } from "@/lib/format";

export function SendersView() {
  const [q, setQ] = useState("");
  const list = useSenders({ q: q || undefined });
  const [editing, setEditing] = useState<Sender | "new" | null>(null);
  return (
    <>
      <PageHeader title="Remitentes" description="Clientes empresariales y particulares. Los capturistas trabajan con el remitente que tienen asignado."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Nuevo remitente</Button>} />
      <Card className="mb-4 p-4"><Input placeholder="Buscar por nombre o clave" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" /></Card>
      <Card>
        <QueryState loading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {list.data?.content.length === 0 ? <EmptyState icon={Store} title="Sin remitentes" /> : (
            <Table head={["Clave", "Nombre", "Contacto", "Dirección", "Estado", ""]}>
              {list.data?.content.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono text-[13px]">{s.code}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-ink">{s.name}</p><p className="text-[13px] text-muted">{s.kind === "EMPRESA" ? "Empresa" : "Particular"}</p></td>
                  <td className="px-4 py-3 text-ink-soft">{[s.contactName, s.phone].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{joinAddress(s.address) || "—"}</td>
                  <td className="px-4 py-3">{s.active ? <Badge tone="green" size="sm">Activo</Badge> : <Badge tone="slate" size="sm">Inactivo</Badge>}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(s)}>Editar</Button></td>
                </tr>
              ))}
            </Table>
          )}
        </QueryState>
      </Card>
      {editing && <SenderDrawer sender={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SenderDrawer({ sender, onClose }: { sender: Sender | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const a = sender?.address ?? {};
  const [f, setF] = useState({ code: sender?.code ?? "", name: sender?.name ?? "", kind: sender?.kind ?? "EMPRESA", contactName: sender?.contactName ?? "", phone: sender?.phone ?? "", email: sender?.email ?? "",
    street: a.street ?? "", neighborhood: a.neighborhood ?? "", city: a.city ?? "", state: a.state ?? "", zip: a.zip ?? "", notes: sender?.notes ?? "", active: sender?.active ?? true });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body = { code: f.code || undefined, name: f.name, kind: f.kind, contactName: f.contactName, phone: f.phone, email: f.email || undefined, notes: f.notes,
        address: { street: f.street, neighborhood: f.neighborhood, city: f.city, state: f.state, zip: f.zip }, active: f.active, version: sender?.version };
      return sender ? api.put(`/senders/${sender.id}`, body) : api.post("/senders", body);
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.senders }); toast.success("Remitente guardado"); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Drawer open onClose={onClose} title={sender ? "Editar remitente" : "Nuevo remitente"}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!f.name.trim()} loading={save.isPending} onClick={() => { setError(null); save.mutate(); }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre / razón social" required className="sm:col-span-2"><Input value={f.name} onChange={set("name")} /></Field>
        <Field label="Clave" hint="Se genera si la dejas vacía"><Input value={f.code} onChange={set("code")} /></Field>
        <Field label="Tipo"><Select value={f.kind} onChange={set("kind")}><option value="EMPRESA">Empresa</option><option value="PARTICULAR">Particular</option></Select></Field>
        <Field label="Contacto"><Input value={f.contactName} onChange={set("contactName")} /></Field>
        <Field label="Teléfono"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Correo" className="sm:col-span-2"><Input value={f.email} onChange={set("email")} /></Field>
        <Field label="Calle y número" className="sm:col-span-2"><Input value={f.street} onChange={set("street")} /></Field>
        <Field label="Colonia"><Input value={f.neighborhood} onChange={set("neighborhood")} /></Field>
        <Field label="Ciudad"><Input value={f.city} onChange={set("city")} /></Field>
        <Field label="Estado"><Input value={f.state} onChange={set("state")} /></Field>
        <Field label="C.P."><Input value={f.zip} onChange={set("zip")} maxLength={5} /></Field>
        <Field label="Notas" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
        {sender && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo</label>}
      </div>
      <div className="mt-4"><InlineError message={error} /></div>
    </Drawer>
  );
}
