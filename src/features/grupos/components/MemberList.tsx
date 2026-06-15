'use client'

import { useState } from 'react'
import { removeMemberAction } from '../actions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: string
  profiles: {
    full_name: string
    username: string
    city: string | null
    avatar_url?: string | null
  } | null
}

interface MemberListProps {
  members: Member[]
  isOwner: boolean
  groupId: string
  currentUserId: string
}

export function MemberList({ members, isOwner, groupId, currentUserId }: MemberListProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(memberId: string) {
    setRemoving(memberId)
    const result = await removeMemberAction(groupId, memberId)
    setRemoving(null)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Membro removido.')
      router.refresh()
    }
  }

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const profile = m.profiles
        const isSelf = m.user_id === currentUserId

        return (
          <div key={m.id} className="flex items-center gap-3 card-dark rounded-xl p-3">
            <UserAvatar
              name={profile?.full_name ?? profile?.username ?? '?'}
              avatarUrl={profile?.avatar_url}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Usuário'}</p>
              <p className="text-xs text-white/40">@{profile?.username}</p>
            </div>
            <div className="flex items-center gap-2">
              {m.role === 'OWNER' && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg border text-primary bg-primary/10 border-primary/25">
                  Dono
                </span>
              )}
              {isOwner && !isSelf && m.role !== 'OWNER' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white/30 hover:text-red-400"
                  disabled={removing === m.user_id}
                  onClick={() => handleRemove(m.user_id)}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
