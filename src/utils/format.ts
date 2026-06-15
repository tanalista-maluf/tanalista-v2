import { format as dateFnsFormat } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuito'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatBalance(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(dateStr: string, pattern = "dd/MM/yyyy 'às' HH:mm"): string {
  return dateFnsFormat(new Date(dateStr), pattern, { locale: ptBR })
}

export function formatDateShort(dateStr: string): string {
  return dateFnsFormat(new Date(dateStr), "dd MMM", { locale: ptBR })
}

export function formatDateTime(dateStr: string): string {
  return dateFnsFormat(new Date(dateStr), "EEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
}
