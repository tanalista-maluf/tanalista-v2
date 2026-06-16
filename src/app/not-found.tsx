import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: '#0D1A14' }}>
      <p className="text-7xl font-extrabold text-primary/20 leading-none select-none" style={{ fontFamily: 'var(--font-heading)' }}>
        404
      </p>
      <h1 className="text-xl font-bold text-white mt-4">Essa página foi embora antes do evento começar</h1>
      <p className="text-sm text-white/40 mt-2 max-w-xs">
        Cancelou a inscrição e nem avisou. Típico.
      </p>
      <Link
        href="/home"
        className="mt-8 px-6 py-3 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Voltar para o início
      </Link>
    </div>
  )
}
