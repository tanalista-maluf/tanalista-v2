import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getGroupById } from '@/features/grupos/queries'
import { isGroupManager } from '@/features/grupos/roles'
import { getMemberReputationDetail } from '@/features/reputacao/queries'
import { MemberCriteriaPanel } from '@/features/reputacao/components/MemberCriteriaPanel'
import { MemberTasksPanel } from '@/features/reputacao/components/MemberTasksPanel'
import { MemberFieldsPanel } from '@/features/reputacao/components/MemberFieldsPanel'

export default async function MemberReputationPage({
  params,
}: {
  params: Promise<{ slug: string; memberId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug, memberId } = await params
  const group = await getGroupById(slug, user.id)
  if (!group || !isGroupManager(group.user_role)) notFound()

  const detail = await getMemberReputationDetail(group.id, memberId)
  if (!detail) notFound()

  const groupSlug = group.slug ?? group.id
  const name = detail.member?.full_name ?? detail.member?.username ?? 'Usuário'

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href={`/grupos/${groupSlug}/reputacao`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
          {name}
        </h1>
        <div className="text-right shrink-0">
          {detail.average !== null ? (
            <p className="text-2xl font-bold text-primary">{detail.average.toFixed(1)}</p>
          ) : (
            <p className="text-xs text-white/30">Sem notas</p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Critérios de avaliação</h2>
        <MemberCriteriaPanel groupId={group.id} memberId={memberId} criteria={detail.criteria} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Mini-missões</h2>
        <MemberTasksPanel groupId={group.id} memberId={memberId} tasks={detail.tasks} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Campos customizados</h2>
        <MemberFieldsPanel groupId={group.id} memberId={memberId} fields={detail.fields} />
      </section>
    </main>
  )
}
