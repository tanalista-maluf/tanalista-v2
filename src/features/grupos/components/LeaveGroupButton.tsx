'use client'

import { useState } from 'react'
import { leaveGroupAction } from '../actions'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, LogOut } from 'lucide-react'

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleLeave() {
    setLoading(true)
    await leaveGroupAction(groupId)
    // leaveGroupAction faz redirect
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-white/[0.06] transition-colors">
        <LogOut className="size-3.5" />
        Sair do grupo
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sair do grupo?</AlertDialogTitle>
          <AlertDialogDescription>
            Você perderá o acesso aos eventos privados deste grupo. Poderá entrar novamente depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeave} disabled={loading} className="bg-destructive text-white hover:bg-destructive/80">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
