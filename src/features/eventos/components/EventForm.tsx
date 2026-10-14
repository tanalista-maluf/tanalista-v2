'use client'

import { useForm, Controller, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { eventSchema, type EventSchema } from '../schemas'
import { createEventAction, updateEventAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, Repeat2, Users, Globe, UserCheck } from 'lucide-react'

const CATEGORIES = [
  'Futebol', 'Basquete', 'Vôlei', 'Airsoft & Paintball', 'Corrida & Trilha',
  'Gastronomia', 'Negócios', 'Ensino', 'Música', 'Social', 'Outros',
]


interface EventFormProps {
  eventId?: string
  groupId?: string
  defaultValues?: Partial<EventSchema>
  isLocked?: boolean // campos críticos travados (status != DRAFT)
  // Editando um rascunho: times e repetição também mudam, e dá para publicar
  isDraft?: boolean
  onSuccess?: () => void
}

export function EventForm({ eventId, groupId, defaultValues, isLocked, isDraft, onSuccess }: EventFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EventSchema>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      group_id: groupId,
      organizer_exempt: true,
      recurrence: 'none',
      recurrence_count: 4,
      ...defaultValues,
    },
  })

  const titleValue = useWatch({ control, name: 'title' })
  const recurrence = useWatch({ control, name: 'recurrence' })
  const category = useWatch({ control, name: 'category' })
  const useTeams = useWatch({ control, name: 'use_teams' })
  const priceRaw = useWatch({ control, name: 'price' })
  // Times e repetição: ao criar e num rascunho
  const canShape = !eventId || !!isDraft

  const { fields: teamFields, replace: replaceTeams } = useFieldArray({
    control,
    name: 'teams',
  })

  // Muda o número de times mantendo o que já foi preenchido nos primeiros
  function changeTeamCount(value: string) {
    const count = Number(value)
    if (count < 2) {
      setValue('use_teams', false)
      replaceTeams([])
      return
    }
    setValue('use_teams', true)
    const capacity = Number(getValues('capacity')) || 20
    const current = getValues('teams') ?? []
    replaceTeams(
      Array.from({ length: count }, (_, i) =>
        current[i] ?? { name: `Time ${String.fromCharCode(65 + i)}`, capacity: Math.max(1, Math.floor(capacity / count)) }
      )
    )
  }

  // asDraft: salva sem publicar (só você vê, em Meus eventos > Organizando)
  async function onSubmit(data: EventSchema, asDraft = false) {
    setServerError(null)
    const payload: EventSchema = eventId
      ? isDraft
        ? { ...data, draft_series: true, publish_draft: !asDraft }
        : data
      : { ...data, as_draft: asDraft }
    const result = eventId ? await updateEventAction(eventId, payload) : await createEventAction(payload)

    if (result?.error) {
      setServerError(result.error)
    } else if (!result?.error && onSuccess) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      {isLocked && (
        <div className="rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 text-xs text-yellow-400">
          Este evento já está publicado. Apenas a descrição, o endereço e o valor podem ser editados.
        </div>
      )}

      {groupId && <input type="hidden" {...register('group_id')} />}

      {/* Informações básicas */}
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Informações básicas</h3>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Título *</Label>
            <span className={`text-xs tabular-nums ${(titleValue?.length ?? 0) >= 40 ? 'text-destructive' : 'text-white/30'}`}>
              {titleValue?.length ?? 0}/40
            </span>
          </div>
          <Input
            id="title"
            placeholder="Ex: Churrasco da galera"
            disabled={isLocked}
            maxLength={40}
            aria-invalid={!!errors.title}
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Detalhes sobre o evento..."
            rows={4}
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || '')} disabled={isLocked}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </section>

      <Separator />

      {/* Local */}
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Local</h3>
        <div className="space-y-1.5">
          <Label htmlFor="address">Endereço completo *</Label>
          <Input
            id="address"
            placeholder="Rua das Flores, 123 - Jardim Paulista"
            aria-invalid={!!errors.address}
            {...register('address')}
          />
          {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            placeholder="São Paulo"
            disabled={isLocked}
            aria-invalid={!!errors.city}
            {...register('city')}
          />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </section>

      <Separator />

      {/* Datas */}
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Datas e horários</h3>
        <div className="space-y-1.5">
          <Label htmlFor="starts_at">Início *</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            disabled={isLocked}
            aria-invalid={!!errors.starts_at}
            {...register('starts_at')}
          />
          {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ends_at">Término</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            disabled={isLocked}
            {...register('ends_at')}
          />
          {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_deadline">Prazo de inscrição *</Label>
          <Input
            id="registration_deadline"
            type="datetime-local"
            disabled={isLocked}
            aria-invalid={!!errors.registration_deadline}
            {...register('registration_deadline')}
          />
          {errors.registration_deadline && <p className="text-xs text-destructive">{errors.registration_deadline.message}</p>}
          <p className="text-xs text-white/50">Deve ser antes do início do evento</p>
        </div>
      </section>

      <Separator />

      {/* Vagas e valor */}
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Vagas e valor</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Valor (R$) *</Label>
            <Input
              id="price"
              placeholder="0,00"
              aria-invalid={!!errors.price}
              {...register('price')}
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            {(() => {
              const cents = Math.round(parseFloat(String(priceRaw).replace(',', '.')) * 100)
              if (!isNaN(cents) && cents > 0) {
                const fee = Math.round(cents * 0.0599)
                const net = cents - fee
                return (
                  <p className="text-[10px] text-white/35 leading-relaxed">
                    Taxa plataforma (5,99%): R$ {(fee/100).toFixed(2).replace('.',',')} · Você recebe: <span className="text-primary font-semibold">R$ {(net/100).toFixed(2).replace('.',',')}</span>
                  </p>
                )
              }
              return null
            })()}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacidade *</Label>
            <Input
              id="capacity"
              type="number"
              min={2}
              disabled={isLocked}
              aria-invalid={!!errors.capacity}
              {...register('capacity', { valueAsNumber: true })}
            />
            {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min_participants">Mínimo *</Label>
            <Input
              id="min_participants"
              type="number"
              min={1}
              disabled={isLocked}
              aria-invalid={!!errors.min_participants}
              {...register('min_participants', { valueAsNumber: true })}
            />
            {errors.min_participants && <p className="text-xs text-destructive">{errors.min_participants.message}</p>}
          </div>
        </div>
        <p className="text-xs text-white/50">
          A fila de espera é calculada automaticamente: 10% da capacidade (mínimo 1 vaga).
        </p>

        <Controller
          name="organizer_exempt"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="organizer_exempt"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLocked}
              />
              <Label htmlFor="organizer_exempt" className="font-normal cursor-pointer">
                Organizador isento do pagamento de inscrição
              </Label>
            </div>
          )}
        />

        <Controller
          name="visibility"
          control={control}
          render={({ field }) => {
            const options = [
              {
                value: 'PUBLIC',
                icon: Globe,
                label: 'Público',
                description: 'Visível para todos. Qualquer pessoa pode se inscrever.',
              },
              {
                value: 'PRIVATE',
                icon: UserCheck,
                label: 'Privado',
                description: 'Visível na listagem, mas a inscrição requer autorização do organizador.',
              },
            ] as const
            const current = field.value ?? 'PUBLIC'
            return (
              <div className="space-y-1.5">
                <Label>Visibilidade do evento</Label>
                <div className="space-y-2">
                  {options.map((opt) => {
                    const Icon = opt.icon
                    const active = current === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={[
                          'w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                          active
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-white/10 hover:border-white/20',
                        ].join(' ')}
                      >
                        <Icon className={['size-4 mt-0.5 shrink-0', active ? 'text-primary' : 'text-white/35'].join(' ')} />
                        <div>
                          <p className={['text-sm font-medium', active ? 'text-primary' : 'text-white/70'].join(' ')}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">{opt.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          }}
        />
        <Controller
          name="cancel_before_hours"
          control={control}
          render={({ field }) => {
            const OPTIONS = [
              { value: null, label: 'Cancelamento não permitido' },
              { value: 0,    label: 'Sempre permitido' },
              { value: 24,   label: 'Até 24h antes' },
              { value: 48,   label: 'Até 48h antes' },
              { value: 72,   label: 'Até 72h antes' },
              { value: 168,  label: 'Até 7 dias antes' },
            ]
            return (
              <div className="space-y-1.5">
                <Label>Política de cancelamento</Label>
                <select
                  value={field.value === null || field.value === undefined ? 'null' : String(field.value)}
                  onChange={e => field.onChange(e.target.value === 'null' ? null : Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/70 focus:outline-none focus:border-primary/40 transition-colors"
                >
                  {OPTIONS.map(o => (
                    <option key={String(o.value)} value={String(o.value)} className="bg-[#0D1A14]">
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/35">
                  Define até quando o participante pode cancelar e receber reembolso na carteira.
                </p>
              </div>
            )
          }}
        />
      </section>

      {/* Times: de 2 a 10, em qualquer categoria; ao criar e num rascunho */}
      {canShape && (
        <>
          <Separator />
          <section className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="size-4" />
              Times
            </h3>
            <div className="space-y-1.5">
              <Label>Número de times</Label>
              <Select value={useTeams ? String(teamFields.length) : '0'} onValueChange={(v) => changeTeamCount(v ?? '0')}>
                <SelectTrigger>
                  <SelectValue>{useTeams ? `${teamFields.length} times` : 'Sem times'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sem times</SelectItem>
                  {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} times</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-white/50">Cada pessoa escolhe o time ao se inscrever.</p>
            </div>

            {useTeams && (
              <div className="space-y-3">
                {teamFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Time ${index + 1}`}
                        {...register(`teams.${index}.name`)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Vagas"
                        {...register(`teams.${index}.capacity`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Recorrência — ao criar e num rascunho */}
      {canShape && (
        <>
          <Separator />
          <section className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Repeat2 className="size-4" />
              Recorrência
            </h3>

            <Controller
              name="recurrence"
              control={control}
              render={({ field }) => {
              const labels: Record<string, string> = {
                none: 'Não repetir',
                weekly: 'Semanalmente',
                biweekly: 'A cada 2 semanas',
                monthly: 'Mensalmente',
              }
              return (
                <div className="space-y-1.5">
                  <Label>Repetir evento</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue>{labels[field.value] ?? 'Não repetir'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não repetir</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="biweekly">A cada 2 semanas</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            }}
            />

            {recurrence && recurrence !== 'none' && (
              <div className="space-y-1.5">
                <Label htmlFor="recurrence_count">Quantas vezes repetir (além desta)</Label>
                <Input
                  id="recurrence_count"
                  type="number"
                  min={1}
                  max={52}
                  {...register('recurrence_count', { valueAsNumber: true })}
                />
                {errors.recurrence_count && (
                  <p className="text-xs text-destructive">{errors.recurrence_count.message}</p>
                )}
                <p className="text-xs text-white/50">
                  Os próximos eventos são criados {(recurrence === 'weekly' ? 'semanalmente' : recurrence === 'biweekly' ? 'a cada 2 semanas' : 'mensalmente')}, junto com este: publicados ou como rascunho, conforme o botão que você usar.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {eventId && !isDraft ? (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Salvar alterações
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, true))}>
            Salvar rascunho
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Publicar evento
          </Button>
        </div>
      )}
    </form>
  )
}
