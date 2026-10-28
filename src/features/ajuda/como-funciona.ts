// Conteúdo da página "Como funciona", num lugar só: o site renderiza em
// /como-funciona e o app busca o mesmo conteúdo em /api/v1/como-funciona.
// Mudou uma regra (taxa, prazo, limite)? Atualize aqui: os números abaixo
// seguem o código de src/lib/mercadopago.ts (calculateFees),
// src/features/carteira/wallet.ts, src/features/marketplace/actions.ts e os
// jobs do pg_cron (event-min-check, event-auto-complete).

export const CONTACT_EMAIL = 'contato@tanalista.app'

export type HowItWorksBlock =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'table'; head: [string, string]; rows: [string, string][] }

export type HowItWorksSection = {
  id: string
  title: string
  summary: string
  blocks: HowItWorksBlock[]
}

export const HOW_IT_WORKS: HowItWorksSection[] = [
  {
    id: 'visao-geral',
    title: 'O que é o TáNaLista',
    summary: 'Eventos em grupo com inscrição e pagamento confirmados.',
    blocks: [
      {
        type: 'p',
        text: 'O TáNaLista organiza eventos em grupo, como a pelada da semana, um churrasco, um torneio ou um jogo de airsoft. O organizador publica o evento e cada pessoa se inscreve e paga pelo próprio app. A lista de quem vai se monta sozinha, sem planilha e sem cobrar ninguém pelo WhatsApp.',
      },
      {
        type: 'p',
        text: 'Você usa a mesma conta no app (Android e iPhone) e no site tanalista.app.',
      },
    ],
  },
  {
    id: 'cadastro',
    title: 'Criar sua conta',
    summary: 'Cadastro por e-mail ou Google e perfil em poucos passos.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Toque em "Criar conta" e cadastre-se com e-mail e senha ou entre com o Google.',
          'No cadastro por e-mail, confirme pelo link que chega na sua caixa de entrada. Contas que nunca são confirmadas são apagadas depois de 7 dias.',
          'Complete o perfil: nome, @usuário (seu endereço público no app), cidade e WhatsApp.',
          'Pronto: você já pode procurar eventos, entrar em grupos e criar os seus.',
        ],
      },
      {
        type: 'tip',
        text: 'Em Perfil > Notificações você escolhe como quer ser avisado: no app, no navegador e por e-mail.',
      },
    ],
  },
  {
    id: 'encontrar',
    title: 'Encontrar eventos e grupos',
    summary: 'Eventos e grupos públicos perto de você.',
    blocks: [
      {
        type: 'list',
        items: [
          'Eventos: a aba Eventos lista os eventos abertos ao público, com busca e filtros por categoria, cidade e data.',
          'Grupos: em Grupos > Descobrir estão os grupos públicos. Entre nos que combinam com você para ser avisado dos próximos eventos.',
          'Links: todo evento e todo grupo tem um link para compartilhar, por WhatsApp ou onde preferir. Quem recebe vê os detalhes mesmo sem ter conta.',
          'Eventos privados aparecem na lista, mas a inscrição depende de aprovação do organizador ou de um link de convite.',
        ],
      },
    ],
  },
  {
    id: 'participar',
    title: 'Participar de um evento',
    summary: 'Da inscrição ao check-in.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Abra o evento e confira data, local, valor, vagas, mínimo de participantes, regras e política de cancelamento.',
          'Toque em "Participar". Se o evento tiver times, escolha o seu.',
          'Evento gratuito: a inscrição é confirmada na hora.',
          'Evento pago: escolha PIX, cartão de crédito ou saldo da carteira. O PIX vale por 30 minutos e a confirmação chega sozinha assim que o banco aprova. Tem cupom? Informe antes de pagar.',
          'Evento privado: sua inscrição vira um pedido. Você é avisado quando o organizador aprovar.',
          'Inscrito, você recebe um ingresso com QR code, que o organizador lê na entrada (check-in).',
        ],
      },
      {
        type: 'p',
        text: 'Na página do evento você também pode adicionar ao calendário, conversar no mural, votar nas enquetes, ver quem vai e, depois do evento, enviar fotos e avaliá-lo.',
      },
      {
        type: 'tip',
        text: 'Quem participa paga só o valor do evento. As taxas do serviço saem da parte do organizador.',
      },
    ],
  },
  {
    id: 'fila',
    title: 'Evento lotado: fila de espera',
    summary: 'Quando abre uma vaga, o próximo da fila é chamado.',
    blocks: [
      {
        type: 'list',
        items: [
          'Com o evento lotado, você pode entrar na fila de espera. Ela tem 10% do tamanho do evento, com no mínimo 1 lugar.',
          'Quando alguém cancela, o primeiro da fila é avisado e tem 3 horas para confirmar a vaga (e pagar, se o evento for pago).',
          'Se não confirmar a tempo, a vaga passa para o próximo.',
        ],
      },
    ],
  },
  {
    id: 'cancelar-inscricao',
    title: 'Cancelar sua inscrição',
    summary: 'Depende da política do evento. O valor volta para a carteira.',
    blocks: [
      {
        type: 'p',
        text: 'Cada evento tem uma política de cancelamento, escolhida pelo organizador e mostrada na página do evento:',
      },
      {
        type: 'list',
        items: [
          'Sempre permitido;',
          'Até 24 horas, 48 horas, 72 horas ou 7 dias antes do início;',
          'Não permitido.',
        ],
      },
      {
        type: 'p',
        text: 'Quando o cancelamento é permitido, o valor que você pagou volta inteiro como crédito na sua carteira TáNaLista. Depois que o evento acontece, a inscrição não pode mais ser cancelada.',
      },
    ],
  },
  {
    id: 'confirmacao-automatica',
    title: 'Confirmação ou cancelamento automático',
    summary: 'O mínimo de participantes é conferido 12 horas antes.',
    blocks: [
      {
        type: 'p',
        text: 'Todo evento tem um mínimo de participantes. O TáNaLista confere esse número sozinho, 12 horas antes do início:',
      },
      {
        type: 'list',
        items: [
          'Atingiu o mínimo: o evento é confirmado e todos são avisados.',
          'Não atingiu: o evento é cancelado automaticamente, cada inscrito recebe de volta o que pagou como crédito na carteira, e todos são avisados.',
        ],
      },
      {
        type: 'p',
        text: 'Duas horas depois do início, o evento confirmado passa a constar como concluído.',
      },
      {
        type: 'table',
        head: ['Situação', 'O que significa'],
        rows: [
          ['Aberto', 'Inscrições abertas, aguardando a conferência do mínimo.'],
          ['Confirmado', 'Atingiu o mínimo. Vai acontecer.'],
          ['Concluído', 'Já aconteceu.'],
          ['Cancelado', 'Não vai acontecer. Quem pagou recebeu o valor na carteira.'],
          ['Rascunho', 'Ainda não publicado. Só o organizador vê.'],
        ],
      },
    ],
  },
  {
    id: 'criar-evento',
    title: 'Criar e organizar um evento',
    summary: 'Do rascunho ao check-in, passo a passo.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Toque em "Criar evento" e escolha onde ele fica: num grupo em que você é dono ou gestor, ou avulso, sem grupo.',
          'Preencha título, descrição, categoria, endereço, cidade, início, término e prazo de inscrição.',
          'Defina o valor por pessoa (R$ 0 para evento gratuito), a capacidade e o mínimo de participantes.',
          'Escolha a visibilidade (público ou privado), a política de cancelamento e, se quiser, o número de times.',
          'Se você também vai jogar, marque "Organizador isento" para participar sem pagar.',
          'Repete toda semana? Use "Repetir evento" para criar as próximas edições de uma vez (semanal, quinzenal ou mensal).',
          'Salve como rascunho ou publique. Ao publicar dentro de um grupo, os membros são avisados.',
        ],
      },
      {
        type: 'p',
        text: 'Depois de publicado, no painel "Gerenciar evento" você:',
      },
      {
        type: 'list',
        items: [
          'Acompanha inscritos, pagamentos e fila de espera, e exporta a lista;',
          'Aprova pedidos de entrada (eventos privados) e gera o link de convite;',
          'Faz o check-in lendo o QR code do ingresso de cada pessoa;',
          'Cria cupons de desconto e organiza os times;',
          'Envia uma mensagem para todos os inscritos, edita as regras e troca a capa;',
          'Duplica o evento ou cria a próxima edição com os mesmos dados.',
        ],
      },
      {
        type: 'p',
        text: 'Se precisar cancelar, use "Cancelar evento" e digite CANCELAR para confirmar. Todos os inscritos são avisados e recebem de volta o que pagaram, como crédito na carteira.',
      },
    ],
  },
  {
    id: 'grupos',
    title: 'Grupos',
    summary: 'A turma que se encontra sempre, num lugar só.',
    blocks: [
      {
        type: 'p',
        text: 'Um grupo reúne quem participa dos mesmos eventos: a turma do futebol, um clube, um time de airsoft, os amigos do churrasco. Os eventos do grupo ficam juntos, e os membros são avisados de cada evento novo.',
      },
      {
        type: 'list',
        items: [
          'Público: qualquer pessoa encontra o grupo e entra na hora.',
          'Privado: a pessoa pede para entrar e o dono aprova, ou entra pelo link de convite.',
          'Criam eventos no grupo o dono e os gestores. O dono promove um membro a gestor (e o volta a membro) na lista de membros.',
          'O gestor edita os próprios eventos. O dono edita e cancela qualquer evento do grupo.',
          'O dono edita o grupo, aprova pedidos, remove membros, transfere a posse e cria cupons que valem para os eventos do grupo.',
          'O dono pode mandar uma mensagem para todos os membros (até 500 caracteres). Ela chega como notificação e por e-mail.',
        ],
      },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace do grupo',
    summary: 'Compra, venda, troca e aluguel entre membros.',
    blocks: [
      {
        type: 'p',
        text: 'Cada grupo tem um marketplace só dos membros, para anunciar equipamento, uniforme, carona ou serviços.',
      },
      {
        type: 'list',
        items: [
          'Tipos de anúncio: venda, aluguel, procuro comprar, empréstimo, troca, doação e serviço.',
          'Até 5 fotos por anúncio, com preço (ou "a combinar"), formas de pagamento aceitas e contato.',
          'Publicar custa R$ 1,00, debitado da carteira. O anúncio fica no ar por 30 dias.',
          'Sem saldo, o anúncio fica salvo como rascunho até você publicar.',
          'Cada pessoa pode ter até 5 anúncios ativos por grupo.',
        ],
      },
      {
        type: 'tip',
        text: 'A negociação e o pagamento são combinados entre vocês. O TáNaLista não intermedeia vendas do marketplace.',
      },
    ],
  },
  {
    id: 'dinheiro',
    title: 'Para onde vai o dinheiro',
    summary: 'Do pagamento do participante ao PIX do organizador.',
    blocks: [
      {
        type: 'steps',
        items: [
          'O participante paga a inscrição por PIX, cartão ou carteira. Os pagamentos são processados pelo Mercado Pago.',
          'O valor fica guardado na plataforma até o evento. É isso que permite devolver o dinheiro na hora se o evento for cancelado.',
          'Depois que o evento começa, o organizador abre Financeiro e toca em "Resgatar receita". O valor líquido (já sem as taxas) entra na carteira dele.',
          'Da carteira, o organizador pede o saque por PIX para a própria chave. A transferência é feita em até 2 dias úteis.',
        ],
      },
      {
        type: 'p',
        text: 'Saques vão de R$ 5,00 a R$ 5.000,00 por pedido, sem taxa. É preciso informar o CPF do titular e a chave PIX.',
      },
    ],
  },
  {
    id: 'taxas',
    title: 'Quanto custa',
    summary: 'Criar conta, grupos e eventos gratuitos não custa nada.',
    blocks: [
      {
        type: 'p',
        text: 'Usar o TáNaLista é gratuito. Só há cobrança sobre inscrições pagas, e quem paga a taxa é o organizador, descontada da receita do evento:',
      },
      {
        type: 'table',
        head: ['Forma de pagamento', 'Taxa sobre cada inscrição'],
        rows: [
          ['PIX ou carteira', '6,98% (5,99% do serviço + 0,99% de processamento)'],
          ['Cartão de crédito', '8,98% (5,99% do serviço + 2,99% de processamento)'],
          ['Evento gratuito', 'Sem taxa'],
        ],
      },
      {
        type: 'p',
        text: 'Exemplo: numa inscrição de R$ 100,00 paga por PIX, o organizador recebe R$ 93,02. Paga por cartão, recebe R$ 91,02.',
      },
      {
        type: 'table',
        head: ['Outros valores', 'Custo'],
        rows: [
          ['Recarga da carteira por PIX', 'Sem taxa'],
          ['Recarga da carteira por cartão', '3% à vista ou 5% parcelado, descontados do valor creditado'],
          ['Saque por PIX', 'Sem taxa'],
          ['Anúncio no marketplace', 'R$ 1,00 por 30 dias'],
        ],
      },
    ],
  },
  {
    id: 'carteira',
    title: 'Carteira e cupons',
    summary: 'Seu saldo no TáNaLista.',
    blocks: [
      {
        type: 'list',
        items: [
          'Entram na carteira: recargas, reembolsos de eventos cancelados, cupons de crédito e, para quem organiza, a receita resgatada dos eventos.',
          'O saldo paga inscrições e anúncios do marketplace, e pode ser sacado por PIX.',
          'Cupom de desconto: vale num evento ou em todos os eventos de um grupo. Informe o código na hora de pagar.',
          'Cupom de crédito: adiciona saldo à carteira. Resgate em Carteira > "Tenho um cupom".',
          'Todas as entradas e saídas ficam no histórico da carteira.',
        ],
      },
    ],
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    summary: 'Você fica sabendo de tudo que importa.',
    blocks: [
      {
        type: 'p',
        text: 'Os avisos aparecem no sino do app e do site, como notificação no celular e no navegador e, conforme sua preferência, por e-mail. Você é avisado quando:',
      },
      {
        type: 'list',
        items: [
          'um evento em que você está inscrito é confirmado, alterado ou cancelado;',
          'falta cerca de um dia para um evento em que você está inscrito (lembrete na véspera);',
          'sai um evento novo num grupo seu;',
          'abre uma vaga para você na fila de espera;',
          'o organizador ou o dono do grupo manda uma mensagem;',
          'seu pedido para entrar num evento ou grupo é respondido;',
          'você recebe um reembolso.',
        ],
      },
      {
        type: 'tip',
        text: 'Ajuste o que recebe em Perfil > Notificações.',
      },
    ],
  },
  {
    id: 'conta',
    title: 'Sua conta e seus dados',
    summary: 'Privacidade, exclusão e contato.',
    blocks: [
      {
        type: 'list',
        items: [
          'Seu telefone e seu e-mail não aparecem no seu perfil público.',
          'Você pode excluir sua conta a qualquer momento, pelo app (Perfil > Excluir minha conta) ou pelo site.',
          `Dúvidas, sugestões ou problemas: escreva para ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
]
