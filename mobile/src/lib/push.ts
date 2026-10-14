import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { apiPost, apiRequestDelete } from '@/lib/api'

// Notificação push: o servidor envia pela Expo (APNs no iOS, FCM no Android)
// toda vez que cria uma notificação para a pessoa (src/lib/mobile-push.ts no site).

// Com o app aberto, a notificação também aparece como banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Token deste aparelho, para tirar do servidor ao sair da conta
let registeredToken: string | null = null

// Para onde a notificação leva: o evento ou o grupo de que ela fala
export function notificationTarget(data: Record<string, unknown> | null | undefined) {
  if (typeof data?.event_id === 'string') return { pathname: '/events/[id]' as const, params: { id: data.event_id } }
  if (typeof data?.group_id === 'string') return { pathname: '/groups/[id]' as const, params: { id: data.group_id } }
  return null
}

// Pede permissão e registra o aparelho. Simulador do iOS não recebe push; e
// sem as credenciais da Apple/Firebase no projeto da Expo o token não sai.
async function registerForPush() {
  if (!Device.isDevice && process.env.EXPO_OS === 'ios') return

  if (process.env.EXPO_OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }

  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    const result = await apiPost<{ success: true } | { error: string }>('/api/v1/me/push-token', {
      token,
      platform: process.env.EXPO_OS === 'ios' ? 'ios' : 'android',
    })
    if (!('error' in result)) registeredToken = token
  } catch (err) {
    console.warn('[push] sem token:', err)
  }
}

// Ao sair da conta o aparelho deixa de receber os avisos dela
export async function unregisterPush() {
  if (!registeredToken) return
  const token = registeredToken
  registeredToken = null
  await apiRequestDelete('/api/v1/me/push-token', { token }).catch(() => undefined)
}

// Na área logada: registra o aparelho e, ao tocar numa notificação (com o app
// aberto ou fechado), abre o evento ou o grupo dela
export function usePushNotifications() {
  const response = Notifications.useLastNotificationResponse()

  useEffect(() => {
    registerForPush()
  }, [])

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
    const target = notificationTarget(response.notification.request.content.data)
    if (target) router.push(target)
    Notifications.clearLastNotificationResponse()
  }, [response])
}
