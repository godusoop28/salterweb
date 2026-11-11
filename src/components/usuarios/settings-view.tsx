"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { InlineError, ProvisionalNote, QueryState } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { qk, useConcepts, useSettings, useShifts } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";

const SETTINGS: { key: string; label: string; hint?: string; type?: "bool" | "select"; options?: string[] }[] = [
  { key: "company.name", label: "Nombre de la empresa" },
  { key: "company.slogan", label: "Lema" },
  { key: "company.phone", label: "Teléfono" },
  { key: "company.email", label: "Correo" },
  { key: "company.address", label: "Dirección" },
  { key: "folio.guide.prefix", label: "Prefijo de folio de guía", hint: "PROVISIONAL. Letras mayúsculas/números" },
  { key: "folio.guide.padding", label: "Dígitos del folio", hint: "Entre 3 y 12" },
  { key: "guide.requiredFields", label: "Campos obligatorios para confirmar", hint: "PROVISIONAL. rcptStreet, rcptCity, rcptPhone, rcptZip, cdReference…" },
  { key: "delivery.requireReception", label: "Exigir recepción en destino antes de la entrega final", type: "bool", hint: "PROVISIONAL" },
  { key: "tracking.public", label: "Rastreo público habilitado", type: "bool" },
  { key: "pdf.guide.pageSize", label: "Tamaño del PDF de guía", type: "select", options: ["LETTER", "HALF_LETTER", "A4"] },
  { key: "pdf.guide.copies", label: "Copias por guía", type: "select", options: ["1", "2", "3", "4"] },
  { key: "pdf.guide.footer", label: "Pie del documento de guía" },
  { key: "pdf.manifest.pageSize", label: "Tamaño del PDF de manifiesto", type: "select", options: ["LETTER", "LETTER_LANDSCAPE", "A4"] },
];

export function SettingsView() {
  const { can } = useSession();
  return (
    <>
      <PageHeader title="Configuración" description="Datos de la empresa, reglas provisionales, turnos y conceptos de mercancía." />
      <div className="space-y-5">
        {can("SETTINGS_MANAGE") && <GeneralSettings />}
        {can("CATALOGS_MANAGE") && <div className="grid gap-5 lg:grid-cols-2"><ShiftsCard /><ConceptsCard /></div>}
      </div>
    </>
  );
}

function GeneralSettings() {
  const q = useSettings();
  const qc = useQueryClient();
  const toast = useToast();
  const [edits, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const values: Record<string, string> = { ...(q.data ?? {}), ...edits };
  const changed = Object.fromEntries(Object.entries(edits).filter(([k, v]) => v !== q.data?.[k]));
  const save = useMutation({
    mutationFn: () => api.put<Record<string, string>>("/settings", changed),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.catalogs }); setValues({}); toast.success("Configuración guardada"); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Card>
      <CardHeader title="General y reglas" description="Los cambios quedan registrados en auditoría." />
      <QueryState loading={q.isLoading} error={q.error}>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          {SETTINGS.map((s) => (
            <Field key={s.key} label={s.label} hint={s.hint}>
              {s.type === "bool" ? (
                <Select value={values[s.key] ?? "false"} onChange={(e) => setValues({ ...edits, [s.key]: e.target.value })}><option value="true">Sí</option><option value="false">No</option></Select>
              ) : s.type === "select" ? (
                <Select value={values[s.key] ?? ""} onChange={(e) => setValues({ ...edits, [s.key]: e.target.value })}>{s.options!.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
              ) : (
                <Input value={values[s.key] ?? ""} onChange={(e) => setValues({ ...edits, [s.key]: e.target.value })} />
              )}
            </Field>
          ))}
          <div className="space-y-3 sm:col-span-2">
            <ProvisionalNote>las reglas de folio, campos obligatorios y recepción son valores iniciales pendientes de confirmar con SALTER.</ProvisionalNote>
            <InlineError message={error} />
            <Button icon={<Save className="size-4" />} disabled={Object.keys(changed).length === 0} loading={save.isPending} onClick={() => { setError(null); save.mutate(); }}>Guardar cambios</Button>
          </div>
        </div>
      </QueryState>
    </Card>
  );
}

function ShiftsCard() {
  const q = useShifts();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ code: "", name: "", startTime: "08:00", endTime: "16:00" });
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: () => api.post("/shifts", f),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.catalogs }); setF({ code: "", name: "", startTime: "08:00", endTime: "16:00" }); toast.success("Turno agregado"); },
    onError: (e) => setError(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (s: { id: number; code: string; name: string; startTime: string; endTime: string; active: boolean }) => api.put(`/shifts/${s.id}`, { ...s, active: !s.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.catalogs }),
  });
  return (
    <Card>
      <CardHeader title="Turnos" description="Horarios provisionales; un turno puede cruzar la medianoche." />
      <div className="p-5">
        <ul className="mb-4 divide-y divide-line-soft">
          {q.data?.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span><strong>{s.name}</strong> ({s.code}) · {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)} {s.current && <span className="text-emerald-700">· actual</span>}</span>
              <Button size="sm" variant="ghost" onClick={() => toggle.mutate(s)}>{s.active ? "Desactivar" : "Activar"}</Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input placeholder="Clave" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} aria-label="Clave" />
          <Input placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nombre" />
          <Input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} aria-label="Inicio" />
          <Input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} aria-label="Fin" />
        </div>
        <div className="mt-2 flex items-center gap-3"><Button size="sm" icon={<Plus className="size-4" />} disabled={!f.code || !f.name} loading={add.isPending} onClick={() => { setError(null); add.mutate(); }}>Agregar turno</Button><InlineError message={error} /></div>
      </div>
    </Card>
  );
}

function ConceptsCard() {
  const q = useConcepts();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("PIEZA");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: () => api.post("/concepts", { name, unit }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.catalogs }); setName(""); toast.success("Concepto agregado"); },
    onError: (e) => setError(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (c: { id: number; name: string; unit: string; active: boolean }) => api.put(`/concepts/${c.id}`, { name: c.name, unit: c.unit, active: !c.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.catalogs }),
  });
  return (
    <Card>
      <CardHeader title="Conceptos de mercancía" description="Se ofrecen como opciones rápidas al elaborar guías." />
      <div className="p-5">
        <ul className="mb-4 divide-y divide-line-soft">
          {q.data?.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span className={c.active ? "" : "text-subtle line-through"}><strong>{c.name}</strong> · {c.unit}</span>
              <Button size="sm" variant="ghost" onClick={() => toggle.mutate(c)}>{c.active ? "Desactivar" : "Activar"}</Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del concepto" />
          <Input placeholder="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unidad" className="max-w-[120px]" />
          <Button icon={<Plus className="size-4" />} disabled={!name.trim()} loading={add.isPending} onClick={() => { setError(null); add.mutate(); }}>Agregar</Button>
        </div>
        <div className="mt-2"><InlineError message={error} /></div>
      </div>
    </Card>
  );
}
