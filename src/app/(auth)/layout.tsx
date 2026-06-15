export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #1A4A2E 0%, transparent 70%), #0D1A14' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span
            className="text-3xl font-bold text-primary tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            TáNaLista
          </span>
          <p className="text-sm text-white/35 mt-1">Organize eventos com pagamento confirmado</p>
        </div>
        {children}
      </div>
    </div>
  )
}
