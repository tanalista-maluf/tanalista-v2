// Horários de evento (starts_at/ends_at/registration_deadline) são sempre
// horário de Brasília para quem organiza e participa. O servidor, porém,
// roda em UTC (as Functions da Vercel usam UTC mesmo na região gru1), então
// qualquer formatação sem fuso explícito mostra os dígitos UTC como se já
// fossem horário local — por isso usamos sempre `America/Sao_Paulo` aqui,
// nunca o fuso implícito do processo.

const EVENT_TIMEZONE = 'America/Sao_Paulo'

type DateInput = Date | string

function asDate(value: DateInput): Date {
  return typeof value === 'string' ? new Date(value) : value
}

/** `Intl.DateTimeFormat('pt-BR', ...)` já fixado no fuso de Brasília. */
export function formatBR(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: EVENT_TIMEZONE }).format(asDate(value))
}

/** Dia do mês (número), no fuso de Brasília — ex.: 8 */
export function getBRDay(value: DateInput): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TIMEZONE, day: 'numeric' }).format(asDate(value)))
}

/** Mês abreviado sem ponto, no fuso de Brasília — ex.: "nov" */
export function getBRMonthShort(value: DateInput): string {
  return formatBR(value, { month: 'short' }).replace('.', '')
}

/** Dia da semana completo, no fuso de Brasília — ex.: "domingo" */
export function getBRWeekday(value: DateInput): string {
  return formatBR(value, { weekday: 'long' })
}

/** Horário HH:mm, no fuso de Brasília */
export function getBRTime(value: DateInput): string {
  return formatBR(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/** Data curta dd/MM, no fuso de Brasília */
export function getBRDateShort(value: DateInput): string {
  return formatBR(value, { day: '2-digit', month: '2-digit' })
}

/** Data curta dd/MM/yy, no fuso de Brasília */
export function getBRDateShortYear2(value: DateInput): string {
  return formatBR(value, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** "dd/MM/yyyy às HH:mm", no fuso de Brasília */
export function getBRDateTimeLong(value: DateInput): string {
  const date = formatBR(value, { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${date} às ${getBRTime(value)}`
}

/**
 * Um Date cujos campos "locais" (getDate, getHours, getDay, ...) são os
 * mesmos de `value` no horário de Brasília — não importa o fuso real do
 * processo que o lê depois. Serve para alimentar funções como o `format` do
 * date-fns, que sempre leem os getters locais e não aceitam um fuso
 * explícito.
 */
export function toBRFakeLocal(value: DateInput): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(asDate(value))
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value)
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
}

/**
 * Valor para um <input type="datetime-local"> (ex.: "2026-11-08T07:30")
 * refletindo o horário de Brasília — nunca os dígitos UTC crus.
 */
export function toBRDatetimeLocal(value: DateInput): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(asDate(value))
  const get = (type: string) => parts.find(p => p.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
