"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, CalendarDays, Mail, MapPin, Package, Phone, Plus, Store, TrendingUp, Trophy, User, UserPlus } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { CHART_COLORS, ChartTooltip } from "@/components/ui/chart-card";
import { Field, Input, SearchBar, Select } from "@/components/ui/form";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Avatar, Card, EmptyState, InfoRow, PageHeader } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { useDemoState, useHydrated } from "@/hooks/use-demo";
import { CITY_NAMES, findCity } from "@/lib/constants";
import { saveSender } from "@/lib/services/salter-service";
import type { Sender } from "@/lib/types";
import { daysAgo, formatAddress, formatDate, formatMonth, formatNumber, monthKey, normalize, relativeTime } from "@/lib/utils";

export function SendersView() {
  const state = useDemoState();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "empresa" | "particular">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      state.senders.map((s) => {
        const list = state.shipments.filter((x) => x.senderId === s.id);
        const last = list.reduce<string | null>((m, x) => (!m || x.createdAt > m ? x.createdAt : m), null);
        return {
          sender: s,
          total: list.length,
          month: list.filter((x) => daysAgo(x.createdAt) < 30).length,
          active: list.filter((x) => x.status !== "entregado").length,
          last,
        };
      }),
    [state.senders, state.shipments],
  );

  const filtered = rows
    .filter((r) => (kind === "all" || r.sender.kind === kind) && normalize(`${r.sender.name} ${r.sender.contactName} ${r.sender.address.city}`).includes(normalize(query)))
    .sort((a, b) => b.month - a.month);

  const top = [...rows].sort((a, b) => b.month - a.month)[0];
  const monthTotal = rows.reduce((s, r) => s + r.month, 0);
  const selected = rows.find((r) => r.sender.id === selectedId);

  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Remitentes"
        description="Empresas y personas que envían paquetes con SALTER. Consulta su actividad y su historial."
        actions={
          <Button icon={<UserPlus className="size-5" />} onClick={() => setCreating(true)}>
            Nuevo remitente
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard className="col-span-2 sm:col-span-1" label="Remitentes registrados" value={formatNumber(state.senders.length)} icon={Store} tone="blue" hint={`${state.senders.filter((s) => s.kind === "empresa").length} empresas · ${state.senders.filter((s) => s.kind === "particular").length} particulares`} />
        <StatCard label="Envíos últimos 30 días" value={formatNumber(monthTotal)} icon={Package} tone="orange" hint="De todos los remitentes" />
        <StatCard label="Remitente más activo" value={top?.sender.name ?? "—"} icon={Trophy} tone="green" hint={top ? `${top.month} envíos en 30 días` : undefined} />
      </section>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-line-soft p-4 sm:flex-row sm:p-5">
          <SearchBar value={query} onChange={setQuery} placeholder="Buscar remitente, contacto o ciudad…" className="flex-1" label="Buscar remitentes" />
          <Select aria-label="Tipo de remitente" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="sm:w-48">
            <option value="all">Todos los tipos</option>
            <option value="empresa">Empresas</option>
            <option value="particular">Particulares</option>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Store} title="Sin remitentes" description="No encontramos remitentes con esos criterios." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line-soft text-xs font-bold uppercase tracking-wider text-muted">
                    <th className="px-5 py-3.5">Remitente</th>
                    <th className="px-4 py-3.5">Contacto</th>
                    <th className="px-4 py-3.5">Ciudad</th>
                    <th className="px-4 py-3.5 text-right">Envíos 30 d</th>
                    <th className="px-4 py-3.5 text-right">En curso</th>
                    <th className="hidden px-4 py-3.5 lg:table-cell">Último envío</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.sender.id} className="cursor-pointer border-b border-line-soft last:border-0 hover:bg-brand-50/40" onClick={() => setSelectedId(r.sender.id)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.sender.name} />
                          <div>
                            <p className="font-semibold text-ink">{r.sender.name}</p>
                            <Badge size="sm" tone={r.sender.kind === "empresa" ? "blue" : "sky"} icon={r.sender.kind === "empresa" ? Building2 : User}>
                              {r.sender.kind === "empresa" ? "Empresa" : "Particular"}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-ink-soft">{r.sender.contactName}</p>
                        <p className="text-[13px] text-muted">{r.sender.phone}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ink-soft">{r.sender.address.city}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-ink tabular-nums">{r.month}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-ink tabular-nums">{r.active}</td>
                      <td className="hidden px-4 py-3.5 text-sm text-muted lg:table-cell">{r.last ? relativeTime(r.last) : "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="soft">Ver detalle</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line-soft md:hidden">
              {filtered.map((r) => (
                <li key={r.sender.id}>
                  <button onClick={() => setSelectedId(r.sender.id)} className="flex w-full items-center gap-3 p-4 text-left">
                    <Avatar name={r.sender.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{r.sender.name}</span>
                      <span className="block text-[13px] text-muted">{r.sender.address.city} · {r.month} envíos en 30 días</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected?.sender.name ?? ""} description={selected ? `Cliente desde ${formatDate(selected.sender.since)}` : undefined} icon={<Store className="size-5" />}>
        {selected && <SenderDetail sender={selected.sender} />}
      </Drawer>
      <NewSenderModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function SenderDetail({ sender }: { sender: Sender }) {
  const state = useDemoState();
  const hydrated = useHydrated();
  const list = state.shipments.filter((s) => s.senderId === sender.id);
  const months = useMemo(() => {
    const m = new Map<string, { key: string; label: string; envios: number }>();
    for (const s of list) {
      const k = monthKey(s.createdAt);
      if (!m.has(k)) m.set(k, { key: k, label: formatMonth(s.createdAt), envios: 0 });
      m.get(k)!.envios++;
    }
    return [...m.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [list]);
  const recent = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <div className="space-y-6">
      <dl className="rounded-2xl border border-line px-4">
        <InfoRow label="Contacto" icon={User}>{sender.contactName}</InfoRow>
        <InfoRow label="Teléfono" icon={Phone}>{sender.phone}</InfoRow>
        <InfoRow label="Correo" icon={Mail}>{sender.email}</InfoRow>
        <InfoRow label="Dirección de recolección" icon={MapPin}>
          <span className="font-medium">{formatAddress(sender.address)}</span>
        </InfoRow>
      </dl>

      <div>
        <h3 className="mb-1 flex items-center gap-2 font-bold text-ink">
          <TrendingUp className="size-4 text-brand-500" aria-hidden /> Envíos por mes
        </h3>
        <p className="mb-3 text-sm text-muted">{formatNumber(list.length)} envíos en total</p>
        <div className="h-48">
          {hydrated && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#EEF5FF" }} />
                <Bar dataKey="envios" name="Envíos" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <CalendarDays className="size-4 text-brand-500" aria-hidden /> Envíos recientes
          </h3>
          <ButtonLink href={`/paquetes?q=${encodeURIComponent(sender.name)}`} size="sm" variant="ghost">
            Ver todos
          </ButtonLink>
        </div>
        <ul className="space-y-2">
          {recent.map((s) => (
            <li key={s.id}>
              <Link href={`/paquetes/${s.guia}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:bg-brand-50/40">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-bold text-ink">{s.guia}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {s.recipient.name} · {s.destination.city} · {formatDate(s.createdAt)}
                  </span>
                </span>
                <StatusBadge status={s.status} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const senderSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre del remitente."),
  kind: z.enum(["empresa", "particular"]),
  contactName: z.string().trim().min(3, "Escribe el nombre del contacto."),
  phone: z.string().trim().regex(/^[0-9\s()+-]{10,16}$/, "Escribe un teléfono de 10 dígitos."),
  email: z.string().trim().email("Revisa el formato del correo."),
  street: z.string().trim().min(5, "Escribe calle y número."),
  neighborhood: z.string().trim().min(2, "Escribe la colonia."),
  city: z.string().min(1, "Selecciona la ciudad."),
  zip: z.string().trim().regex(/^\d{5}$/, "El código postal tiene 5 dígitos."),
});
type SenderValues = z.infer<typeof senderSchema>;

function NewSenderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, reset, formState } = useForm<SenderValues>({
    resolver: zodResolver(senderSchema),
    defaultValues: { name: "", kind: "empresa", contactName: "", phone: "", email: "", street: "", neighborhood: "", city: "", zip: "" },
  });
  const e = formState.errors;
  const close = () => {
    reset();
    onClose();
  };
  const submit = (v: SenderValues) => {
    const s = saveSender({
      name: v.name,
      kind: v.kind,
      contactName: v.contactName,
      phone: v.phone,
      email: v.email,
      address: { street: v.street, neighborhood: v.neighborhood, city: v.city, state: findCity(v.city).state, zip: v.zip },
    });
    toast.success("Remitente registrado", `${s.name} ya puede enviar paquetes.`);
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Nuevo remitente"
      description="Registra una empresa o persona que enviará paquetes."
      icon={<UserPlus className="size-5" />}
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button icon={<Plus className="size-4" />} onClick={handleSubmit(submit)}>Guardar remitente</Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
        <Field label="Nombre o razón social" required error={e.name?.message} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.name} placeholder="Ej. Papelería La Pluma" {...register("name")} />}
        </Field>
        <Field label="Tipo" required>
          {(id) => (
            <Select id={id} {...register("kind")}>
              <option value="empresa">Empresa</option>
              <option value="particular">Particular</option>
            </Select>
          )}
        </Field>
        <Field label="Persona de contacto" required error={e.contactName?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.contactName} {...register("contactName")} />}
        </Field>
        <Field label="Teléfono" required error={e.phone?.message}>
          {(id, d) => <Input id={id} type="tel" aria-describedby={d} aria-invalid={!!e.phone} placeholder="777 123 4567" {...register("phone")} />}
        </Field>
        <Field label="Correo" required error={e.email?.message}>
          {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!e.email} placeholder="contacto@empresa.mx" {...register("email")} />}
        </Field>
        <Field label="Calle y número" required error={e.street?.message} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.street} {...register("street")} />}
        </Field>
        <Field label="Colonia" required error={e.neighborhood?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.neighborhood} {...register("neighborhood")} />}
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Ciudad" required error={e.city?.message}>
            {(id, d) => (
              <Select id={id} aria-describedby={d} aria-invalid={!!e.city} {...register("city")}>
                <option value="">Selecciona…</option>
                {CITY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="C.P." required error={e.zip?.message}>
            {(id, d) => <Input id={id} inputMode="numeric" maxLength={5} aria-describedby={d} aria-invalid={!!e.zip} {...register("zip")} />}
          </Field>
        </div>
      </form>
    </Modal>
  );
}
