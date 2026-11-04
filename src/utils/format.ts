import { format as dateFnsFormat } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toBRFakeLocal } from './datetime'

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuito'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatBalance(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Sempre no horário de Brasília — o servidor roda em UTC (as Functions da
// Vercel, mesmo na região gru1), então sem isso os dígitos UTC apareceriam
// como se já fossem horário local.
export function formatDate(dateStr: string, pattern = "dd/MM/yyyy 'às' HH:mm"): string {
  return dateFnsFormat(toBRFakeLocal(dateStr), pattern, { locale: ptBR })
}

export function formatDateShort(dateStr: string): string {
  return dateFnsFormat(toBRFakeLocal(dateStr), "dd MMM", { locale: ptBR })
}

export function formatDateTime(dateStr: string): string {
  return dateFnsFormat(toBRFakeLocal(dateStr), "EEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
}
