"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Pencil, Plus, Trash2, Users } from "lucide-react";
import { QueryState, Table } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Card, EmptyState, PageHeader, Pagination } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { qk, useRecipients, useSenders } from "@/lib/api/hooks";
import type { Recipient } from "@/lib/api/types";
import { joinAddress } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useDebounced } from "@/hooks/use-debounced";
import { ImportWizard } from "./import-wizard";
import { RecipientEditor } from "./recipient-editor";

const PAGE = 25;

export function RecipientsView() {
  const { me, can } = useSession();
  const restricted = !can("SENDERS_VIEW");
  const senders = useSenders({ active: true });
  const [chosenSender, setSenderId] = useState<number | undefined>();
  const senderId = chosenSender ?? me?.sender?.id ?? (restricted ? undefined : senders.data?.content[0]?.id);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Recipient | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [removing, setRemoving] = useState<Recipient | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const dq = useDebounced(q.trim());
  const list = useRecipients({ senderId, q: dq || undefined, page: page - 1, size: PAGE }, !!senderId || !restricted);
  const remove = useMutation({
    mutationFn: (r: Recipient) => api.del(`/recipients/${r.id}`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.recipients }); toast.success("Destinatario dado de baja", "Las guías emitidas conservan sus datos."); },
    onError: (e) => toast.error("No se pudo dar de baja", errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Destinatarios" description="Catálogo autorizado por remitente. La búsqueda ignora mayúsculas y acentos."
        actions={<>
          {can("RECIPIENTS_IMPORT") && <Button variant="outline" icon={<FileSpreadsheet className="size-4" />} onClick={() => setImporting(true)} disabled={!senderId}>Importar Excel / CSV</Button>}
          {can("RECIPIENTS_MANAGE") && <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")} disabled={!senderId}>Nuevo destinatario</Button>}
        </>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3">
        {restricted ? <Input readOnly value={me?.sender?.name ?? "Sin remitente asignado"} className="bg-canvas" aria-label="Remitente" /> : (
          <Select value={senderId ?? ""} onChange={(e) => { setSenderId(Number(e.target.value)); setPage(1); }} aria-label="Remitente">
            {senders.data?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        )}
        <Input className="sm:col-span-2" placeholder="Buscar por nombre, número de cliente, subruta (CVA-01), ciudad…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Buscar" />
      </Card>
      <Card>
        <QueryState loading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
          {list.data?.content.length === 0 ? <EmptyState icon={Users} title="Sin destinatarios" description="Registra uno nuevo o importa tu archivo de Excel." /> : (
            <>
              <ul className="divide-y divide-line-soft md:hidden">
                {list.data?.content.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        {r.clientCode && <span className="font-mono text-[13px] text-muted">#{r.clientCode}</span>}
                        {r.subRoute && <span className="rounded-lg bg-brand-50 px-2 py-0.5 font-mono text-[12px] font-bold text-brand-700">{r.subRoute}</span>}
                      </p>
                      <p className="mt-0.5 font-semibold text-ink">{r.fullName}</p>
                      <p className="text-[13px] text-muted">{joinAddress(r.address) || "Sin dirección"}</p>
                    </div>
                    {can("RECIPIENTS_MANAGE") && <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="Editar"><Pencil className="size-4" /></Button>}
                  </li>
                ))}
              </ul>
              <Table className="hidden md:block" head={["Cliente", "Nombre", "Dirección", "Subruta", ""]}>
                {list.data?.content.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-[13px] text-ink-soft">{r.clientCode ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{r.fullName}{r.phone && <span className="block text-[13px] font-normal text-muted">{r.phone}</span>}</td>
                    <td className="px-4 py-3 text-ink-soft">{joinAddress(r.address) || "—"}</td>
                    <td className="px-4 py-3">{r.subRoute ? <span className="whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1 font-mono text-[13px] font-bold text-brand-700">{r.subRoute}</span> : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {can("RECIPIENTS_MANAGE") && <>
                        <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)}>Editar</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={() => setRemoving(r)} aria-label="Dar de baja" />
                      </>}
                    </td>
                  </tr>
                ))}
              </Table>
              {list.data && list.data.totalPages > 1 && <div className="border-t border-line-soft p-4"><Pagination page={page} pageCount={list.data.totalPages} total={list.data.totalElements} pageSize={PAGE} onChange={setPage} /></div>}
            </>
          )}
        </QueryState>
      </Card>
      {editing && senderId && <RecipientEditor recipient={editing === "new" ? null : editing} senderId={senderId} onClose={() => setEditing(null)} />}
      {importing && senderId && <ImportWizard senderId={senderId} senderName={senders.data?.content.find((s) => s.id === senderId)?.name ?? me?.sender?.name ?? ""} onClose={() => setImporting(false)} />}
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing)}
        title="¿Dar de baja al destinatario?" description="Dejará de aparecer en el buscador. Las guías ya emitidas no cambian." confirmLabel="Dar de baja" />
    </>
  );
}
