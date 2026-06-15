import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email ?? '')) redirect('/home')

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
          <nav className="flex items-center gap-1 text-xs">
            {[
              { href: '/admin', label: 'Dashboard' },
              { href: '/admin/usuarios', label: 'Usuários' },
              { href: '/admin/eventos', label: 'Eventos' },
              { href: '/admin/grupos', label: 'Grupos' },
              { href: '/admin/cupons', label: 'Cupons' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                {label}
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
