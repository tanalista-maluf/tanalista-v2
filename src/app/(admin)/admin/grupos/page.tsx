import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function AdminGruposPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const pageNum = Math.max(1, Number(page ?? 1))
  const pageSize = 30
  const offset = (pageNum - 1) * pageSize

  const admin = createAdminClient()

  let query = admin
    .from('groups')
    .select(
      'id, name, category, city, visibility, member_count, created_at, owner_id, profiles!groups_owner_id_fkey(full_name, username)',
      { count: 'exact' }
    )
    .order('member_count', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: groups, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Grupos</h1>
          <p className="text-sm text-white/40 mt-0.5">{count?.toLocaleString('pt-BR') ?? 0} no total</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar grupo..."
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 w-64"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors">
            Buscar
          </button>
        </form>
      </div>

      <div className="card-dark rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-white/40 font-medium">Grupo</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium">Dono</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Membros</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Criado em</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Visib.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(groups ?? []).map((g: any) => (
              <tr key={g.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3">
                  <a href={`/grupos/${g.id}`} className="text-white font-medium hover:text-primary transition-colors">
                    {g.name}
                  </a>
                  <p className="text-white/30 text-xs mt-0.5">{g.city ?? '—'} {g.category ? `· ${g.category}` : ''}</p>
                </td>
                <td className="px-4 py-3 text-white/50 text-xs">
                  @{g.profiles?.username ?? '—'}
                </td>
                <td className="px-4 py-3 text-right text-white/70">{g.member_count}</td>
                <td className="px-4 py-3 text-right text-white/35 text-xs">
                  {format(new Date(g.created_at), 'dd/MM/yy', { locale: ptBR })}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    g.visibility === 'PUBLIC' ? 'text-primary bg-primary/10' : 'text-white/40 bg-white/5'
                  }`}>
                    {g.visibility === 'PUBLIC' ? 'Público' : 'Privado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {pageNum > 1 && (
            <a href={`?page=${pageNum - 1}${q ? `&q=${q}` : ''}`} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors">
              ← Anterior
            </a>
          )}
          <span className="text-white/30">{pageNum} / {totalPages}</span>
          {pageNum < totalPages && (
            <a href={`?page=${pageNum + 1}${q ? `&q=${q}` : ''}`} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white transition-colors">
              Próxima →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
