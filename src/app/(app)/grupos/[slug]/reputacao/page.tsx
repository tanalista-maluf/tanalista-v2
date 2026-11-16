import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Star } from 'lucide-react'
import { getGroupById } from '@/features/grupos/queries'
import { isGroupManager } from '@/features/grupos/roles'
import { getGroupReputationOverview } from '@/features/reputacao/queries'
import { CriteriaManager } from '@/features/reputacao/components/CriteriaManager'
import { TasksManager } from '@/features/reputacao/components/TasksManager'
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
  const admin = createAdminClient()

  const [members, { data: criteria }, { data: tasks }, { data: fields }] = await Promise.all([
    getGroupReputationOverview(group.id),
    admin.from('group_rating_criteria').select('id, name, active').eq('group_id', group.id).order('created_at'),
    admin.from('group_tasks').select('id, title, description, active, archived').eq('group_id', group.id).order('created_at'),
    admin.from('group_member_fields').select('id, label, unit, active').eq('group_id', group.id).order('created_at'),
  ])

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
        Visível só para dono e gestores do grupo. Ninguém mais vê estas notas.
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
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-xs text-white/40">
                    {m.rating_count} {m.rating_count === 1 ? 'nota' : 'notas'} · {m.task_count} {m.task_count === 1 ? 'missão' : 'missões'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {m.average !== null ? (
                    <p className="text-lg font-bold text-primary">{m.average.toFixed(1)}</p>
                  ) : (
                    <p className="text-xs text-white/30">Sem notas</p>
                  )}
                </div>
              </Link>
            )
          })}
          {(members ?? []).length === 0 && <p className="text-sm text-white/30">Nenhum membro no grupo ainda.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Critérios de avaliação</h2>
        <CriteriaManager groupId={group.id} initialCriteria={criteria ?? []} isOwner={group.is_owner} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Mini-missões</h2>
        <TasksManager groupId={group.id} initialTasks={tasks ?? []} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Campos customizados</h2>
        <p className="text-xs text-white/35">
          Ex.: velocidade de cronagem, com data de cada medição. Deixe sem campos se o grupo não precisar disso.
        </p>
        <FieldsManager groupId={group.id} initialFields={fields ?? []} isOwner={group.is_owner} />
      </section>
    </main>
  )
}
