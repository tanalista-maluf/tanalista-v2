export default function PublicEventLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#0D1A14' }}>
      {/* Header mínimo */}
      <header className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <a
          href="/"
          className="text-xl font-bold text-primary tracking-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          TáNaLista
        </a>
        <a
          href="/login"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Entrar
        </a>
      </header>
      {children}
    </div>
  )
}
