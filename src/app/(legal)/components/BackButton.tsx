'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
    >
      <ChevronLeft className="size-4" />
      Voltar
    </button>
  )
}
