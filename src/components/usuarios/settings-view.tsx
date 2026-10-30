"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Check, Database, Palette, RotateCcw, Settings2 } from "lucide-react";
import { Logo, type LogoVariant } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Card, CardHeader, PageHeader, Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { resetDemo, updateSettings } from "@/lib/services/salter-service";
import type { Settings } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

type Tab = "general" | "marca" | "operacion" | "demo";

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("general");
  return (
    <>
      <PageHeader eyebrow="Administración" title="Configuración" description="Datos de la empresa, identidad de marca y reglas de operación del sistema." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6"
        items={[
          { value: "general", label: "Datos de la empresa" },
          { value: "marca", label: "Identidad SALTER" },
          { value: "operacion", label: "Operación" },
          { value: "demo", label: "Datos de demostración" },
        ]}
      />
      {tab === "general" && <GeneralSettings />}
      {tab === "marca" && <BrandSettings />}
      {tab === "operacion" && <OperationSettings />}
      {tab === "demo" && <DemoSettings />}
    </>
  );
}

const schema = z.object({
  companyName: z.string().trim().min(2, "Escribe el nombre comercial."),
  slogan: z.string().trim().min(2, "Escribe el eslogan."),
  phone: z.string().trim().regex(/^[0-9\s()+-]{10,16}$/, "Escribe un teléfono de 10 dígitos."),
  email: z.string().trim().email("Revisa el formato del correo."),
  address: z.string().trim().min(8, "Escribe la dirección completa."),
  hours: z.string().trim().min(4, "Escribe el horario de atención."),
});
type Values = z.infer<typeof schema>;

function GeneralSettings() {
  const state = useDemoState();
  const toast = useToast();
  const s = state.settings;
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { companyName: s.companyName, slogan: s.slogan, phone: s.phone, email: s.email, address: s.address, hours: s.hours },
  });
  const e = formState.errors;
  return (
    <Card className="max-w-4xl">
      <CardHeader title="Datos de la empresa" description="Se muestran en el portal de rastreo, comprobantes y correos." icon={Building2} />
      <form
        className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"
        noValidate
        onSubmit={handleSubmit((v) => {
          updateSettings(v);
          toast.success("Configuración guardada", "Los datos de la empresa se actualizaron.");
        })}
      >
        <Field label="Nombre comercial" required error={e.companyName?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.companyName} {...register("companyName")} />}
        </Field>
        <Field label="Eslogan" required error={e.slogan?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.slogan} {...register("slogan")} />}
        </Field>
        <Field label="Teléfono de atención" required error={e.phone?.message}>
          {(id, d) => <Input id={id} type="tel" aria-describedby={d} aria-invalid={!!e.phone} {...register("phone")} />}
        </Field>
        <Field label="Correo de contacto" required error={e.email?.message}>
          {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!e.email} {...register("email")} />}
        </Field>
        <Field label="Dirección de la sucursal principal" required error={e.address?.message} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.address} {...register("address")} />}
        </Field>
        <Field label="Horario de atención" required error={e.hours?.message} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.hours} {...register("hours")} />}
        </Field>
        <div className="flex justify-end border-t border-line-soft pt-5 sm:col-span-2">
          <Button type="submit" icon={<Check className="size-4" />}>Guardar cambios</Button>
        </div>
      </form>
    </Card>
  );
}

const LOGO_USES: { variant: LogoVariant; title: string; use: string; dark?: boolean }[] = [
  { variant: "horizontal", title: "Principal horizontal", use: "Login y portal de rastreo" },
  { variant: "compacto", title: "Horizontal compacto", use: "Barra lateral, portal y app" },
  { variant: "vertical", title: "Principal vertical", use: "Pantalla de bienvenida" },
  { variant: "isotipo", title: "Isotipo", use: "Ícono del sitio y menú contraído" },
  { variant: "mono", title: "Monocromático", use: "Documentos e impresiones" },
  { variant: "oscuro", title: "Para fondo oscuro", use: "Paneles navy y app del repartidor", dark: true },
];

const COLORS = [
  { name: "Azul SALTER", hex: "#0B5CD5", cls: "bg-brand-500", text: "text-white", use: "Navegación, enlaces y elementos base" },
  { name: "Naranja SALTER", hex: "#FF7A00", cls: "bg-accent-500", text: "text-white", use: "Acentos y llamadas de atención" },
  { name: "Naranja acción", hex: "#E35D00", cls: "bg-accent-600", text: "text-white", use: "Botones principales (contraste AA)" },
  { name: "Azul cielo", hex: "#00A3F0", cls: "bg-sky-brand", text: "text-white", use: "Degradados e íconos" },
  { name: "Navy", hex: "#011638", cls: "bg-navy", text: "text-white", use: "Fondos oscuros y paneles" },
  { name: "Blanco", hex: "#FFFFFF", cls: "bg-white ring-1 ring-line", text: "text-ink", use: "Superficies y tarjetas" },
];

function BrandSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Variantes del logotipo" description="Archivos oficiales ubicados en public/branding" icon={Palette} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
          {LOGO_USES.map((l) => (
            <div key={l.variant} className="overflow-hidden rounded-2xl border border-line">
              <div className={cn("grid h-40 place-items-center p-6", l.dark ? "bg-navy" : "bg-dots bg-canvas")}>
                <Logo variant={l.variant} height={l.variant === "compacto" || l.variant === "horizontal" ? 56 : 112} />
              </div>
              <div className="border-t border-line-soft px-4 py-3">
                <p className="font-bold text-ink">{l.title}</p>
                <p className="text-[13px] text-muted">{l.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Paleta de colores" description="Tonos extraídos de los logotipos de SALTER" icon={Palette} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
          {COLORS.map((c) => (
            <div key={c.hex} className="flex items-center gap-4 rounded-2xl border border-line p-3">
              <span className={cn("grid size-16 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold", c.cls, c.text)}>{c.hex}</span>
              <div>
                <p className="font-bold text-ink">{c.name}</p>
                <p className="text-[13px] text-muted">{c.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OperationSettings() {
  const state = useDemoState();
  const toast = useToast();
  const s = state.settings;
  const toggle = (key: keyof Pick<Settings, "requirePhoto" | "requireSignature" | "notifyEmail" | "publicTracking">, label: string) => (v: boolean) => {
    updateSettings({ [key]: v });
    toast.success("Ajuste guardado", `${label}: ${v ? "activado" : "desactivado"}.`);
  };
  return (
    <Card className="max-w-3xl">
      <CardHeader title="Reglas de operación" description="Definen cómo trabajan los repartidores y qué ven tus clientes." icon={Settings2} />
      <div className="divide-y divide-line-soft px-5 py-2 sm:px-6">
        <div className="py-4">
          <Switch checked={s.requirePhoto} onChange={toggle("requirePhoto", "Foto obligatoria")} label="Fotografía obligatoria al entregar" description="El repartidor no podrá confirmar la entrega sin tomar una foto." />
        </div>
        <div className="py-4">
          <Switch checked={s.requireSignature} onChange={toggle("requireSignature", "Firma obligatoria")} label="Firma del destinatario obligatoria" description="Se solicita la firma en pantalla antes de confirmar." />
        </div>
        <div className="py-4">
          <Switch checked={s.notifyEmail} onChange={toggle("notifyEmail", "Avisos por correo")} label="Avisos por correo al remitente" description="Notificar cuando el paquete se entrega o tiene una incidencia (simulado en la demo)." />
        </div>
        <div className="py-4">
          <Switch checked={s.publicTracking} onChange={toggle("publicTracking", "Rastreo público")} label="Portal de rastreo público" description="Cualquier persona con el número de guía puede consultar su estado." />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-[15px] font-semibold text-ink">Prefijo de guías</p>
            <p className="text-sm text-muted">Ejemplo de la siguiente guía: <span className="font-mono font-bold text-ink">{s.guidePrefix}-{String(state.seq.guia + 1).padStart(6, "0")}</span></p>
          </div>
          <Input
            aria-label="Prefijo de guías"
            className="w-28 font-mono uppercase"
            maxLength={4}
            defaultValue={s.guidePrefix}
            onBlur={(e) => {
              const v = e.target.value.trim().toUpperCase();
              if (v && v !== s.guidePrefix) {
                updateSettings({ guidePrefix: v });
                toast.success("Prefijo actualizado", `Las nuevas guías iniciarán con ${v}-`);
              }
            }}
          />
        </div>
      </div>
    </Card>
  );
}

function DemoSettings() {
  const state = useDemoState();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <Card className="max-w-3xl">
      <CardHeader title="Datos de demostración" description="Esta versión funciona con información ficticia guardada en tu navegador." icon={Database} />
      <div className="space-y-5 p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Paquetes", state.shipments.length],
            ["Incidencias", state.incidents.length],
            ["Remitentes", state.senders.length],
            ["Usuarios", state.users.length],
          ].map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-canvas p-4">
              <dd className="font-display text-2xl font-bold text-ink">{formatNumber(Number(n))}</dd>
              <dt className="text-[13px] text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        <div className="rounded-2xl border border-accent-100 bg-accent-50 p-4 text-sm text-accent-700">
          Al restaurar se eliminarán los paquetes, incidencias, usuarios y ajustes que hayas creado o modificado durante la demostración.
        </div>
        <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirm(true)}>
          Restaurar datos originales
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          resetDemo();
          toast.success("Datos restaurados", "La demostración volvió a su estado original.");
        }}
        title="¿Restaurar datos de demostración?"
        description="Se perderán todos los cambios realizados en esta demo. Esta acción no se puede deshacer."
        confirmLabel="Sí, restaurar"
      />
    </Card>
  );
}
