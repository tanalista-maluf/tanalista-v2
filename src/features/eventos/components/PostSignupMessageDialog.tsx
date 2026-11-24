'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Mostrado uma vez, assim que o redirect de confirmação de inscrição
// (?joined=1) cai na página do evento — ver pagamento/page.tsx,
// PagamentoPixView.tsx, PagamentoCartaoView.tsx e participacoes/actions.ts
export function PostSignupMessageDialog({ message, imageUrl }: { message?: string | null; imageUrl?: string | null }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  // Lazy initializer: só importa o valor de ?joined=1 na primeira renderização
  // (logo depois do redirect de confirmação); mudanças depois disso não reabrem
  const [open, setOpen] = useState(() => searchParams.get('joined') === '1')

  function close() {
    setOpen(false)
    router.replace(pathname, { scroll: false })
  }

  return (
    <AlertDialog open={open} onOpenChange={(value) => { if (!value) close() }}>
      <AlertDialogContent>
        {imageUrl && (
          <div className="relative w-full h-40 rounded-lg overflow-hidden -mt-2">
            <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        )}
        <AlertDialogHeader>
          <AlertDialogTitle>Inscrição confirmada!</AlertDialogTitle>
          {message && (
            <AlertDialogDescription className="whitespace-pre-wrap text-left">
              {message}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={close}>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
