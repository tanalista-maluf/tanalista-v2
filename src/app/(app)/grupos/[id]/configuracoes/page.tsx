import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getGroupById } from '@/features/grupos/queries'
import { GroupForm } from '@/features/grupos/components/GroupForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group || !group.is_owner) notFound()

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/grupos/${id}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Configurações do grupo
        </h1>
      </div>

      <GroupForm
        groupId={id}
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
