import type {
  CourierStatus,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  PackageType,
  Permission,
  Role,
  ServiceLevel,
  ShipmentStatus,
  UserStatus,
} from "@/lib/types";

/** Momento de referencia de la demo: todos los datos simulados están anclados a esta fecha. */
export const DEMO_NOW_ISO = "2026-10-29T17:30:00-06:00";
export const TIME_ZONE = "America/Mexico_City";

export const STATUS_FLOW: ShipmentStatus[] = [
  "registrado",
  "en_proceso",
  "en_transito",
  "en_ciudad_destino",
  "entregado",
];

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  registrado: "Registrado",
  en_proceso: "En proceso",
  en_transito: "En tránsito",
  en_ciudad_destino: "En ciudad destino",
  entregado: "Entregado",
  pendiente: "Pendiente",
  incidencia: "Incidencia",
};

export const STATUS_HINT: Record<ShipmentStatus, string> = {
  registrado: "Recibimos la información de tu envío.",
  en_proceso: "Tu paquete se está preparando en el centro de distribución.",
  en_transito: "Tu paquete va en camino a la ciudad destino.",
  en_ciudad_destino: "Tu paquete llegó a la ciudad destino y saldrá a reparto.",
  entregado: "Tu paquete fue entregado con éxito.",
  pendiente: "La entrega se reprogramó. Te contactaremos pronto.",
  incidencia: "Estamos atendiendo un detalle con tu envío.",
};

export const STATUS_ORDER: ShipmentStatus[] = [
  "registrado",
  "en_proceso",
  "en_transito",
  "en_ciudad_destino",
  "pendiente",
  "incidencia",
  "entregado",
];

/** Colores para gráficas por estado (siempre acompañados de etiqueta). */
export const STATUS_CHART_COLOR: Record<ShipmentStatus, string> = {
  registrado: "#94A3B8",
  en_proceso: "#7FB4F7",
  en_transito: "#0A5BD3",
  en_ciudad_destino: "#5FB8F0",
  entregado: "#16A34A",
  pendiente: "#FF7A00",
  incidencia: "#DC2626",
};

export const PACKAGE_TYPE_LABEL: Record<PackageType, string> = {
  sobre: "Sobre",
  chico: "Paquete chico",
  mediano: "Paquete mediano",
  grande: "Paquete grande",
};

export const SERVICE_LABEL: Record<ServiceLevel, string> = {
  estandar: "Estándar",
  express: "Express",
};

export const COURIER_STATUS_LABEL: Record<CourierStatus, string> = {
  en_ruta: "En ruta",
  disponible: "Disponible",
  descanso: "En descanso",
  inactivo: "Inactivo",
};

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  destinatario_ausente: "Destinatario ausente",
  direccion_incorrecta: "Dirección incorrecta",
  paquete_danado: "Paquete dañado",
  rechazado: "Entrega rechazada",
  retraso: "Retraso en ruta",
  no_localizado: "Paquete no localizado",
};

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  abierta: "Abierta",
  en_revision: "En revisión",
  resuelta: "Resuelta",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor de operación",
  repartidor: "Repartidor",
  remitente: "Remitente",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  pendiente: "Invitación pendiente",
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  dashboard: "Panel general",
  paquetes: "Gestión de paquetes",
  repartidores: "Repartidores",
  remitentes: "Remitentes",
  incidencias: "Incidencias",
  reportes: "Reportes",
  usuarios: "Usuarios",
  configuracion: "Configuración",
  entregas: "App de entregas",
  envios_propios: "Portal de envíos",
};

export interface CityInfo {
  name: string;
  state: string;
  phonePrefix: string;
  zipBase: number;
  neighborhoods: string[];
  streets: string[];
}

export const CITIES: CityInfo[] = [
  {
    name: "Cuernavaca",
    state: "Morelos",
    phonePrefix: "777",
    zipBase: 62000,
    neighborhoods: ["Centro", "Vista Hermosa", "Delicias", "Lomas de Cortés", "Chapultepec", "Rancho Cortés"],
    streets: ["Av. Morelos", "Av. Domingo Diez", "Calle Gutenberg", "Av. Río Mayo", "Calle Galeana", "Av. Plan de Ayala"],
  },
  {
    name: "Ciudad de México",
    state: "CDMX",
    phonePrefix: "55",
    zipBase: 3100,
    neighborhoods: ["Del Valle", "Roma Norte", "Narvarte", "Coyoacán", "Polanco", "Escandón"],
    streets: ["Av. Insurgentes Sur", "Calle Durango", "Av. Universidad", "Calle Tlacotalpan", "Av. Revolución", "Calle Moras"],
  },
  {
    name: "Guadalajara",
    state: "Jalisco",
    phonePrefix: "33",
    zipBase: 44100,
    neighborhoods: ["Americana", "Providencia", "Chapalita", "Ladrón de Guevara", "Jardines del Bosque"],
    streets: ["Av. Chapultepec", "Av. Vallarta", "Calle Libertad", "Av. Américas", "Calle Morelos"],
  },
  {
    name: "Monterrey",
    state: "Nuevo León",
    phonePrefix: "81",
    zipBase: 64000,
    neighborhoods: ["Centro", "Obispado", "Mitras Centro", "Cumbres", "Contry"],
    streets: ["Av. Constitución", "Calle Padre Mier", "Av. Gonzalitos", "Calle Hidalgo", "Av. Garza Sada"],
  },
  {
    name: "Puebla",
    state: "Puebla",
    phonePrefix: "222",
    zipBase: 72000,
    neighborhoods: ["Centro Histórico", "La Paz", "Anzures", "El Carmen", "Huexotitla"],
    streets: ["Av. Juárez", "Calle 5 de Mayo", "Blvd. Atlixco", "Av. Reforma", "Calle 16 de Septiembre"],
  },
  {
    name: "Querétaro",
    state: "Querétaro",
    phonePrefix: "442",
    zipBase: 76000,
    neighborhoods: ["Centro", "Jardines de la Hacienda", "Álamos", "Juriquilla", "Carretas"],
    streets: ["Av. Zaragoza", "Calle Madero", "Av. Constituyentes", "Blvd. Bernardo Quintana", "Calle Corregidora"],
  },
  {
    name: "Toluca",
    state: "Estado de México",
    phonePrefix: "722",
    zipBase: 50000,
    neighborhoods: ["Centro", "Universidad", "Morelos", "Las Américas", "San Sebastián"],
    streets: ["Av. Independencia", "Paseo Tollocan", "Calle Hidalgo", "Av. Morelos", "Calle Lerdo de Tejada"],
  },
];

export const CITY_NAMES = CITIES.map((c) => c.name);

export function findCity(name: string): CityInfo {
  return CITIES.find((c) => c.name === name) ?? CITIES[0];
}

export const DEMO_PASSWORD = "demo1234";
