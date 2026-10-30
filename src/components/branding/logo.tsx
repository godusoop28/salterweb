import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Variantes oficiales del logo SALTER (public/branding).
 * Los archivos se recortaron y se limpió el fondo blanco a partir de los originales
 * que están en la raíz del proyecto; no se modificó el diseño de la marca.
 */
const LOGOS = {
  horizontal: { src: "/branding/salter-horizontal.png", width: 1241, height: 397 },
  compacto: { src: "/branding/salter-compacto.png", width: 1222, height: 305 },
  vertical: { src: "/branding/salter-vertical.png", width: 901, height: 978 },
  isotipo: { src: "/branding/salter-isotipo.png", width: 938, height: 869 },
  mono: { src: "/branding/salter-mono.png", width: 900, height: 862 },
  oscuro: { src: "/branding/salter-oscuro.png", width: 873, height: 818 },
} as const;

export type LogoVariant = keyof typeof LOGOS;

interface LogoProps {
  variant?: LogoVariant;
  /** Alto en píxeles; el ancho se calcula respetando la proporción. */
  height?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ variant = "compacto", height = 40, className, priority }: LogoProps) {
  const logo = LOGOS[variant];
  const width = Math.round((logo.width / logo.height) * height);
  return (
    <Image
      src={logo.src}
      alt="SALTER · Alternativa en Movimiento"
      width={width}
      height={height}
      priority={priority}
      className={cn("select-none object-contain", className)}
      style={{ height, width: "auto" }}
      draggable={false}
    />
  );
}
