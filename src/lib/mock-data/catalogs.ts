import type { Courier, Permission, Role, Sender, Settings, User } from "@/lib/types";

export const COURIERS: Courier[] = [
  { id: "rep-01", name: "Juan Pérez", phone: "777 318 4521", email: "juan.perez@salter.mx", zone: "Cuernavaca", vehicle: "Nissan NV350", plate: "PXR-418-A", status: "en_ruta", joinedAt: "2024-02-12T09:00:00-06:00", rating: 4.9 },
  { id: "rep-02", name: "Miguel Sánchez", phone: "55 4120 8873", email: "miguel.sanchez@salter.mx", zone: "Ciudad de México", vehicle: "Renault Kangoo", plate: "MSK-227-C", status: "en_ruta", joinedAt: "2023-08-01T09:00:00-06:00", rating: 4.7 },
  { id: "rep-03", name: "Pedro Hernández", phone: "722 209 1147", email: "pedro.hernandez@salter.mx", zone: "Toluca", vehicle: "Italika FT150", plate: "TL-55-82", status: "disponible", joinedAt: "2024-06-17T09:00:00-06:00", rating: 4.6 },
  { id: "rep-04", name: "Laura Torres", phone: "222 677 0391", email: "laura.torres@salter.mx", zone: "Puebla", vehicle: "Chevrolet Tornado Van", plate: "PUE-903-B", status: "en_ruta", joinedAt: "2023-11-06T09:00:00-06:00", rating: 4.8 },
  { id: "rep-05", name: "Ricardo Gómez", phone: "442 155 6620", email: "ricardo.gomez@salter.mx", zone: "Querétaro", vehicle: "Nissan NP300", plate: "QRO-381-D", status: "descanso", joinedAt: "2025-01-20T09:00:00-06:00", rating: 4.5 },
  { id: "rep-06", name: "Daniela Flores", phone: "33 3812 9044", email: "daniela.flores@salter.mx", zone: "Guadalajara", vehicle: "Renault Kangoo", plate: "JAL-604-K", status: "en_ruta", joinedAt: "2024-09-02T09:00:00-06:00", rating: 4.8 },
  { id: "rep-07", name: "Óscar Villarreal", phone: "81 1736 2258", email: "oscar.villarreal@salter.mx", zone: "Monterrey", vehicle: "Ford Transit", plate: "NL-772-T", status: "disponible", joinedAt: "2025-03-10T09:00:00-06:00", rating: 4.6 },
];

export const SENDERS: Sender[] = [
  { id: "rem-01", name: "Tienda El Sol", kind: "empresa", contactName: "Gabriela Ruiz", phone: "777 312 0045", email: "envios@tiendaelsol.mx", address: { street: "Av. Morelos 214", neighborhood: "Centro", city: "Cuernavaca", state: "Morelos", zip: "62000" }, since: "2024-03-04T09:00:00-06:00" },
  { id: "rem-02", name: "Distribuidora Norte", kind: "empresa", contactName: "Arturo Garza", phone: "81 8340 1290", email: "logistica@distnorte.mx", address: { street: "Av. Constitución 1450", neighborhood: "Centro", city: "Monterrey", state: "Nuevo León", zip: "64000" }, since: "2024-05-21T09:00:00-06:00" },
  { id: "rem-03", name: "Comercializadora Ruiz", kind: "empresa", contactName: "Elena Ruiz", phone: "222 245 7781", email: "ventas@comruiz.mx", address: { street: "Blvd. Atlixco 3120", neighborhood: "La Paz", city: "Puebla", state: "Puebla", zip: "72160" }, since: "2024-07-15T09:00:00-06:00" },
  { id: "rem-04", name: "Electro Hogar", kind: "empresa", contactName: "Marco Antonio Ibarra", phone: "55 5523 6610", email: "pedidos@electrohogar.mx", address: { street: "Av. Insurgentes Sur 1602", neighborhood: "Del Valle", city: "Ciudad de México", state: "CDMX", zip: "03100" }, since: "2023-12-01T09:00:00-06:00" },
  { id: "rem-05", name: "Tecnología MX", kind: "empresa", contactName: "Paola Chávez", phone: "33 3615 4402", email: "operaciones@tecnologiamx.mx", address: { street: "Av. Chapultepec 480", neighborhood: "Americana", city: "Guadalajara", state: "Jalisco", zip: "44160" }, since: "2024-10-08T09:00:00-06:00" },
  { id: "rem-06", name: "Distribuidora MX", kind: "empresa", contactName: "Raúl Montes", phone: "442 212 9083", email: "almacen@distribuidoramx.mx", address: { street: "Av. Constituyentes 88", neighborhood: "Centro", city: "Querétaro", state: "Querétaro", zip: "76000" }, since: "2025-02-17T09:00:00-06:00" },
  { id: "rem-07", name: "Farmacia San Rafael", kind: "empresa", contactName: "Irma Castañeda", phone: "722 214 3390", email: "compras@fsanrafael.mx", address: { street: "Av. Independencia 702", neighborhood: "Centro", city: "Toluca", state: "Estado de México", zip: "50000" }, since: "2025-04-02T09:00:00-06:00" },
  { id: "rem-08", name: "Taller Artesanal Xochi", kind: "particular", contactName: "Xóchitl Bahena", phone: "777 145 8820", email: "xochi.bahena@gmail.com", address: { street: "Calle Galeana 31", neighborhood: "Delicias", city: "Cuernavaca", state: "Morelos", zip: "62330" }, since: "2025-06-09T09:00:00-06:00" },
];

export const RECIPIENTS = [
  "María López", "Carlos Ramírez", "Ana Torres", "Jorge Castillo", "Sofía Martínez",
  "Luis Hernández", "Fernanda Ríos", "Ricardo Mendoza", "Patricia Vega", "Alejandro Cruz",
  "Daniela Ortiz", "Roberto Navarro", "Gabriela Flores", "Héctor Morales", "Valeria Jiménez",
  "Andrés Salazar", "Mónica Aguilar", "Diego Romero", "Lucía Guerrero", "Fernando Medina",
  "Claudia Reyes", "Emilio Vargas", "Teresa Domínguez", "Samuel Ortega",
];

export const CONTENTS: { text: string; type: "sobre" | "chico" | "mediano" | "grande"; value: [number, number] }[] = [
  { text: "Documentos contractuales", type: "sobre", value: [100, 500] },
  { text: "Facturas y estados de cuenta", type: "sobre", value: [50, 300] },
  { text: "Ropa y accesorios", type: "chico", value: [400, 2500] },
  { text: "Cosméticos", type: "chico", value: [300, 1800] },
  { text: "Medicamentos (no controlados)", type: "chico", value: [200, 1500] },
  { text: "Libros", type: "mediano", value: [350, 1600] },
  { text: "Electrónicos: audífonos y cargadores", type: "mediano", value: [900, 4800] },
  { text: "Refacciones automotrices", type: "mediano", value: [700, 5200] },
  { text: "Artesanías de barro", type: "mediano", value: [500, 2400] },
  { text: "Artículos de cocina", type: "grande", value: [800, 3800] },
  { text: "Electrodoméstico: licuadora", type: "grande", value: [1400, 3200] },
  { text: "Monitor de 24 pulgadas", type: "grande", value: [2800, 5600] },
];

const ALL: Permission[] = ["dashboard", "paquetes", "repartidores", "remitentes", "incidencias", "reportes", "usuarios", "configuracion"];

export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  supervisor: ["dashboard", "paquetes", "repartidores", "remitentes", "incidencias", "reportes"],
  repartidor: ["entregas"],
  remitente: ["envios_propios"],
};

export const DEFAULT_SETTINGS: Settings = {
  companyName: "SALTER",
  slogan: "Alternativa en Movimiento",
  phone: "777 312 8800",
  email: "contacto@salter.mx",
  address: "Av. Plan de Ayala 1120, Col. Chapultepec, Cuernavaca, Morelos",
  hours: "Lunes a sábado, 8:00 a 19:00 h",
  guidePrefix: "SAL",
  requirePhoto: true,
  requireSignature: true,
  notifyEmail: true,
  publicTracking: true,
  permissions: DEFAULT_PERMISSIONS,
};

export const USERS: User[] = [
  { id: "usr-01", name: "Alejandra Salgado", email: "admin@salter.mx", phone: "777 312 8801", role: "admin", status: "activo", lastAccess: "2026-10-29T08:12:00-06:00", createdAt: "2023-06-01T09:00:00-06:00" },
  { id: "usr-02", name: "Roberto Téllez", email: "operaciones@salter.mx", phone: "777 312 8802", role: "supervisor", status: "activo", lastAccess: "2026-10-29T07:45:00-06:00", createdAt: "2023-06-01T09:00:00-06:00" },
  { id: "usr-03", name: "Karla Méndez", email: "atencion@salter.mx", phone: "777 312 8803", role: "supervisor", status: "activo", lastAccess: "2026-10-28T18:20:00-06:00", createdAt: "2024-01-15T09:00:00-06:00" },
  ...COURIERS.map<User>((c, i) => ({
    id: `usr-r${i + 1}`,
    name: c.name,
    email: i === 0 ? "repartidor@salter.mx" : c.email,
    phone: c.phone,
    role: "repartidor",
    status: c.status === "inactivo" ? "inactivo" : "activo",
    lastAccess: i === 4 ? "2026-10-27T19:02:00-06:00" : "2026-10-29T07:" + String(10 + i * 6).padStart(2, "0") + ":00-06:00",
    createdAt: c.joinedAt,
    linkedId: c.id,
  })),
  { id: "usr-c1", name: "Gabriela Ruiz", email: "cliente@tiendaelsol.mx", phone: "777 312 0045", role: "remitente", status: "activo", lastAccess: "2026-10-29T10:05:00-06:00", createdAt: "2024-03-04T09:00:00-06:00", linkedId: "rem-01" },
  { id: "usr-c2", name: "Marco Antonio Ibarra", email: "pedidos@electrohogar.mx", phone: "55 5523 6610", role: "remitente", status: "activo", lastAccess: "2026-10-28T13:40:00-06:00", createdAt: "2023-12-01T09:00:00-06:00", linkedId: "rem-04" },
  { id: "usr-c3", name: "Paola Chávez", email: "operaciones@tecnologiamx.mx", phone: "33 3615 4402", role: "remitente", status: "activo", lastAccess: "2026-10-25T09:15:00-06:00", createdAt: "2024-10-08T09:00:00-06:00", linkedId: "rem-05" },
  { id: "usr-c4", name: "Raúl Montes", email: "almacen@distribuidoramx.mx", phone: "442 212 9083", role: "remitente", status: "pendiente", lastAccess: null, createdAt: "2026-10-20T09:00:00-06:00", linkedId: "rem-06" },
  { id: "usr-04", name: "Tomás Aranda", email: "tomas.aranda@salter.mx", phone: "777 312 8805", role: "supervisor", status: "inactivo", lastAccess: "2026-07-14T16:30:00-06:00", createdAt: "2024-02-01T09:00:00-06:00" },
];

export const DEMO_ACCOUNTS = {
  admin: "admin@salter.mx",
  repartidor: "repartidor@salter.mx",
  remitente: "cliente@tiendaelsol.mx",
} as const;
