import { createAdminClient } from '@/lib/supabase/admin'
import { formatBalance } from '@/utils/format'
import { WithdrawalActions } from '@/features/saques/components/WithdrawalActions'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  PENDING:   { label: 'Pendente',   cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Clock },
  PAID:      { label: 'Pago',       cls: 'text-primary bg-primary/10 border-primary/20',         icon: CheckCircle },
  CANCELLED: { label: 'Cancelado',  cls: 'text-red-400 bg-red-400/10 border-red-400/20',         icon: XCircle },
}

const PIX_TYPE_LABEL: Record<string, string> = {
  cpf: 'CPF', email: 'E-mail', phone: 'Telefone', random: 'Chave aleatória',
}

export default async function AdminSaquesPage() {
  const admin = createAdminClient()

  const { data: withdrawals } = await admin
    .from('withdrawals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const userIds = [...new Set((withdrawals ?? []).map(w => w.user_id))]
  const { data: profiles } = userIds.length > 0
    ? await admin.from('profiles').select('id, full_name, username').in('id', userIds)
    : { data: [] }
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const withdrawalsWithProfiles = (withdrawals ?? []).map(w => ({
    ...w,
    profiles: profileMap[w.user_id] ?? null,
  }))

  const pending = withdrawalsWithProfiles.filter(w => w.status === 'PENDING')
  const done    = withdrawalsWithProfiles.filter(w => w.status !== 'PENDING')

  const totalPending = pending.reduce((s, w) => s + (w.net_cents ?? 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Saques</h1>
        <p className="text-sm text-white/40">Gerencie solicitações de saque dos usuários</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-400">{pending.length}</p>
        </div>
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">A transferir</p>
          <p className="text-2xl font-bold text-white">{formatBalance(totalPending)}</p>
        </div>
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">Total processados</p>
          <p className="text-2xl font-bold text-white/50">{done.length}</p>
        </div>
      </div>

      {/* Pendentes */}
      <section>
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">
          Pendentes {pending.length > 0 && <span className="text-yellow-400">({pending.length})</span>}
        </h2>
        {pending.length === 0 ? (
          <div className="card-dark rounded-2xl p-8 text-center text-sm text-white/30">
            Nenhum saque pendente. ✓
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(w => <WithdrawalRow key={w.id} w={w} showActions />)}
          </div>
        )}
      </section>

      {/* Histórico */}
      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Histórico</h2>
          <div className="space-y-2">
            {done.map(w => <WithdrawalRow key={w.id} w={w} showActions={false} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function WithdrawalRow({ w, showActions }: { w: any; showActions: boolean }) {
  const cfg = STATUS_CONFIG[w.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
  const StatusIcon = cfg.icon
  const profile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
  const date = new Date(w.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="card-dark rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {profile?.full_name ?? profile?.username ?? w.user_id.slice(0, 8)}
          </p>
          <p className="text-xs text-white/35">{date}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border ${cfg.cls}`}>
          <StatusIcon className="size-3" />
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-white/30 mb-0.5">Solicitado</p>
          <p className="font-semibold text-white">{formatBalance(w.amount_cents)}</p>
        </div>
        <div>
          <p className="text-white/30 mb-0.5">Taxa (1%)</p>
          <p className="font-semibold text-white/50">−{formatBalance(w.fee_cents)}</p>
        </div>
        <div>
          <p className="text-white/30 mb-0.5">A transferir</p>
          <p className="font-bold text-primary">{formatBalance(w.net_cents)}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">{PIX_TYPE_LABEL[w.pix_key_type] ?? w.pix_key_type}</span>
          <span className="font-mono text-white/70 select-all">{w.pix_key}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">CPF</span>
          <span className="font-mono text-white/50">
            {w.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
          </span>
        </div>
      </div>

      {w.admin_note && (
        <p className="text-xs text-white/40 italic">Nota: {w.admin_note}</p>
      )}

      {showActions && <WithdrawalActions id={w.id} />}

      {!showActions && w.processed_at && (
        <p className="text-xs text-white/25">
          Processado em {new Date(w.processed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
