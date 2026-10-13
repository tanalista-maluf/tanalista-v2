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
