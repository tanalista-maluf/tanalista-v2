import Link from 'next/link'
import { Suspense } from 'react'
import { NotificationBell } from '@/features/notificacoes/components/NotificationBell'
import { BottomNav } from './components/BottomNav'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { getUnreadCount } from '@/features/notificacoes/queries'

async function BellWrapper() {
  const count = await getUnreadCount()
  return <NotificationBell initialCount={count} />
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-primary/8 bg-background/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-0.5" style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="text-[17px] font-extrabold tracking-tight text-primary">Tá</span>
            <span className="text-[17px] font-light tracking-tight text-white/40">na</span>
            <span className="text-[17px] font-extrabold tracking-tight text-primary">Lista</span>
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

      <BottomNav />
    </div>
  )
}
