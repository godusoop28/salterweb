import { CITIES, DEMO_NOW_ISO, STATUS_FLOW, findCity } from "@/lib/constants";
import type {
  Address,
  DemoState,
  Incident,
  IncidentSeverity,
  IncidentType,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
} from "@/lib/types";
import { daysAgo } from "@/lib/utils";
import { CONTENTS, COURIERS, DEFAULT_SETTINGS, RECIPIENTS, SENDERS, USERS } from "./catalogs";
import { describeEvent, eventLocation } from "./events";

export const DEMO_VERSION = 4;

/** Generador pseudoaleatorio con semilla: los datos son idénticos en cada carga. */
function createRng(seed: number) {
  let a = seed;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
    weighted: <T,>(items: readonly (readonly [T, number])[]) => {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of items) {
        r -= w;
        if (r <= 0) return item;
      }
      return items[items.length - 1][0];
    },
  };
}

/** Volumen mensual (mayo–octubre 2026): suma 1,248 envíos. */
const MONTHS = [
  { month: 5, days: 31, count: 168 },
  { month: 6, days: 30, count: 184 },
  { month: 7, days: 31, count: 197 },
  { month: 8, days: 31, count: 213 },
  { month: 9, days: 30, count: 231 },
  { month: 10, days: 29, count: 255 },
];

const DEST_WEIGHTS: [string, number][] = [
  ["Cuernavaca", 26],
  ["Ciudad de México", 22],
  ["Guadalajara", 12],
  ["Monterrey", 10],
  ["Puebla", 11],
  ["Querétaro", 10],
  ["Toluca", 9],
];

const SENDER_WEIGHTS: [string, number][] = [
  ["rem-01", 22],
  ["rem-02", 11],
  ["rem-03", 12],
  ["rem-04", 18],
  ["rem-05", 13],
  ["rem-06", 9],
  ["rem-07", 9],
  ["rem-08", 6],
];

const INCIDENT_SEVERITY: Record<IncidentType, IncidentSeverity> = {
  destinatario_ausente: "baja",
  direccion_incorrecta: "media",
  paquete_danado: "alta",
  rechazado: "media",
  retraso: "baja",
  no_localizado: "alta",
};

const INCIDENT_TEXT: Record<IncidentType, string[]> = {
  destinatario_ausente: [
    "Se visitó el domicilio en dos ocasiones y no hubo quién recibiera. Se dejó aviso en la puerta.",
    "Nadie atendió en el domicilio. El teléfono del destinatario envía a buzón.",
  ],
  direccion_incorrecta: [
    "El número exterior no corresponde con la calle indicada. Se solicita confirmar la dirección.",
    "La colonia registrada no coincide con el código postal. Se requiere referencia adicional.",
  ],
  paquete_danado: [
    "La caja llegó con una esquina golpeada y cinta abierta. Se documentó con fotografía.",
    "El empaque presenta humedad en la base. Se separó para revisión del contenido.",
  ],
  rechazado: [
    "El destinatario rechazó el paquete porque no reconoce el pedido.",
    "El destinatario no aceptó la entrega por diferencia en el contenido esperado.",
  ],
  retraso: [
    "Retraso por cierre vial en la autopista. El paquete continúa en ruta.",
    "La unidad tuvo una falla mecánica menor. Se reprogramó la salida a reparto.",
  ],
  no_localizado: ["El paquete no aparece en el escaneo de llegada del centro de distribución."],
};

const ASSIGNEES = ["Roberto Téllez", "Karla Méndez"];

function buildAddress(rng: ReturnType<typeof createRng>, cityName: string): Address {
  const city = findCity(cityName);
  return {
    street: `${rng.pick(city.streets)} ${rng.int(12, 2400)}`,
    neighborhood: rng.pick(city.neighborhoods),
    city: city.name,
    state: city.state,
    zip: String(city.zipBase + rng.int(0, 90) * 10).padStart(5, "0"),
  };
}

function phoneFor(rng: ReturnType<typeof createRng>, cityName: string) {
  const prefix = findCity(cityName).phonePrefix;
  const digits = String(rng.int(1000000, 9999999)).padStart(10 - prefix.length, "0").slice(0, 10 - prefix.length);
  return prefix.length === 2
    ? `${prefix} ${digits.slice(0, 4)} ${digits.slice(4)}`
    : `${prefix} ${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function courierForCity(city: string) {
  return COURIERS.find((c) => c.zone === city) ?? COURIERS[0];
}

function statusForAge(rng: ReturnType<typeof createRng>, age: number): ShipmentStatus {
  if (age <= 0) return rng.weighted([["registrado", 5], ["en_proceso", 5]] as const);
  if (age === 1) return rng.weighted([["en_proceso", 2], ["en_transito", 5], ["en_ciudad_destino", 3]] as const);
  if (age === 2) return rng.weighted([["en_transito", 3], ["en_ciudad_destino", 3], ["entregado", 3], ["pendiente", 1]] as const);
  if (age <= 5) return rng.weighted([["entregado", 70], ["en_ciudad_destino", 8], ["pendiente", 10], ["incidencia", 12]] as const);
  if (age <= 10) return rng.weighted([["entregado", 92], ["pendiente", 2], ["incidencia", 6]] as const);
  return "entregado";
}

function createdAtFor(rng: ReturnType<typeof createRng>, month: number, days: number) {
  const day = rng.int(1, days);
  const lastHour = month === 10 && day === 29 ? 16 : 19;
  const hour = rng.int(8, lastHour);
  const minute = rng.int(0, 59);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return new Date(`2026-${mm}-${dd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-06:00`).toISOString();
}

export function createDemoState(): DemoState {
  const rng = createRng(20261029);
  const now = Date.parse(DEMO_NOW_ISO);
  let eventSeq = 0;
  const nextEventId = () => `evt-${++eventSeq}`;

  // 1. Fechas de alta
  const dates: string[] = [];
  for (const m of MONTHS) for (let i = 0; i < m.count; i++) dates.push(createdAtFor(rng, m.month, m.days));
  dates.sort();

  const shipments: Shipment[] = [];
  const incidents: Incident[] = [];
  let incidentSeq = 0;

  const makeIncident = (s: Shipment, type: IncidentType, createdAt: string, resolved: boolean) => {
    incidentSeq++;
    const courier = s.courierId ? COURIERS.find((c) => c.id === s.courierId) : undefined;
    const status = resolved ? "resuelta" : rng.chance(0.55) ? "abierta" : "en_revision";
    const assignee = rng.pick(ASSIGNEES);
    const inc: Incident = {
      id: `inc-${incidentSeq}`,
      folio: `INC-${String(incidentSeq).padStart(4, "0")}`,
      shipmentId: s.id,
      guia: s.guia,
      courierId: s.courierId,
      type,
      severity: INCIDENT_SEVERITY[type],
      status,
      createdAt,
      resolvedAt: resolved ? new Date(Date.parse(createdAt) + rng.int(4, 30) * 3_600_000).toISOString() : undefined,
      reportedBy: courier?.name ?? "Centro de distribución",
      assignee,
      description: rng.pick(INCIDENT_TEXT[type]),
      hasEvidence: type === "paquete_danado" || rng.chance(0.5),
      evidence: null,
      notes:
        status === "abierta"
          ? []
          : [
              {
                id: `note-${incidentSeq}-1`,
                date: new Date(Date.parse(createdAt) + 2 * 3_600_000).toISOString(),
                author: assignee,
                text: "Se contactó al destinatario por teléfono para confirmar datos.",
              },
              ...(resolved
                ? [
                    {
                      id: `note-${incidentSeq}-2`,
                      date: new Date(Date.parse(createdAt) + 4 * 3_600_000).toISOString(),
                      author: assignee,
                      text: "Se acordó nueva visita. Incidencia cerrada.",
                    },
                  ]
                : []),
            ],
    };
    incidents.push(inc);
    return inc;
  };

  dates.forEach((createdAt, i) => {
    const senderId = rng.weighted(SENDER_WEIGHTS);
    const sender = SENDERS.find((s) => s.id === senderId)!;
    let destCity = rng.weighted(DEST_WEIGHTS);
    if (destCity === sender.address.city && rng.chance(0.6)) destCity = rng.weighted(DEST_WEIGHTS);
    const content = rng.pick(CONTENTS);
    const service = rng.chance(0.22) ? "express" : "estandar";
    const transitDays = destCity === sender.address.city ? 1 : service === "express" ? rng.int(1, 2) : rng.int(2, 3);
    const age = daysAgo(createdAt);
    const status = statusForAge(rng, age);
    const weight =
      content.type === "sobre"
        ? rng.int(1, 5) / 10
        : content.type === "chico"
          ? rng.int(5, 30) / 10
          : content.type === "mediano"
            ? rng.int(30, 100) / 10
            : rng.int(100, 250) / 10;

    const recipientName = rng.pick(RECIPIENTS);
    const shipment: Shipment = {
      id: `pkg-${i + 1}`,
      guia: `SAL-${String(i + 1).padStart(6, "0")}`,
      senderId,
      sender: { company: sender.name, name: sender.contactName, phone: sender.phone, email: sender.email },
      origin: sender.address,
      recipient: { name: recipientName, phone: phoneFor(rng, destCity) },
      destination: buildAddress(rng, destCity),
      description: content.text,
      type: content.type,
      weightKg: weight,
      declaredValue: Math.round(rng.int(content.value[0], content.value[1]) / 50) * 50,
      service,
      notes: rng.chance(0.18) ? rng.pick(["Frágil, manejar con cuidado.", "Entregar en horario de oficina.", "Llamar antes de llegar.", "Dejar en recepción del edificio."]) : undefined,
      status,
      courierId: null,
      createdAt,
      estimatedDelivery: new Date(Date.parse(createdAt) + transitDays * 86_400_000).toISOString(),
      events: [],
    };

    const assignCourier = ["en_ciudad_destino", "entregado", "pendiente", "incidencia"].includes(status) || (status === "en_transito" && rng.chance(0.5));
    if (assignCourier) shipment.courierId = courierForCity(destCity).id;

    // Línea de tiempo
    const flowIndex = status === "entregado" ? 4 : status === "pendiente" || status === "incidencia" ? 3 : STATUS_FLOW.indexOf(status);
    const start = Date.parse(createdAt);
    // ~10% de las entregas llegan después de la fecha estimada (tráfico, segunda visita, etc.).
    const delayHours = rng.chance(0.1) ? rng.int(14, 40) : 0;
    const exception = status === "pendiente" || status === "incidencia";
    const deliveredAt =
      status === "entregado"
        ? Math.min(start + (transitDays * 24 - rng.int(2, 9) + delayHours) * 3_600_000, now - rng.int(1, 6) * 3_600_000)
        : exception
          ? Math.min(start + (transitDays * 24 - rng.int(1, 6)) * 3_600_000, now - rng.int(1, 4) * 3_600_000)
          : now;
    const end = Math.max(deliveredAt, start + 3_600_000);
    const span = (end - start) / (status === "entregado" || exception ? 1 : 1.25);
    const events: ShipmentEvent[] = [];
    for (let k = 0; k <= flowIndex; k++) {
      const st = STATUS_FLOW[k];
      const t = k === 0 ? start : status === "entregado" && k === 4 ? end : start + span * [0, 0.12, 0.3, exception ? 0.6 : 0.72, 1][k];
      events.push({
        id: nextEventId(),
        status: st,
        date: new Date(t).toISOString(),
        location: eventLocation(st, shipment),
        description: describeEvent(st, shipment),
        actor: st === "entregado" ? COURIERS.find((c) => c.id === shipment.courierId)?.name : undefined,
      });
    }

    if (status === "entregado") {
      shipment.deliveredAt = new Date(end).toISOString();
      shipment.evidence = {
        receivedBy: rng.chance(0.85) ? recipientName : rng.pick(["Familiar del destinatario", "Recepción del edificio", "Vecino autorizado"]),
        deliveredAt: shipment.deliveredAt,
        photo: null,
        signature: null,
      };
      // Algunas entregas pasaron por una incidencia ya resuelta.
      if (age > 4 && rng.chance(0.026)) {
        const type = rng.pick(["destinatario_ausente", "direccion_incorrecta", "retraso", "paquete_danado"] as const);
        const at = new Date(Date.parse(events[3].date) + 2 * 3_600_000).toISOString();
        const inc = makeIncident(shipment, type, at, true);
        events.splice(4, 0, {
          id: nextEventId(),
          status: "incidencia",
          date: at,
          location: eventLocation("incidencia", shipment),
          description: `Incidencia ${inc.folio}: ${inc.description}`,
        });
      }
    }

    if (status === "pendiente" || status === "incidencia") {
      const at = new Date(end).toISOString();
      if (status === "pendiente") {
        events.push({ id: nextEventId(), status, date: at, location: eventLocation(status, shipment), description: "Destinatario ausente en la primera visita. Se reprograma la entrega." });
      } else {
        const type = rng.pick(["destinatario_ausente", "direccion_incorrecta", "paquete_danado", "rechazado", "retraso", "direccion_incorrecta", "no_localizado"] as const);
        const inc = makeIncident(shipment, type, at, false);
        events.push({ id: nextEventId(), status, date: at, location: eventLocation(status, shipment), description: `Incidencia ${inc.folio}: ${inc.description}` });
      }
    }

    shipment.events = events;
    shipments.push(shipment);
  });

  prepareTodayRoute(shipments);

  incidents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    version: DEMO_VERSION,
    shipments,
    couriers: COURIERS,
    senders: SENDERS,
    incidents,
    users: USERS,
    settings: DEFAULT_SETTINGS,
    session: null,
    seq: { guia: shipments.length, incident: incidentSeq, event: eventSeq },
  };
}

/**
 * Garantiza que el repartidor de demostración (Juan Pérez, Cuernavaca) tenga
 * una ruta del día clara: entregas por hacer con orden de visita.
 */
function prepareTodayRoute(shipments: Shipment[]) {
  const juan = COURIERS[0];
  const featured = ["María López", "Carlos Ramírez", "Ana Torres", "Jorge Castillo", "Sofía Martínez", "Luis Hernández", "Fernanda Ríos"];
  const todo = shipments
    .filter((s) => s.courierId === juan.id && (s.status === "en_ciudad_destino" || s.status === "pendiente"))
    .concat(
      shipments.filter(
        (s) => s.destination.city === juan.zone && s.status === "en_transito" && daysAgo(s.createdAt) >= 1,
      ),
    )
    .slice(0, 7);

  todo.forEach((s, idx) => {
    if (s.status === "en_transito") {
      s.status = "en_ciudad_destino";
      s.courierId = juan.id;
      s.events.push({
        id: `${s.events[s.events.length - 1].id}-cd`,
        status: "en_ciudad_destino",
        date: new Date(Date.parse(DEMO_NOW_ISO) - (9 - idx * 0.2) * 3_600_000).toISOString(),
        location: eventLocation("en_ciudad_destino", s),
        description: describeEvent("en_ciudad_destino", s),
      });
    }
    s.routeOrder = idx + 1;
    s.recipient.name = featured[idx] ?? s.recipient.name;
    if (idx === 0) s.notes = "Llamar antes de llegar. Portón negro.";
    // El destinatario cambió: actualiza la descripción de eventos ya generados.
    s.events.forEach((e) => {
      if (e.status === "entregado") e.description = describeEvent("entregado", s);
    });
  });
}

export const DEMO_CITIES = CITIES.map((c) => c.name);
