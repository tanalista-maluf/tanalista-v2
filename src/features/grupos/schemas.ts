import { z } from 'zod'

export const groupSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(80, 'Máximo 80 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  category: z.string().max(50).optional().or(z.literal('')),
  city: z.string().min(2, 'Informe a cidade').max(100),
})

export const groupSearchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  cursor_created_at: z.string().optional(),
  cursor_id: z.string().optional(),
})

export type GroupSchema       = z.infer<typeof groupSchema>
export type GroupSearchSchema = z.infer<typeof groupSearchSchema>
