import type { Database } from './database'

type Tables = Database['public']['Tables']

export type EventRow = Tables['events']['Row']
export type GroupRow = Tables['groups']['Row']
export type GroupMemberRow = Tables['group_members']['Row']
