export const metadata = {
  title: 'Termos de Uso — TáNaLista',
  description: 'Termos e condições de uso da plataforma TáNaLista.',
}

export default function TermosPage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Termos de Uso</h1>
        <p className="text-sm text-white/40">Última atualização: junho de 2025</p>
      </div>

      <Section title="1. Aceitação dos Termos">
        <p>
          Ao criar uma conta ou utilizar a plataforma TáNaLista, você concorda com estes Termos de Uso.
          Caso não concorde, não utilize nossos serviços.
        </p>
      </Section>

      <Section title="2. Descrição do Serviço">
        <p>
          TáNaLista é uma plataforma de organização de eventos em grupo com pagamento antecipado.
          Permite que organizadores criem eventos, definam vagas e preços, e que participantes se inscrevam
          e paguem de forma segura. A plataforma atua apenas como intermediária entre organizadores e participantes.
        </p>
      </Section>

      <Section title="3. Cadastro e Conta">
        <ul>
          <li>Você deve ter pelo menos 18 anos para criar uma conta.</li>
          <li>As informações fornecidas no cadastro devem ser verdadeiras e atualizadas.</li>
          <li>Você é responsável pela segurança da sua senha e por todas as ações realizadas na sua conta.</li>
          <li>Não é permitido criar contas falsas, múltiplas contas para a mesma pessoa ou contas em nome de terceiros sem autorização.</li>
        </ul>
      </Section>

      <Section title="4. Eventos e Pagamentos">
        <ul>
          <li>O pagamento é obrigatório para confirmar a participação em eventos pagos.</li>
          <li>Os valores são debitados no momento da inscrição e creditados na carteira do organizador após a conclusão do evento.</li>
          <li>Em caso de cancelamento do evento pelo organizador, os participantes recebem reembolso integral na carteira TáNaLista.</li>
          <li>Cancelamentos por parte do participante estão sujeitos à política de cancelamento definida pelo organizador.</li>
          <li>A TáNaLista cobra uma taxa de plataforma por transação aprovada, conforme tabela vigente.</li>
        </ul>
      </Section>

      <Section title="5. Responsabilidades do Organizador">
        <ul>
          <li>O organizador é responsável pela realização do evento conforme divulgado.</li>
          <li>Informações falsas ou enganosas sobre o evento podem resultar em suspensão da conta.</li>
          <li>Em caso de cancelamento, o organizador deve notificar os participantes com antecedência razoável.</li>
          <li>O organizador é responsável por cumprir todas as obrigações legais aplicáveis ao evento (licenças, seguros, etc.).</li>
        </ul>
      </Section>

      <Section title="6. Conduta do Usuário">
        <p>É proibido:</p>
        <ul>
          <li>Usar a plataforma para atividades ilegais ou prejudiciais a terceiros.</li>
          <li>Realizar fraudes, chargebacks indevidos ou abusar de sistemas de pagamento.</li>
          <li>Compartilhar conteúdo ofensivo, discriminatório ou que viole direitos de terceiros.</li>
          <li>Tentar burlar sistemas de segurança ou obter acesso não autorizado à plataforma.</li>
        </ul>
      </Section>

      <Section title="7. Carteira Digital">
        <ul>
          <li>A carteira TáNaLista armazena créditos para uso exclusivo dentro da plataforma.</li>
          <li>Saques estão sujeitos a prazo de processamento e verificação de identidade.</li>
          <li>Créditos não têm prazo de validade enquanto a conta estiver ativa.</li>
        </ul>
      </Section>

      <Section title="8. Privacidade">
        <p>
          O uso dos seus dados pessoais é regido pela nossa{' '}
          <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>,
          que é parte integrante destes Termos.
        </p>
      </Section>

      <Section title="9. Limitação de Responsabilidade">
        <p>
          A TáNaLista não se responsabiliza por danos decorrentes de: cancelamentos de eventos por parte dos organizadores,
          força maior, falhas em serviços de terceiros (gateways de pagamento, provedores de infraestrutura) ou uso
          inadequado da plataforma.
        </p>
      </Section>

      <Section title="10. Alterações nos Termos">
        <p>
          Podemos atualizar estes Termos a qualquer momento. Notificaremos usuários sobre mudanças relevantes
          por e-mail ou notificação na plataforma. O uso continuado após a notificação implica aceitação dos novos termos.
        </p>
      </Section>

      <Section title="11. Encerramento de Conta">
        <p>
          Você pode encerrar sua conta a qualquer momento. A TáNaLista reserva-se o direito de suspender ou encerrar
          contas que violem estes Termos. Saldos remanescentes em carteira serão processados conforme política vigente.
        </p>
      </Section>

      <Section title="12. Lei Aplicável">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. O foro competente para
          resolução de disputas é o da comarca de domicílio do usuário.
        </p>
      </Section>

      <Section title="13. Contato">
        <p>
          Para dúvidas sobre estes Termos, entre em contato: <a href="mailto:suporte@tanalista.com.br" className="text-primary hover:underline">suporte@tanalista.com.br</a>
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="text-sm text-white/60 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:hover:underline">
        {children}
      </div>
    </section>
  )
}
