'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinGroupAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export function JoinGroupButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleJoin() {
    setLoading(true)
    const result = await joinGroupAction(groupId)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Você entrou no grupo!')
      router.refresh()
    }
  }

  return (
    <Button size="sm" onClick={handleJoin} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
      Entrar no grupo
    </Button>
  )
}
