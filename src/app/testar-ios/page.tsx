import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/logo-mark'
import { CONTACT_EMAIL } from '@/features/ajuda/como-funciona'
import { ArrowLeft, Download, Smartphone, MessageCircleWarning } from 'lucide-react'

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/gfd36Tce'

export const metadata = {
  title: 'Testar no iOS (beta) — TáNaLista',
  description: 'Baixe o TáNaLista pelo TestFlight e ajude a testar o app para iPhone antes do lançamento na App Store.',
}

export default function TestarIOSPage() {
  return (
    <div className="flex flex-col min-h-full bg-[#0D1A14] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0D1A14]/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="text-[15px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              <span className="text-[#4ADE80]">Tá</span>
              <span className="text-white/35 font-light">na</span>
              <span className="text-[#4ADE80]">Lista</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4ADE80]/20 bg-[#4ADE80]/5 px-4 py-1.5 text-xs font-medium text-[#4ADE80] mb-6">
            <Smartphone className="size-3.5" />
            Beta fechado para iPhone
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-[1.1]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Teste o app do <span className="text-[#4ADE80]">TáNaLista</span> antes de todo mundo
          </h1>
          <p className="text-white/55 leading-relaxed max-w-xl mx-auto mb-8">
            Ainda estamos preparando o lançamento na App Store. Enquanto isso, você já pode instalar o app pelo
            TestFlight (a ferramenta oficial da Apple para testes) e ajudar a encontrar bugs antes dos outros.
          </p>
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }), 'bg-[#4ADE80] text-[#0D1A14] hover:bg-[#4ADE80]/90 font-bold text-base px-8 gap-2')}
          >
            <Download className="size-4" />
            Baixar pelo TestFlight
          </a>
          <p className="text-xs text-white/35 mt-3">Abra este link no seu iPhone. Funciona apenas em dispositivos iOS.</p>
        </section>

        <section className="mx-auto max-w-xl px-4 sm:px-6 pb-14">
          <div className="rounded-3xl border border-white/10 overflow-hidden bg-black shadow-2xl">
            <video
              src="/videos/tanalista-demo.mp4"
              controls
              playsInline
              preload="metadata"
              className="w-full aspect-[9/16] sm:aspect-video object-contain bg-black"
            />
          </div>
          <p className="text-center text-xs text-white/30 mt-3">Veja o app em ação antes de instalar</p>
        </section>

        <section className="border-t border-white/[0.06] bg-white/[0.02] py-16">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <h2
              className="text-xl sm:text-2xl font-bold text-white text-center mb-10"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Como instalar pelo TestFlight
            </h2>
            <ol className="space-y-5">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4ADE80]/15 border border-[#4ADE80]/20 text-xs font-bold text-[#4ADE80]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-white text-sm">{s.title}</p>
                    <p className="text-sm text-white/50 leading-relaxed">{s.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex gap-4">
              <MessageCircleWarning className="size-5 text-[#4ADE80] shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">É uma versão beta</p>
                <p className="text-sm text-white/50 leading-relaxed">
                  Pode haver instabilidades enquanto ajustamos o app. Encontrou algum bug ou tem uma sugestão?
                  Escreva para{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#4ADE80] hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center text-sm text-white/30">
          © {new Date().getFullYear()} TáNaLista
        </div>
      </footer>
    </div>
  )
}

const steps = [
  {
    title: 'Abra o link do TestFlight no iPhone',
    description: 'Toque no botão "Baixar pelo TestFlight" acima pelo navegador do seu iPhone (Safari ou Chrome).',
  },
  {
    title: 'Instale o app TestFlight, se ainda não tiver',
    description: 'É um app grátis da própria Apple, feito para testar apps antes do lançamento oficial. A própria tela vai te direcionar para a App Store se precisar.',
  },
  {
    title: 'Toque em "Aceitar" e depois em "Instalar"',
    description: 'O TestFlight vai te mostrar o TáNaLista disponível para teste — basta aceitar o convite e instalar.',
  },
  {
    title: 'Abra o TáNaLista e comece a testar',
    description: 'O app aparece na sua tela inicial como qualquer outro. Pode criar conta, organizar e confirmar presença em eventos normalmente.',
  },
]
