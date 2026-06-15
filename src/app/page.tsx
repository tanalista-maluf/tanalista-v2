import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle, Users, CreditCard, Bell } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="text-primary">Tá</span>
            <span className="text-white/40 font-light">na</span>
            <span className="text-primary">Lista</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Entrar
            </Link>
            <Link href="/cadastro" className={cn(buttonVariants())}>
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24 text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            E aí?{' '}
            <span className="text-primary">Tá </span>
            <span className="text-white/40 font-light">na</span>
            <span className="text-primary"> Lista?</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10">
            Organize eventos em grupo com confirmação de pagamento. Chega de WhatsApp para descobrir quem realmente vai comparecer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }), 'text-base px-8')}>
              Cadastre-se
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-base px-8')}>
              Já tenho conta
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-secondary/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              className="text-2xl sm:text-3xl font-bold text-center mb-12"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Tudo que você precisa para organizar eventos
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div key={f.title} className="bg-card rounded-xl p-6 shadow-sm border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24 text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Pronto para organizar seu próximo evento?
          </h2>
          <p className="text-muted-foreground mb-8">
            Crie seu grupo, defina o evento e veja quem realmente vai.
          </p>
          <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }), 'text-base px-10')}>
            Criar conta grátis
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TáNaLista. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: CheckCircle,
    title: 'Confirmação real',
    description: 'Chega de correr atrás de confirmação e pagamentos.',
  },
  {
    icon: Users,
    title: 'Grupos organizados',
    description: 'Eventos sociais, festas, partidas de futebol, e muito mais. Tudo o que o seu grupo precisar.',
  },
  {
    icon: CreditCard,
    title: 'Pagamento integrado',
    description: 'Aceite pagamentos via cartão ou PIX.',
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Avise automaticamente quando o evento for confirmado ou cancelado.',
  },
]
