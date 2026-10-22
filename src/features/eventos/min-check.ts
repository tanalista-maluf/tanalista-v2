// Quando o TáNaLista confere o mínimo de participantes (job event-min-check
// do pg_cron, a cada 15 minutos): normalmente 12 horas antes do início. Evento
// criado ou remarcado já dentro dessas 12 horas ganha prazo até 1 hora antes
// do início, para dar tempo de as pessoas se inscreverem; se nem isso der,
// a conferência é no próprio início.
const HOUR = 60 * 60 * 1000

export function minCheckAt(startsAt: Date, now = new Date()): Date {
  const usual = new Date(startsAt.getTime() - 12 * HOUR)
  if (usual > now) return usual
  const late = new Date(startsAt.getTime() - HOUR)
  return late > now ? late : startsAt
}
