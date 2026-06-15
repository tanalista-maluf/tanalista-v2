import { formatDateTime } from '@/utils/format'
import { Shield } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  LOGIN:                 'Acesso à conta',
  LOGOUT:                'Saída da conta',
  PROFILE_UPDATED:       'Perfil atualizado',
  GROUP_CREATED:         'Grupo criado',
  GROUP_JOINED:          'Entrou em um grupo',
  GROUP_LEFT:            'Saiu de um grupo',
  EVENT_CREATED:         'Evento criado',
  EVENT_PUBLISHED:       'Evento publicado',
  EVENT_CANCELLED:       'Evento cancelado',
  PARTICIPATION_JOINED:  'Inscrito em evento',
  PARTICIPATION_CANCELLED: 'Inscrição cancelada',
  WAITLIST_JOINED:       'Entrou na fila de espera',
  WAITLIST_LEFT:         'Saiu da fila de espera',
  WITHDRAWAL_REQUESTED:  'Saque solicitado',
  PASSWORD_RESET:        'Senha redefinida',
}

interface AuditLog {
  id: string
  action: string
  table_name: string | null
  created_at: string
  new_data: Record<string, unknown> | null
}

interface AuditLogListProps {
  logs: AuditLog[]
}

export function AuditLogList({ logs }: AuditLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-white/50">
        <Shield className="size-10 opacity-20" />
        <p className="text-sm">Nenhuma atividade registrada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 py-3 border-b last:border-0">
          <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {ACTION_LABELS[log.action] ?? log.action}
            </p>
            {log.table_name && (
              <p className="text-xs text-white/50 capitalize">{log.table_name.replace(/_/g, ' ')}</p>
            )}
          </div>
          <p className="text-xs text-white/50 shrink-0">{formatDateTime(log.created_at)}</p>
        </div>
      ))}
    </div>
  )
}
