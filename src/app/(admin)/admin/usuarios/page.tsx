import { listAdminUsers } from '@/features/admin/queries'
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
  const pageNum = Math.max(1, Math.floor(Number(page)) || 1)

  const { users, total: count, pageSize } = await listAdminUsers(q, pageNum)
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
            placeholder="Nome, @username ou telefone"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 w-64"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors">
            Buscar
          </button>
        </form>
      </div>

      <div className="card-dark rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-white/40 font-medium">Usuário</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium">Contato</th>
              <th className="text-left px-4 py-3 text-white/40 font-medium">Cidade</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Carteira</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Cadastro</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Onboarding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{u.full_name ?? '—'}</p>
                  <p className="text-white/35 text-xs mt-0.5">@{u.username}</p>
                </td>
                <td className="px-4 py-3">
                  {u.email
                    ? <a href={`mailto:${u.email}`} className="block text-white/70 text-xs hover:text-primary break-all">{u.email}</a>
                    : <p className="text-white/25 text-xs">sem e-mail</p>}
                  {u.phone
                    ? <a href={`tel:${u.phone.replace(/[^\d+]/g, '')}`} className="block text-white/50 text-xs mt-0.5 hover:text-primary">{u.phone}</a>
                    : <p className="text-white/25 text-xs mt-0.5">sem telefone</p>}
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
