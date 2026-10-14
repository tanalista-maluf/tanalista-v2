import type { ReactElement } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

type Action = { testID: string; label: string; icon: ReactElement; onPress: () => void }

function ActionButton({ action }: { action: Action }) {
  return (
    <Pressable
      testID={action.testID}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {action.icon}
    </Pressable>
  )
}

// Botões à direita do cabeçalho, cada um no seu círculo. No iOS 26 os botões
// do cabeçalho dividiriam a mesma cápsula de vidro e pareceriam um só; ali
// eles vão sem a cápsula e com espaço entre si. Uso: options={{ ...headerActions([...]) }}
export function headerActions(actions: Action[]) {
  return {
    unstable_headerRightItems: () =>
      actions.flatMap((action, index) => [
        ...(index > 0 ? [{ type: 'spacing' as const, spacing: 10 }] : []),
        { type: 'custom' as const, element: <ActionButton action={action} />, hidesSharedBackground: true },
      ]),
    headerRight: () => (
      <View style={styles.row}>
        {actions.map((action) => (
          <ActionButton key={action.testID} action={action} />
        ))}
      </View>
    ),
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pressed: { opacity: 0.6 },
})
