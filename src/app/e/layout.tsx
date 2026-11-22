import { LogoMark } from '@/components/logo-mark'

export default function PublicEventLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#0D1A14' }}>
      {/* Header mínimo */}
      <header className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="text-[16px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}><span className="text-primary">Tá</span><span className="text-white/40 font-light">na</span><span className="text-primary">Lista</span></span>
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
