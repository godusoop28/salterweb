"use client";

/* eslint-disable @next/next/no-img-element -- las fotos son data URLs locales, no se optimizan con next/image */
import { useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { compressImage, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

/** Captura o selección de fotografía. En el celular abre directamente la cámara trasera. */
export function PhotoPicker({ value, onChange, compact = false }: { value: string | null; onChange: (v: string | null) => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const onFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      onChange(await compressImage(file));
    } catch (e) {
      toast.error("No se pudo cargar la foto", e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Seleccionar fotografía"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-line bg-canvas">
          <img src={value} alt="Evidencia capturada" className={cn("w-full object-cover", compact ? "h-40" : "h-56")} />
          <div className="absolute right-2 bottom-2 flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/95 px-3 text-sm font-semibold text-ink shadow">
              <RefreshCw className="size-4" aria-hidden /> Cambiar
            </button>
            <button type="button" onClick={() => onChange(null)} className="grid size-9 place-items-center rounded-xl bg-white/95 text-red-600 shadow" aria-label="Quitar foto">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50",
            compact ? "h-28" : "h-44",
          )}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-card">
            {loading ? <RefreshCw className="size-6 animate-spin" aria-hidden /> : compact ? <ImagePlus className="size-6" aria-hidden /> : <Camera className="size-6" aria-hidden />}
          </span>
          <span className="text-[15px] font-bold">{loading ? "Procesando foto…" : "Tomar o seleccionar foto"}</span>
          {!compact && <span className="text-[13px] text-muted">Toma la foto del paquete en la puerta del domicilio</span>}
        </button>
      )}
    </div>
  );
}
