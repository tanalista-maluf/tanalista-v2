import Link from 'next/link'
import { CONTACT_EMAIL, HOW_IT_WORKS, type HowItWorksBlock } from '@/features/ajuda/como-funciona'

export const metadata = {
  title: 'Como funciona — TáNaLista',
  description: 'Como criar e participar de eventos, grupos, marketplace, pagamentos, taxas e carteira no TáNaLista.',
}

// O mesmo conteúdo aparece no app (tela "Como funciona"), que o busca em
// /api/v1/como-funciona
export default function ComoFuncionaPage() {
  return (
    <article className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Como funciona</h1>
        <p className="text-sm text-white/50">
          Tudo sobre o TáNaLista, do cadastro ao check-in: como participar, como organizar, grupos, marketplace,
          pagamentos e taxas.
        </p>
      </div>

      <nav aria-label="Seções" className="card-dark rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35 mb-2">Nesta página</p>
        <ol className="grid gap-1.5 sm:grid-cols-2 text-sm">
          {HOW_IT_WORKS.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-white/60 hover:text-primary transition-colors">
                <span className="text-white/25 tabular-nums mr-2">{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {HOW_IT_WORKS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <p className="text-sm text-white/40">{section.summary}</p>
          </div>
          <div className="space-y-3 text-sm text-white/65 leading-relaxed">
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>
        </section>
      ))}

      <div className="card-dark rounded-2xl p-5 text-sm text-white/60 space-y-3">
        <p className="font-semibold text-white">Ainda com dúvida?</p>
        <p>
          Escreva para <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
          Veja também os <Link href="/termos" className="text-primary hover:underline">Termos de uso</Link> e a{' '}
          <Link href="/privacidade" className="text-primary hover:underline">Política de privacidade</Link>.
        </p>
      </div>
    </article>
  )
}

function Block({ block }: { block: HowItWorksBlock }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>
    case 'steps':
      return (
        <ol className="space-y-2">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )
    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1.5 marker:text-primary/60">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    case 'tip':
      return <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-white/70">{block.text}</p>
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left">
                <th className="px-4 py-2.5 font-medium text-white/40">{block.head[0]}</th>
                <th className="px-4 py-2.5 font-medium text-white/40">{block.head[1]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {block.rows.map(([label, value]) => (
                <tr key={label}>
                  <td className="px-4 py-2.5 text-white/80 align-top">{label}</td>
                  <td className="px-4 py-2.5 text-white/60">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}
