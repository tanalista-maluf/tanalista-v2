'use client'

import { useForm, Controller, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { eventSchema, type EventSchema } from '../schemas'
import { createEventAction, updateEventAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, Repeat2, Users, Globe, UserCheck, ImagePlus, Camera } from 'lucide-react'
import Image from 'next/image'
import { PostSignupMessageImageUpload } from './PostSignupMessageImageUpload'

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
  // Quem criou o evento — só o organizador vê o toggle de notificação de
  // nova inscrição (o dono/gestor do grupo pode editar o evento sem ser
  // quem recebe esse aviso). Na criação é sempre o próprio organizador.
  isOrganizer?: boolean
  // Imagem atual do popup pós-inscrição: o upload é imediato (fora do submit
  // do form, como a capa), então vem de fora como prop
  postSignupMessageImageUrl?: string | null
  onSuccess?: () => void
}

export function EventForm({
  eventId, groupId, defaultValues, isLocked, isDraft, isOrganizer = true, postSignupMessageImageUrl, onSuccess,
}: EventFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [cover, setCover] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) {
      setServerError('Imagem deve ter no máximo 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setCover({ base64: result.split(',')[1], mimeType: file.type, preview: result })
    }
    reader.readAsDataURL(file)
  }

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
      notify_group_on_create: true,
      notify_organizer_on_signup: true,
      post_signup_message_enabled: false,
      post_signup_message: '',
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
  const postSignupMessageEnabled = useWatch({ control, name: 'post_signup_message_enabled' })
  const postSignupMessageValue = useWatch({ control, name: 'post_signup_message' })
  const customRulesValue = useWatch({ control, name: 'custom_rules' })
  const rulesConfirmationRequired = useWatch({ control, name: 'rules_confirmation_required' })
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
      : { ...data, as_draft: asDraft, cover: cover ? { base64: cover.base64, mimeType: cover.mimeType } : undefined }
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

      {!eventId && (
        <section className="space-y-1.5">
          <Label>Foto de capa</Label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleCoverChange}
          />
          <div
            onClick={() => coverInputRef.current?.click()}
            className="relative aspect-[16/9] rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer group flex items-center justify-center"
          >
            {cover ? (
              <Image src={cover.preview} alt="Capa do evento" fill unoptimized className="object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-white/30 group-hover:text-white/50 transition-colors">
                <ImagePlus className="size-6" />
                <span className="text-xs">Adicionar foto de capa</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 size-7 rounded-full bg-primary flex items-center justify-center">
              <Camera className="size-3.5 text-background" />
            </div>
          </div>
          <p className="text-xs text-white/30">Opcional. Aparece no topo do evento.</p>
        </section>
      )}

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
          <Label htmlFor="ends_at">Término *</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            disabled={isLocked}
            aria-invalid={!!errors.ends_at}
            {...register('ends_at')}
          />
          {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_deadline">Prazo de inscrição (opcional)</Label>
          <Input
            id="registration_deadline"
            type="datetime-local"
            disabled={isLocked}
            aria-invalid={!!errors.registration_deadline}
            {...register('registration_deadline')}
          />
          {errors.registration_deadline && <p className="text-xs text-destructive">{errors.registration_deadline.message}</p>}
          <p className="text-xs text-white/50">Em branco, as inscrições ficam abertas até o início do evento</p>
        </div>
        <div className="rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 text-xs text-yellow-400">
          Se o evento não atingir o número mínimo de participantes até 12h antes do início, ele é cancelado
          automaticamente e todos os inscritos são reembolsados.
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

        {groupId && (
          <Controller
            name="notify_group_on_create"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify_group_on_create"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="notify_group_on_create" className="font-normal cursor-pointer">
                  Notificar o grupo quando este evento for publicado
                </Label>
              </div>
            )}
          />
        )}

        {isOrganizer && (
          <Controller
            name="notify_organizer_on_signup"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify_organizer_on_signup"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="notify_organizer_on_signup" className="font-normal cursor-pointer">
                  Notificar a cada nova inscrição confirmada
                </Label>
              </div>
            )}
          />
        )}

        {/* Só depois que o evento existe: o organizador ativa quando quiser */}
        {eventId && (
          <div className="space-y-2 rounded-xl border border-white/10 p-3">
            <Controller
              name="post_signup_message_enabled"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="post_signup_message_enabled"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="post_signup_message_enabled" className="font-normal cursor-pointer">
                    Mostrar mensagem após a inscrição
                  </Label>
                </div>
              )}
            />
            <p className="text-xs text-white/40">
              Aparece pra quem acabou de confirmar inscrição: regras, como chegar, avisos etc.
            </p>
            {postSignupMessageEnabled && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="post_signup_message">Mensagem</Label>
                  <span className={`text-xs tabular-nums ${(postSignupMessageValue?.length ?? 0) >= 500 ? 'text-destructive' : 'text-white/30'}`}>
                    {postSignupMessageValue?.length ?? 0}/500
                  </span>
                </div>
                <Textarea
                  id="post_signup_message"
                  placeholder="Ex: Chegue 15 min antes. Estacionamento na rua ao lado."
                  maxLength={500}
                  aria-invalid={!!errors.post_signup_message}
                  {...register('post_signup_message')}
                />
                {errors.post_signup_message && <p className="text-xs text-destructive">{errors.post_signup_message.message}</p>}
                <Label className="text-white/60">Ou personalize com uma imagem</Label>
                <PostSignupMessageImageUpload eventId={eventId!} currentImageUrl={postSignupMessageImageUrl ?? null} />
              </div>
            )}
          </div>
        )}

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

      <Separator />

      {/* Regras e diretrizes: texto livre que substitui o padrão na aba
          Regras, e a opção de exigir confirmação de leitura antes de
          inscrever-se. Disponível na criação e na edição. */}
      <section className="space-y-4">
        <h3 className="font-semibold text-sm">Regras e diretrizes</h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="custom_rules">Regras personalizadas (opcional)</Label>
            <span className={`text-xs tabular-nums ${(customRulesValue?.length ?? 0) >= 8000 ? 'text-destructive' : 'text-white/30'}`}>
              {customRulesValue?.length ?? 0}/8000
            </span>
          </div>
          <Textarea
            id="custom_rules"
            placeholder={`Ex:\n• Chegue com 15 minutos de antecedência\n• Traje esportivo obrigatório\n• Proibido fumar no local`}
            rows={5}
            maxLength={8000}
            aria-invalid={!!errors.custom_rules}
            {...register('custom_rules')}
          />
          {errors.custom_rules && <p className="text-xs text-destructive">{errors.custom_rules.message}</p>}
          <p className="text-xs text-white/50">
            Se preenchido, substitui o texto padrão na aba Regras. Em branco, mantém o padrão.
          </p>
        </div>

        <Controller
          name="rules_confirmation_required"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="rules_confirmation_required"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="rules_confirmation_required" className="font-normal cursor-pointer">
                Exigir confirmação de leitura antes de ativar a inscrição
              </Label>
            </div>
          )}
        />
        {rulesConfirmationRequired && (
          <p className="text-xs text-white/40">
            O participante só consegue se inscrever depois de marcar &quot;Li e concordo com as diretrizes&quot;.
          </p>
        )}
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
