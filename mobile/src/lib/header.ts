import { useHeaderHeight } from 'expo-router/react-navigation'
import { Platform } from 'react-native'

// O cabeçalho é transparente e o conteúdo passa por baixo dele. No iOS a lista
// se ajusta sozinha (contentInsetAdjustmentBehavior); no Android é preciso
// reservar o espaço à mão.
export function useHeaderInset(): number {
  const headerHeight = useHeaderHeight()
  return Platform.OS === 'android' ? headerHeight : 0
}

// Nas abas o cabeçalho é desenhado em JavaScript, e nem o iOS ajusta a lista
// sozinho: o espaço é sempre reservado à mão.
export function useTabHeaderInset(): number {
  return useHeaderHeight()
}
