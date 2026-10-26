import { Check, ChevronDown } from 'lucide-react-native'
import { useRef, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { colors, fonts, radius } from '@/lib/theme'

export type DropdownOption = { key: string; label: string }

type Props = {
  // O que o botão mostra quando nada está escolhido (ex.: "Categoria")
  placeholder: string
  options: DropdownOption[]
  selected: string | null
  // null = limpar o filtro (a primeira linha do menu)
  onSelect: (key: string | null) => void
  // Texto da linha que limpa o filtro (ex.: "Todas as categorias")
  allLabel: string
  // Rótulo do botão quando o escolhido não é uma das opções (ex.: um dia do calendário)
  selectedLabel?: string
  // Sem a linha que limpa (escolha obrigatória, ex.: número de times)
  hideAll?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

const MENU_MAX_HEIGHT = 360

// Botão com menu suspenso: a lista abre logo abaixo dele, por cima da tela, e
// fecha ao escolher ou ao tocar fora.
export function Dropdown(props: Props) {
  const { placeholder, options, selected, onSelect, allLabel, selectedLabel, hideAll, disabled, style, testID } = props
  const trigger = useRef<View>(null)
  const window = useWindowDimensions()
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null)

  const active = selected !== null
  const label = selectedLabel ?? options.find((o) => o.key === selected)?.label ?? placeholder

  function open() {
    trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y: y + height + 6, width }))
  }

  function choose(key: string | null) {
    setAnchor(null)
    onSelect(key)
  }

  // Menu pelo menos tão largo quanto o botão e dentro da tela
  const menuWidth = anchor ? Math.min(Math.max(anchor.width, 220), window.width - 32) : 0
  const menuLeft = anchor ? Math.min(anchor.x, window.width - 16 - menuWidth) : 0
  // Sem espaço abaixo, o menu sobe até caber
  const menuTop = anchor ? Math.min(anchor.y, window.height - 40 - MENU_MAX_HEIGHT) : 0

  return (
    <>
      <Pressable
        ref={trigger}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${placeholder}: ${active ? label : allLabel}`}
        onPress={open}
        disabled={disabled}
        style={({ pressed }) => [styles.trigger, active && styles.triggerActive, (pressed || disabled) && styles.dim, style]}>
        {/* Três lado a lado no filtro de eventos: com a fonte do sistema maior,
            o texto diminui um pouco antes de cortar */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[styles.triggerText, active && styles.triggerTextActive]}>
          {label}
        </Text>
        <ChevronDown size={15} color={active ? colors.primary : colors.text50} />
      </Pressable>

      <Modal visible={anchor !== null} transparent animationType="fade" onRequestClose={() => setAnchor(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAnchor(null)} accessibilityLabel="Fechar" />
        {anchor && (
          <View style={[styles.menu, { top: Math.max(menuTop, 60), left: menuLeft, width: menuWidth }]}>
            <ScrollView bounces={false}>
              {[...(hideAll ? [] : [{ key: null, label: allLabel }]), ...options].map((option: { key: string | null; label: string }, index) => {
                const checked = option.key === selected
                return (
                  <Pressable
                    key={option.key ?? '__all'}
                    testID={testID ? `${testID}-option-${index}` : undefined}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: checked }}
                    onPress={() => choose(option.key)}
                    style={({ pressed }) => [styles.option, index > 0 && styles.divider, pressed && styles.pressed]}>
                    <Text style={[styles.optionText, checked && styles.optionTextActive]}>{option.label}</Text>
                    {checked && <Check size={16} color={colors.primary} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  triggerActive: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  triggerText: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  triggerTextActive: { color: colors.primary },
  dim: { opacity: 0.6 },
  menu: {
    position: 'absolute',
    maxHeight: MENU_MAX_HEIGHT,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  pressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  optionText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  optionTextActive: { fontFamily: fonts.bodySemi, color: colors.primary },
})
