import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="border-b border-white/[0.06] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            TáNaLista
          </Link>
          <nav className="flex items-center gap-4 text-xs text-white/40">
            <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        {children}
      </main>
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-white/25">
        © {new Date().getFullYear()} TáNaLista. Todos os direitos reservados.
      </footer>
    </div>
  )
}
