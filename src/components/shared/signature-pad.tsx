"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

/** Área para que el destinatario firme con el dedo o el mouse. Devuelve la firma como PNG (data URL). */
export function SignaturePad({ onChange, className }: { onChange: (dataUrl: string | null) => void; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0A3F95";
    };
    resize();

    const point = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing.current = true;
      last.current = point(e);
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#0A3F95";
      ctx.fill();
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current || !last.current) return;
      const p = point(e);
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
    };
    const up = () => {
      if (!drawing.current) return;
      drawing.current = false;
      last.current = null;
      setEmpty(false);
      onChangeRef.current(canvas.toDataURL("image/png"));
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointerleave", up);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed border-brand-200 bg-white", className)}>
      <canvas ref={canvasRef} className="block h-48 w-full touch-none" aria-label="Área de firma del destinatario" role="img" />
      <div className="pointer-events-none absolute right-6 bottom-10 left-6 border-b-2 border-slate-200" aria-hidden />
      <span className="pointer-events-none absolute bottom-3 left-6 text-xs font-semibold text-subtle">Firma del destinatario</span>
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-subtle">
          <PenLine className="size-6" aria-hidden />
          <span className="text-sm font-semibold">Firme aquí con el dedo</span>
        </div>
      )}
      {!empty && (
        <button type="button" onClick={clear} className="absolute top-2 right-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-canvas px-3 text-sm font-semibold text-ink-soft hover:bg-line-soft">
          <Eraser className="size-4" aria-hidden /> Borrar
        </button>
      )}
    </div>
  );
}
