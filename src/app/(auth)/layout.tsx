import { LogoMark } from '@/components/logo-mark'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #1A4A2E 0%, transparent 70%), #0D1A14' }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}><span className="text-primary">Tá</span><span className="text-white/40 font-light">na</span><span className="text-primary">Lista</span></span>
          </div>
          <p className="text-sm text-white/35">Organize eventos com pagamento confirmado</p>
        </div>
        {children}
      </div>
    </div>
  )
}
