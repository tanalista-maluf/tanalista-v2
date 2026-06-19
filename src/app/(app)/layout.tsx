import Link from 'next/link'
import { Suspense } from 'react'
import { NotificationBell } from '@/features/notificacoes/components/NotificationBell'
import { BottomNav } from './components/BottomNav'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { getUnreadCount } from '@/features/notificacoes/queries'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function BellWrapper() {
  const count = await getUnreadCount()
  return <NotificationBell initialCount={count} />
}

async function NavWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '')
  return <BottomNav isAdmin={isAdmin} />
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-primary/8 bg-background/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="14" fill="#4ADE8018"/>
              <rect x="16" y="18" width="20" height="2.5" rx="1.25" fill="#4ADE80"/>
              <rect x="16" y="24.5" width="14" height="2.5" rx="1.25" fill="#4ADE8066"/>
              <rect x="16" y="31" width="16" height="2.5" rx="1.25" fill="#4ADE8066"/>
              <circle cx="39" cy="36" r="9" fill="#4ADE80"/>
              <path d="M34.5 36.2l3 3 5-5.5" stroke="#0D1A14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}><span className="text-primary">Tá</span><span className="text-white/40 font-light">na</span><span className="text-primary">Lista</span></span>
          </Link>
          <Suspense fallback={<div className="size-9" />}>
            <BellWrapper />
          </Suspense>
        </div>
      </header>

      {/* Pull-to-refresh (mobile) */}
      <PullToRefresh />

      {/* Conteúdo principal */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      <Suspense fallback={<BottomNav />}>
        <NavWrapper />
      </Suspense>
    </div>
  )
}
