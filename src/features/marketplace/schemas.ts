import { z } from 'zod'

export const LISTING_TYPES = [
  { value: 'SELL',     label: 'Venda' },
  { value: 'RENT',     label: 'Locação / Aluguel' },
  { value: 'BUY',      label: 'Procuro comprar' },
  { value: 'LOAN',     label: 'Empréstimo' },
  { value: 'EXCHANGE', label: 'Troca' },
  { value: 'DONATION', label: 'Doação' },
  { value: 'SERVICE',  label: 'Serviço' },
] as const

export const PAYMENT_METHODS = ['PIX', 'Cartão', 'Dinheiro', 'Transferência', 'A combinar'] as const

export const listingSchema = z.object({
  title:            z.string().min(3, 'Mínimo 3 caracteres').max(100),
  description:      z.string().min(10, 'Mínimo 10 caracteres').max(1500),
  type:             z.enum(['SELL', 'RENT', 'BUY', 'LOAN', 'EXCHANGE', 'DONATION', 'SERVICE']),
  price:            z.string().optional().or(z.literal('')),
  price_negotiable: z.boolean(),
  payment_methods:  z.array(z.string()).optional(),
  contact:          z.string().max(200).optional().or(z.literal('')),
  photo_url:        z.string().url().optional().or(z.literal('')),
})

export type ListingSchema = z.infer<typeof listingSchema>
