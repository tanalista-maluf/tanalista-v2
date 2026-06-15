import { createAdminClient } from '@/lib/supabase/admin'
import { formatBalance } from '@/utils/format'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function AdminUsuariosPage({
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
    .from('profiles')
    .select('id, full_name, username, city, wallet_balance, created_at, onboarding_completed', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (q) {
    query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
  }

  const { data: users, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários</h1>
          <p className="text-sm text-white/40 mt-0.5">{count?.toLocaleString('pt-BR') ?? 0} cadastrados</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou @username..."
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
              <th className="text-left px-4 py-3 text-white/40 font-medium">Usuário</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium">Cidade</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Carteira</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Cadastro</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Onboarding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(users ?? []).map((u: any) => (
              <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{u.full_name ?? '—'}</p>
                  <p className="text-white/35 text-xs mt-0.5">@{u.username}</p>
                </td>
                <td className="px-4 py-3 text-white/50">{u.city ?? '—'}</td>
                <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">
                  {formatBalance(u.wallet_balance ?? 0)}
                </td>
                <td className="px-4 py-3 text-right text-white/35 text-xs">
                  {format(new Date(u.created_at), 'dd/MM/yy', { locale: ptBR })}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.onboarding_completed
                    ? <span className="text-xs text-primary">✓</span>
                    : <span className="text-xs text-white/25">Pendente</span>
                  }
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
