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
import { Loader2, Repeat2, Plus, Trash2, Users } from 'lucide-react'

const CATEGORIES = [
  'Futebol', 'Basquete', 'Vôlei', 'Airsoft & Paintball', 'Corrida & Trilha',
  'Gastronomia', 'Negócios', 'Ensino', 'Música', 'Social', 'Outros',
]

const SPORTS_CATEGORIES = new Set(['Futebol', 'Basquete', 'Vôlei', 'Airsoft & Paintball'])

interface EventFormProps {
  eventId?: string
  groupId: string
  defaultValues?: Partial<EventSchema>
  isLocked?: boolean // campos críticos travados (status != DRAFT)
  onSuccess?: () => void
}

export function EventForm({ eventId, groupId, defaultValues, isLocked, onSuccess }: EventFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
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

  const recurrence = useWatch({ control, name: 'recurrence' })
  const category = useWatch({ control, name: 'category' })
  const useTeams = useWatch({ control, name: 'use_teams' })
  const isSports = SPORTS_CATEGORIES.has(category ?? '')

  const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
    control,
    name: 'teams',
  })

  async function onSubmit(data: EventSchema) {
    setServerError(null)
    const result = eventId
      ? await updateEventAction(eventId, data)
      : await createEventAction(data)

    if (result?.error) {
      setServerError(result.error)
    } else if (!result?.error && onSuccess) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      {isLocked && (
        <div className="rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 text-xs text-yellow-400">
          Este evento já está publicado. Apenas a descrição e o endereço podem ser editados.
        </div>
      )}

      <input type="hidden" {...register('group_id')} />

      {/* Informações básicas */}
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Informações básicas</h3>

        <div className="space-y-1.5">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            placeholder="Ex: Churrasco da galera"
            disabled={isLocked}
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
        <div className="grid grid-cols-2 gap-4">
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
              disabled={isLocked}
              aria-invalid={!!errors.price}
              {...register('price')}
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
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
      </section>

      {/* Times — só para Esportes e só ao criar */}
      {isSports && !eventId && (
        <>
          <Separator />
          <section className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="size-4" />
              Times
            </h3>

            <Controller
              name="use_teams"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="use_teams"
                    checked={!!field.value}
                    onCheckedChange={(v) => {
                      field.onChange(v)
                      if (v && teamFields.length === 0) {
                        appendTeam({ name: '', capacity: 10 })
                        appendTeam({ name: '', capacity: 10 })
                      }
                    }}
                  />
                  <Label htmlFor="use_teams" className="font-normal cursor-pointer">
                    Dividir participantes em times
                  </Label>
                </div>
              )}
            />

            {useTeams && (
              <div className="space-y-3">
                <p className="text-xs text-white/50">
                  A capacidade total do evento será a soma das vagas de cada time.
                </p>
                {teamFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Ex: Time A, Grêmio, PMC...`}
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
                    {teamFields.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeTeam(index)}
                        className="text-white/30 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendTeam({ name: '', capacity: 10 })}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="size-3.5" />
                  Adicionar time
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* Recorrência — só ao criar */}
      {!eventId && (
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
                  Serão criados {(recurrence === 'weekly' ? 'semanalmente' : recurrence === 'biweekly' ? 'a cada 2 semanas' : 'mensalmente')} como rascunho para você revisar.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {eventId ? 'Salvar alterações' : 'Criar evento'}
      </Button>
    </form>
  )
}
