"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Concept, Courier, CourierAssignment, CourierHistoryItem, Guide, GuideStatus, GuideSummary, Incident, Manifest,
  ManifestSummary, Page, PermissionInfo, Recipient, ReportSummary, RoleInfo, Sender, Shift, UserAccount,
} from "./types";

/** Claves de caché: invalidar un prefijo refresca todas las vistas relacionadas. */
export const qk = {
  guides: ["guides"] as const,
  manifests: ["manifests"] as const,
  recipients: ["recipients"] as const,
  incidents: ["incidents"] as const,
  reports: ["reports"] as const,
  couriers: ["couriers"] as const,
  courierMe: ["courier-me"] as const,
  users: ["users"] as const,
  senders: ["senders"] as const,
  catalogs: ["catalogs"] as const,
};

export interface GuideFilters {
  q?: string; status?: GuideStatus[]; senderId?: number; shiftId?: number; courierId?: number; mine?: boolean;
  from?: string; to?: string; withoutManifest?: boolean; page?: number; size?: number;
}

export function useGuides(f: GuideFilters) {
  return useQuery({
    queryKey: [...qk.guides, "list", f],
    queryFn: () => api.get<Page<GuideSummary>>("/guides", { ...f, status: f.status }),
    placeholderData: keepPreviousData,
  });
}

export function useGuide(id: number | null) {
  return useQuery({ queryKey: [...qk.guides, "detail", id], queryFn: () => api.get<Guide>(`/guides/${id}`), enabled: id != null });
}

export function useRecipients(params: { senderId?: number; q?: string; page?: number; size?: number; active?: boolean }, enabled = true) {
  return useQuery({
    queryKey: [...qk.recipients, params],
    queryFn: () => api.get<Page<Recipient>>("/recipients", params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSenders(params: { q?: string; active?: boolean; page?: number; size?: number } = {}) {
  return useQuery({ queryKey: [...qk.senders, params], queryFn: () => api.get<Page<Sender>>("/senders", { size: 200, ...params }) });
}

export function useShifts() {
  return useQuery({ queryKey: [...qk.catalogs, "shifts"], queryFn: () => api.get<Shift[]>("/shifts"), staleTime: 5 * 60_000 });
}

export function useConcepts() {
  return useQuery({ queryKey: [...qk.catalogs, "concepts"], queryFn: () => api.get<Concept[]>("/concepts"), staleTime: 5 * 60_000 });
}

export function useSettings() {
  return useQuery({ queryKey: [...qk.catalogs, "settings"], queryFn: () => api.get<Record<string, string>>("/settings") });
}

export function useCouriers(active?: boolean, enabled = true) {
  return useQuery({ queryKey: [...qk.couriers, active], queryFn: () => api.get<Courier[]>("/couriers", { active }), enabled });
}

export function useManifests(params: { status?: string; shiftId?: number; senderId?: number; from?: string; to?: string; page?: number }) {
  return useQuery({
    queryKey: [...qk.manifests, "list", params],
    queryFn: () => api.get<Page<ManifestSummary>>("/manifests", params),
    placeholderData: keepPreviousData,
  });
}

export function useManifest(id: number | null) {
  return useQuery({ queryKey: [...qk.manifests, "detail", id], queryFn: () => api.get<Manifest>(`/manifests/${id}`), enabled: id != null });
}

export function useEligibleGuides(params: { shiftId?: number; senderId?: number; from?: string; to?: string; q?: string }) {
  return useQuery({
    queryKey: [...qk.manifests, "eligible", params],
    queryFn: () => api.get<Page<GuideSummary>>("/manifests/eligible-guides", { ...params, size: 200 }),
  });
}

export function useIncidents(params: { status?: string; severity?: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: [...qk.incidents, params],
    queryFn: () => api.get<Page<Incident>>("/incidents", params),
    placeholderData: keepPreviousData,
  });
}

export function useReportSummary(params: Record<string, string | number | undefined>, enabled = true) {
  return useQuery({
    queryKey: [...qk.reports, params],
    queryFn: () => api.get<ReportSummary>("/reports/summary", params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMyAssignments() {
  return useQuery({ queryKey: [...qk.courierMe, "assignments"], queryFn: () => api.get<CourierAssignment[]>("/courier/assignments"), refetchInterval: 60_000 });
}

export function useMyHistory(days = 7) {
  return useQuery({ queryKey: [...qk.courierMe, "history", days], queryFn: () => api.get<CourierHistoryItem[]>("/courier/history", { days }) });
}

export function useUsers(params: { q?: string; role?: string; active?: boolean; page?: number }) {
  return useQuery({ queryKey: [...qk.users, params], queryFn: () => api.get<Page<UserAccount>>("/users", params), placeholderData: keepPreviousData });
}

export function useRoles(enabled = true) {
  return useQuery({ queryKey: [...qk.users, "roles"], queryFn: () => api.get<RoleInfo[]>("/roles"), enabled });
}

export function usePermissionCatalog(enabled = true) {
  return useQuery({ queryKey: [...qk.users, "permissions"], queryFn: () => api.get<PermissionInfo[]>("/permissions"), enabled, staleTime: Infinity });
}

/** Invalida todo lo relacionado con la operación de guías tras una mutación. */
export function useInvalidateOperation() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.guides }),
      qc.invalidateQueries({ queryKey: qk.manifests }),
      qc.invalidateQueries({ queryKey: qk.incidents }),
      qc.invalidateQueries({ queryKey: qk.reports }),
      qc.invalidateQueries({ queryKey: qk.courierMe }),
      qc.invalidateQueries({ queryKey: qk.couriers }),
    ]);
}
