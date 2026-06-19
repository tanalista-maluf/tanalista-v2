import { z } from 'zod'

const now = () => new Date()

export const teamSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(50),
  capacity: z.number().int().min(1, 'Mínimo 1 vaga'),
})

export type TeamSchema = z.infer<typeof teamSchema>

export const eventSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(40, 'Máximo 40 caracteres'),
  description: z.string().max(2000).optional().or(z.literal('')),
  address: z.string().min(5, 'Informe o endereço completo').max(300),
  city: z.string().min(2, 'Informe a cidade').max(100),
  category: z.string().max(50).optional().or(z.literal('')),
  price: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Valor inválido')
    .refine((v) => parseFloat(v.replace(',', '.')) >= 0, 'Valor deve ser positivo'),
  capacity: z
    .number({ error: 'Informe a capacidade' })
    .int()
    .min(2, 'Mínimo 2 participantes')
    .max(10000),
  min_participants: z
    .number({ error: 'Informe o mínimo' })
    .int()
    .min(1, 'Mínimo 1'),
  starts_at: z.string().min(1, 'Informe a data e hora'),
  ends_at: z.string().optional().or(z.literal('')),
  registration_deadline: z.string().min(1, 'Informe o prazo de inscrição'),
  organizer_exempt: z.boolean(),
  group_id: z.string().uuid('Grupo inválido'),
  recurrence: z.enum(['none', 'weekly', 'biweekly', 'monthly']),
  recurrence_count: z.number().int().min(1).max(52).optional(),
  use_teams: z.boolean().optional(),
  teams: z.array(teamSchema).optional(),
  visibility: z.enum(['PUBLIC', 'GROUP', 'INVITE']).optional(),
}).superRefine((d, ctx) => {
  const starts = new Date(d.starts_at)
  const deadline = new Date(d.registration_deadline)
  const ends = d.ends_at ? new Date(d.ends_at) : null

  if (starts <= now()) {
    ctx.addIssue({ code: 'custom', path: ['starts_at'], message: 'Data de início deve ser no futuro' })
  }
  if (deadline >= starts) {
    ctx.addIssue({ code: 'custom', path: ['registration_deadline'], message: 'Prazo de inscrição deve ser antes do início' })
  }
  if (ends && ends <= starts) {
    ctx.addIssue({ code: 'custom', path: ['ends_at'], message: 'Término deve ser após o início' })
  }
  if (d.min_participants > d.capacity) {
    ctx.addIssue({ code: 'custom', path: ['min_participants'], message: 'Mínimo não pode ser maior que a capacidade' })
  }
})

export const eventSearchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  group_id: z.string().optional(),
  cursor_created_at: z.string().optional(),
  cursor_id: z.string().optional(),
})

export type EventSchema       = z.infer<typeof eventSchema>
export type EventSearchSchema = z.infer<typeof eventSearchSchema>
