'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: '#0D1A14' }}>
      <p className="text-5xl font-extrabold text-red-400/20 leading-none select-none" style={{ fontFamily: 'var(--font-heading)' }}>
        500
      </p>
      <h1 className="text-xl font-bold text-white mt-4">Algo deu errado</h1>
      <p className="text-sm text-white/40 mt-2 max-w-xs">
        Ocorreu um erro inesperado. Tente novamente ou volte para o início.
      </p>
      {error.digest && (
        <p className="text-[10px] font-mono text-white/20 mt-3">ref: {error.digest}</p>
      )}
      <div className="flex gap-3 mt-8">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
        <a
          href="/home"
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-colors"
        >
          Início
        </a>
      </div>
    </div>
  )
}
