"use client";

import { useState } from "react";
import { Download, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, downloadFile, errorMessage } from "@/lib/api/client";
import type { Guide } from "@/lib/api/types";
import { useSession } from "@/lib/session";

type Variant = "CLIENTE" | "INTERNA";
type Size = "LETTER" | "LABEL_4X6";

/** Imprime un PDF dentro de la página (iframe oculto) sin abrir pestañas ni ventanas emergentes. */
export async function printPdf(path: string, query?: Record<string, string>) {
  const blob = await api.blob(path, query);
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };
  document.body.appendChild(frame);
  setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 120_000);
}

/**
 * Vista previa, impresión y descarga de la guía.
 * Versión «Cliente»: SIN datos de quien recibe (nombre, domicilio, teléfono, firma). «Interna»: sólo personal operativo.
 */
export function GuidePrintButtons({ guide, compact = false }: { guide: Pick<Guide, "id" | "folio" | "allowedActions">; compact?: boolean }) {
  const { can } = useSession();
  const toast = useToast();
  const canInternal = can("GUIDES_VIEW_ALL", "DELIVERIES_ANY", "DELIVERIES_OWN", "RECEPTION_CONFIRM");
  const [variant, setVariant] = useState<Variant>("CLIENTE");
  const [size, setSize] = useState<Size>("LETTER");
  const [busy, setBusy] = useState<"preview" | "print" | "download" | null>(null);
  if (!guide.folio) return null;
  const path = `/guides/${guide.id}/pdf`;
  const query = { variant, size };
  const file = `guia-${guide.folio}-${variant === "CLIENTE" ? "cliente" : "interna"}.pdf`;

  async function run(kind: "preview" | "print" | "download") {
    setBusy(kind);
    try {
      if (kind === "print") await printPdf(path, query);
      else await downloadFile(path, file, query, kind === "preview");
    } catch (e) {
      toast.error("No se pudo generar el documento", errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canInternal && (
        <Select className="h-9 w-auto text-sm" value={variant} onChange={(e) => setVariant(e.target.value as Variant)} aria-label="Versión del documento">
          <option value="CLIENTE">Versión cliente (sin datos de quien recibe)</option>
          <option value="INTERNA">Versión interna (completa)</option>
        </Select>
      )}
      <Select className="h-9 w-auto text-sm" value={size} onChange={(e) => setSize(e.target.value as Size)} aria-label="Tamaño">
        <option value="LETTER">Hoja carta</option>
        <option value="LABEL_4X6">Etiqueta 4×6</option>
      </Select>
      <Button size="sm" variant="outline" icon={<Eye className="size-4" />} loading={busy === "preview"} onClick={() => void run("preview")}>{compact ? "Ver" : "Vista previa"}</Button>
      <Button size="sm" variant="outline" icon={<Printer className="size-4" />} loading={busy === "print"} onClick={() => void run("print")}>Imprimir</Button>
      <Button size="sm" variant="outline" icon={<Download className="size-4" />} loading={busy === "download"} onClick={() => void run("download")}>{compact ? "PDF" : "Descargar PDF"}</Button>
    </div>
  );
}
