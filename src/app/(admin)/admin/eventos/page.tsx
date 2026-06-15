import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice } from '@/utils/format'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT:       { label: 'Rascunho',           className: 'text-white/40 bg-white/5' },
  OPEN:        { label: 'Aberto',              className: 'text-primary bg-primary/10' },
  PENDING:     { label: 'Pendente',            className: 'text-yellow-400 bg-yellow-400/10' },
  CONFIRMED:   { label: 'Confirmado',          className: 'text-blue-400 bg-blue-400/10' },
  COMPLETED:   { label: 'Concluído',           className: 'text-white/50 bg-white/5' },
  CANCELLED:   { label: 'Cancelado',           className: 'text-red-400 bg-red-400/10' },
  MIN_NOT_MET: { label: 'Mín. não atingido',  className: 'text-orange-400 bg-orange-400/10' },
}

export default async function AdminEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q, status, page } = await searchParams
  const pageNum = Math.max(1, Number(page ?? 1))
  const pageSize = 30
  const offset = (pageNum - 1) * pageSize

  const admin = createAdminClient()

  let query = admin
    .from('events')
    .select(
      'id, title, status, starts_at, price, confirmed_count, capacity, city, organizer_id, profiles!events_organizer_id_fkey(full_name, username)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (status) query = query.eq('status', status)

  const { data: events, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Eventos</h1>
          <p className="text-sm text-white/40 mt-0.5">{count?.toLocaleString('pt-BR') ?? 0} no total</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar evento..."
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 w-52"
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 focus:outline-none focus:border-primary/50"
          >
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors">
            Filtrar
          </button>
        </form>
      </div>

      <div className="card-dark rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-white/40 font-medium">Evento</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium">Organizador</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Data</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Vagas</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Preço</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(events ?? []).map((ev: any) => {
              const cfg = STATUS_LABELS[ev.status] ?? { label: ev.status, className: 'text-white/40 bg-white/5' }
              return (
                <tr key={ev.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <a href={`/eventos/${ev.id}`} className="text-white font-medium hover:text-primary transition-colors truncate block max-w-[200px]">
                      {ev.title}
                    </a>
                    <p className="text-white/30 text-xs mt-0.5">{ev.city}</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    @{ev.profiles?.username ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-white/40 text-xs">
                    {format(new Date(ev.starts_at), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-right text-white/50 text-xs">
                    {ev.confirmed_count}/{ev.capacity}
                  </td>
                  <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">
                    {formatPrice(ev.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {pageNum > 1 && (
            <a href={`?page=${pageNum - 1}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`}
               className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors">
              ← Anterior
            </a>
          )}
          <span className="text-white/30">{pageNum} / {totalPages}</span>
          {pageNum < totalPages && (
            <a href={`?page=${pageNum + 1}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`}
               className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors">
              Próxima →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
