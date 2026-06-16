import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEvents } from '@/features/eventos/queries'
import { getUserParticipations } from '@/features/participacoes/queries'
import { EventCard } from '@/features/eventos/components/EventCard'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Search, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  tab?: string
  sub?: string
  q?: string
  city?: string
  category?: string
  date_from?: string
  date_to?: string
  cursor_created_at?: string
  cursor_id?: string
}

function sortEventsByProximity<T extends { starts_at: string }>(list: T[]): T[] {
  const now = new Date()
  const upcoming = list.filter(e => new Date(e.starts_at) >= now).sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )
  const past = list.filter(e => new Date(e.starts_at) < now).sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  )
  return [...upcoming, ...past]
}

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Futebol', value: 'Futebol' },
  { label: 'Basquete', value: 'Basquete' },
  { label: 'Vôlei', value: 'Vôlei' },
  { label: 'Airsoft & Paintball', value: 'Airsoft & Paintball' },
  { label: 'Corrida & Trilha', value: 'Corrida & Trilha' },
  { label: 'Gastronomia', value: 'Gastronomia' },
  { label: 'Negócios', value: 'Negócios' },
  { label: 'Ensino', value: 'Ensino' },
  { label: 'Música', value: 'Música' },
  { label: 'Social', value: 'Social' },
  { label: 'Outros', value: 'Outros' },
]

function SubBar({ isMeus, sub, buildHref }: {
  isMeus: boolean
  sub: string
  buildHref: (o: Partial<SearchParams>) => string
}) {
  if (!isMeus) return null
  const tabs = [
    { label: 'Organizando', value: 'organizando' },
    { label: 'Participando', value: 'participando' },
  ]
  return (
    <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
      {tabs.map(t => (
        <Link
          key={t.value}
          href={buildHref({ sub: t.value, cursor_created_at: undefined, cursor_id: undefined })}
          className={cn(
            'flex-1 text-center text-xs font-medium py-1.5 rounded-md transition-colors',
            sub === t.value
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:text-white/70'
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tab = params.tab === 'meus' ? 'meus' : 'todos'
  const isMeus = tab === 'meus'
  const sub = params.sub === 'participando' ? 'participando' : 'organizando'

  const activeCategory = params.category ?? ''

  function buildHref(overrides: Partial<SearchParams>) {
    const merged = { ...params, ...overrides }
    // Remove undefined keys
    const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v != null && v !== ''))
    const qs = Object.entries(clean)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&')
    return `/eventos${qs ? `?${qs}` : ''}`
  }

  // Buscar primeiro grupo do user para o botão "Criar evento"
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  // ── Dados por aba ─────────────────────────────────────────────────────────
  let events: Awaited<ReturnType<typeof getEvents>>['events'] = []
  let has_more = false
  let next_cursor: { created_at: string; id: string } | null = null

  // Participações do usuário (sub-aba "Participando")
  type ParticipationEvent = {
    id: string
    title: string
    starts_at: string
    city: string
    status: string
    price: number
    cover_url: string | null
    groups: { name: string } | null
    participations: { status: string; profiles: { full_name: string | null; avatar_url: string | null } | null }[]
    organizer_id?: string
    // extras para compatibilidade com EventCard
    confirmedCount?: number
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let participationEvents: any[] = []

  if (!isMeus) {
    const result = await getEvents({
      userId: user.id,
      q: params.q,
      city: params.city,
      category: params.category,
      date_from: params.date_from,
      date_to: params.date_to,
      cursor_created_at: params.cursor_created_at,
      cursor_id: params.cursor_id,
      status: ['OPEN', 'CONFIRMED', 'PENDING'],
    })
    events = result.events
    has_more = result.has_more
    next_cursor = result.next_cursor
  } else if (sub === 'organizando') {
    const result = await getEvents({
      userId: user.id,
      q: params.q,
      cursor_created_at: params.cursor_created_at,
      cursor_id: params.cursor_id,
      onlyMine: true,
      status: ['DRAFT', 'OPEN', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    })
    const sorted = sortEventsByProximity(result.events)
    events = sorted as typeof result.events
    has_more = result.has_more
    next_cursor = result.next_cursor
  } else {
    // sub === 'participando'
    const participations = await getUserParticipations(user.id)
    const mapped = participations
      .filter(p => {
        const ev = p.events as ParticipationEvent | null
        if (!ev) return false
        // excluir eventos onde o user é o organizador (já aparecem em "organizando")
        if (ev.organizer_id === user.id) return false
        // filtro de busca
        if (params.q && !ev.title.toLowerCase().includes(params.q.toLowerCase())) return false
        return true
      })
      .map(p => {
        const ev = p.events as ParticipationEvent
        const allParticipations = (ev.participations ?? []) as { status: string }[]
        return {
          ...ev,
          groups: Array.isArray(ev.groups) ? ev.groups[0] ?? null : ev.groups,
          participations: allParticipations,
          confirmedCount: allParticipations.filter(x => x.status === 'CONFIRMED').length,
          _participationStatus: p.status,
        }
      })
    participationEvents = sortEventsByProximity(mapped)
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Eventos
        </h1>
        {membership && (
          <Link
            href={`/eventos/novo?group_id=${membership.group_id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="size-4" />
            Criar
          </Link>
        )}
      </div>

      {/* Aba principal: Todos / Meus eventos */}
      <div className="flex gap-1 bg-white/[0.05] rounded-xl p-1 border border-white/[0.08]">
        <Link
          href={buildHref({ tab: undefined, sub: undefined, cursor_created_at: undefined, cursor_id: undefined })}
          className={cn(
            'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors',
            !isMeus ? 'bg-primary/20 text-primary' : 'text-white/50 hover:text-white'
          )}
        >
          Todos
        </Link>
        <Link
          href={buildHref({ tab: 'meus', sub: sub, cursor_created_at: undefined, cursor_id: undefined })}
          className={cn(
            'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors',
            isMeus ? 'bg-primary/20 text-primary' : 'text-white/50 hover:text-white'
          )}
        >
          Meus eventos
        </Link>
      </div>

      {/* Sub-barra: Organizando / Participando */}
      <SubBar isMeus={isMeus} sub={sub} buildHref={buildHref} />

      {/* Busca */}
      <form method="GET" className="space-y-2">
        {params.tab && <input type="hidden" name="tab" value={params.tab} />}
        {isMeus && <input type="hidden" name="sub" value={sub} />}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <Input name="q" defaultValue={params.q} placeholder="Buscar eventos..." className="pl-9" />
          </div>
          {!isMeus && (
            <Input name="city" defaultValue={params.city} placeholder="Cidade" className="w-28" />
          )}
          <button type="submit" className={cn(buttonVariants({ variant: 'outline' }), 'border-white/10 text-white/60 hover:text-white hover:border-primary/40 shrink-0')}>
            Buscar
          </button>
        </div>
        {!isMeus && (
          <>
            <select
              name="category"
              defaultValue={activeCategory}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/60 focus:outline-none focus:border-primary/40 transition-colors"
            >
              {CATEGORIES.map(({ label, value }) => (
                <option key={value} value={value} className="bg-[#0d1a14] text-white">
                  {value === '' ? `Categoria: ${label}` : label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 items-center">
              <Input type="date" name="date_from" defaultValue={params.date_from} className="flex-1 text-white/60 text-sm" />
              <span className="text-white/30 text-xs shrink-0">até</span>
              <Input type="date" name="date_to" defaultValue={params.date_to} className="flex-1 text-white/60 text-sm" />
            </div>
          </>
        )}
      </form>

      {/* Lista */}
      {(() => {
        const list = isMeus && sub === 'participando' ? participationEvents : events
        const isEmpty = list.length === 0

        const emptyMessage = !isMeus
          ? 'Nenhum evento encontrado.'
          : sub === 'organizando'
            ? 'Você ainda não criou nenhum evento.'
            : 'Você não está inscrito em nenhum evento.'

        if (isEmpty) {
          return (
            <div className="card-dark rounded-2xl p-10 text-center space-y-3">
              <Calendar className="size-9 mx-auto text-white/15" />
              <p className="text-white/35 text-sm">{emptyMessage}</p>
              {!isMeus && (
                <p className="text-xs text-white/20">Tente outros termos ou remova os filtros.</p>
              )}
              {isMeus && sub === 'organizando' && membership && (
                <Link href={`/eventos/novo?group_id=${membership.group_id}`} className={cn(buttonVariants(), 'gap-2')}>
                  <Plus className="size-4" />
                  Criar primeiro evento
                </Link>
              )}
              {isMeus && sub === 'participando' && (
                <Link href="/eventos" className="inline-block text-xs text-primary hover:underline">
                  Explorar eventos →
                </Link>
              )}
            </div>
          )
        }

        return (
          <div className="space-y-3">
            {list.map((event) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const e = event as any
              const participations = e.participations ?? []
              const confirmedCount = e.confirmedCount ?? participations.filter((p: { status: string }) => p.status === 'CONFIRMED').length
              return (
                <EventCard
                  key={e.id}
                  event={e}
                  confirmedCount={confirmedCount}
                  groupName={e.groups?.name}
                />
              )
            })}
          </div>
        )
      })()}

      {!isMeus && has_more && next_cursor && (
        <div className="text-center">
          <Link
            href={buildHref({ cursor_created_at: next_cursor.created_at, cursor_id: next_cursor.id })}
            className={cn(buttonVariants({ variant: 'outline' }), 'border-white/10 text-white/60 hover:text-white')}
          >
            Carregar mais
          </Link>
        </div>
      )}
    </main>
  )
}
