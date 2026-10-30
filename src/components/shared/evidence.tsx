/* eslint-disable @next/next/no-img-element -- evidencias en data URL generadas en el navegador */
import { Camera, PenLine, UserCheck } from "lucide-react";
import type { DeliveryEvidence } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

/** Foto ilustrativa para entregas de los datos de ejemplo (no es una fotografía real). */
export function IllustrativePhoto({ seed = 0, label = "Imagen ilustrativa" }: { seed?: number; label?: string }) {
  const hue = [205, 28, 215, 195][seed % 4];
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
      <svg viewBox="0 0 320 200" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect x="0" y="0" width="320" height="200" fill={`hsl(${hue} 30% 92%)`} />
        <rect x="190" y="20" width="96" height="180" rx="4" fill={`hsl(${hue} 25% 70%)`} />
        <rect x="200" y="32" width="76" height="168" rx="3" fill={`hsl(${hue} 30% 80%)`} />
        <circle cx="264" cy="118" r="4" fill="#475569" />
        <rect x="0" y="160" width="320" height="40" fill="hsl(30 20% 78%)" />
        <g transform="translate(70 92)">
          <rect width="98" height="74" rx="5" fill="#C8955C" />
          <rect y="0" width="98" height="16" rx="4" fill="#B78249" />
          <rect x="40" y="0" width="18" height="74" fill="#E9D3B0" opacity="0.8" />
          <rect x="10" y="38" width="30" height="20" rx="2" fill="white" opacity="0.9" />
          <rect x="14" y="43" width="20" height="2.5" fill="#0B5CD5" />
          <rect x="14" y="49" width="14" height="2.5" fill="#FF7A00" />
        </g>
      </svg>
      <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-muted">{label}</span>
    </div>
  );
}

export function IllustrativeSignature({ name }: { name: string }) {
  const n = name.length;
  return (
    <svg viewBox="0 0 240 80" className="h-full w-full" aria-label={`Firma ilustrativa de ${name}`}>
      <path
        d={`M14 ${52 - (n % 5)} C 30 ${10 + n}, 42 70, 58 40 S 86 ${18 + (n % 7)}, 100 46 S 128 60, 140 34 S 170 ${22 + (n % 9)}, 186 44 S 212 50, 226 30`}
        fill="none"
        stroke="#0A3F95"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M40 64 L 200 62" stroke="#0A3F95" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EvidenceView({ evidence, seed = 0 }: { evidence: DeliveryEvidence; seed?: number }) {
  const illustrative = !evidence.photo && !evidence.signature;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="overflow-hidden rounded-2xl border border-line">
          <div className="h-44">
            {evidence.photo ? <img src={evidence.photo} alt="Fotografía de la entrega" className="h-full w-full object-cover" /> : <IllustrativePhoto seed={seed} />}
          </div>
          <figcaption className="flex items-center gap-2 border-t border-line-soft px-3 py-2 text-[13px] font-semibold text-ink-soft">
            <Camera className="size-4 text-brand-500" aria-hidden /> Evidencia fotográfica
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-2xl border border-line">
          <div className="grid h-44 place-items-center bg-white p-4">
            {evidence.signature ? <img src={evidence.signature} alt={`Firma de ${evidence.receivedBy}`} className="max-h-full" /> : <IllustrativeSignature name={evidence.receivedBy} />}
          </div>
          <figcaption className="flex items-center gap-2 border-t border-line-soft px-3 py-2 text-[13px] font-semibold text-ink-soft">
            <PenLine className="size-4 text-brand-500" aria-hidden /> Firma del destinatario
          </figcaption>
        </figure>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span className="inline-flex items-center gap-1.5 font-bold">
          <UserCheck className="size-4" aria-hidden /> Recibió: {evidence.receivedBy}
        </span>
        <span>{formatDateTime(evidence.deliveredAt)}</span>
      </div>
      {illustrative && <p className="text-[13px] text-muted">Las entregas de los datos de ejemplo muestran evidencia ilustrativa. Las confirmadas desde la app del repartidor guardan la foto y la firma reales.</p>}
      {evidence.notes && <p className="text-sm text-ink-soft">Nota: {evidence.notes}</p>}
    </div>
  );
}
