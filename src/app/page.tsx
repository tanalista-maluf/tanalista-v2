import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, XCircle, AlertTriangle, Clock,
  CreditCard, QrCode, Bell, ShieldCheck, ArrowRight, Smartphone
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full bg-[#0D1A14] text-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0D1A14]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="14" fill="#4ADE8018"/>
              <rect x="16" y="18" width="20" height="2.5" rx="1.25" fill="#4ADE80"/>
              <rect x="16" y="24.5" width="14" height="2.5" rx="1.25" fill="#4ADE8066"/>
              <rect x="16" y="31" width="16" height="2.5" rx="1.25" fill="#4ADE8066"/>
              <circle cx="39" cy="36" r="9" fill="#4ADE80"/>
              <path d="M34.5 36.2l3 3 5-5.5" stroke="#0D1A14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              <span className="text-[#4ADE80]">Tá</span>
              <span className="text-white/35 font-light">na</span>
              <span className="text-[#4ADE80]">Lista</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'text-white/60 hover:text-white')}>
              Entrar
            </Link>
            <Link href="/cadastro" className={cn(buttonVariants(), 'bg-[#4ADE80] text-[#0D1A14] hover:bg-[#4ADE80]/90 font-semibold')}>
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4ADE80]/20 bg-[#4ADE80]/5 px-4 py-1.5 text-xs font-medium text-[#4ADE80] mb-6">
              <span className="size-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              Chega de perrengue em grupo
            </div>
            <h1
              className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              E aí?{' '}
              <span className="text-[#4ADE80]">Tá </span>
              <span className="text-white/35 font-light">na</span>
              <span className="text-[#4ADE80]"> Lista?</span>
            </h1>
            <p className="text-lg text-white/55 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Organize eventos em grupo com confirmação de presença vinculada ao pagamento. Sem WhatsApp, sem lista de papel, sem dívida no final.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }), 'bg-[#4ADE80] text-[#0D1A14] hover:bg-[#4ADE80]/90 font-bold text-base px-8 gap-2')}>
                Organizar meu primeiro evento
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/10 text-white/60 hover:text-white hover:border-white/20 text-base px-8')}>
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* Mockup do app */}
          <div className="flex justify-center lg:justify-end">
            <AppMockup />
          </div>
        </section>

        {/* ── Perrengues ──────────────────────────────────────────────────── */}
        <section className="border-y border-white/[0.06] bg-white/[0.02] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest text-[#4ADE80]/60 uppercase mb-3">Você conhece bem essa história</p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                O caos da lista descentralizada
              </h2>
            </div>

            {/* Linha 1: 3 cards */}
            <div className="grid sm:grid-cols-3 gap-5">
              {perrengues.slice(0, 3).map((p) => (
                <div key={p.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <p.icon className="size-5 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
            {/* Linha 2: 2 cards centralizados */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-5 sm:w-2/3 sm:mx-auto mt-5">
              {perrengues.slice(3).map((p) => (
                <div key={p.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <p.icon className="size-5 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
            {/* Mobile: todos em coluna única */}
            <div className="grid grid-cols-1 gap-5 sm:hidden">
              {perrengues.slice(3).map((p) => (
                <div key={p.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <p.icon className="size-5 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-white/30 text-sm">Com o TáNaLista, nada disso acontece.</p>
            </div>
          </div>
        </section>

        {/* ── Como funciona ────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest text-[#4ADE80]/60 uppercase mb-3">Simples assim</p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Como funciona
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 relative">
              {/* linha conectora */}
              <div className="hidden sm:block absolute top-6 left-[22%] right-[22%] h-px bg-gradient-to-r from-transparent via-[#4ADE80]/20 to-transparent" />

              {steps.map((s, i) => (
                <div key={s.title} className="text-center relative">
                  <div className="w-12 h-12 rounded-2xl bg-[#4ADE80]/10 border border-[#4ADE80]/20 flex items-center justify-center mx-auto mb-5 relative z-10">
                    <span className="text-sm font-bold text-[#4ADE80]">{i + 1}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="border-t border-white/[0.06] bg-white/[0.02] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Tudo que você precisa
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7 space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-[#4ADE80]/10 border border-[#4ADE80]/15 flex items-center justify-center">
                    <f.icon className="size-5 text-[#4ADE80]" />
                  </div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
            <div className="rounded-3xl border border-[#4ADE80]/15 bg-[#4ADE80]/5 p-10 sm:p-14 space-y-6">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Chega de rodar atrás de confirmação
              </h2>
              <p className="text-white/50 leading-relaxed">
                Crie seu grupo, monte o evento e receba as confirmações com pagamento já resolvido.
              </p>
              <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }), 'bg-[#4ADE80] text-[#0D1A14] hover:bg-[#4ADE80]/90 font-bold text-base px-10 gap-2')}>
                Criar conta grátis
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <span>© {new Date().getFullYear()} TáNaLista</span>
          <div className="flex gap-6">
            <Link href="/termos" className="hover:text-white/60 transition-colors">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-white/60 transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Mockup inline do app ──────────────────────────────────────────────────── */
function AppMockup() {
  const participants = [
    { name: 'Lucas M.', paid: true },
    { name: 'Ana Paula', paid: true },
    { name: 'Rafael S.', paid: true },
    { name: 'Bia Costa', paid: false },
  ]

  return (
    <div className="relative w-[280px] sm:w-[300px] select-none">
      {/* Brilho de fundo */}
      <div className="absolute -inset-8 bg-[#4ADE80]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Phone shell */}
      <div className="relative rounded-[2.5rem] border-2 border-white/10 bg-[#0D1A14] shadow-2xl overflow-hidden">
        {/* notch */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-20 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Screen content */}
        <div className="px-4 pb-6 space-y-3">
          {/* Header do evento */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-white leading-none">⚽ Fut Society — Sábado</p>
                <p className="text-[9px] text-white/40">28 jun · 08h00 · Arena Central</p>
              </div>
              <span className="text-[8px] font-semibold bg-[#4ADE80]/15 text-[#4ADE80] px-2 py-0.5 rounded-full border border-[#4ADE80]/20 shrink-0">Aberto</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
              <span className="text-[9px] text-white/40">3 de 10 vagas</span>
              <span className="text-[9px] font-semibold text-[#4ADE80]">R$ 35,00 / pessoa</span>
            </div>
          </div>

          {/* Lista de participantes */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-semibold text-white/30 uppercase tracking-wider px-0.5">Participantes confirmados</p>
            {participants.map((p) => (
              <div key={p.name} className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                <div className="w-5 h-5 rounded-full bg-[#4ADE80]/20 flex items-center justify-center shrink-0">
                  <span className="text-[7px] font-bold text-[#4ADE80]">{p.name[0]}</span>
                </div>
                <span className="text-[10px] text-white/70 flex-1">{p.name}</span>
                {p.paid ? (
                  <CheckCircle2 className="size-3 text-[#4ADE80] shrink-0" />
                ) : (
                  <Clock className="size-3 text-yellow-400/70 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Botão */}
          <button className="w-full rounded-xl bg-[#4ADE80] text-[#0D1A14] text-[11px] font-bold py-2.5">
            Confirmar presença
          </button>
        </div>
      </div>

      {/* Badge flutuante — pagamento confirmado */}
      <div className="absolute -right-4 top-20 bg-[#0D1A14] border border-[#4ADE80]/25 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2">
        <div className="size-6 rounded-full bg-[#4ADE80]/15 flex items-center justify-center">
          <CheckCircle2 className="size-3.5 text-[#4ADE80]" />
        </div>
        <div>
          <p className="text-[9px] font-semibold text-white">Pagamento confirmado</p>
          <p className="text-[8px] text-white/40">via PIX · agora</p>
        </div>
      </div>

      {/* Badge flutuante — vaga garantida */}
      <div className="absolute -left-4 bottom-24 bg-[#0D1A14] border border-white/10 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2">
        <Smartphone className="size-3.5 text-white/40" />
        <p className="text-[9px] text-white/60">Ingresso no celular</p>
      </div>
    </div>
  )
}

/* ── Dados ─────────────────────────────────────────────────────────────────── */
const perrengues = [
  {
    icon: AlertTriangle,
    title: 'Lista antiga, confusão nova',
    description: 'Alguém entra no grupo tarde, pega uma lista desatualizada e se inscreve em uma vaga que já foi preenchida.',
  },
  {
    icon: XCircle,
    title: '"Tô dentro!" — e sumiu',
    description: 'A pessoa coloca o nome, confirma no zap e no dia do evento simplesmente não aparece. E a conta fica dividida entre menos gente.',
  },
  {
    icon: Clock,
    title: 'Cobrança depois do evento',
    description: 'Fica para cobrar depois, vira constrangimento. Alguém paga, alguém não paga, o organizador fica no prejuízo.',
  },
  {
    icon: XCircle,
    title: 'Número de vagas no achismo',
    description: 'Sem controle de capacidade, o organizador aceita mais gente do que o espaço comporta — ou fecha vaga antes da hora.',
  },
  {
    icon: Clock,
    title: 'Quem vai mesmo? Ninguém sabe',
    description: 'Nem o organizador sabe de cabeça quem confirmou de verdade. Fica fazendo contagem manual no grupo do WhatsApp.',
  },
]

const steps = [
  {
    title: 'Crie o grupo',
    description: 'Monte seu grupo, convide os membros e defina as regras do pedaço.',
  },
  {
    title: 'Monte o evento',
    description: 'Defina data, local, vagas e valor. O sistema cuida do resto.',
  },
  {
    title: 'Receba confirmações reais',
    description: 'Só entra na lista quem pagou. Sem surpresa no dia.',
  },
]

const features = [
  {
    icon: CheckCircle2,
    title: 'Confirmação com pagamento',
    description: 'Quem paga, confirma. Quem não paga, não está na lista. Simples.',
  },
  {
    icon: CreditCard,
    title: 'PIX e cartão',
    description: 'Pagamento integrado via Mercado Pago. Receba na sua carteira sem complicação.',
  },
  {
    icon: QrCode,
    title: 'Check-in por QR Code',
    description: 'Cada participante tem um ingresso digital. Check-in na entrada sem papel.',
  },
  {
    icon: Bell,
    title: 'Notificações automáticas',
    description: 'O grupo é avisado quando o evento é confirmado, alterado ou cancelado.',
  },
  {
    icon: ShieldCheck,
    title: 'Reembolso automático',
    description: 'Evento cancelado? O valor volta para a carteira do participante na hora.',
  },
  {
    icon: CheckCircle2,
    title: 'Fila de espera',
    description: 'Vagas esgotaram? Quem chegar depois entra na fila e é avisado se abrir uma vaga.',
  },
]
