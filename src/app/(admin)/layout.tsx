import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email ?? '')) redirect('/home')

  const admin = createAdminClient()
  const { count: pendingWithdrawals } = await admin
    .from('withdrawals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING')

  const NAV = [
    { href: '/admin',           label: 'Dashboard' },
    { href: '/admin/saques',    label: 'Saques', badge: pendingWithdrawals ?? 0 },
    { href: '/admin/usuarios',  label: 'Usuários' },
    { href: '/admin/eventos',   label: 'Eventos' },
    { href: '/admin/grupos',    label: 'Grupos' },
    { href: '/admin/cupons',    label: 'Cupons' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header className="border-b border-white/[0.06] px-4 py-3 sticky top-0 z-10" style={{ background: 'var(--background)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
              TáNaLista
            </span>
            <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          </div>
          <a
            href="/home"
            className="ml-auto text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Sair do painel
          </a>
          <nav className="flex items-center gap-1 text-xs">
            {NAV.map(({ href, label, badge }) => (
              <a
                key={href}
                href={href}
                className="relative px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                {label}
                {badge ? (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-yellow-400 text-black text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
