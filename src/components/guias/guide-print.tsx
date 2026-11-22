"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, downloadFile, errorMessage } from "@/lib/api/client";
import type { Guide } from "@/lib/api/types";
import { useSession } from "@/lib/session";

type Variant = "CLIENTE" | "INTERNA";
type Size = "LETTER" | "LABEL_4X6";

/** En móviles/tabletas y Safari no se puede imprimir un PDF desde un iframe: se abre en pestaña para usar «Imprimir» del visor. */
function iframePrintUnsupported() {
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(ua);
  return mobile || safari;
}

/** Imprime un PDF dentro de la página (iframe oculto) sin abrir pestañas; si el navegador no lo permite, lo abre en una pestaña. */
export async function printPdf(path: string, query?: Record<string, string>) {
  if (iframePrintUnsupported()) {
    await downloadFile(path, "documento.pdf", query, true);
    return;
  }
  const blob = await api.blob(path, query);
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  // Fuera de pantalla pero con tamaño real: algunos navegadores imprimen en blanco un iframe de 0×0.
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = "800px";
  frame.style.height = "600px";
  frame.style.border = "0";
  frame.setAttribute("aria-hidden", "true");
  frame.src = url;
  frame.onload = () => {
    // Pequeña espera para que el visor de PDF termine de cargar antes de imprimir.
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(url, "_blank");
      }
    }, 400);
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
  // Ctrl+P / Cmd+P en esta pantalla imprime la guía con el formato oficial (no la página web).
  useEffect(() => {
    if (!guide.folio) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "p") return;
      e.preventDefault();
      if (busy) return;
      setBusy("print");
      printPdf(`/guides/${guide.id}/pdf`, { variant, size })
        .catch((err) => toast.error("No se pudo generar el documento", errorMessage(err)))
        .finally(() => setBusy(null));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guide.id, guide.folio, variant, size, busy, toast]);
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
