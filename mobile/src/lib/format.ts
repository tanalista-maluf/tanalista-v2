export function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuito'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatEventDate(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
