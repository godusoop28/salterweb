"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Truck } from "lucide-react";
import { InlineError, QueryState, Table } from "@/components/app/common";
import { GuideStatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { qk, useCouriers, useGuides, useInvalidateOperation } from "@/lib/api/hooks";
import type { Courier, CourierStatus } from "@/lib/api/types";
import { useSession } from "@/lib/session";

const STATUS: Record<CourierStatus, [string, "green" | "blue" | "orange" | "slate"]> = {
  DISPONIBLE: ["Disponible", "green"], EN_RUTA: ["En ruta", "blue"], DESCANSO: ["Descanso", "orange"], INACTIVO: ["Inactivo", "slate"],
};

export function CouriersView() {
  const { can } = useSession();
  const list = useCouriers();
  const [editing, setEditing] = useState<Courier | "new" | null>(null);
  const [assigning, setAssigning] = useState<Courier | null>(null);
  return (
    <>
      <PageHeader title="Repartidores y asignaciones" description="Cada repartidor ve únicamente los envíos que tiene asignados."
        actions={can("COURIERS_MANAGE") && <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Nuevo repartidor</Button>} />
      <Card>
        <QueryState loading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {list.data?.length === 0 ? <EmptyState icon={Truck} title="Sin repartidores" /> : (
            <Table head={["Repartidor", "Zona", "Vehículo", "Estado", "Asignadas", "Cuenta", ""]}>
              {list.data?.map((c) => (
                <tr key={c.id} className={c.active ? "" : "opacity-60"}>
                  <td className="px-4 py-3"><p className="font-semibold text-ink">{c.name}</p><p className="text-[13px] text-muted">{c.phone ?? ""}</p></td>
                  <td className="px-4 py-3">{c.zone ?? "—"}</td>
                  <td className="px-4 py-3">{[c.vehicle, c.plate].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3"><Badge tone={STATUS[c.status][1]} size="sm">{STATUS[c.status][0]}</Badge></td>
                  <td className="px-4 py-3">{c.activeAssignments}</td>
                  <td className="px-4 py-3 text-[13px] text-muted">{c.userId ? "Vinculada" : "Sin usuario"}</td>
                  <td className="px-4 py-3 text-right">
                    {can("ASSIGNMENTS_MANAGE") && c.active && <Button size="sm" variant="soft" onClick={() => setAssigning(c)}>Asignar guías</Button>}
                    {can("COURIERS_MANAGE") && <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(c)} aria-label="Editar" />}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </QueryState>
      </Card>
      {editing && <CourierDrawer courier={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {assigning && <AssignModal courier={assigning} onClose={() => setAssigning(null)} />}
    </>
  );
}

function CourierDrawer({ courier, onClose }: { courier: Courier | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ name: courier?.name ?? "", phone: courier?.phone ?? "", email: courier?.email ?? "", zone: courier?.zone ?? "", vehicle: courier?.vehicle ?? "", plate: courier?.plate ?? "", status: courier?.status ?? "DISPONIBLE", active: courier?.active ?? true });
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => (courier ? api.put(`/couriers/${courier.id}`, { ...f, email: f.email || undefined, version: courier.version }) : api.post("/couriers", { ...f, email: f.email || undefined })),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.couriers }); toast.success("Repartidor guardado"); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Drawer open onClose={onClose} title={courier ? "Editar repartidor" : "Nuevo repartidor"}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!f.name.trim()} loading={save.isPending} onClick={() => save.mutate()}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required className="sm:col-span-2"><Input value={f.name} onChange={set("name")} /></Field>
        <Field label="Teléfono"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Correo"><Input value={f.email} onChange={set("email")} /></Field>
        <Field label="Zona"><Input value={f.zone} onChange={set("zone")} /></Field>
        <Field label="Vehículo"><Input value={f.vehicle} onChange={set("vehicle")} /></Field>
        <Field label="Placas"><Input value={f.plate} onChange={set("plate")} /></Field>
        <Field label="Estado"><Select value={f.status} onChange={set("status")}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Select></Field>
        {courier && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Activo</label>}
      </div>
      <p className="mt-4 text-[13px] text-muted">Para que el repartidor use la app, crea un usuario con rol Repartidor vinculado a este registro (Usuarios y permisos).</p>
      <div className="mt-3"><InlineError message={error} /></div>
    </Drawer>
  );
}

function AssignModal({ courier, onClose }: { courier: Courier; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const [q, setQ] = useState("");
  const guides = useGuides({ q: q || undefined, status: ["LISTA_SALIDA", "EN_TRANSITO", "RECIBIDA_DESTINO"], size: 50 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const assign = useMutation({
    mutationFn: () => api.post<{ assigned: number }>("/assignments", { courierId: courier.id, guideIds: [...selected] }),
    onSuccess: async (r) => { await invalidate(); toast.success(`${r.assigned} guías asignadas a ${courier.name}`); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={`Asignar guías a ${courier.name}`} description="Guías listas para salida, en tránsito o recibidas en destino."
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={selected.size === 0} loading={assign.isPending} onClick={() => assign.mutate()}>Asignar {selected.size}</Button></>}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar folio, destinatario o ciudad" aria-label="Buscar" />
      <ul className="mt-3 max-h-[50vh] divide-y divide-line-soft overflow-auto rounded-2xl border border-line">
        {guides.data?.content.map((g) => (
          <li key={g.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-canvas">
              <input type="checkbox" checked={selected.has(g.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })} />
              <span className="font-mono font-semibold">{g.reference}</span>
              <span className="flex-1 truncate text-sm text-muted">{g.recipientName} · {g.recipientCity ?? ""}</span>
              <GuideStatusBadge status={g.status} size="sm" />
            </label>
          </li>
        ))}
        {guides.data?.content.length === 0 && <li className="px-4 py-3 text-sm text-muted">Sin guías disponibles.</li>}
      </ul>
      <div className="mt-3"><InlineError message={error} /></div>
    </Modal>
  );
}
