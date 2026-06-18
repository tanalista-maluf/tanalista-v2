import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getGroupById } from '@/features/grupos/queries'
import { GroupForm } from '@/features/grupos/components/GroupForm'
import { GroupAvatarUpload } from '@/features/grupos/components/GroupAvatarUpload'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

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
    </main>
  )
}
