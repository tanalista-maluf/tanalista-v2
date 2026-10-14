// "50", "50,5" ou "1.234,56" em centavos; null se não for um valor
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[^\d,]/g, '')
  if (!clean) return null
  const [whole, fraction = ''] = clean.split(',')
  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
  return Number.isFinite(cents) && cents > 0 ? cents : null
}
