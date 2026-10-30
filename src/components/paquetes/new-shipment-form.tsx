"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, FileText, Package, PackageCheck, PackagePlus, Plus, Zap } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { useDemoState } from "@/hooks/use-demo";
import { CITY_NAMES, PACKAGE_TYPE_LABEL } from "@/lib/constants";
import { createShipment } from "@/lib/services/salter-service";
import type { PackageType, Shipment } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const phoneRegex = /^[0-9\s()+-]{10,16}$/;

const schema = z.object({
  senderId: z.string().min(1, "Selecciona el remitente."),
  originStreet: z.string().trim().min(5, "Escribe la dirección de recolección."),
  originCity: z.string().min(1, "Selecciona la ciudad de origen."),
  recipientName: z.string().trim().min(3, "Escribe el nombre completo del destinatario."),
  recipientPhone: z.string().trim().regex(phoneRegex, "Escribe un teléfono de 10 dígitos."),
  destStreet: z.string().trim().min(5, "Escribe calle y número."),
  destNeighborhood: z.string().trim().min(2, "Escribe la colonia."),
  destCity: z.string().min(1, "Selecciona la ciudad destino."),
  destZip: z.string().trim().regex(/^\d{5}$/, "El código postal tiene 5 dígitos."),
  description: z.string().trim().min(3, "Describe brevemente el contenido."),
  type: z.enum(["sobre", "chico", "mediano", "grande"]),
  weightKg: z.number({ error: "Indica el peso en kilogramos." }).positive("El peso debe ser mayor a 0.").max(70, "El peso máximo es 70 kg."),
  declaredValue: z.number({ error: "Indica el valor declarado." }).min(0, "El valor no puede ser negativo."),
  service: z.enum(["estandar", "express"]),
  notes: z.string().max(240, "Máximo 240 caracteres.").optional(),
});

export type NewShipmentValues = z.infer<typeof schema>;

const TYPE_HINT: Record<PackageType, string> = {
  sobre: "Documentos · hasta 0.5 kg",
  chico: "Hasta 3 kg",
  mediano: "Hasta 10 kg",
  grande: "Más de 10 kg",
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se indica, el remitente queda fijo (portal del cliente). */
  fixedSenderId?: string;
  detailHref?: (s: Shipment) => string;
}

export function NewShipmentModal({ open, onClose, fixedSenderId, detailHref = (s) => `/paquetes/${s.guia}` }: Props) {
  const [created, setCreated] = useState<Shipment | null>(null);
  const close = () => {
    setCreated(null);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={created ? "¡Paquete registrado!" : "Registrar nuevo paquete"}
      description={created ? undefined : "Completa los datos. Los campos con * son obligatorios."}
      icon={created ? <PackageCheck className="size-5" /> : <PackagePlus className="size-5" />}
    >
      {created ? (
        <ShipmentCreated shipment={created} onAnother={() => setCreated(null)} onClose={close} detailHref={detailHref(created)} />
      ) : (
        <NewShipmentForm fixedSenderId={fixedSenderId} onCreated={setCreated} onCancel={close} />
      )}
    </Modal>
  );
}

export function NewShipmentForm({
  fixedSenderId,
  onCreated,
  onCancel,
}: {
  fixedSenderId?: string;
  onCreated: (s: Shipment) => void;
  onCancel?: () => void;
}) {
  const state = useDemoState();
  const toast = useToast();
  const initialSender = state.senders.find((s) => s.id === fixedSenderId) ?? null;
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, control, formState } = useForm<NewShipmentValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      senderId: initialSender?.id ?? "",
      originStreet: initialSender ? `${initialSender.address.street}, Col. ${initialSender.address.neighborhood}` : "",
      originCity: initialSender?.address.city ?? "",
      recipientName: "",
      recipientPhone: "",
      destStreet: "",
      destNeighborhood: "",
      destCity: "",
      destZip: "",
      description: "",
      type: "chico",
      service: "estandar",
      notes: "",
    },
  });
  const errors = formState.errors;
  const type = useWatch({ control, name: "type" });
  const service = useWatch({ control, name: "service" });

  const onSubmit = (values: NewShipmentValues) => {
    setSaving(true);
    setTimeout(() => {
      const s = createShipment(values);
      setSaving(false);
      toast.success("Paquete registrado", `Guía ${s.guia} generada correctamente.`);
      onCreated(s);
    }, 500);
  };

  const sectionTitle = (n: number, text: string) => (
    <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
      <span className="grid size-6 place-items-center rounded-full bg-brand-500 text-xs text-white">{n}</span>
      {text}
    </h3>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Revisa el formulario", "Hay campos que necesitan tu atención."))} noValidate className="space-y-7">
      <section>
        {sectionTitle(1, "Remitente y origen")}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Remitente" required error={errors.senderId?.message}>
            {(id, desc) =>
              initialSender ? (
                <Input id={id} value={initialSender.name} readOnly aria-describedby={desc} className="bg-canvas font-semibold" />
              ) : (
              <Select
                id={id}
                aria-describedby={desc}
                aria-invalid={!!errors.senderId}
                {...register("senderId", {
                  onChange: (e) => {
                    const s = state.senders.find((x) => x.id === e.target.value);
                    if (s) {
                      setValue("originStreet", `${s.address.street}, Col. ${s.address.neighborhood}`, { shouldValidate: true });
                      setValue("originCity", s.address.city, { shouldValidate: true });
                    }
                  },
                })}
              >
                <option value="">Selecciona un remitente…</option>
                {state.senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              )
            }
          </Field>
          <Field label="Ciudad de origen" required error={errors.originCity?.message}>
            {(id, desc) => (
              <Select id={id} aria-describedby={desc} aria-invalid={!!errors.originCity} {...register("originCity")}>
                <option value="">Selecciona…</option>
                {CITY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Dirección de origen (recolección)" required error={errors.originStreet?.message} className="sm:col-span-2">
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.originStreet} placeholder="Calle, número y colonia" {...register("originStreet")} />}
          </Field>
        </div>
      </section>

      <section>
        {sectionTitle(2, "Destinatario")}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" required error={errors.recipientName?.message}>
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.recipientName} placeholder="Ej. María López" autoComplete="off" {...register("recipientName")} />}
          </Field>
          <Field label="Teléfono" required error={errors.recipientPhone?.message} hint="Lo usaremos para coordinar la entrega.">
            {(id, desc) => <Input id={id} type="tel" inputMode="tel" aria-describedby={desc} aria-invalid={!!errors.recipientPhone} placeholder="777 123 4567" {...register("recipientPhone")} />}
          </Field>
          <Field label="Calle y número" required error={errors.destStreet?.message} className="sm:col-span-2">
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.destStreet} placeholder="Ej. Av. Morelos 1024, interior 3" {...register("destStreet")} />}
          </Field>
          <Field label="Colonia" required error={errors.destNeighborhood?.message}>
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.destNeighborhood} placeholder="Ej. Centro" {...register("destNeighborhood")} />}
          </Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Ciudad destino" required error={errors.destCity?.message}>
              {(id, desc) => (
                <Select id={id} aria-describedby={desc} aria-invalid={!!errors.destCity} {...register("destCity")}>
                  <option value="">Selecciona…</option>
                  {CITY_NAMES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="C.P." required error={errors.destZip?.message}>
              {(id, desc) => <Input id={id} inputMode="numeric" maxLength={5} aria-describedby={desc} aria-invalid={!!errors.destZip} placeholder="62000" {...register("destZip")} />}
            </Field>
          </div>
        </div>
      </section>

      <section>
        {sectionTitle(3, "Paquete")}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-soft">Tipo de paquete *</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(Object.keys(PACKAGE_TYPE_LABEL) as PackageType[]).map((t, i) => (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all",
                  type === t ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200",
                )}
              >
                <input type="radio" value={t} className="sr-only" {...register("type")} />
                {t === "sobre" ? (
                  <FileText className={cn("size-6", type === t ? "text-brand-600" : "text-subtle")} aria-hidden />
                ) : (
                  <Package className={cn(type === t ? "text-brand-600" : "text-subtle")} style={{ width: 18 + i * 4, height: 18 + i * 4 }} aria-hidden />
                )}
                <span className="text-sm font-bold text-ink">{PACKAGE_TYPE_LABEL[t]}</span>
                <span className="text-xs text-muted">{TYPE_HINT[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Descripción del contenido" required error={errors.description?.message} className="sm:col-span-2">
            {(id, desc) => <Input id={id} aria-describedby={desc} aria-invalid={!!errors.description} placeholder="Ej. Ropa y accesorios" {...register("description")} />}
          </Field>
          <Field label="Peso (kg)" required error={errors.weightKg?.message}>
            {(id, desc) => <Input id={id} type="number" step="0.1" min="0" inputMode="decimal" aria-describedby={desc} aria-invalid={!!errors.weightKg} placeholder="1.5" {...register("weightKg", { valueAsNumber: true })} />}
          </Field>
          <Field label="Valor declarado (MXN)" required error={errors.declaredValue?.message}>
            {(id, desc) => <Input id={id} type="number" step="50" min="0" inputMode="numeric" aria-describedby={desc} aria-invalid={!!errors.declaredValue} placeholder="1500" {...register("declaredValue", { valueAsNumber: true })} />}
          </Field>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-ink-soft">Tipo de servicio *</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              { v: "estandar" as const, title: "Estándar", text: "Entrega estimada en 2 a 3 días", icon: Package },
              { v: "express" as const, title: "Express", text: "Entrega estimada al día siguiente", icon: Zap },
            ].map((o) => (
              <label key={o.v} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition-all", service === o.v ? "border-accent-500 bg-accent-50" : "border-line hover:border-accent-200")}>
                <input type="radio" value={o.v} className="sr-only" {...register("service")} />
                <span className={cn("grid size-10 place-items-center rounded-xl", service === o.v ? "bg-accent-500 text-white" : "bg-canvas text-subtle")}>
                  <o.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold text-ink">{o.title}</span>
                  <span className="block text-[13px] text-muted">{o.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Observaciones" error={errors.notes?.message} hint="Opcional. Ej. Frágil, llamar antes de llegar." className="mt-4">
          {(id, desc) => <Textarea id={id} rows={2} aria-describedby={desc} placeholder="Indicaciones para el repartidor…" {...register("notes")} />}
        </Field>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-line-soft pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={saving} icon={<PackagePlus className="size-5" />}>
          Registrar paquete
        </Button>
      </div>
    </form>
  );
}

export function ShipmentCreated({
  shipment,
  onAnother,
  onClose,
  detailHref,
}: {
  shipment: Shipment;
  onAnother: () => void;
  onClose?: () => void;
  detailHref: string;
}) {
  const toast = useToast();
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="grid size-20 animate-scale-in place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
        <PackageCheck className="size-10" aria-hidden />
      </div>
      <p className="mt-5 text-[15px] text-muted">Número de guía generado</p>
      <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-5 py-3">
        <span className="font-mono text-2xl font-bold tracking-wider text-brand-700">{shipment.guia}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(shipment.guia);
            toast.info("Guía copiada", "Ya puedes compartirla con tu cliente.");
          }}
          className="grid size-9 place-items-center rounded-lg text-brand-600 hover:bg-white"
          aria-label="Copiar guía"
        >
          <Copy className="size-4" />
        </button>
      </div>
      <dl className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 text-left">
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="text-xs font-semibold text-muted">Destinatario</dt>
          <dd className="font-bold text-ink">{shipment.recipient.name}</dd>
        </div>
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="text-xs font-semibold text-muted">Destino</dt>
          <dd className="font-bold text-ink">{shipment.destination.city}</dd>
        </div>
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="text-xs font-semibold text-muted">Servicio</dt>
          <dd className="font-bold text-ink">{shipment.service === "express" ? "Express" : "Estándar"}</dd>
        </div>
        <div className="rounded-2xl bg-canvas p-3">
          <dt className="text-xs font-semibold text-muted">Entrega estimada</dt>
          <dd className="font-bold text-ink">{formatDate(shipment.estimatedDelivery)}</dd>
        </div>
      </dl>
      <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="outline" icon={<Plus className="size-4" />} onClick={onAnother}>
          Registrar otro
        </Button>
        <ButtonLink href={detailHref} variant="secondary" onClick={onClose}>
          Ver detalle del envío
        </ButtonLink>
      </div>
      <p className="mt-4 text-[13px] text-muted">
        También puedes consultarlo en{" "}
        <Link href={`/rastreo?guia=${shipment.guia}`} className="font-semibold text-brand-600 hover:underline" onClick={onClose}>
          el portal de rastreo
        </Link>
        .
      </p>
    </div>
  );
}
