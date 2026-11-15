"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClipboardList, Pencil, Plus, Route, Truck, Users } from "lucide-react";
import { InlineError, QueryState, Table } from "@/components/app/common";
import { GuideStatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useGuides, useInvalidateOperation, useRouteOverview, useUsers } from "@/lib/api/hooks";
import type { RouteOverview, ShippingRoute } from "@/lib/api/types";
import { printedFolio } from "@/lib/format";
import { useSession } from "@/lib/session";

const STATUS_COLS: { key: keyof RouteOverview["guidesByStatus"]; label: string }[] = [
  { key: "CONFIRMADA", label: "Confirmadas" }, { key: "LISTA_SALIDA", label: "Listas p/ salida" }, { key: "EN_TRANSITO", label: "En tránsito" },
  { key: "RECIBIDA_DESTINO", label: "En destino" }, { key: "CON_INCIDENCIA", label: "Incidencia" }, { key: "RETENIDA", label: "Retenidas" },
];

/**
 * Operaciones por ruta de embarque: catálogo de rutas, manifiesto en preparación, guías por estado y acceso a
 * guías, manifiestos y asignación de operadores. Las acciones se validan en el backend con los permisos del usuario.
 */
export function RoutesView() {
  const { can } = useSession();
  const overview = useRouteOverview();
  const [editing, setEditing] = useState<ShippingRoute | "new" | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const sel = overview.data?.find((o) => o.route.id === selected);

  return (
    <>
      <PageHeader eyebrow="Operaciones" title="Rutas de embarque" description="Cada guía confirmada entra al manifiesto en preparación de su ruta. Desde aquí supervisas rutas, manifiestos y guías, y cambias guías de ruta con motivo."
        actions={<>
          {can("ASSIGNMENTS_MANAGE", "COURIERS_MANAGE") && <ButtonLink href="/repartidores" variant="outline" icon={<Truck className="size-4" />}>Operadores y asignaciones</ButtonLink>}
          <ButtonLink href="/manifiestos" variant="outline" icon={<ClipboardList className="size-4" />}>Manifiestos</ButtonLink>
          {can("ROUTES_MANAGE") && <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Nueva ruta</Button>}
        </>} />
      <Card>
        <QueryState loading={overview.isLoading} error={overview.error} onRetry={() => overview.refetch()}>
          {overview.data?.length === 0 ? (
            <EmptyState icon={Route} title="Aún no hay rutas de embarque" description="Crea las rutas y asigna a cada remitente su ruta predeterminada (Remitentes → editar)." />
          ) : (
            <Table head={["Ruta", "Estado", "Responsable", "En preparación", "Sin manifiesto", ...STATUS_COLS.map((c) => c.label), ""]}>
              {overview.data?.map((o) => (
                <tr key={o.route.id} className={selected === o.route.id ? "bg-brand-50/60" : "hover:bg-canvas"}>
                  <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => setSelected(o.route.id)}><span className="font-mono font-bold text-brand-700">{o.route.code}</span><span className="block text-[13px] text-ink">{o.route.name}</span></button></td>
                  <td className="px-4 py-3">{o.route.active ? <Badge tone="green" size="sm">Activa</Badge> : <Badge tone="slate" size="sm">Inactiva</Badge>}</td>
                  <td className="px-4 py-3 text-[13px]">{o.route.responsible?.name ?? "—"}</td>
                  <td className="px-4 py-3">{o.openManifest ? <Link href={`/manifiestos/${o.openManifest.id}`} className="font-mono font-semibold text-brand-700">{o.openManifest.name}</Link> : "—"}{o.openManifest && <span className="block text-[12px] text-muted">{o.openManifestGuides} guías</span>}</td>
                  <td className="px-4 py-3">{o.pendingWithoutManifest > 0 ? <Badge tone="orange" size="sm">{o.pendingWithoutManifest}</Badge> : 0}</td>
                  {STATUS_COLS.map((c) => <td key={c.key} className="px-4 py-3">{o.guidesByStatus[c.key] ?? 0}</td>)}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(o.route.id)}>Ver guías</Button>
                    {can("ROUTES_MANAGE") && <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} aria-label={`Editar ${o.route.code}`} onClick={() => setEditing(o.route)} />}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </QueryState>
      </Card>
      {sel && <RouteGuides o={sel} />}
      {editing && <RouteEditor route={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function RouteGuides({ o }: { o: RouteOverview }) {
  const q = useGuides({ shippingRouteId: o.route.id, status: ["CONFIRMADA", "LISTA_SALIDA", "EN_TRANSITO", "RECIBIDA_DESTINO", "CON_INCIDENCIA", "RETENIDA"], size: 50 });
  return (
    <Card className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <p className="font-bold text-ink">Guías vigentes de la ruta {o.route.code}</p>
        <p className="text-[13px] text-muted">Para cambiar una guía de ruta, ábrela y usa «Cambiar ruta» (se pide motivo).</p>
      </div>
      <QueryState loading={q.isLoading} error={q.error}>
        {q.data?.content.length === 0 ? <EmptyState icon={ClipboardList} title="Sin guías vigentes en esta ruta" /> : (
          <Table head={["Folio", "Estado", "Cliente", "Subruta", "Piezas", "Remitente", "Elaboró"]}>
            {q.data?.content.map((g) => (
              <tr key={g.id} className="hover:bg-canvas">
                <td className="px-4 py-3 font-mono font-semibold text-brand-700"><Link href={`/guias/${g.id}`}>{g.folio ? printedFolio(g.folio) : g.reference}</Link></td>
                <td className="px-4 py-3"><GuideStatusBadge status={g.status} size="sm" /></td>
                <td className="px-4 py-3">{g.recipientName}</td>
                <td className="px-4 py-3 font-mono">{g.subRoute ?? "—"}</td>
                <td className="px-4 py-3">{g.packageCount ?? "—"}</td>
                <td className="px-4 py-3">{g.senderName}</td>
                <td className="px-4 py-3 text-[13px] text-muted">{g.createdBy.name}</td>
              </tr>
            ))}
          </Table>
        )}
      </QueryState>
    </Card>
  );
}

function RouteEditor({ route, onClose }: { route: ShippingRoute | null; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateOperation();
  const staff = useUsers({ active: true });
  const [code, setCode] = useState(route?.code ?? "");
  const [name, setName] = useState(route?.name ?? "");
  const [active, setActive] = useState(route?.active ?? true);
  const [responsible, setResponsible] = useState(route?.responsible ? String(route.responsible.id) : "");
  const [notes, setNotes] = useState(route?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => {
      const body = { code, name, active, responsibleUserId: responsible ? Number(responsible) : undefined, notes, version: route?.version };
      return route ? api.put<ShippingRoute>(`/shipping-routes/${route.id}`, body) : api.post<ShippingRoute>("/shipping-routes", body);
    },
    onSuccess: async (r) => { await invalidate(); toast.success(`Ruta ${r.code} guardada`); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} title={route ? `Editar ruta ${route.code}` : "Nueva ruta de embarque"} icon={<Route className="size-5 text-brand-600" />}
      description="La ruta de embarque organiza los manifiestos de salida. Es distinta de la ruta y la subruta del cliente."
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={m.isPending} disabled={!code.trim() || !name.trim()} onClick={() => { setError(null); m.mutate(); }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Clave" required hint="Ej. OAX-1"><Input value={code} maxLength={20} className="font-mono uppercase" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} /></Field>
        <Field label="Nombre" required><Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Responsable (opcional)" className="sm:col-span-2">
          <Select value={responsible} onChange={(e) => setResponsible(e.target.value)}>
            <option value="">Sin responsable</option>
            {staff.data?.content.filter((u) => ["ADMIN", "OPERACIONES", "ENCARGADO"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.fullName} · {u.roleName}</option>)}
          </Select>
        </Field>
        <Field label="Observaciones" className="sm:col-span-2"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ruta activa</label>
        <p className="flex items-center gap-1.5 text-[12px] text-muted sm:col-span-2"><Users className="size-3.5" /> La lista de responsables requiere permiso de administrar usuarios; si no lo tienes queda vacía.</p>
        <div className="sm:col-span-2"><InlineError message={error} /></div>
      </div>
    </Modal>
  );
}
