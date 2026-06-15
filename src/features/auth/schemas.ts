import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export const registerSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Deve conter ao menos um número'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})

export const recoverSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export const onboardingStep1Schema = z.object({
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
})

export const onboardingStep2Schema = z.object({
  city: z.string().min(2, 'Informe sua cidade').max(100),
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone inválido (DDD + número, sem espaços)')
    .optional()
    .or(z.literal('')),
})

export type LoginSchema        = z.infer<typeof loginSchema>
export type RegisterSchema     = z.infer<typeof registerSchema>
export type RecoverSchema      = z.infer<typeof recoverSchema>
export type OnboardingStep1    = z.infer<typeof onboardingStep1Schema>
export type OnboardingStep2    = z.infer<typeof onboardingStep2Schema>
