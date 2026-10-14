import { CheckCircle2, Circle, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radius } from '@/lib/theme'

type Props = {
  status: string
  description: string | null
  cover_url: string | null
  ends_at: string | null
  cancel_before_hours: number | null
}

// O que ainda falta para o evento ficar completo, como no site
// (src/features/eventos/components/OrganizerChecklist.tsx). Some quando está tudo feito.
export function OrganizerChecklist(event: Props) {
  if (!['OPEN', 'PENDING'].includes(event.status)) return null

  const items = [
    { label: 'Descrição do evento', done: !!event.description?.trim(), tip: 'Uma boa descrição aumenta a taxa de inscrição.' },
    { label: 'Imagem de capa', done: !!event.cover_url, tip: 'Eventos com foto recebem mais inscrições.' },
    { label: 'Horário de término', done: !!event.ends_at, tip: 'Ajuda os participantes a planejarem o dia.' },
    {
      label: 'Política de cancelamento',
      done: event.cancel_before_hours !== null,
      tip: 'Define se os participantes podem cancelar e receber o reembolso.',
    },
  ]
  const pending = items.filter((item) => !item.done).length
  if (pending === 0) return null

  return (
    <View testID="organizer-checklist" style={styles.box}>
      <View style={styles.header}>
        <TriangleAlert size={17} color={colors.warning} />
        <Text style={styles.title}>
          {pending} {pending === 1 ? 'item' : 'itens'} para completar o evento
        </Text>
      </View>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          {item.done ? (
            <CheckCircle2 size={17} color={colors.primary} />
          ) : (
            <Circle size={17} color={colors.text25} />
          )}
          <View style={styles.itemBody}>
            <Text style={[styles.label, item.done && styles.done]}>{item.label}</Text>
            {!item.done && <Text style={styles.tip}>{item.tip}</Text>}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.18)',
    backgroundColor: 'rgba(250,204,21,0.05)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemBody: { flex: 1, gap: 1 },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.text70 },
  done: { color: colors.text40, textDecorationLine: 'line-through' },
  tip: { fontFamily: fonts.body, fontSize: 12, color: colors.text40 },
})
