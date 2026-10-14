export function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuito'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "domingo, 18 de outubro às 07:30", como na página do evento do site
export function formatLongDate(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

// Partes do bloco de data do cartão: dia, mês abreviado e hora
export function dateParts(iso: string) {
  const date = new Date(iso)
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// Quanto falta para o evento, para a contagem regressiva; null se já começou
export function countdownParts(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now
  if (diff <= 0) return null
  const minutes = Math.floor(diff / 60000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    days: pad(Math.floor(minutes / 1440)),
    hours: pad(Math.floor((minutes % 1440) / 60)),
    minutes: pad(minutes % 60),
  }
}

// Valor em reais, também quando é zero (saldo da carteira, total a pagar)
export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "há 8 horas", "há 2 dias": quanto tempo passou, para listas de atividade
export function formatRelative(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'há 1 hora' : `há ${hours} horas`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}
