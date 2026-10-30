import { DEMO_PASSWORD, findCity } from "@/lib/constants";
import { describeEvent, eventLocation } from "@/lib/mock-data/events";
import type {
  Courier,
  DeliveryEvidence,
  DemoState,
  Incident,
  IncidentStatus,
  NewIncidentInput,
  NewShipmentInput,
  Sender,
  Settings,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
  User,
} from "@/lib/types";
import { addDays, demoNow } from "@/lib/utils";
import { getSnapshot, resetState, setState } from "./demo-store";

/**
 * Capa de servicios de SALTER.
 *
 * Todas las operaciones de datos de la interfaz pasan por aquí. Hoy modifican el
 * almacén local de la demostración; para producción, cada función se reimplementa
 * contra la API REST (Spring Boot) conservando la misma firma, por ejemplo:
 *
 *   createShipment(input)        → POST   /api/paquetes
 *   assignCourier(id, courierId) → PATCH  /api/paquetes/{id}/repartidor
 *   confirmDelivery(id, ev)      → POST   /api/paquetes/{id}/entrega (multipart: foto + firma)
 *   createIncident(input)        → POST   /api/incidencias
 */

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

function nextEventId(state: DemoState) {
  state.seq.event += 1;
  return `evt-${state.seq.event}`;
}

function mutate<T>(fn: (draft: DemoState) => T): T {
  let result!: T;
  setState((prev) => {
    const draft: DemoState = {
      ...prev,
      shipments: [...prev.shipments],
      incidents: [...prev.incidents],
      users: [...prev.users],
      couriers: [...prev.couriers],
      seq: { ...prev.seq },
    };
    result = fn(draft);
    return draft;
  });
  return result;
}

function updateShipmentIn(draft: DemoState, id: string, fn: (s: Shipment) => Shipment) {
  const idx = draft.shipments.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Paquete no encontrado");
  draft.shipments[idx] = fn({ ...draft.shipments[idx], events: [...draft.shipments[idx].events] });
  return draft.shipments[idx];
}

function currentUserName(draft: DemoState) {
  const u = draft.users.find((x) => x.id === draft.session?.userId);
  return u?.name ?? "Administración";
}

/* ───────────────────────────── Sesión ───────────────────────────── */

export function login(email: string, password: string): ServiceResult<User> {
  const user = getSnapshot().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return { ok: false, error: "No encontramos una cuenta con ese correo." };
  if (password !== DEMO_PASSWORD) return { ok: false, error: "La contraseña no es correcta. En la demo es demo1234." };
  if (user.status === "inactivo") return { ok: false, error: "Esta cuenta está desactivada. Contacta a administración." };
  mutate((d) => {
    d.session = { userId: user.id };
    d.users = d.users.map((u) => (u.id === user.id ? { ...u, lastAccess: demoNow(), status: "activo" } : u));
  });
  return { ok: true, data: user };
}

export function logout() {
  mutate((d) => {
    d.session = null;
  });
}

export function resetDemo() {
  resetState();
}

/* ───────────────────────────── Paquetes ───────────────────────────── */

export function createShipment(input: NewShipmentInput): Shipment {
  return mutate((d) => {
    const sender = d.senders.find((s) => s.id === input.senderId) ?? d.senders[0];
    d.seq.guia += 1;
    const now = demoNow();
    const city = findCity(input.destCity);
    const shipment: Shipment = {
      id: `pkg-${d.seq.guia}`,
      guia: `${d.settings.guidePrefix}-${String(d.seq.guia).padStart(6, "0")}`,
      senderId: sender.id,
      sender: { company: sender.name, name: sender.contactName, phone: sender.phone, email: sender.email },
      origin: { ...sender.address, street: input.originStreet || sender.address.street, city: input.originCity || sender.address.city },
      recipient: { name: input.recipientName.trim(), phone: input.recipientPhone.trim() },
      destination: {
        street: input.destStreet.trim(),
        neighborhood: input.destNeighborhood.trim(),
        city: city.name,
        state: city.state,
        zip: input.destZip.trim(),
      },
      description: input.description.trim(),
      type: input.type,
      weightKg: input.weightKg,
      declaredValue: input.declaredValue,
      service: input.service,
      notes: input.notes?.trim() || undefined,
      status: "registrado",
      courierId: null,
      createdAt: now,
      estimatedDelivery: addDays(now, input.service === "express" ? 1 : 3),
      events: [],
    };
    shipment.events.push({
      id: nextEventId(d),
      status: "registrado",
      date: now,
      location: eventLocation("registrado", shipment),
      description: describeEvent("registrado", shipment),
      actor: currentUserName(d),
    });
    d.shipments.push(shipment);
    return shipment;
  });
}

export function updateShipmentStatus(id: string, status: ShipmentStatus, note?: string): Shipment {
  return mutate((d) =>
    updateShipmentIn(d, id, (s) => {
      const event: ShipmentEvent = {
        id: nextEventId(d),
        status,
        date: demoNow(),
        location: eventLocation(status, s),
        description: note?.trim() || describeEvent(status, s),
        actor: currentUserName(d),
      };
      return { ...s, status, events: [...s.events, event] };
    }),
  );
}

export function assignCourier(id: string, courierId: string): Shipment {
  return mutate((d) => {
    const courier = d.couriers.find((c) => c.id === courierId);
    return updateShipmentIn(d, id, (s) => {
      const pending = d.shipments.filter((x) => x.courierId === courierId && ["en_ciudad_destino", "pendiente"].includes(x.status)).length;
      return {
        ...s,
        courierId,
        routeOrder: pending + 1,
        events: [
          ...s.events,
          {
            id: nextEventId(d),
            status: s.status,
            date: demoNow(),
            location: eventLocation(s.status, s),
            description: `Asignado al repartidor ${courier?.name ?? ""}.`,
            actor: currentUserName(d),
          },
        ],
      };
    });
  });
}

export function updateShipmentDetails(id: string, patch: Partial<Pick<Shipment, "recipient" | "notes" | "description" | "weightKg" | "declaredValue" | "service">>) {
  return mutate((d) => updateShipmentIn(d, id, (s) => ({ ...s, ...patch })));
}

export function deleteShipment(id: string) {
  mutate((d) => {
    d.shipments = d.shipments.filter((s) => s.id !== id);
    d.incidents = d.incidents.filter((i) => i.shipmentId !== id);
  });
}

export function confirmDelivery(id: string, evidence: Omit<DeliveryEvidence, "deliveredAt">): Shipment {
  return mutate((d) =>
    updateShipmentIn(d, id, (s) => {
      const now = demoNow();
      const courier = d.couriers.find((c) => c.id === s.courierId);
      return {
        ...s,
        status: "entregado",
        deliveredAt: now,
        evidence: { ...evidence, deliveredAt: now },
        events: [
          ...s.events,
          {
            id: nextEventId(d),
            status: "entregado",
            date: now,
            location: eventLocation("entregado", s),
            description: `Entregado a ${evidence.receivedBy}. Evidencia con ${evidence.photo ? "fotografía y " : ""}firma registrada.`,
            actor: courier?.name ?? currentUserName(d),
          },
        ],
      };
    }),
  );
}

/* ───────────────────────────── Incidencias ───────────────────────────── */

export function createIncident(input: NewIncidentInput): Incident {
  return mutate((d) => {
    d.seq.incident += 1;
    const shipment = d.shipments.find((s) => s.id === input.shipmentId);
    if (!shipment) throw new Error("Paquete no encontrado");
    const now = demoNow();
    const incident: Incident = {
      id: `inc-${d.seq.incident}`,
      folio: `INC-${String(d.seq.incident).padStart(4, "0")}`,
      shipmentId: shipment.id,
      guia: shipment.guia,
      courierId: shipment.courierId,
      type: input.type,
      severity: input.severity,
      status: "abierta",
      createdAt: now,
      reportedBy: input.reportedBy,
      assignee: "Roberto Téllez",
      description: input.description.trim(),
      notes: [],
      evidence: input.evidence ?? null,
      hasEvidence: Boolean(input.evidence),
    };
    d.incidents.unshift(incident);
    updateShipmentIn(d, shipment.id, (s) => ({
      ...s,
      status: "incidencia",
      events: [
        ...s.events,
        {
          id: nextEventId(d),
          status: "incidencia",
          date: now,
          location: eventLocation("incidencia", s),
          description: `Incidencia ${incident.folio}: ${incident.description}`,
          actor: input.reportedBy,
        },
      ],
    }));
    return incident;
  });
}

export function updateIncidentStatus(id: string, status: IncidentStatus, note?: string): Incident {
  return mutate((d) => {
    const idx = d.incidents.findIndex((i) => i.id === id);
    const author = currentUserName(d);
    const now = demoNow();
    const prev = d.incidents[idx];
    const notes = note?.trim() ? [...prev.notes, { id: `note-${id}-${prev.notes.length + 1}`, date: now, author, text: note.trim() }] : prev.notes;
    const updated: Incident = { ...prev, status, notes, resolvedAt: status === "resuelta" ? now : undefined };
    d.incidents[idx] = updated;
    // Al resolverse, el paquete vuelve a la cola de reparto.
    const s = d.shipments.find((x) => x.id === prev.shipmentId);
    if (status === "resuelta" && s?.status === "incidencia") {
      updateShipmentIn(d, s.id, (x) => ({
        ...x,
        status: "en_ciudad_destino",
        events: [
          ...x.events,
          {
            id: nextEventId(d),
            status: "en_ciudad_destino",
            date: now,
            location: eventLocation("en_ciudad_destino", x),
            description: `Incidencia ${prev.folio} resuelta. El paquete regresa a reparto.`,
            actor: author,
          },
        ],
      }));
    }
    return updated;
  });
}

export function addIncidentNote(id: string, text: string) {
  return mutate((d) => {
    const idx = d.incidents.findIndex((i) => i.id === id);
    const inc = d.incidents[idx];
    d.incidents[idx] = {
      ...inc,
      notes: [...inc.notes, { id: `note-${id}-${inc.notes.length + 1}`, date: demoNow(), author: currentUserName(d), text: text.trim() }],
    };
    return d.incidents[idx];
  });
}

/* ───────────────────────────── Repartidores ───────────────────────────── */

export function updateCourier(id: string, patch: Partial<Courier>) {
  mutate((d) => {
    d.couriers = d.couriers.map((c) => (c.id === id ? { ...c, ...patch } : c));
  });
}

/* ───────────────────────────── Remitentes ───────────────────────────── */

export type SenderInput = Omit<Sender, "id" | "since">;

export function saveSender(input: SenderInput, id?: string): Sender {
  return mutate((d) => {
    if (id) {
      d.senders = d.senders.map((s) => (s.id === id ? { ...s, ...input } : s));
      return d.senders.find((s) => s.id === id)!;
    }
    const created: Sender = { ...input, id: `rem-${String(d.senders.length + 1).padStart(2, "0")}-${d.seq.guia}`, since: demoNow() };
    d.senders = [...d.senders, created];
    return created;
  });
}

/* ───────────────────────────── Usuarios y configuración ───────────────────────────── */

export type UserInput = Pick<User, "name" | "email" | "phone" | "role" | "status">;

export function saveUser(input: UserInput, id?: string): ServiceResult<User> {
  const exists = getSnapshot().users.find((u) => u.email.toLowerCase() === input.email.toLowerCase() && u.id !== id);
  if (exists) return { ok: false, error: "Ya existe un usuario con ese correo." };
  const user = mutate((d) => {
    if (id) {
      d.users = d.users.map((u) => (u.id === id ? { ...u, ...input } : u));
      return d.users.find((u) => u.id === id)!;
    }
    const created: User = { ...input, id: `usr-${d.users.length + 100}`, lastAccess: null, createdAt: demoNow() };
    d.users.push(created);
    return created;
  });
  return { ok: true, data: user };
}

export function deleteUser(id: string) {
  mutate((d) => {
    d.users = d.users.filter((u) => u.id !== id);
  });
}

export function updateSettings(patch: Partial<Settings>) {
  mutate((d) => {
    d.settings = { ...d.settings, ...patch };
  });
}
