"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FilePlus2, Package } from "lucide-react";
import { QueryState, Table } from "@/components/app/common";
import { GUIDE_STATUS, GUIDE_STATUS_ORDER, GuideStatusBadge } from "@/components/app/status";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Card, EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { useGuides, useSenders, useShifts } from "@/lib/api/hooks";
import type { GuideStatus } from "@/lib/api/types";
import { fmtDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDebounced } from "@/hooks/use-debounced";

const PAGE_SIZE = 25;

export function GuidesList() {
  const { can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<GuideStatus | "">((params.get("status") as GuideStatus) ?? "");
  const [senderId, setSenderId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const all = can("GUIDES_VIEW_ALL");
  const senders = useSenders({});
  const shifts = useShifts();
  const dq = useDebounced(q.trim());
  const query = useGuides({
    q: dq || undefined, status: status ? [status] : undefined, senderId: senderId ? Number(senderId) : undefined,
    shiftId: shiftId ? Number(shiftId) : undefined, from: from || undefined, to: to || undefined, page: page - 1, size: PAGE_SIZE,
  });
  const title = all ? "Guías" : can("SHIPMENTS_OWN") ? "Mis envíos" : "Mis guías";
  const data = query.data;

  return (
    <>
      <PageHeader title={title} description={all ? "Todas las guías, con su estado actual." : "Consulta el estado y los documentos de tus guías."}
        actions={can("GUIDES_CREATE") && <ButtonLink href="/guias/nueva" icon={<FilePlus2 className="size-4" />}>Nueva guía</ButtonLink>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input className="lg:col-span-2" placeholder="Folio, destinatario, ciudad, referencia…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Buscar" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as GuideStatus); setPage(1); }} aria-label="Estado">
          <option value="">Todos los estados</option>
          {GUIDE_STATUS_ORDER.map((s) => <option key={s} value={s}>{GUIDE_STATUS[s].label}</option>)}
        </Select>
        {all ? (
          <Select value={senderId} onChange={(e) => { setSenderId(e.target.value); setPage(1); }} aria-label="Remitente">
            <option value="">Todos los remitentes</option>
            {senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        ) : (
          <Select value={shiftId} onChange={(e) => { setShiftId(e.target.value); setPage(1); }} aria-label="Turno">
            <option value="">Todos los turnos</option>
            {shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="Desde" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="Hasta" />
      </Card>
      <Card>
        <QueryState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
          {data && data.content.length === 0 ? (
            <EmptyState icon={Package} title="No hay guías con estos filtros" description="Ajusta la búsqueda o elabora una nueva guía." />
          ) : (
            <>
              {/* Escritorio */}
              <Table className="hidden md:block" head={["Folio", "Estado", "Destinatario", "Remitente", "Ref. CD / pedido", "Bultos", "Elaborada"]}>
                {data?.content.map((g) => (
                  <tr key={g.id} className="cursor-pointer hover:bg-canvas" onClick={() => router.push(`/guias/${g.id}`)}>
                    <td className="px-4 py-3"><Link href={`/guias/${g.id}`} className="font-mono font-semibold text-brand-700" onClick={(e) => e.stopPropagation()}>{g.reference}</Link></td>
                    <td className="px-4 py-3"><GuideStatusBadge status={g.status} size="sm" /></td>
                    <td className="px-4 py-3"><p className="font-semibold text-ink">{g.recipientName}</p><p className="text-[13px] text-muted">{g.recipientCity ?? "—"}</p></td>
                    <td className="px-4 py-3 text-ink-soft">{g.senderName}</td>
                    <td className="px-4 py-3 text-ink-soft">{[g.cdReference, g.orderReference].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-4 py-3">{g.packageCount}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{fmtDateTime(g.createdAt)}<br />{g.createdBy.name}</td>
                  </tr>
                ))}
              </Table>
              {/* Móvil */}
              <ul className="divide-y divide-line-soft md:hidden">
                {data?.content.map((g) => (
                  <li key={g.id}>
                    <Link href={`/guias/${g.id}`} className="block px-4 py-3.5 active:bg-canvas">
                      <div className="flex items-center justify-between gap-2"><span className="font-mono font-semibold text-brand-700">{g.reference}</span><GuideStatusBadge status={g.status} size="sm" /></div>
                      <p className="mt-1 font-semibold text-ink">{g.recipientName}</p>
                      <p className="text-[13px] text-muted">{g.recipientCity ?? "—"} · {g.packageCount} bulto(s) · {fmtDateTime(g.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {data && data.totalPages > 1 && (
                <div className="border-t border-line-soft p-4">
                  <Pagination page={page} pageCount={data.totalPages} total={data.totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
                </div>
              )}
            </>
          )}
        </QueryState>
      </Card>
    </>
  );
}
