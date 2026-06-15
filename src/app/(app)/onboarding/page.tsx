'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingStep1Schema, onboardingStep2Schema, type OnboardingStep1, type OnboardingStep2 } from '@/features/auth/schemas'
import {
  onboardingStep1Action,
  onboardingStep2Action,
  completeOnboardingAction,
  getSuggestedGroupsAction,
  joinGroupOnboardingAction,
} from '@/features/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AtSign, MapPin, Sparkles, Users, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 4

const CATEGORIES = [
  { label: 'Esportes', emoji: '⚽' },
  { label: 'Gastronomia', emoji: '🍖' },
  { label: 'Tecnologia', emoji: '💻' },
  { label: 'Música', emoji: '🎵' },
  { label: 'Arte & Cultura', emoji: '🎨' },
  { label: 'Social', emoji: '🎉' },
  { label: 'Saúde', emoji: '🧘' },
  { label: 'Negócios', emoji: '💼' },
  { label: 'Viagens', emoji: '✈️' },
]

const STEP_META = [
  { label: 'Usuário', icon: AtSign },
  { label: 'Localização', icon: MapPin },
  { label: 'Interesses', icon: Sparkles },
  { label: 'Grupos', icon: Users },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedCity, setSavedCity] = useState('')
  const [interests, setInterests] = useState<string[]>([])

  function next() { setServerError(null); setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-2xl font-extrabold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            TáNaLista
          </span>
          <p className="text-sm text-white/40">
            Etapa {step} de {TOTAL_STEPS} — {STEP_META[step - 1].label}
          </p>
        </div>

        {/* Barra de progresso */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {step === 1 && (
          <Step1
            onNext={next}
            serverError={serverError}
            setServerError={setServerError}
          />
        )}
        {step === 2 && (
          <Step2
            onNext={(city) => { setSavedCity(city); next() }}
            onBack={back}
            serverError={serverError}
            setServerError={setServerError}
          />
        )}
        {step === 3 && (
          <Step3
            interests={interests}
            setInterests={setInterests}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 4 && (
          <Step4
            city={savedCity}
            interests={interests}
            onBack={back}
          />
        )}
      </div>
    </div>
  )
}

// ── Etapa 1: @username ───────────────────────────────────
function Step1({ onNext, serverError, setServerError }: {
  onNext: () => void
  serverError: string | null
  setServerError: (e: string | null) => void
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<OnboardingStep1>({ resolver: zodResolver(onboardingStep1Schema) })

  async function onSubmit(data: OnboardingStep1) {
    setServerError(null)
    const result = await onboardingStep1Action(data)
    if (result?.error) setServerError(result.error)
    else onNext()
  }

  return (
    <div className="card-dark rounded-2xl p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">Escolha seu @username</h2>
        <p className="text-sm text-white/40">É assim que outros usuários vão te encontrar.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <p className="text-sm text-red-400">{serverError}</p>}
        <div className="space-y-1.5">
          <Label className="text-white/60">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
            <Input className="pl-7" placeholder="joaosilva" autoComplete="username" aria-invalid={!!errors.username} {...register('username')} />
          </div>
          {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
          <p className="text-xs text-white/30">Letras minúsculas, números e _ (3–30 caracteres)</p>
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Continuar
        </button>
      </form>
    </div>
  )
}

// ── Etapa 2: Cidade ──────────────────────────────────────
function Step2({ onNext, onBack, serverError, setServerError }: {
  onNext: (city: string) => void
  onBack: () => void
  serverError: string | null
  setServerError: (e: string | null) => void
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<OnboardingStep2>({ resolver: zodResolver(onboardingStep2Schema) })

  const city = watch('city', '')

  async function onSubmit(data: OnboardingStep2) {
    setServerError(null)
    const result = await onboardingStep2Action(data)
    if (result?.error) setServerError(result.error)
    else onNext(data.city)
  }

  return (
    <div className="card-dark rounded-2xl p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">Onde você mora?</h2>
        <p className="text-sm text-white/40">Usamos sua cidade para mostrar eventos próximos.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <p className="text-sm text-red-400">{serverError}</p>}
        <div className="space-y-1.5">
          <Label className="text-white/60">Cidade</Label>
          <Input placeholder="São Paulo" aria-invalid={!!errors.city} {...register('city')} />
          {errors.city && <p className="text-xs text-red-400">{errors.city.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/60">Celular <span className="text-white/30 text-xs">(opcional)</span></Label>
          <Input type="tel" placeholder="11999998888" aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:border-white/20 hover:text-white transition-colors">
            Voltar
          </button>
          <button type="submit" disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Continuar
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Etapa 3: Interesses ──────────────────────────────────
function Step3({ interests, setInterests, onNext, onBack }: {
  interests: string[]
  setInterests: (v: string[]) => void
  onNext: () => void
  onBack: () => void
}) {
  function toggle(cat: string) {
    setInterests(
      interests.includes(cat) ? interests.filter(c => c !== cat) : [...interests, cat]
    )
  }

  return (
    <div className="card-dark rounded-2xl p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">O que você curte?</h2>
        <p className="text-sm text-white/40">Selecione seus interesses para encontrar grupos certos pra você.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ label, emoji }) => {
          const active = interests.includes(label)
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-sm font-medium border transition-all',
                active
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:text-white'
              )}
            >
              {emoji} {label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:border-white/20 hover:text-white transition-colors">
          Voltar
        </button>
        <button type="button" onClick={onNext}
          className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors">
          {interests.length > 0 ? `Continuar (${interests.length})` : 'Pular'}
        </button>
      </div>
    </div>
  )
}

// ── Etapa 4: Grupos sugeridos ────────────────────────────
type Group = { id: string; name: string; category: string | null; city: string | null; member_count: number; description: string | null }

function Step4({ city, interests, onBack }: {
  city: string
  interests: string[]
  onBack: () => void
}) {
  const [groups, setGroups] = useState<Group[]>([])
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [completing, setCompleting] = useState(false)

  // Carregar grupos na montagem do step
  useState(() => {
    getSuggestedGroupsAction(city, interests).then(data => {
      setGroups(data as Group[])
      setLoaded(true)
    })
  })

  function handleJoin(groupId: string) {
    startTransition(async () => {
      await joinGroupOnboardingAction(groupId)
      setJoined(prev => new Set([...prev, groupId]))
    })
  }

  async function handleComplete() {
    setCompleting(true)
    await completeOnboardingAction()
  }

  return (
    <div className="card-dark rounded-2xl p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white">Grupos para você</h2>
        <p className="text-sm text-white/40">
          {city ? `Grupos em ${city} que combinam com seus interesses.` : 'Grupos públicos disponíveis.'}
        </p>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-sm">
          Nenhum grupo encontrado para sua cidade. Você pode explorar grupos depois.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(g => {
            const isJoined = joined.has(g.id)
            return (
              <div key={g.id} className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3.5">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{g.name}</p>
                  <p className="text-xs text-white/35">
                    {g.member_count} membros{g.category ? ` · ${g.category}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isJoined && handleJoin(g.id)}
                  disabled={isPending || isJoined}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    isJoined
                      ? 'bg-primary/10 text-primary border border-primary/20 flex items-center gap-1'
                      : 'bg-primary text-background hover:bg-primary/90'
                  )}
                >
                  {isJoined ? <><Check className="size-3" /> Entrou</> : 'Entrar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:border-white/20 hover:text-white transition-colors">
          Voltar
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {completing && <Loader2 className="size-4 animate-spin" />}
          {joined.size > 0 ? 'Entrar no app →' : 'Pular e entrar'}
        </button>
      </div>
    </div>
  )
}
