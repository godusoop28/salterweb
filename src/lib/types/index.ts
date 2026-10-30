/**
 * Modelos de dominio de SALTER.
 * Estas interfaces son el contrato entre la interfaz y la capa de datos.
 * Hoy las alimenta el almacenamiento de demostración; mañana, la API (Spring Boot + PostgreSQL).
 */

export type ShipmentStatus =
  | "registrado"
  | "en_proceso"
  | "en_transito"
  | "en_ciudad_destino"
  | "entregado"
  | "pendiente"
  | "incidencia";

export type PackageType = "sobre" | "chico" | "mediano" | "grande";
export type ServiceLevel = "estandar" | "express";

export interface Address {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

export interface Contact {
  name: string;
  phone: string;
  email?: string;
}

export interface ShipmentEvent {
  id: string;
  status: ShipmentStatus;
  date: string;
  location: string;
  description: string;
  actor?: string;
}

export interface DeliveryEvidence {
  receivedBy: string;
  deliveredAt: string;
  /** Data URL comprimida o null si es evidencia ilustrativa de la demo. */
  photo?: string | null;
  signature?: string | null;
  notes?: string;
}

export interface Shipment {
  id: string;
  guia: string;
  senderId: string;
  sender: Contact & { company: string };
  origin: Address;
  recipient: Contact;
  destination: Address;
  description: string;
  type: PackageType;
  weightKg: number;
  declaredValue: number;
  service: ServiceLevel;
  notes?: string;
  status: ShipmentStatus;
  courierId: string | null;
  routeOrder?: number;
  createdAt: string;
  estimatedDelivery: string;
  deliveredAt?: string;
  events: ShipmentEvent[];
  evidence?: DeliveryEvidence;
}

export type CourierStatus = "en_ruta" | "disponible" | "descanso" | "inactivo";

export interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
  vehicle: string;
  plate: string;
  status: CourierStatus;
  joinedAt: string;
  rating: number;
}

export interface Sender {
  id: string;
  name: string;
  kind: "empresa" | "particular";
  contactName: string;
  phone: string;
  email: string;
  address: Address;
  since: string;
}

export type IncidentType =
  | "destinatario_ausente"
  | "direccion_incorrecta"
  | "paquete_danado"
  | "rechazado"
  | "retraso"
  | "no_localizado";

export type IncidentSeverity = "baja" | "media" | "alta";
export type IncidentStatus = "abierta" | "en_revision" | "resuelta";

export interface IncidentNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

export interface Incident {
  id: string;
  folio: string;
  shipmentId: string;
  guia: string;
  courierId: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  reportedBy: string;
  assignee: string;
  description: string;
  notes: IncidentNote[];
  /** Data URL de la foto o null cuando la evidencia es ilustrativa. */
  evidence?: string | null;
  hasEvidence: boolean;
}

export type Role = "admin" | "supervisor" | "repartidor" | "remitente";
export type UserStatus = "activo" | "inactivo" | "pendiente";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  lastAccess: string | null;
  createdAt: string;
  /** Repartidor o remitente vinculado a la cuenta. */
  linkedId?: string;
}

export type Permission =
  | "dashboard"
  | "paquetes"
  | "repartidores"
  | "remitentes"
  | "incidencias"
  | "reportes"
  | "usuarios"
  | "configuracion"
  | "entregas"
  | "envios_propios";

export interface Settings {
  companyName: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  guidePrefix: string;
  requirePhoto: boolean;
  requireSignature: boolean;
  notifyEmail: boolean;
  publicTracking: boolean;
  permissions: Record<Role, Permission[]>;
}

export interface Session {
  userId: string;
}

export interface DemoState {
  version: number;
  shipments: Shipment[];
  couriers: Courier[];
  senders: Sender[];
  incidents: Incident[];
  users: User[];
  settings: Settings;
  session: Session | null;
  seq: { guia: number; incident: number; event: number };
}

/** Datos de entrada para registrar un paquete (formulario admin o portal del remitente). */
export interface NewShipmentInput {
  senderId: string;
  recipientName: string;
  recipientPhone: string;
  originStreet: string;
  originCity: string;
  destStreet: string;
  destNeighborhood: string;
  destCity: string;
  destZip: string;
  description: string;
  type: PackageType;
  weightKg: number;
  declaredValue: number;
  service: ServiceLevel;
  notes?: string;
}

export interface NewIncidentInput {
  shipmentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  evidence?: string | null;
  reportedBy: string;
}
