"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Pencil, Plus, ShieldCheck, UserCog } from "lucide-react";
import { InlineError, QueryState, Table } from "@/components/app/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Card, EmptyState, PageHeader, Pagination, Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { qk, useCouriers, usePermissionCatalog, useRoles, useSenders, useUsers } from "@/lib/api/hooks";
import type { Permission, RoleCode, RoleInfo, UserAccount } from "@/lib/api/types";
import { fmtDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";

export function UsersView() {
  const { can } = useSession();
  const [tab, setTab] = useState<"users" | "roles">("users");
  return (
    <>
      <PageHeader title="Usuarios y permisos" description="Las cuentas, roles y permisos se validan en el servidor en cada operación." />
      {can("ROLES_MANAGE") && <div className="mb-4"><Tabs value={tab} onChange={setTab} items={[{ value: "users", label: "Usuarios" }, { value: "roles", label: "Roles y permisos" }]} /></div>}
      {tab === "users" ? <UsersTab /> : <RolesTab />}
    </>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const roles = useRoles();
  const list = useUsers({ q: q || undefined, role: role || undefined, page: page - 1 });
  const [editing, setEditing] = useState<UserAccount | "new" | null>(null);
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  return (
    <>
      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <Input placeholder="Buscar por nombre o correo" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Buscar" />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Rol" className="sm:max-w-xs">
          <option value="">Todos los roles</option>{roles.data?.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
        </Select>
        <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Nuevo usuario</Button>
      </Card>
      <Card>
        <QueryState loading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {list.data?.content.length === 0 ? <EmptyState icon={UserCog} title="Sin usuarios" /> : (
            <>
              <Table head={["Usuario", "Rol", "Remitente / repartidor", "Estado", "Último acceso", ""]}>
                {list.data?.content.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3"><p className="font-semibold text-ink">{u.fullName}</p><p className="text-[13px] text-muted">{u.email}</p></td>
                    <td className="px-4 py-3">{u.roleName}{(u.grantedPermissions.length > 0 || u.revokedPermissions.length > 0) && <span className="ml-1 text-[12px] text-accent-600">(ajustado)</span>}</td>
                    <td className="px-4 py-3 text-ink-soft">{u.sender?.name ?? u.courier?.name ?? "—"}</td>
                    <td className="px-4 py-3">{u.locked ? <Badge tone="red" size="sm" icon={Lock}>Bloqueado</Badge> : u.active ? <Badge tone="green" size="sm">Activo</Badge> : <Badge tone="slate" size="sm">Inactivo</Badge>}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(u)}>Editar</Button>
                      <Button size="sm" variant="ghost" icon={<KeyRound className="size-4" />} onClick={() => setResetting(u)} aria-label="Restablecer contraseña" />
                    </td>
                  </tr>
                ))}
              </Table>
              {list.data && list.data.totalPages > 1 && <div className="border-t border-line-soft p-4"><Pagination page={page} pageCount={list.data.totalPages} total={list.data.totalElements} pageSize={list.data.size} onChange={setPage} /></div>}
            </>
          )}
        </QueryState>
      </Card>
      {editing && <UserDrawer user={editing === "new" ? null : editing} roles={roles.data ?? []} onClose={() => setEditing(null)} />}
      {resetting && <ResetPassword user={resetting} onClose={() => setResetting(null)} />}
    </>
  );
}

function UserDrawer({ user, roles, onClose }: { user: UserAccount | null; roles: RoleInfo[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const senders = useSenders({ active: true });
  const couriers = useCouriers(true);
  const catalog = usePermissionCatalog();
  const [f, setF] = useState({
    email: user?.email ?? "", fullName: user?.fullName ?? "", phone: user?.phone ?? "", role: (user?.role ?? "CAPTURISTA") as RoleCode,
    password: "", senderId: user?.sender ? String(user.sender.id) : "", courierId: user?.courier ? String(user.courier.id) : "", active: user?.active ?? true,
  });
  const [granted, setGranted] = useState<Set<Permission>>(new Set(user?.grantedPermissions ?? []));
  const [revoked, setRevoked] = useState<Set<Permission>>(new Set(user?.revokedPermissions ?? []));
  const [error, setError] = useState<string | null>(null);
  const roleInfo = roles.find((r) => r.code === f.role);
  const rolePerms = new Set(roleInfo?.permissions ?? []);

  const save = useMutation({
    mutationFn: () => {
      const body = { email: f.email, fullName: f.fullName, phone: f.phone || undefined, role: f.role, senderId: f.senderId ? Number(f.senderId) : undefined,
        courierId: f.courierId ? Number(f.courierId) : undefined, grantedPermissions: [...granted], revokedPermissions: [...revoked] };
      return user ? api.put(`/users/${user.id}`, { ...body, active: f.active, version: user.version }) : api.post("/users", { ...body, password: f.password });
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.users }); toast.success("Usuario guardado"); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });

  const toggle = (p: Permission) => {
    if (rolePerms.has(p)) {
      setRevoked((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
    } else {
      setGranted((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
    }
  };
  const effective = (p: Permission) => (rolePerms.has(p) && !revoked.has(p)) || granted.has(p);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Drawer open onClose={onClose} size="lg" title={user ? "Editar usuario" : "Nuevo usuario"}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={save.isPending} disabled={!f.email || !f.fullName || (!user && f.password.length < 10)} onClick={() => { setError(null); save.mutate(); }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" required><Input value={f.fullName} onChange={set("fullName")} /></Field>
        <Field label="Correo" required><Input type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="Teléfono"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Rol" required><Select value={f.role} onChange={(e) => { setF({ ...f, role: e.target.value as RoleCode }); setGranted(new Set()); setRevoked(new Set()); }}>{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</Select></Field>
        {!user && <Field label="Contraseña inicial" hint="10+ caracteres con letras y números" required><Input type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>}
        <Field label="Remitente asignado" hint={f.role === "CAPTURISTA" ? "Remitente por defecto del capturista" : f.role === "REMITENTE" ? "Obligatorio: sólo verá sus envíos" : "Opcional"}>
          <Select value={f.senderId} onChange={set("senderId")}><option value="">Ninguno</option>{senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </Field>
        {(f.role === "REPARTIDOR" || f.courierId) && (
          <Field label="Repartidor vinculado" required={f.role === "REPARTIDOR"}><Select value={f.courierId} onChange={set("courierId")}><option value="">Ninguno</option>{couriers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        )}
        {user && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Cuenta activa</label>}
      </div>
      <div className="mt-6">
        <h4 className="mb-1 flex items-center gap-2 font-bold text-ink"><ShieldCheck className="size-4 text-brand-600" /> Permisos efectivos</h4>
        <p className="mb-3 text-[13px] text-muted">Marcados por el rol «{roleInfo?.name}». Puedes conceder o retirar permisos sólo a este usuario (p. ej. permitir que un capturista confirme guías o importe destinatarios).</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {catalog.data?.map((p) => (
            <label key={p.code} className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-canvas">
              <input type="checkbox" className="mt-0.5" checked={effective(p.code)} onChange={() => toggle(p.code)} />
              <span><span className="text-ink">{p.description}</span>
                {granted.has(p.code) && <span className="ml-1 text-[11px] font-bold text-emerald-700">+ concedido</span>}
                {revoked.has(p.code) && <span className="ml-1 text-[11px] font-bold text-red-600">− retirado</span>}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4"><InlineError message={error} /></div>
    </Drawer>
  );
}

function ResetPassword({ user, onClose }: { user: UserAccount; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: async () => { await api.post(`/users/${user.id}/reset-password`, { password: pw }); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.users }); toast.success("Contraseña restablecida", "Se cerraron sus sesiones activas."); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Restablecer contraseña" description={user.email}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={pw.length < 10} loading={m.isPending} onClick={() => m.mutate()}>Guardar</Button></>}>
      <Field label="Nueva contraseña" hint="10+ caracteres con letras y números"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
      <div className="mt-3"><InlineError message={error} /></div>
    </Modal>
  );
}

function RolesTab() {
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const qc = useQueryClient();
  const toast = useToast();
  const [roleId, setRoleId] = useState<number | null>(null);
  const role = roles.data?.find((r) => r.id === roleId) ?? roles.data?.[0];
  const [perms, setPerms] = useState<Set<Permission> | null>(null);
  const current = perms ?? new Set(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api.put(`/roles/${role!.id}/permissions`, { permissions: [...current] }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.users }); setPerms(null); toast.success("Permisos del rol actualizados"); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Card className="p-5">
      <QueryState loading={roles.isLoading || catalog.isLoading} error={roles.error ?? catalog.error}>
        <div className="mb-4 flex flex-wrap gap-2">
          {roles.data?.map((r) => <Button key={r.id} size="sm" variant={r.id === role?.id ? "secondary" : "outline"} onClick={() => { setRoleId(r.id); setPerms(null); }}>{r.name}</Button>)}
        </div>
        <p className="mb-3 text-sm text-muted">{role?.description}</p>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.data?.map((p) => (
            <label key={p.code} className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-canvas">
              <input type="checkbox" className="mt-0.5" checked={current.has(p.code)} onChange={() => { const n = new Set(current); if (n.has(p.code)) n.delete(p.code); else n.add(p.code); setPerms(n); }} />
              <span className="text-ink">{p.description}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3"><Button disabled={!perms} loading={save.isPending} onClick={() => { setError(null); save.mutate(); }}>Guardar permisos del rol</Button><InlineError message={error} /></div>
      </QueryState>
    </Card>
  );
}
