export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #1A4A2E 0%, transparent 70%), #0D1A14' }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="14" fill="#4ADE8018"/>
              <rect x="16" y="18" width="20" height="2.5" rx="1.25" fill="#4ADE80"/>
              <rect x="16" y="24.5" width="14" height="2.5" rx="1.25" fill="#4ADE8066"/>
              <rect x="16" y="31" width="16" height="2.5" rx="1.25" fill="#4ADE8066"/>
              <circle cx="39" cy="36" r="9" fill="#4ADE80"/>
              <path d="M34.5 36.2l3 3 5-5.5" stroke="#0D1A14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}><span className="text-primary">Tá</span><span className="text-white/40 font-light">na</span><span className="text-primary">Lista</span></span>
          </div>
          <p className="text-sm text-white/35">Organize eventos com pagamento confirmado</p>
        </div>
        {children}
      </div>
    </div>
  )
}
