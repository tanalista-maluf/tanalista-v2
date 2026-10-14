import { Pressable, StyleSheet, Text, View } from 'react-native'
import { OccupancyBar } from '@/components/ui'
import type { EventTeam } from '@/lib/api'
import { colors, fonts, radius } from '@/lib/theme'

type TeamPickerProps = {
  teams: EventTeam[]
  selectedId: string | null
  onSelect: (teamId: string) => void
  // Na fila de espera um time lotado pode ser escolhido: é a fila dele
  allowFull?: boolean
  disabled?: boolean
}

export function TeamPicker({ teams, selectedId, onSelect, allowFull, disabled }: TeamPickerProps) {
  return (
    <View style={styles.list}>
      {teams.map((team, index) => {
        const available = Math.max(0, team.capacity - team.confirmed_count)
        const full = available === 0
        const blocked = disabled || (full && !allowFull)
        const selected = selectedId === team.id
        const detail = full ? 'Lotado' : available === 1 ? '1 vaga' : `${available} vagas`
        return (
          <Pressable
            key={team.id}
            testID={`team-${index}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: blocked }}
            accessibilityLabel={`${team.name}. ${detail}`}
            onPress={() => onSelect(team.id)}
            disabled={blocked}
            style={[styles.team, selected && styles.selected, blocked && styles.dim]}>
            <View style={styles.header}>
              <Text style={styles.name}>{team.name}</Text>
              <Text style={[styles.detail, full && styles.full]}>{detail}</Text>
            </View>
            <OccupancyBar confirmed={team.confirmed_count} capacity={team.capacity} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  team: {
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  selected: {
    borderColor: 'rgba(74,222,128,0.45)',
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  dim: { opacity: 0.5 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  detail: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text50 },
  full: { color: colors.destructive },
})
