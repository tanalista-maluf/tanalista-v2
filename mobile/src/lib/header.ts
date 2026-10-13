import { useHeaderHeight } from 'expo-router/react-navigation'
import { Platform } from 'react-native'

// O cabeçalho é transparente e o conteúdo passa por baixo dele. No iOS a lista
// se ajusta sozinha (contentInsetAdjustmentBehavior); no Android é preciso
// reservar o espaço à mão.
export function useHeaderInset(): number {
  const headerHeight = useHeaderHeight()
  return Platform.OS === 'android' ? headerHeight : 0
}
