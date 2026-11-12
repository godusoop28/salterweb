"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Upload } from "lucide-react";
import { InlineError } from "@/components/app/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { qk } from "@/lib/api/hooks";
import type { ImportPreview, ImportResult, ImportRow, RowStatus, ValidationResult } from "@/lib/api/types";

const FIELDS: { key: keyof ImportRow | "lastName2"; label: string; required?: boolean }[] = [
  { key: "clientCode", label: "Número de cliente" },
  { key: "firstName", label: "Nombre(s) / razón social", required: true },
  { key: "lastName", label: "Apellido(s) / paterno" },
  { key: "lastName2", label: "Apellido materno (se une al anterior)" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Correo" },
  { key: "street", label: "Calle y número" },
  { key: "extNumber", label: "Número exterior (se une a la calle)" },
  { key: "neighborhood", label: "Colonia" },
  { key: "city", label: "Ciudad / municipio" },
  { key: "state", label: "Estado" },
  { key: "zip", label: "Código postal" },
  { key: "route", label: "Ruta" },
  { key: "subRoute", label: "Subruta / Clave CD (ej. CVA-01)" },
  { key: "references", label: "Referencias" },
  { key: "notes", label: "Notas" },
];

const STATUS: Record<RowStatus, { label: string; tone: "green" | "red" | "orange" | "slate" }> = {
  VALID: { label: "Válida", tone: "green" }, ERROR: { label: "Error", tone: "red" },
  DUPLICATE: { label: "Duplicado", tone: "slate" }, PROBABLE_DUPLICATE: { label: "Posible duplicado", tone: "orange" },
};

/** Importación masiva: archivo → correspondencia de columnas → validación → confirmación transaccional. */
export function ImportWizard({ senderId, senderName, onClose }: { senderId: number; senderName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [includeProbable, setIncludeProbable] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append("file", file); return api.post<ImportPreview>("/recipients/import/preview", fd); },
    onSuccess: (p) => { setPreview(p); setMapping(p.suggestedMapping); setStep(2); setError(null); },
    onError: (e) => setError(errorMessage(e)),
  });

  const rows: ImportRow[] = useMemo(() => {
    if (!preview) return [];
    return preview.rows.map((r, i) => {
      const get = (k: string) => (mapping[k] ? (r[mapping[k]] ?? "").trim() : "");
      const last = [get("lastName"), get("lastName2")].filter(Boolean).join(" ");
      return { rowNumber: i + 2, firstName: get("firstName"), lastName: last, phone: get("phone"), email: get("email"), street: get("street"),
        neighborhood: get("neighborhood"), city: get("city"), state: get("state"), zip: get("zip"), references: get("references"), notes: get("notes"),
        clientCode: get("clientCode"), extNumber: get("extNumber"), route: get("route"), subRoute: get("subRoute") };
    });
  }, [preview, mapping]);

  const validate = useMutation({
    mutationFn: () => api.post<ValidationResult>("/recipients/import/validate", { senderId, rows }),
    onSuccess: (v) => { setValidation(v); setStep(3); setError(null); },
    onError: (e) => setError(errorMessage(e)),
  });
  const commit = useMutation({
    mutationFn: () => api.post<ImportResult>("/recipients/import/commit", { senderId, rows, importProbableDuplicates: includeProbable }),
    onSuccess: async (r) => { setResult(r); setStep(4); await qc.invalidateQueries({ queryKey: qk.recipients }); toast.success(`${r.created} destinatarios importados`); },
    onError: (e) => setError(errorMessage(e)),
  });

  const byRow = new Map(rows.map((r) => [r.rowNumber, r]));

  return (
    <Modal open onClose={onClose} size="xl" title="Importar destinatarios" description={`Remitente: ${senderName} · Paso ${step} de 4`}
      footer={<>
        <Button variant="outline" onClick={onClose}>{step === 4 ? "Cerrar" : "Cancelar"}</Button>
        {step === 2 && <Button disabled={!mapping.firstName} loading={validate.isPending} onClick={() => validate.mutate()}>Validar {rows.length} filas</Button>}
        {step === 3 && validation && (
          <Button loading={commit.isPending} disabled={validation.valid + (includeProbable ? validation.probableDuplicates : 0) === 0} onClick={() => commit.mutate()}>
            Importar {validation.valid + (includeProbable ? validation.probableDuplicates : 0)}
          </Button>
        )}
      </>}>
      <div className="space-y-4">
        {step === 1 && (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/40 px-6 py-12 text-center hover:bg-brand-50">
            <Upload className="size-8 text-brand-500" />
            <span className="font-bold text-ink">{upload.isPending ? "Leyendo archivo…" : "Selecciona un archivo de Excel (.xlsx, .xls) o CSV"}</span>
            <span className="text-sm text-muted">La primera fila debe contener los encabezados. Máximo 5 MB.</span>
            <input type="file" className="sr-only" accept=".xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); }} />
          </label>
        )}
        {step === 2 && preview && (
          <>
            <p className="text-sm text-muted">{preview.fileName}: {preview.totalRows} filas. Relaciona cada campo con una columna del archivo.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((fd) => (
                <label key={fd.key} className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
                  <span>{fd.label}{fd.required && <span className="text-accent-600"> *</span>}</span>
                  <Select value={mapping[fd.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [fd.key]: e.target.value })}>
                    <option value="">— No importar —</option>
                    {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </label>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-[13px]">
                <thead className="bg-canvas"><tr>{["Fila", "# Cliente", "Nombre", "Calle", "Ciudad", "C.P.", "Subruta"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 5).map((r) => <tr key={r.rowNumber} className="border-t border-line-soft"><td className="px-3 py-1.5">{r.rowNumber}</td><td className="px-3">{r.clientCode}</td><td className="px-3">{[r.firstName, r.lastName].filter(Boolean).join(" ")}</td><td className="px-3">{[r.street, r.extNumber].filter(Boolean).join(" ")}</td><td className="px-3">{r.city}</td><td className="px-3">{r.zip}</td><td className="px-3">{r.subRoute}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}
        {step === 3 && validation && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{validation.valid} válidas</Badge>
              <Badge tone="orange">{validation.probableDuplicates} posibles duplicados</Badge>
              <Badge tone="slate">{validation.duplicates} duplicados (no se importan)</Badge>
              <Badge tone="red">{validation.errors} con error</Badge>
            </div>
            {validation.probableDuplicates > 0 && (
              <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={includeProbable} onChange={(e) => setIncludeProbable(e.target.checked)} /> Importar también los posibles duplicados (por ejemplo, el mismo cliente con otra sucursal o dirección)</label>
            )}
            <div className="max-h-[45vh] overflow-auto rounded-2xl border border-line">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-canvas"><tr>{["Fila", "Destinatario", "Resultado", "Detalle"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {validation.rows.filter((r) => r.status !== "VALID").concat(validation.rows.filter((r) => r.status === "VALID")).map((r) => {
                    const row = byRow.get(r.rowNumber);
                    return (
                      <tr key={r.rowNumber} className="border-t border-line-soft align-top">
                        <td className="px-3 py-1.5">{r.rowNumber}</td>
                        <td className="px-3">{[row?.firstName, row?.lastName].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-3"><Badge tone={STATUS[r.status].tone} size="sm">{STATUS[r.status].label}</Badge></td>
                        <td className="px-3 text-muted">{r.errors.join(" ")} {r.matches.map((m) => `${m.name} (${m.reason})`).join("; ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {step === 4 && result && (
          <div className="py-6 text-center">
            <CircleCheck className="mx-auto size-12 text-emerald-600" />
            <p className="mt-3 text-xl font-bold text-ink">{result.created} destinatarios importados</p>
            <p className="mt-1 text-muted">Omitidos: {result.skippedDuplicates} duplicados, {result.skippedProbable} posibles duplicados, {result.skippedErrors} con error.</p>
          </div>
        )}
        <InlineError message={error} />
      </div>
    </Modal>
  );
}
