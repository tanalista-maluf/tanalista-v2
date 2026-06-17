'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { ListingForm } from './ListingForm'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

interface Props {
  groupId: string
  walletBalance: number
  activeCount: number
}

export function ListingFormSheet({ groupId, walletBalance, activeCount }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
      >
        <Plus className="size-4" />
        Anunciar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Sheet */}
          <div className="relative mt-auto bg-[#0D1A14] border-t border-white/10 rounded-t-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#0D1A14] px-4 pt-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                Novo anúncio
              </h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <div className="px-4 py-5">
              <ListingForm
                groupId={groupId}
                walletBalance={walletBalance}
                activeCount={activeCount}
                onSuccess={() => { setOpen(false); window.location.reload() }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
