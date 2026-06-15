import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getGroups } from '@/features/grupos/queries'
import { GroupCard } from '@/features/grupos/components/GroupCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Search, Plus } from 'lucide-react'

interface SearchParams {
  q?: string
  city?: string
  category?: string
  cursor_created_at?: string
  cursor_id?: string
  tab?: string
}

export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tab = params.tab ?? 'descobrir'
  const isMine = tab === 'meus'

  const { groups, has_more, next_cursor } = await getGroups({
    userId: user.id,
    q: params.q,
    city: params.city,
    category: params.category,
    cursor_created_at: params.cursor_created_at,
    cursor_id: params.cursor_id,
    mine: isMine,
  })

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Grupos
        </h1>
        <Link href="/grupos/novo" className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="size-4" />
          Criar grupo
        </Link>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-white/[0.05] rounded-xl p-1 border border-white/[0.08]">
        {[
          { key: 'descobrir', label: 'Descobrir' },
          { key: 'meus', label: 'Meus grupos' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/grupos?tab=${t.key}`}
            className={cn(
              'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors',
              tab === t.key
                ? 'bg-primary/20 text-primary'
                : 'text-white/50 hover:text-white'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50" />
          <Input
            name="q"
            defaultValue={params.q}
            placeholder="Buscar grupos..."
            className="pl-9"
          />
        </div>
        <Input
          name="city"
          defaultValue={params.city}
          placeholder="Cidade"
          className="w-36"
        />
        <button
          type="submit"
          className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}
        >
          Buscar
        </button>
      </form>

      {/* Lista */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-white/50 text-sm">
          {isMine
            ? 'Você ainda não participa de nenhum grupo.'
            : 'Nenhum grupo encontrado. Que tal criar o primeiro?'}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      {/* Paginação cursor */}
      {has_more && next_cursor && (
        <div className="text-center">
          <Link
            href={`/grupos?tab=${tab}${params.q ? `&q=${params.q}` : ''}${params.city ? `&city=${params.city}` : ''}&cursor_created_at=${next_cursor.created_at}&cursor_id=${next_cursor.id}`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Carregar mais
          </Link>
        </div>
      )}
    </main>
  )
}
