import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice } from '@/utils/format'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CouponForm } from '@/features/cupons/components/CouponForm'
import { ToggleCouponButton } from '@/features/cupons/components/ToggleCouponButton'

export const dynamic = 'force-dynamic'

export default async function AdminCuponsPage() {
  const admin = createAdminClient()
  const { data: coupons } = await admin
    .from('coupons')
    .select('*, coupon_uses(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cupons</h1>
          <p className="text-sm text-white/40 mt-0.5">Créditos de carteira sem movimentação financeira</p>
        </div>
        <CouponForm />
      </div>

      <div className="card-dark rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-white/40 font-medium">Código</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Valor</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Usos</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Limite</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Validade</th>
              <th className="text-right px-4 py-3 text-white/40 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(coupons ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/25 text-sm">
                  Nenhum cupom criado ainda.
                </td>
              </tr>
            )}
            {(coupons ?? []).map((c: any) => (
              <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-primary tracking-widest">{c.code}</span>
                </td>
                <td className="px-4 py-3 text-right text-white font-semibold">
                  {formatPrice(c.amount_cents)}
                </td>
                <td className="px-4 py-3 text-right text-white/60">
                  {c.uses_count}
                </td>
                <td className="px-4 py-3 text-right text-white/40">
                  {c.max_uses ?? '∞'}
                </td>
                <td className="px-4 py-3 text-right text-white/40 text-xs">
                  {c.expires_at
                    ? format(new Date(c.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <ToggleCouponButton id={c.id} active={c.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
