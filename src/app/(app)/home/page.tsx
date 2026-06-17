export const revalidate = 30

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getUserParticipations } from '@/features/participacoes/queries'
import { formatPrice, formatBalance } from '@/utils/format'
import { EventStatusBadge } from '@/features/eventos/components/EventStatusBadge'
import { UserAvatar } from '@/components/ui/user-avatar'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, Plus, ArrowRight, Users, Activity, MapPin, Clock } from 'lucide-react'
import { differenceInHours, differenceInMinutes, differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getCountdown(startsAt: string): { label: string; urgent: boolean } {
  const now = new Date()
  const start = new Date(startsAt)
  const diffM = differenceInMinutes(start, now)
  const diffH = differenceInHours(start, now)
  const diffD = differenceInDays(start, now)

  if (diffM <= 0) return { label: 'Agora', urgent: true }
  if (diffM < 60) return { label: `em ${diffM}min`, urgent: true }
  if (diffH < 24) return { label: `em ${diffH}h`, urgent: true }
  if (diffD === 1) return { label: 'amanhã', urgent: false }
  return { label: `em ${diffD} dias`, urgent: false }
}

const AVATAR_COLORS = ['bg-emerald-600','bg-blue-600','bg-purple-600','bg-orange-600','bg-rose-600','bg-teal-600']
function colorFor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function AvatarStack({ participants, total }: { participants: { name: string; avatarUrl?: string | null }[]; total: number }) {
  const shown = participants.slice(0, 4)
  const rest = total - shown.length
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="avatar-stack">
        {shown.map((p, i) => (
          p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.avatarUrl} alt={p.name} title={p.name} className="avatar-stack-item object-cover" />
          ) : (
            <div key={i} className={`avatar-stack-item ${colorFor(p.name)}`} title={p.name}>
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          )
        ))}
        {rest > 0 && (
          <div className="avatar-stack-item bg-white/10 text-white/50">+{rest}</div>
        )}
      </div>
      <span className="text-[11px] text-white/30">confirmados</span>
    </div>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [profileResult, participations] = await Promise.all([
    admin.from('profiles').select('full_name, username, city, onboarding_completed, wallet_balance').eq('id', user.id).single(),
    getUserParticipations(user.id),
  ])
  const profile = profileResult.data as { full_name: string; username: string; city: string | null; onboarding_completed: boolean; wallet_balance: number } | null

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const upcoming = participations
    .filter((p: any) => {
      const ev = p.events
      return ev && ['OPEN', 'CONFIRMED', 'PENDING'].includes(ev.status) && new Date(ev.starts_at) > new Date()
    })
    .sort((a: any, b: any) => new Date(a.events.starts_at).getTime() - new Date(b.events.starts_at).getTime())
    .slice(0, 5)

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, category)')
    .eq('user_id', user.id)
    .limit(10)

  const groupIds = (memberships ?? []).map((m: any) => m.group_id)

  let activityFeed: { type: 'joined'; userName: string; username: string; avatarUrl: string | null; eventTitle: string; eventId: string; groupName: string; when: string }[] = []

  if (groupIds.length > 0) {
    const { data: recentParticipations } = await admin
      .from('participations')
      .select('id, created_at, user_id, status, events(id, slug, title, group_id, groups(name)), profiles(full_name, username, avatar_url)')
      .neq('user_id', user.id)
      .eq('status', 'CONFIRMED')
      .in('event_id',
        (await admin.from('events').select('id').in('group_id', groupIds).gte('starts_at', new Date().toISOString()).limit(50)).data?.map((e: any) => e.id) ?? []
      )
      .order('created_at', { ascending: false })
      .limit(6)

    const { formatDistanceToNow } = await import('date-fns')
    activityFeed = (recentParticipations ?? [])
      .filter((p: any) => p.events && p.profiles)
      .map((p: any) => ({
        type: 'joined' as const,
        userName: p.profiles.full_name ?? p.profiles.username ?? 'Alguém',
        username: p.profiles.username ?? '',
        avatarUrl: p.profiles.avatar_url,
        eventTitle: p.events.title,
        eventId: p.events.slug ?? p.events.id,
        groupName: p.events.groups?.name ?? '',
        when: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR }),
      }))
  }

  let suggestedGroups: { id: string; slug: string | null; name: string; category: string | null; member_count: number }[] = []
  if (upcoming.length === 0 && profile.city) {
    const { data: suggested } = await supabase
      .from('groups')
      .select('id, slug, name, category, member_count')
      .eq('city', profile.city)
      .eq('visibility', 'PUBLIC')
      .not('id', 'in', `(${groupIds.length > 0 ? groupIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('member_count', { ascending: false })
      .limit(3)
    suggestedGroups = suggested ?? []
  }

  const firstName = profile.full_name?.split(' ')[0] ?? 'você'
  const balance = profile.wallet_balance ?? 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full">
      {/* Hero com gradiente radial */}
      <div className="px-4 pt-5 pb-2" style={{ background: 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(74,222,128,0.06) 0%, transparent 70%)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {greeting}, {firstName}
            </h1>
            <p className="text-[12px] text-white/35 mt-0.5">
              {upcoming.length > 0
                ? `${upcoming.length} evento${upcoming.length > 1 ? 's' : ''} próximo${upcoming.length > 1 ? 's' : ''}`
                : 'Explore eventos e inscreva-se'}
            </p>
          </div>
          <Link href="/eventos/novo" className={cn(
            buttonVariants({ size: 'sm', variant: 'outline' }),
            'gap-1.5 shrink-0'
          )}>
            <Plus className="size-3.5" />
            Criar evento
          </Link>
        </div>
      </div>

      <div className="px-4 space-y-5 pb-6">
        {/* Card Carteira */}
        <div className="wallet-gradient rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary/55 mb-1">Saldo disponível</p>
          <p className="text-[32px] font-extrabold text-primary tracking-tight leading-none">{formatBalance(balance)}</p>
          <p className="text-sm text-white/25 mt-1">disponível para inscrições</p>
          <div className="flex gap-2.5 mt-4">
            <Link href="/carteira/deposito" className="flex-1 h-11 rounded-xl flex items-center justify-center text-base font-bold bg-primary text-[#071209] hover:bg-primary/90 transition-colors shadow-[0_0_14px_rgba(74,222,128,0.18)]">
              Adicionar
            </Link>
            <Link href="/carteira/saque" className="flex-1 h-11 rounded-xl flex items-center justify-center text-base font-semibold bg-white/5 border border-white/8 text-white/55 hover:bg-white/10 hover:text-white/70 transition-colors">
              Sacar
            </Link>
          </div>
        </div>

        {/* Próximos eventos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/80">Seus eventos</h2>
            <Link href="/eventos" className="text-xs text-primary/80 flex items-center gap-1 hover:text-primary transition-colors">
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="space-y-3">
              <div className="card-dark rounded-2xl p-8 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mx-auto">
                  <Calendar className="size-5 text-white/20" />
                </div>
                <p className="text-sm text-white/35">Nenhum evento próximo.</p>
                <Link href="/eventos" className={cn(buttonVariants({ size: 'sm' }))}>
                  Explorar eventos
                </Link>
              </div>

              {suggestedGroups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-white/25 font-medium">Grupos perto de você em {profile.city}</p>
                  {suggestedGroups.map(g => (
                    <Link key={g.id} href={`/grupos/${g.slug ?? g.id}`} className="flex items-center gap-3 card-dark rounded-2xl p-3.5 hover:bg-white/[0.05] transition-colors">
                      <div className="size-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-primary font-extrabold text-[15px] shrink-0">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{g.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{g.member_count} membros{g.category ? ` · ${g.category}` : ''}</p>
                      </div>
                      <ArrowRight className="size-4 text-white/15 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((p: any) => {
                const ev = p.events
                const startsAt = new Date(ev.starts_at)
                const day = startsAt.getDate()
                const mon = format(startsAt, 'MMM', { locale: ptBR }).replace('.', '')
                const timeStr = format(startsAt, 'HH:mm', { locale: ptBR })
                const countdown = getCountdown(ev.starts_at)
                const confirmedParticipants = (ev.participations ?? [])
                  .filter((pp: any) => pp.status === 'CONFIRMED')
                  .map((pp: any) => ({ name: pp.profiles?.full_name ?? '?', avatarUrl: pp.profiles?.avatar_url ?? null }))

                return (
                  <Link key={p.id} href={`/eventos/${ev.slug ?? ev.id}`} className="block">
                    <div className="card-dark rounded-2xl flex items-stretch overflow-hidden">
                      {/* Accent bar */}
                      <div className={`card-accent-bar ${countdown.urgent ? 'bg-yellow-400' : 'bg-gradient-to-b from-primary to-emerald-500'}`} />

                      {/* Data */}
                      <div className="w-14 min-w-14 flex flex-col items-center justify-center py-4 border-r border-white/[0.06] shrink-0">
                        <span className="text-2xl font-extrabold leading-none tracking-tight text-primary">{day}</span>
                        <span className="text-[10px] font-semibold capitalize mt-0.5 text-primary/60">{mon}</span>
                        <span className="text-[9px] text-white/25 mt-1">{timeStr}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 px-3.5 py-3">
                        <p className="font-bold text-sm text-white truncate leading-snug">{ev.title}</p>
                        <p className="text-xs text-white/30 truncate mt-0.5">{ev.city}</p>
                        {confirmedParticipants.length > 0 && (
                          <AvatarStack participants={confirmedParticipants} total={ev.capacity} />
                        )}
                      </div>

                      {/* Direita */}
                      <div className="shrink-0 flex flex-col items-end justify-center gap-2 pr-4 pl-1">
                        <EventStatusBadge status={p.status} />
                        <span className="text-[11px] font-bold text-primary">{formatPrice(ev.price)}</span>
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          countdown.urgent
                            ? 'text-yellow-400 bg-yellow-400/10'
                            : 'text-white/25 bg-white/4'
                        )}>
                          {countdown.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Feed de atividade */}
        {activityFeed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="size-3.5 text-primary/70" />
              <h2 className="text-sm font-bold text-white/80">Atividade nos grupos</h2>
            </div>
            <div className="space-y-2">
              {activityFeed.map((item, i) => (
                <div key={i} className="flex items-start gap-3 card-dark rounded-xl p-3.5">
                  <a href={item.username ? `/u/${item.username}` : '#'} className="shrink-0">
                    <UserAvatar name={item.userName} avatarUrl={item.avatarUrl} size="sm" />
                  </a>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60 leading-snug">
                      <a href={item.username ? `/u/${item.username}` : '#'} className="font-semibold text-white hover:text-primary transition-colors">
                        {item.userName}
                      </a>
                      {' '}se inscreveu em{' '}
                      <Link href={`/eventos/${item.eventId}`} className="font-semibold text-primary hover:underline">
                        {item.eventTitle}
                      </Link>
                    </p>
                    {item.groupName && (
                      <p className="text-[10px] text-white/25 mt-0.5">{item.groupName}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-white/20 shrink-0 mt-0.5 whitespace-nowrap">{item.when}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atalhos rápidos */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { href: '/eventos',    label: 'Explorar eventos', sub: 'Descubra eventos perto de você', icon: Calendar },
            { href: '/grupos',     label: 'Meus grupos',      sub: 'Veja e crie grupos',              icon: Users },
            { href: '/carteira',   label: 'Carteira',          sub: 'Saldo e movimentações',           icon: MapPin },
            { href: '/financeiro', label: 'Financeiro',        sub: 'Receitas dos seus eventos',       icon: Activity },
          ].map(({ href, label, sub, icon: Icon }) => (
            <Link key={href} href={href} className="card-dark rounded-2xl p-4 space-y-2 group hover:bg-white/[0.05] transition-colors">
              <Icon className="size-4 text-primary/60 group-hover:text-primary transition-colors" />
              <div>
                <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">{label}</p>
                <p className="text-sm text-white/30 mt-0.5 leading-snug">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
