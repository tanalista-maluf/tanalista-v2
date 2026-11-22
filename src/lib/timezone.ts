// Os eventos acontecem no Brasil: datas são lidas e mostradas no horário de
// Brasília, não no fuso do servidor (a Vercel roda em UTC). O Brasil não tem
// horário de verão desde 2019, então o deslocamento é fixo.
export const TIME_ZONE = 'America/Sao_Paulo'
const OFFSET = '-03:00'

// Valor de <input type="datetime-local"> ("2026-11-08T07:30") -> ISO em UTC.
// O app já manda ISO com fuso ("...Z"), que passa como está.
export function fromLocalInput(value: string): string {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value)
  return new Date(hasZone ? value : `${value}${value.length === 16 ? ':00' : ''}${OFFSET}`).toISOString()
}

// ISO do banco -> valor de <input type="datetime-local"> no horário de Brasília
export function toLocalInput(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
