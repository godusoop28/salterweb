"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, KeyRound, Lock, Pencil, Power, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { RoleBadge, UserStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, SearchBar, Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Avatar, Card, CardHeader, EmptyState, PageHeader, Tabs } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { PERMISSION_LABEL, ROLE_LABEL, USER_STATUS_LABEL } from "@/lib/constants";
import { deleteUser, saveUser, updateSettings } from "@/lib/services/salter-service";
import type { Permission, Role, User, UserStatus } from "@/lib/types";
import { cn, normalize, relativeTime } from "@/lib/utils";

const ROLES: Role[] = ["admin", "supervisor", "repartidor", "remitente"];
const ADMIN_PERMISSIONS: Permission[] = ["dashboard", "paquetes", "repartidores", "remitentes", "incidencias", "reportes", "usuarios", "configuracion"];

export function UsersView() {
  const state = useDemoState();
  const toast = useToast();
  const [role, setRole] = useState<Role | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const filtered = useMemo(
    () => state.users.filter((u) => (role === "all" || u.role === role) && normalize(`${u.name} ${u.email}`).includes(normalize(query))),
    [state.users, role, query],
  );
  const count = (r: Role) => state.users.filter((u) => u.role === r).length;
  const sessionId = state.session?.userId;

  const userActions = (u: User, className = "justify-end") => (
    <div className={cn("flex gap-1", className)}>
      <button onClick={() => setEditing(u)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-600" aria-label={`Editar a ${u.name}`} title="Editar">
        <Pencil className="size-4" />
      </button>
      <button
        onClick={() => {
          const next: UserStatus = u.status === "activo" ? "inactivo" : "activo";
          saveUser({ name: u.name, email: u.email, phone: u.phone, role: u.role, status: next }, u.id);
          toast.success(next === "activo" ? "Usuario activado" : "Usuario desactivado", u.name);
        }}
        disabled={u.id === sessionId}
        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-accent-50 hover:text-accent-700 disabled:opacity-30"
        aria-label={u.status === "activo" ? `Desactivar a ${u.name}` : `Activar a ${u.name}`}
        title={u.status === "activo" ? "Desactivar" : "Activar"}
      >
        <Power className="size-4" />
      </button>
      <button
        onClick={() => setDeleting(u)}
        disabled={u.id === sessionId}
        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
        aria-label={`Eliminar a ${u.name}`}
        title="Eliminar"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );

  const togglePermission = (r: Role, p: Permission) => {
    const current = state.settings.permissions[r];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    updateSettings({ permissions: { ...state.settings.permissions, [r]: next } });
    toast.success("Permisos actualizados", `${ROLE_LABEL[r]}: ${PERMISSION_LABEL[p]} ${current.includes(p) ? "desactivado" : "activado"}.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y permisos"
        description="Controla quién accede al sistema y qué puede hacer cada perfil."
        actions={
          <Button icon={<UserPlus className="size-5" />} onClick={() => setEditing("new")}>
            Agregar usuario
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Usuarios totales" value={String(state.users.length)} icon={Users} tone="blue" hint={`${state.users.filter((u) => u.status === "activo").length} activos`} />
        <StatCard label="Administración" value={String(count("admin") + count("supervisor"))} icon={ShieldCheck} tone="navy" hint="Administradores y supervisores" />
        <StatCard label="Repartidores" value={String(count("repartidor"))} icon={KeyRound} tone="orange" hint="Con acceso a la app" />
        <StatCard label="Remitentes" value={String(count("remitente"))} icon={Lock} tone="sky" hint="Con acceso al portal" />
      </section>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-line-soft p-4 sm:p-5 lg:flex-row lg:items-center">
          <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre o correo…" className="flex-1" label="Buscar usuarios" />
          <Tabs
            value={role}
            onChange={setRole}
            items={[{ value: "all" as const, label: "Todos", count: state.users.length }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r].split(" ")[0], count: count(r) }))]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Sin usuarios" description="No hay usuarios con esos criterios." />
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line-soft text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">Usuario</th>
                  <th className="px-4 py-3.5">Rol</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Último acceso</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-line-soft last:border-0 hover:bg-brand-50/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div>
                          <p className="font-semibold text-ink">
                            {u.name} {u.id === sessionId && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">Tú</span>}
                          </p>
                          <p className="text-[13px] text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><UserStatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted">{u.lastAccess ? relativeTime(u.lastAccess) : "Nunca"}</td>
                    <td className="px-5 py-3">
                      {userActions(u)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line-soft md:hidden">
            {filtered.map((u) => (
              <li key={u.id} className="flex items-start gap-3 px-5 py-4">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {u.name} {u.id === sessionId && <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">Tú</span>}
                  </p>
                  <p className="truncate text-[13px] text-muted">{u.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <RoleBadge role={u.role} />
                    <UserStatusBadge status={u.status} />
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted">Último acceso: {u.lastAccess ? relativeTime(u.lastAccess) : "Nunca"}</p>
                  {userActions(u, "-ml-2 mt-1")}
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Roles y permisos" description="Activa o desactiva los módulos a los que puede entrar cada rol." icon={ShieldCheck} />
        <div className="mt-4 overflow-x-auto pb-2">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-y border-line-soft bg-canvas/60 text-xs font-bold uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Módulo</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-3 text-center">{ROLE_LABEL[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERMISSION_LABEL) as Permission[]).map((p) => (
                <tr key={p} className="border-b border-line-soft last:border-0">
                  <td className="px-6 py-3 text-[15px] font-medium text-ink-soft">{PERMISSION_LABEL[p]}</td>
                  {ROLES.map((r) => {
                    const on = state.settings.permissions[r].includes(p);
                    const locked = r === "admin" && ADMIN_PERMISSIONS.includes(p);
                    return (
                      <td key={r} className="px-4 py-3 text-center">
                        <button
                          onClick={() => !locked && togglePermission(r, p)}
                          disabled={locked}
                          aria-pressed={on}
                          aria-label={`${PERMISSION_LABEL[p]} para ${ROLE_LABEL[r]}`}
                          title={locked ? "El administrador siempre tiene este acceso" : undefined}
                          className={cn(
                            "inline-grid size-8 place-items-center rounded-lg border-2 transition-all",
                            on ? "border-brand-500 bg-brand-500 text-white" : "border-line text-transparent hover:border-brand-300",
                            locked && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Check className="size-4" aria-hidden />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-6 pb-5 text-[13px] text-muted">En la demostración los permisos se guardan como configuración; la versión final los aplicará en el servidor.</p>
      </Card>

      <UserModal user={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteUser(deleting.id);
          toast.success("Usuario eliminado", deleting.name);
        }}
        title={`¿Eliminar a ${deleting?.name ?? ""}?`}
        description="La persona perderá el acceso al sistema. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
      />
    </>
  );
}

const schema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre completo."),
  email: z.string().trim().email("Revisa el formato del correo."),
  phone: z.string().trim().regex(/^[0-9\s()+-]{10,16}$/, "Escribe un teléfono de 10 dígitos."),
  role: z.enum(["admin", "supervisor", "repartidor", "remitente"]),
  status: z.enum(["activo", "inactivo", "pendiente"]),
});
type Values = z.infer<typeof schema>;

function UserModal({ user, onClose }: { user: User | "new" | null; onClose: () => void }) {
  const isNew = user === "new";
  const existing = user && user !== "new" ? user : null;
  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={isNew ? "Agregar usuario" : "Editar usuario"}
      description={isNew ? "Se enviará una invitación por correo (simulado en la demo)." : existing?.email}
      icon={isNew ? <UserPlus className="size-5" /> : <Pencil className="size-5" />}
    >
      {user && <UserForm key={existing?.id ?? "new"} user={existing} onDone={onClose} />}
    </Modal>
  );
}

function UserForm({ user, onDone }: { user: User | null; onDone: () => void }) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: user ? { name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status } : { name: "", email: "", phone: "", role: "supervisor", status: "pendiente" },
  });
  const e = formState.errors;
  const submit = (v: Values) => {
    const res = saveUser(v, user?.id);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    toast.success(user ? "Cambios guardados" : "Usuario agregado", res.data.name);
    onDone();
  };
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
      <Field label="Nombre completo" required error={e.name?.message} className="sm:col-span-2">
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.name} {...register("name")} />}
      </Field>
      <Field label="Correo electrónico" required error={e.email?.message}>
        {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!e.email} {...register("email")} />}
      </Field>
      <Field label="Teléfono" required error={e.phone?.message}>
        {(id, d) => <Input id={id} type="tel" aria-describedby={d} aria-invalid={!!e.phone} placeholder="777 123 4567" {...register("phone")} />}
      </Field>
      <Field label="Rol" required>
        {(id) => (
          <Select id={id} {...register("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Estado de la cuenta" required>
        {(id) => (
          <Select id={id} {...register("status")}>
            {(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((s) => (
              <option key={s} value={s}>{USER_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        )}
      </Field>
      {serverError && <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 sm:col-span-2" role="alert">{serverError}</p>}
      <div className="flex justify-end gap-2 border-t border-line-soft pt-4 sm:col-span-2">
        <Button variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="submit" icon={<Check className="size-4" />}>{user ? "Guardar cambios" : "Agregar usuario"}</Button>
      </div>
    </form>
  );
}
