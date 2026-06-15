import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizerSummary } from '@/features/financeiro/queries'
import { RevenueCards } from '@/features/financeiro/components/RevenueCards'
import { EventPayoutTable } from '@/features/financeiro/components/EventPayoutTable'
import { ExportFinanceiroButton } from '@/features/financeiro/components/ExportFinanceiroButton'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const summary = await getOrganizerSummary()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Financeiro
        </h1>
        <p className="text-sm text-white/40">Resumo de receitas dos seus eventos</p>
      </div>

      <RevenueCards
        totalGross={summary.totalGross}
        totalNet={summary.totalNet}
        totalFees={summary.totalFees}
        totalEvents={summary.totalEvents}
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Por evento</h2>
          <ExportFinanceiroButton events={summary.events} />
        </div>
        <EventPayoutTable events={summary.events} />
      </div>
    </main>
  )
}
