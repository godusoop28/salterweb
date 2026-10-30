import type { Shipment, ShipmentStatus } from "@/lib/types";

type ShipmentLike = Pick<Shipment, "origin" | "destination" | "recipient">;

export function eventLocation(status: ShipmentStatus, s: ShipmentLike): string {
  switch (status) {
    case "registrado":
      return `Sucursal ${s.origin.city}`;
    case "en_proceso":
      return `Centro de distribución ${s.origin.city}`;
    case "en_transito":
      return s.origin.city === s.destination.city ? `Ruta local ${s.destination.city}` : `Ruta ${s.origin.city} → ${s.destination.city}`;
    case "en_ciudad_destino":
      return `Centro de distribución ${s.destination.city}`;
    case "entregado":
      return `${s.destination.neighborhood}, ${s.destination.city}`;
    case "pendiente":
    case "incidencia":
      return `${s.destination.neighborhood}, ${s.destination.city}`;
  }
}

export function describeEvent(status: ShipmentStatus, s: ShipmentLike): string {
  switch (status) {
    case "registrado":
      return "Envío registrado y guía generada.";
    case "en_proceso":
      return "Paquete recibido, pesado y etiquetado.";
    case "en_transito":
      return `El paquete salió hacia ${s.destination.city}.`;
    case "en_ciudad_destino":
      return "Llegó a la ciudad destino y se asignó a reparto.";
    case "entregado":
      return `Entregado a ${s.recipient.name}.`;
    case "pendiente":
      return "Entrega reprogramada.";
    case "incidencia":
      return "Se reportó una incidencia.";
  }
}
