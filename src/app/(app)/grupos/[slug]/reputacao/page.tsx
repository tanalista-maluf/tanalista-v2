import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Star } from 'lucide-react'
import { getGroupById } from '@/features/grupos/queries'
import { isGroupManager } from '@/features/grupos/roles'
import { getGroupReputationConfig, getGroupReputationOverview } from '@/features/reputacao/queries'
import { ReputationIndicatorBadge } from '@/features/reputacao/components/ReputationIndicator'
import { FieldsManager } from '@/features/reputacao/components/FieldsManager'

export default async function GroupReputationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const group = await getGroupById(slug, user.id)
  if (!group || !isGroupManager(group.user_role)) notFound()

  const groupSlug = group.slug ?? group.id

  const [members, config] = await Promise.all([
    getGroupReputationOverview(group.id),
    getGroupReputationConfig(group.id),
  ])
  const { fields } = config ?? { fields: [] }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href={`/grupos/${groupSlug}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <Star className="size-5 text-primary" />
          Avaliação de membros
        </h1>
      </div>
      <p className="text-xs text-white/35 -mt-6">
        Visível só para dono e gestores do grupo. Ninguém mais vê estes registros.
      </p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Membros</h2>
        <div className="space-y-2">
          {(members ?? []).map((m) => {
            const name = m.full_name ?? m.username ?? 'Usuário'
            return (
              <Link
                key={m.member_id}
                href={`/grupos/${groupSlug}/reputacao/${m.member_id}`}
                className="flex items-center gap-3 card-dark rounded-xl p-3 hover:border-primary/30 border border-transparent transition-colors"
              >
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatar pequeno, sem necessidade de otimização
                    <img src={m.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    <ReputationIndicatorBadge indicator={m.indicator} />
                  </div>
                  <p className="text-xs text-white/40">
                    {m.incident_count} {m.incident_count === 1 ? 'falta' : 'faltas'} · {m.contribution_count} {m.contribution_count === 1 ? 'contribuição' : 'contribuições'}
                  </p>
                </div>
              </Link>
            )
          })}
          {(members ?? []).length === 0 && <p className="text-sm text-white/30">Nenhum membro no grupo ainda.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Campos customizados</h2>
        <p className="text-xs text-white/35">
          Ex.: velocidade de cronagem, com data de cada medição. Deixe sem campos se o grupo não precisar disso.
        </p>
        <FieldsManager groupId={group.id} initialFields={fields} isOwner={group.is_owner} />
      </section>
    </main>
  )
}
