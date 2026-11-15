/**
 * Contratos de la API de SALTER (salterapi). Reflejan los DTO del backend.
 * Los campos opcionales pueden omitirse en la respuesta cuando no tienen valor.
 */

export type Permission =
  | "DASHBOARD_VIEW" | "USERS_MANAGE" | "ROLES_MANAGE" | "SETTINGS_MANAGE" | "AUDIT_VIEW"
  | "SENDERS_VIEW" | "SENDERS_MANAGE" | "RECIPIENTS_VIEW" | "RECIPIENTS_MANAGE" | "RECIPIENTS_IMPORT"
  | "CATALOGS_MANAGE" | "GUIDES_CREATE" | "GUIDES_VIEW_OWN" | "GUIDES_VIEW_ALL" | "GUIDES_CONFIRM"
  | "GUIDES_CANCEL" | "GUIDES_CORRECT" | "GUIDES_HOLD" | "MANIFESTS_VIEW" | "MANIFESTS_MANAGE"
  | "DISPATCH_AUTHORIZE" | "DISPATCH_REGISTER" | "ROUTES_VIEW" | "ROUTES_MANAGE" | "ROUTES_REASSIGN" | "COURIERS_VIEW" | "COURIERS_MANAGE" | "ASSIGNMENTS_MANAGE" | "DELIVERIES_OWN"
  | "DELIVERIES_ANY" | "RECEPTION_CONFIRM" | "INCIDENTS_VIEW" | "INCIDENTS_CREATE" | "INCIDENTS_RESOLVE"
  | "REPORTS_VIEW" | "REPORTS_OWN" | "SHIPMENTS_OWN";

export type RoleCode = "ADMIN" | "REMITENTE" | "RECEPCION" | "REPARTIDOR" | "OPERACIONES" | "ENCARGADO";

export interface Ref { id: number; name: string }

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

export interface Address {
  street?: string; neighborhood?: string; city?: string; state?: string; zip?: string; references?: string;
}

export interface Me {
  id: number; email: string; fullName: string; phone?: string; role: RoleCode; roleName: string;
  permissions: Permission[]; sender?: Ref; courier?: Ref; lastLoginAt?: string;
}

export interface LoginResponse { token: string; expiresAt: string; user: Me }

// ─────────── Catálogos ───────────
export interface Sender {
  id: number; code: string; name: string; kind: "EMPRESA" | "PARTICULAR"; contactName?: string; phone?: string;
  email?: string; address: Address; notes?: string;
  /** Plaza de origen por defecto en la guía (ej. PBA). */
  plazaCode?: string;
  /** Siglas configuradas para el folio (ej. ATM). */
  guidePrefix?: string;
  /** Siglas que realmente se usan en el folio (configuradas o calculadas del nombre). */
  effectiveGuidePrefix: string;
  /** Ruta de embarque predeterminada (se propone en cada guía). */
  defaultShippingRoute?: Ref;
  active: boolean; createdAt: string; version: number;
}

// ─────────── Rutas de embarque ───────────
/** Ruta de EMBARQUE (organiza manifiestos). Distinta de la ruta/subruta del cliente. */
export interface ShippingRoute {
  id: number; code: string; name: string; active: boolean; responsible?: Ref; notes?: string; createdAt: string; version: number;
}
export interface RouteOverview {
  route: ShippingRoute; openManifest?: Ref; openManifestGuides: number;
  guidesByStatus: Partial<Record<GuideStatus, number>>; pendingWithoutManifest: number;
}
export interface Shift { id: number; code: string; name: string; startTime: string; endTime: string; active: boolean; current: boolean }
export interface Concept { id: number; name: string; unit: string; active: boolean }

export interface Recipient {
  id: number; senderId: number; senderName: string; firstName: string; lastName?: string; fullName: string;
  phone?: string; email?: string; address: Address; notes?: string; active: boolean; createdAt: string; version: number;
  /** Número de cliente, ruta y subruta (ej. CVA-01) del listado del remitente. */
  clientCode?: string; route?: string; subRoute?: string; destinationCode?: string;
  /** Ubicación del local (opcional). Sólo es «verificada» si la confirmó personal autorizado. */
  latitude?: number; longitude?: number; locationVerified: boolean;
}
export interface DuplicateMatch { recipientId?: number; name: string; level: "EXACT" | "PROBABLE"; reason: string }

// ─────────── Importación ───────────
export interface ImportPreview {
  fileName: string; headers: string[]; rows: Record<string, string>[]; totalRows: number;
  suggestedMapping: Record<string, string>; targetFields: string[];
}
export interface ImportRow {
  rowNumber: number; firstName?: string; lastName?: string; phone?: string; email?: string; street?: string;
  neighborhood?: string; city?: string; state?: string; zip?: string; references?: string; notes?: string;
  clientCode?: string; extNumber?: string; route?: string; subRoute?: string;
}
export type RowStatus = "VALID" | "ERROR" | "DUPLICATE" | "PROBABLE_DUPLICATE";
export interface RowResult { rowNumber: number; status: RowStatus; errors: string[]; matches: DuplicateMatch[] }
export interface ValidationResult { total: number; valid: number; errors: number; duplicates: number; probableDuplicates: number; rows: RowResult[] }
export interface ImportResult { created: number; skippedDuplicates: number; skippedErrors: number; skippedProbable: number; rows: RowResult[] }

// ─────────── Guías ───────────
export type GuideStatus =
  | "BORRADOR" | "CONFIRMADA" | "LISTA_SALIDA" | "EN_TRANSITO" | "RECIBIDA_DESTINO"
  | "ENTREGADA" | "CON_INCIDENCIA" | "RETENIDA" | "CANCELADA";

export type GuideAction =
  | "EDIT" | "CONFIRM" | "CANCEL" | "CORRECT" | "HOLD" | "RELEASE" | "RECEIVE" | "DELIVER"
  | "REPORT_INCIDENT" | "ASSIGN" | "REASSIGN" | "PDF" | "CHANGE_ROUTE";

export interface GuideSummary {
  id: number; folio?: string; reference: string; status: GuideStatus; statusLabel: string; senderId: number;
  senderName: string; recipientId?: number; recipientName: string; recipientPhone?: string; recipientCity?: string;
  cdReference?: string; orderReference?: string;
  /** Piezas (suma de los bultos). Vacío en borradores sin bultos. */
  packageCount?: number; originCode?: string; destinationCode?: string;
  shift?: Ref; createdBy: Ref;
  createdAt: string; confirmedAt?: string; version: number;
  subRoute?: string; shippingRoute?: Ref;
}

export interface Party { name: string; contact?: string; phone?: string; email?: string; address: Address; clientCode?: string }
export interface GuideItem { id: number; position: number; conceptId?: number; description: string; quantity: number; unit: string; weightKg?: number; detail?: string }
export interface Movement {
  id: number; type: string; typeLabel: string; fromStatus?: GuideStatus; toStatus: GuideStatus; toStatusLabel: string;
  userName?: string; occurredAt: string; location?: string; notes?: string; metadata?: Record<string, unknown>;
}

export interface Guide {
  id: number; folio?: string; reference: string; status: GuideStatus; statusLabel: string; senderId: number;
  sender: Party; recipientId?: number; recipientOneTime: boolean; recipient: Party; shift?: Ref;
  cdReference?: string; orderReference?: string; packageCount?: number; totalWeightKg?: number;
  shipping: Shipping; notes?: string;
  /** Subruta del cliente (ej. CVA-01) y ruta de embarque. */
  subRoute?: string; shippingRoute?: Ref;
  /** Bultos originales del reporte (LPN, tipo, pedido). */
  packages: { lpn?: string; type: string; order?: string }[];
  importBatchId?: number;
  items: GuideItem[]; createdBy: Ref; createdAt: string; updatedAt: string; confirmedAt?: string; confirmedBy?: Ref;
  cancelledAt?: string; cancelledBy?: Ref; cancelReason?: string;
  manifest?: { id: number; number: string; status: ManifestStatus; travels: boolean; shippingRoute?: Ref };
  assignment?: { courierId: number; courierName: string; courierPhone?: string; assignedAt: string; routeOrder?: number };
  reception?: { receivedAt: string; location?: string; receivedCount?: number; hasDifferences: boolean; differences?: string; notes?: string };
  delivery?: { deliveredAt: string; receivedByName: string; notes?: string };
  openIncidentId?: number; movements: Movement[]; allowedActions: GuideAction[]; version: number;
}

/** Datos de traslado del formato oficial de guía: PBA → OAX, dimensiones, servicio y fecha compromiso. */
export interface Shipping {
  originCode?: string; destinationCode?: string; dimensions?: string; serviceType: string; commitmentDate?: string;
  weightNotApplicable: boolean; dimensionsNotApplicable: boolean;
}
export interface ShippingInput {
  originCode?: string; destinationCode?: string; dimensions?: string; serviceType?: string; commitmentDate?: string;
  weightNotApplicable?: boolean; dimensionsNotApplicable?: boolean;
}
export interface ServiceOption { code: string; days: number }

export interface NewRecipientInput {
  firstName: string; lastName?: string; phone?: string; email?: string; address?: Address;
  saveToCatalog: boolean; allowProbableDuplicate?: boolean;
}
export interface ItemInput { conceptId?: number; description?: string; quantity: number; unit?: string; weightKg?: number; detail?: string }
export interface GuideRequest {
  clientRequestId?: string; senderId?: number; shiftId?: number; recipientId?: number; newRecipient?: NewRecipientInput;
  cdReference?: string; orderReference?: string; packageCount?: number; shipping?: ShippingInput; items: ItemInput[];
  notes?: string; confirm: boolean; version?: number;
  /** Generar aunque el pedido ya esté en otra guía vigente del remitente. */
  allowDuplicateOrder?: boolean;
  subRoute?: string; shippingRouteId?: number; routeChangeReason?: string;
}

// ─────────── Manifiestos ───────────
export type ManifestStatus = "BORRADOR" | "CERRADO" | "DESPACHADO";
export interface ManifestSummary {
  id: number; number: string; status: ManifestStatus; operationDate: string; shift?: Ref; sender?: Ref;
  guideCount: number; createdBy: Ref; createdAt: string; closedAt?: string; version: number;
  shippingRoute?: Ref; authorized: boolean;
}
export interface ManifestEntry {
  guideId: number; folio?: string; travels: boolean; active: boolean; travelReason?: string; travelChangedBy?: Ref;
  travelChangedAt?: string; orders: number; piecesByType: Record<string, number>;
}
export interface ManifestReview {
  guides: number; travelling: number; notTravelling: number; orders: number; boxes: number; pieces: number; travellingPieces: number;
  piecesByType: { type: string; quantity: number }[];
  batches: { batchId: number; fileName?: string; load?: string; declaredPackages?: number; piecesInManifest: number;
    piecesInOtherManifests: number; piecesWithoutManifest: number; guidesInBatch: number; difference?: number }[];
  routeChanges: { guideId: number; folio?: string; from: string; to: string; by?: string; at: string; reason?: string }[];
  warnings: string[];
}
export interface Manifest extends ManifestSummary {
  notes?: string; closedBy?: Ref; packageCount: number; guides: GuideSummary[];
  dispatch?: { dispatchedAt: string; dispatchedBy?: Ref; courierId?: number; courierName?: string; vehicle?: string; notes?: string; guideCount: number };
  authorization?: { authorizedAt: string; authorizedBy?: Ref; notes?: string };
  entries: ManifestEntry[]; review: ManifestReview; notTravelledHistory: GuideSummary[];
  allowedActions: ("EDIT" | "CLOSE" | "DELETE" | "REOPEN" | "AUTHORIZE" | "DISPATCH" | "TRAVEL" | "PDF")[];
}

// ─────────── Operación ───────────
export type CourierStatus = "DISPONIBLE" | "EN_RUTA" | "DESCANSO" | "INACTIVO";
export interface Courier {
  id: number; name: string; phone?: string; email?: string; zone?: string; vehicle?: string; plate?: string;
  status: CourierStatus; active: boolean; activeAssignments: number; userId?: number; version: number;
}
export interface CourierAssignment {
  assignmentId: number; routeOrder?: number; assignedAt: string; guide: GuideSummary;
  street?: string; neighborhood?: string; references?: string; zip?: string; notes?: string;
}
export interface CourierHistoryItem { assignedAt: string; active: boolean; releasedAt?: string; guide: GuideSummary }

// ─────────── Incidencias ───────────
export type IncidentType = "DESTINATARIO_AUSENTE" | "DIRECCION_INCORRECTA" | "PAQUETE_DANADO" | "RECHAZADO" | "RETRASO"
  | "NO_LOCALIZADO" | "DIFERENCIA_RECEPCION" | "FALTANTE" | "OTRO";
export type IncidentSeverity = "BAJA" | "MEDIA" | "ALTA";
export type IncidentStatus = "ABIERTA" | "EN_REVISION" | "RESUELTA";
export interface Incident {
  id: number; folio: string; guideId: number; guideFolio?: string; guideStatus: GuideStatus; type: IncidentType;
  severity: IncidentSeverity; status: IncidentStatus; description: string; guideStatusBefore: GuideStatus;
  reportedByName: string; createdAt: string; resolvedAt?: string; resolution?: string;
  notes: { id: number; authorName: string; text: string; createdAt: string }[]; version: number;
}

// ─────────── Usuarios ───────────
export interface UserAccount {
  id: number; email: string; fullName: string; phone?: string; role: RoleCode; roleName: string; active: boolean;
  sender?: Ref; courier?: Ref; grantedPermissions: Permission[]; revokedPermissions: Permission[];
  lastLoginAt?: string; createdAt: string; locked: boolean; version: number;
}
export interface RoleInfo { id: number; code: RoleCode; name: string; description?: string; permissions: Permission[] }
export interface PermissionInfo { code: Permission; description: string }

// ─────────── Reportes ───────────
export interface ReportSummary {
  from: string; to: string; filters: Record<string, unknown>;
  generated: number; confirmed: number; readyForDispatch: number; dispatched: number; inTransit: number;
  received: number; delivered: number; pending: number; incidentsCreated: number; incidentsOpen: number;
  currentByStatus: Record<GuideStatus, number>;
  byShift: { shift: string; guides: number; confirmed: number }[];
  movementsByDay: { day: string; created: number; confirmed: number; dispatched: number; received: number; delivered: number; incidents: number; total: number }[];
  byCourier: { courier_id: number; courier: string; active_assignments: number; guides_assigned: number; guides_transported: number;
    delivered: number; orders_delivered: number; pieces_delivered: number }[];
  bySender: { sender_id: number; sender: string; guides: number }[];
  /** Productividad por usuario que elaboró (nombre, no correo). */
  byCreator: { user_id: number; user_name: string; guides: number; confirmed: number; orders: number; pieces: number }[];
}

/** Gráfica del día del cliente (guías confirmadas hoy). */
export interface DayStatus {
  date: string; senderId?: number; total: number; delivered: number; inTransit: number; pending: number;
  deliveredPct: number; inTransitPct: number; pendingPct: number; definition: Record<string, GuideStatus[]>;
}

export interface Tracking {
  folio: string; status: GuideStatus; statusLabel: string; destinationCity?: string; destinationState?: string;
  packageCount: number; confirmedAt?: string; events: { type: string; label: string; status: string; occurredAt: string }[];
}
