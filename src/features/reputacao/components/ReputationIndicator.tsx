import { Star, CircleMinus } from 'lucide-react'
import type { ReputationIndicator as IndicatorValue } from '../queries'

// Estrela verde (mais contribuições que faltas) ou sinal negativo vermelho
// (mais faltas que contribuições), ao lado do nome do membro — visível só
// pra quem vê a lista como dono/gestor (a tela que usa isto decide isso).
export function ReputationIndicatorBadge({ indicator }: { indicator: IndicatorValue }) {
  if (indicator === 'positive') return <Star className="size-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
  if (indicator === 'negative') return <CircleMinus className="size-3.5 text-red-400 shrink-0" />
  return null
}
