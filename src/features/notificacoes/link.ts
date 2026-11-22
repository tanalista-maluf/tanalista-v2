// Para onde a notificação leva no site. Pedido de entrada (tem requester_id)
// vai direto para onde o organizador aprova ou recusa: a aba Solicitações do
// evento ou as configurações do grupo.
export function notificationHref(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null
  const isJoinRequest = typeof data.requester_id === 'string'

  if (typeof data.event_id === 'string') {
    const event = typeof data.event_slug === 'string' && data.event_slug ? data.event_slug : data.event_id
    return isJoinRequest ? `/eventos/${event}?aba=solicitacoes` : `/eventos/${event}`
  }
  if (typeof data.group_id === 'string') {
    const group = typeof data.group_slug === 'string' && data.group_slug ? data.group_slug : data.group_id
    return isJoinRequest ? `/grupos/${group}/configuracoes` : `/grupos/${group}`
  }
  return null
}
