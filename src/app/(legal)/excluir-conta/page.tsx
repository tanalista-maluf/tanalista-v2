import Link from 'next/link'

export const metadata = {
  title: 'Excluir conta — TáNaLista',
  description: 'Como excluir sua conta da TáNaLista e quais dados são apagados.',
}

// Página pública exigida pela Google Play: explica como pedir a exclusão da
// conta sem precisar do app. O que é apagado e o que fica segue
// src/features/auth/delete-account.ts.
export default function ExcluirContaPage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Excluir sua conta</h1>
        <p className="text-sm text-white/40">TáNaLista — app e site</p>
      </div>

      <Section title="Pelo app">
        <ol>
          <li>Entre na sua conta no app TáNaLista.</li>
          <li>Abra a aba <strong className="text-white/80">Perfil</strong>.</li>
          <li>Toque em <strong className="text-white/80">Excluir minha conta</strong>, no fim da tela, e confirme.</li>
        </ol>
      </Section>

      <Section title="Pelo site">
        <ol>
          <li>Entre em <Link href="/login">tanalista.app</Link>.</li>
          <li>Abra o seu <Link href="/perfil">Perfil</Link>.</li>
          <li>Clique em <strong className="text-white/80">Excluir minha conta</strong> e confirme.</li>
        </ol>
      </Section>

      <Section title="Sem acesso à conta">
        <p>
          Se você não consegue entrar, peça a exclusão por e-mail para{' '}
          <a href="mailto:privacidade@tanalista.com.br">privacidade@tanalista.com.br</a>, a partir do endereço
          cadastrado. Respondemos em até 15 dias.
        </p>
      </Section>

      <Section title="Antes de excluir">
        <p>A exclusão só é feita quando não há nada pendente que envolva dinheiro ou outras pessoas:</p>
        <ul>
          <li>Saldo na carteira: faça o saque antes.</li>
          <li>Saque em andamento: aguarde a conclusão.</li>
          <li>Grupos dos quais você é dono: exclua-os antes.</li>
          <li>Eventos que você organiza e que ainda vão acontecer: cancele-os antes.</li>
          <li>Inscrições em eventos que ainda vão acontecer: cancele-as antes.</li>
        </ul>
      </Section>

      <Section title="O que é apagado">
        <ul>
          <li>Nome, foto, bio, cidade, telefone, CPF e @username.</li>
          <li>E-mail, senha e logins vinculados (Google, Apple). O e-mail fica livre para um novo cadastro.</li>
          <li>Notificações, lembretes, inscrições em dispositivos para push, participação em grupos, pedidos de entrada, filas de espera e anúncios.</li>
        </ul>
        <p>A exclusão é imediata e não pode ser desfeita.</p>
      </Section>

      <Section title="O que é mantido">
        <p>
          Registros de eventos passados, pagamentos, reembolsos e movimentos da carteira continuam existindo, sem
          os seus dados pessoais (aparecem como &ldquo;Conta excluída&rdquo;). Eles são necessários para os outros
          participantes, para a prestação de contas dos organizadores e para obrigações legais e fiscais, pelo
          prazo que a lei exigir.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="text-sm text-white/60 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_a]:text-primary [&_a]:hover:underline">
        {children}
      </div>
    </section>
  )
}
