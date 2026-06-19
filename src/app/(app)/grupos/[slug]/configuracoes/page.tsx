import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { getGroupById } from '@/features/grupos/queries'
import { GroupForm } from '@/features/grupos/components/GroupForm'
import { GroupAvatarUpload } from '@/features/grupos/components/GroupAvatarUpload'
import { GroupJoinRequests } from '@/features/grupos/components/GroupJoinRequests'
import Link from 'next/link'
import { ChevronLeft, Users } from 'lucide-react'

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const group = await getGroupById(slug, user.id)
  if (!group || !group.is_owner) notFound()

  const groupSlug = group.slug ?? group.id

  // Fetch pending join requests for private groups
  let joinRequests: { id: string; user_id: string; status: string; created_at: string; profiles: { full_name: string | null; username: string | null } | null }[] = []
  if (group.visibility === 'PRIVATE') {
    const admin = createAdminClient()
    const { data } = await admin
      .from('group_join_requests')
      .select('id, user_id, status, created_at, profiles(full_name, username)')
      .eq('group_id', group.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
    joinRequests = (data ?? []) as any
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/grupos/${groupSlug}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Configurações do grupo
        </h1>
      </div>

      <div className="flex justify-center">
        <GroupAvatarUpload
          groupId={group.id}
          groupName={group.name}
          currentAvatarUrl={group.avatar_url ?? null}
        />
      </div>

      <GroupForm
        groupId={group.id}
        defaultValues={{
          name: group.name,
          description: group.description ?? '',
          visibility: group.visibility,
          category: group.category ?? '',
          city: group.city ?? '',
        }}
      />

      {/* Solicitações de entrada — apenas grupos privados */}
      {group.visibility === 'PRIVATE' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-white/40" />
            <h2 className="font-semibold text-white">
              Solicitações de entrada
              {joinRequests.length > 0 && (
                <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {joinRequests.length}
                </span>
              )}
            </h2>
          </div>
          <GroupJoinRequests requests={joinRequests} groupId={group.id} />
        </section>
      )}
    </main>
  )
}
