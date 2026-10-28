// Papéis num grupo: o dono, os Gestores que ele promove e os demais membros.
// Só dono e Gestores criam eventos no grupo; o Gestor edita os próprios
// eventos e o dono edita e cancela qualquer evento do grupo.
export type GroupRole = 'OWNER' | 'MANAGER' | 'MEMBER'

export const GROUP_ROLE_LABEL: Record<GroupRole, string> = {
  OWNER: 'Dono',
  MANAGER: 'Gestor',
  MEMBER: 'Membro',
}

export function canCreateGroupEvents(role: string | null | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER'
}
