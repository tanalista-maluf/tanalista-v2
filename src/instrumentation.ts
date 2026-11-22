import { TIME_ZONE } from '@/lib/timezone'

// O servidor da Vercel roda em UTC: sem isto, páginas, avisos e e-mails
// mostravam 07:30 de Brasília como 10:30. Datas formatadas no servidor
// (date-fns, toLocaleString) passam a sair no horário de Brasília.
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') process.env.TZ = TIME_ZONE
}
