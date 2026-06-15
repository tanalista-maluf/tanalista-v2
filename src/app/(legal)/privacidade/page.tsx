export const metadata = {
  title: 'Política de Privacidade — TáNaLista',
  description: 'Como a TáNaLista coleta, usa e protege seus dados pessoais.',
}

export default function PrivacidadePage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Política de Privacidade</h1>
        <p className="text-sm text-white/40">Última atualização: junho de 2025</p>
      </div>

      <Section title="1. Controlador dos Dados">
        <p>
          A TáNaLista é responsável pelo tratamento dos seus dados pessoais conforme descrito nesta Política,
          em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
        </p>
      </Section>

      <Section title="2. Dados que Coletamos">
        <p>Coletamos os seguintes dados pessoais:</p>
        <ul>
          <li><strong className="text-white/80">Cadastro:</strong> nome completo, e-mail, senha (armazenada com hash), telefone (opcional), cidade, foto de perfil (opcional), @username.</li>
          <li><strong className="text-white/80">Eventos:</strong> dados de eventos que você cria ou participa, incluindo histórico de inscrições e pagamentos.</li>
          <li><strong className="text-white/80">Pagamentos:</strong> dados de transações processadas. Dados de cartão são tratados diretamente pelo gateway de pagamento e nunca armazenados em nossos servidores.</li>
          <li><strong className="text-white/80">Uso:</strong> logs de acesso, endereço IP, dispositivo e navegador utilizados.</li>
          <li><strong className="text-white/80">Comunicações:</strong> mensagens enviadas pelo mural de eventos.</li>
        </ul>
      </Section>

      <Section title="3. Como Usamos seus Dados">
        <ul>
          <li>Criar e gerenciar sua conta.</li>
          <li>Processar inscrições e pagamentos em eventos.</li>
          <li>Enviar notificações sobre eventos (lembretes, confirmações, cancelamentos).</li>
          <li>Calcular e exibir receitas no painel financeiro do organizador.</li>
          <li>Melhorar a plataforma com base no comportamento agregado dos usuários.</li>
          <li>Cumprir obrigações legais e fiscais.</li>
          <li>Prevenir fraudes e abusos.</li>
        </ul>
      </Section>

      <Section title="4. Base Legal do Tratamento">
        <ul>
          <li><strong className="text-white/80">Execução de contrato:</strong> dados necessários para prestar o serviço.</li>
          <li><strong className="text-white/80">Legítimo interesse:</strong> segurança, prevenção de fraudes, melhoria do serviço.</li>
          <li><strong className="text-white/80">Consentimento:</strong> notificações opcionais (push, e-mail marketing).</li>
          <li><strong className="text-white/80">Obrigação legal:</strong> registros fiscais e de auditoria.</li>
        </ul>
      </Section>

      <Section title="5. Compartilhamento de Dados">
        <p>Seus dados podem ser compartilhados com:</p>
        <ul>
          <li><strong className="text-white/80">Outros usuários:</strong> nome, @username e foto de perfil são visíveis para outros usuários da plataforma conforme as configurações de privacidade.</li>
          <li><strong className="text-white/80">Gateway de pagamento:</strong> dados necessários para processar transações.</li>
          <li><strong className="text-white/80">Provedores de infraestrutura:</strong> hospedagem, banco de dados e envio de e-mails (apenas para prestação do serviço).</li>
          <li>Não vendemos seus dados a terceiros.</li>
        </ul>
      </Section>

      <Section title="6. Retenção de Dados">
        <ul>
          <li>Dados de conta: mantidos enquanto a conta estiver ativa.</li>
          <li>Dados de pagamento: mantidos por 5 anos conforme legislação fiscal.</li>
          <li>Logs de acesso: mantidos por 6 meses.</li>
          <li>Após encerramento da conta: dados são anonimizados em até 30 dias, exceto onde exigido por lei.</li>
        </ul>
      </Section>

      <Section title="7. Seus Direitos (LGPD)">
        <p>Você tem direito a:</p>
        <ul>
          <li>Confirmar a existência de tratamento dos seus dados.</li>
          <li>Acessar seus dados pessoais.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Solicitar a portabilidade dos seus dados.</li>
          <li>Revogar consentimento para tratamentos baseados em consentimento.</li>
          <li>Solicitar o encerramento da conta e exclusão dos dados.</li>
        </ul>
        <p>Para exercer seus direitos, entre em contato: <a href="mailto:privacidade@tanalista.com.br">privacidade@tanalista.com.br</a></p>
      </Section>

      <Section title="8. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (TLS),
          autenticação segura, controles de acesso por função e auditoria de ações sensíveis.
          Em caso de incidente de segurança, notificaremos os usuários afetados conforme exigido pela LGPD.
        </p>
      </Section>

      <Section title="9. Cookies e Tecnologias Similares">
        <p>
          Utilizamos cookies essenciais para manter sua sessão autenticada. Não utilizamos cookies de rastreamento
          ou publicidade de terceiros.
        </p>
      </Section>

      <Section title="10. Crianças e Adolescentes">
        <p>
          Nosso serviço é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.
          Se identificarmos uma conta criada por menor, ela será encerrada.
        </p>
      </Section>

      <Section title="11. Alterações nesta Política">
        <p>
          Podemos atualizar esta Política periodicamente. Notificaremos usuários sobre mudanças relevantes.
          A data de atualização no topo desta página indica a versão vigente.
        </p>
      </Section>

      <Section title="12. Contato">
        <p>
          Para questões de privacidade:{' '}
          <a href="mailto:privacidade@tanalista.com.br">privacidade@tanalista.com.br</a>
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
