// Script de seed demo — TáNaLista
// Executar: node scripts/seed-demo.mjs
//
// PARA LIMPAR depois do vídeo, rode: node scripts/seed-demo.mjs --clean

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ekisdxnhovruhhvdvefh.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Defina SUPABASE_SERVICE_ROLE_KEY no ambiente')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── DADOS ───────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'ana.silva@demo.tanalista.test',       full_name: 'Ana Carolina Silva',      username: 'ana_carolina',   bio: 'Corredora e apaixonada por eventos ao ar livre. Maratonista amadora desde 2019.',          city: 'São Paulo' },
  { email: 'bruno.oliveira@demo.tanalista.test',  full_name: 'Bruno Henrique Oliveira', username: 'bruno_oliveira', bio: 'Desenvolvedor de software, entusiasta de cerveja artesanal e tecnologia.',               city: 'São Paulo' },
  { email: 'camila.santos@demo.tanalista.test',   full_name: 'Camila Santos Ferreira',  username: 'camila_santos',  bio: 'Fotógrafa freelancer. Amo capturar momentos únicos em eventos e viagens.',               city: 'Rio de Janeiro' },
  { email: 'diego.alves@demo.tanalista.test',     full_name: 'Diego Alves Rodrigues',   username: 'diego_alves',    bio: 'Músico e produtor musical. Jazz, blues e MPB são minha paixão.',                         city: 'São Paulo' },
  { email: 'elisa.mendes@demo.tanalista.test',    full_name: 'Elisa Mendes Costa',      username: 'elisa_mendes',   bio: 'Professora de yoga e meditação. Bem-estar é meu estilo de vida.',                        city: 'Belo Horizonte' },
  { email: 'fabio.lima@demo.tanalista.test',      full_name: 'Fábio Lima Pereira',      username: 'fabio_lima',     bio: 'Chef de cozinha e blogueiro gastronômico. Culinária italiana é especialidade.',           city: 'Curitiba' },
  { email: 'gabriela.rocha@demo.tanalista.test',  full_name: 'Gabriela Rocha Martins',  username: 'gabriela_rocha', bio: 'Dançarina e professora de forró e samba de gafieira. 12 anos de experiência.',            city: 'São Paulo' },
  { email: 'henrique.souza@demo.tanalista.test',  full_name: 'Henrique Souza Barbosa',  username: 'henrique_souza', bio: 'Guia de trilhas certificado. Conheço cada sentiero do Rio de Janeiro.',                  city: 'Rio de Janeiro' },
  { email: 'isabela.carvalho@demo.tanalista.test',full_name: 'Isabela Carvalho Gomes',  username: 'isabela_carv',   bio: 'Nutricionista e entusiasta de gastronomia saudável. Amo eventos foodie.',                 city: 'São Paulo' },
  { email: 'joao.pedro@demo.tanalista.test',      full_name: 'João Pedro Nascimento',   username: 'joao_pedro',     bio: 'Surfista desde os 14 anos. Floripa é minha casa, o mar é minha vida.',                   city: 'Florianópolis' },
  { email: 'karla.teixeira@demo.tanalista.test',  full_name: 'Karla Teixeira Moreira',  username: 'karla_teixeira', bio: 'Jornalista cultural, crítica musical e fã número 1 de jazz brasileiro.',                 city: 'São Paulo' },
  { email: 'leonardo.cardoso@demo.tanalista.test',full_name: 'Leonardo Cardoso Araújo', username: 'leo_cardoso',    bio: 'Mestre cervejeiro e sócio de microcervejaria. Fundador do Cervejeiros Artesanais.',       city: 'Porto Alegre' },
  { email: 'mariana.correia@demo.tanalista.test', full_name: 'Mariana Correia Santos',  username: 'mari_correia',   bio: 'Cineasta independente e curadora de cinema cult. Godard e Kubrick forever.',              city: 'São Paulo' },
  { email: 'nicolas.castro@demo.tanalista.test',  full_name: 'Nicolas Castro Ramos',    username: 'nicolas_castro', bio: 'Street photographer. Urbano e irreverente, câmera sempre no pescoço.',                   city: 'Rio de Janeiro' },
  { email: 'olivia.fernandes@demo.tanalista.test',full_name: 'Olivia Fernandes Nunes',  username: 'olivia_fern',    bio: 'Empreendedora serial, 3 startups no currículo. Mentora de novos fundadores.',             city: 'São Paulo' },
  { email: 'paulo.campos@demo.tanalista.test',    full_name: 'Paulo Ricardo Campos',    username: 'paulo_campos',   bio: 'Engenheiro de dados e apaixonado por trilhas e montanhismo.',                            city: 'Belo Horizonte' },
  { email: 'quesia.pinto@demo.tanalista.test',    full_name: 'Quésia Pinto Rocha',      username: 'quesia_pinto',   bio: 'Designer UX/UI, corredora de 10K e fã de eventos culturais.',                           city: 'São Paulo' },
  { email: 'rafael.cunha@demo.tanalista.test',    full_name: 'Rafael Cunha Melo',       username: 'rafael_cunha',   bio: 'DJ e produtor musical. Sets de jazz e soul nos melhores bares de SP.',                  city: 'Rio de Janeiro' },
  { email: 'sara.machado@demo.tanalista.test',    full_name: 'Sara Machado Cavalcanti', username: 'sara_machado',   bio: 'Médica, praticante de yoga e admiradora da gastronomia japonesa.',                       city: 'São Paulo' },
  { email: 'thiago.lopes@demo.tanalista.test',    full_name: 'Thiago Lopes Vieira',     username: 'thiago_lopes',   bio: 'Sommelier de cervejas, homebrewer há 8 anos. Curitiba tem a melhor cena craft.',          city: 'Curitiba' },
  { email: 'ursula.borges@demo.tanalista.test',   full_name: 'Úrsula Borges Freitas',   username: 'ursula_borges',  bio: 'Arquiteta e fotógrafa urbana. Amo documentar a transformação das cidades.',              city: 'São Paulo' },
  { email: 'vinicius.andrade@demo.tanalista.test',full_name: 'Vinícius Andrade Dias',   username: 'vinicius_andr',  bio: 'Personal trainer e corredor de maratona. 42km me completam.',                           city: 'Rio de Janeiro' },
  { email: 'wanderlei.fig@demo.tanalista.test',   full_name: 'Wanderlei Figueiredo',    username: 'wanderlei_fig',  bio: 'Empreendedor no setor de eventos, produtor cultural há 15 anos.',                        city: 'São Paulo' },
  { email: 'ximena.azevedo@demo.tanalista.test',  full_name: 'Ximena Azevedo Batista',  username: 'ximena_azevedo', bio: 'Instrutora de meditação mindfulness e professora de pilates.',                          city: 'Belo Horizonte' },
  { email: 'yara.monteiro@demo.tanalista.test',   full_name: 'Yara Monteiro Vasconcelos',username: 'yara_monteiro', bio: 'Marketing digital, growth hacker e entusiasta de eventos tech.',                        city: 'São Paulo' },
  { email: 'zeca.marques@demo.tanalista.test',    full_name: 'Zeca Marques Cruz',       username: 'zeca_marques',   bio: 'Músico e produtor de eventos culturais no Rio. Trilha sonora da cidade.',               city: 'Rio de Janeiro' },
  { email: 'adriana.fonseca@demo.tanalista.test', full_name: 'Adriana Fonseca Paiva',   username: 'adriana_fonseca',bio: 'Nutricionista clínica e apaixonada por culinária funcional e eventos gastronômicos.',    city: 'São Paulo' },
  { email: 'bernardo.tavares@demo.tanalista.test',full_name: 'Bernardo Tavares Silva',   username: 'bernardo_tav',   bio: 'Desenvolvedor mobile, ciclista urbano e homebrewer iniciante.',                          city: 'Curitiba' },
  { email: 'claudia.pires@demo.tanalista.test',   full_name: 'Cláudia Pires Oliveira',  username: 'claudia_pires',  bio: 'Publicitária, dançarina amadora de salsa e forró desde 2015.',                          city: 'São Paulo' },
  { email: 'daniel.rezende@demo.tanalista.test',  full_name: 'Daniel Rezende Ferreira', username: 'daniel_rezende', bio: 'Diretor de fotografia e documentarista. RJ é meu palco.',                              city: 'Rio de Janeiro' },
  { email: 'eduarda.matos@demo.tanalista.test',   full_name: 'Eduarda Matos Rodrigues', username: 'eduarda_matos',  bio: 'Estudante de gastronomia, confeiteira e viciada em eventos de culinária.',              city: 'São Paulo' },
  { email: 'fernando.braga@demo.tanalista.test',  full_name: 'Fernando Braga Costa',    username: 'fernando_braga', bio: 'CTO de startup fintech, palestrante de tecnologia e mentor de devs júnior.',            city: 'Belo Horizonte' },
  { email: 'giovana.moura@demo.tanalista.test',   full_name: 'Giovana Moura Pereira',   username: 'giovana_moura',  bio: 'Atriz e diretora teatral, cinéfila inveterada e fã de Bergman.',                        city: 'São Paulo' },
  { email: 'hugo.santana@demo.tanalista.test',    full_name: 'Hugo Santana Florêncio',  username: 'hugo_santana',   bio: 'Instrutor de surf e praticante de stand-up paddle. Mar e montanha.',                    city: 'Florianópolis' },
  { email: 'ingrid.coelho@demo.tanalista.test',   full_name: 'Ingrid Coelho Barbosa',   username: 'ingrid_coelho',  bio: 'Advogada, corredora de meia maratona e amante de vinhos naturais.',                    city: 'São Paulo' },
  { email: 'julia.medeiros@demo.tanalista.test',  full_name: 'Júlia Medeiros Gama',     username: 'julia_medeiros', bio: 'Violinista clássica reconvertida ao jazz. Toco em bares e festivais de SP.',            city: 'Rio de Janeiro' },
  { email: 'kevin.nogueira@demo.tanalista.test',  full_name: 'Kevin Nogueira Lira',     username: 'kevin_nogueira', bio: 'Engenheiro de software, CTF player e fã de hackathons.',                               city: 'São Paulo' },
  { email: 'laura.esteves@demo.tanalista.test',   full_name: 'Laura Esteves Prado',     username: 'laura_esteves',  bio: 'Sommelier de café especial. Curitiba tem o melhor cenário de specialty coffee.',       city: 'Curitiba' },
  { email: 'matheus.leite@demo.tanalista.test',   full_name: 'Matheus Leite Guedes',    username: 'matheus_leite',  bio: 'Triatleta amador, nutricionista esportivo e atleta de fim de semana.',                  city: 'São Paulo' },
  { email: 'natalia.brandt@demo.tanalista.test',  full_name: 'Natalia Brandt Kauer',    username: 'natalia_brandt', bio: 'Cervejeira e embaixadora de marcas craft na região Sul. Mestra em lúpulo.',            city: 'Porto Alegre' },
  { email: 'otavio.sousa@demo.tanalista.test',    full_name: 'Otávio Sousa Drummond',   username: 'otavio_sousa',   bio: 'Empreendedor, investidor anjo e apaixonado por metodologias ágeis.',                   city: 'São Paulo' },
  { email: 'priscila.mag@demo.tanalista.test',    full_name: 'Priscila Magalhães Brum', username: 'priscila_mag',   bio: 'Fotógrafa documental, especialista em fotografia de rua e retratos urbanos.',          city: 'Rio de Janeiro' },
  { email: 'quirino.bueno@demo.tanalista.test',   full_name: 'Quirino Bueno Falcão',    username: 'quirino_bueno',  bio: 'Historiador e cineasta, curador de acervos cinematográficos raros.',                   city: 'São Paulo' },
  { email: 'renata.sampaio@demo.tanalista.test',  full_name: 'Renata Sampaio Vilaça',   username: 'renata_sampaio', bio: 'Professora de dança, coreógrafa e organizadora de festivais de samba.',               city: 'Belo Horizonte' },
  { email: 'sergio.tenorio@demo.tanalista.test',  full_name: 'Sérgio Tenório Paixão',   username: 'sergio_tenorio', bio: 'CTO, dev full-stack e evangelista de open source. GitHub é meu portfólio.',           city: 'São Paulo' },
  { email: 'tatiana.werneck@demo.tanalista.test', full_name: 'Tatiana Werneck Freire',  username: 'tatiana_werneck',bio: 'Jornalista, podcast host e documentarista de cenas culturais urbanas.',               city: 'Rio de Janeiro' },
  { email: 'ugo.bernardes@demo.tanalista.test',   full_name: 'Ugo Bernardes Maia',      username: 'ugo_bernardes',  bio: 'Product manager, ávido leitor e praticante de meditação zen.',                        city: 'São Paulo' },
  { email: 'valentina.godoy@demo.tanalista.test', full_name: 'Valentina Godoy Sena',    username: 'valentina_godoy',bio: 'Designer gráfica, ilustradora e organizadora de workshops criativos.',                city: 'Curitiba' },
  { email: 'wellington.sq@demo.tanalista.test',   full_name: 'Wellington Siqueira Porto',username: 'wellington_sq', bio: 'Triatleta, personal trainer e especialista em performance esportiva.',                 city: 'São Paulo' },
  { email: 'zilda.amaral@demo.tanalista.test',    full_name: 'Zilda Amaral Penteado',   username: 'zilda_amaral',   bio: 'Professora aposentada, corredora de 70 anos que inspira a todos no grupo.',           city: 'São Paulo' },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString()
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString()
}
function hoursFromNow(n) {
  const d = new Date(); d.setHours(d.getHours() + n); return d.toISOString()
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function clean() {
  console.log('🧹 Limpando dados demo...')
  const { data: demoUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const ids = (demoUsers?.users ?? [])
    .filter(u => u.email?.endsWith('@demo.tanalista.test'))
    .map(u => u.id)

  if (ids.length === 0) { console.log('Nenhum dado demo encontrado.'); return }

  await supabase.from('marketplace_listings').delete().in('user_id', ids)
  await supabase.from('participations').delete().in('user_id', ids)
  await supabase.from('events').delete().in('organizer_id', ids)
  await supabase.from('group_members').delete().in('user_id', ids)
  await supabase.from('groups').delete().in('owner_id', ids)
  for (const id of ids) {
    await supabase.auth.admin.deleteUser(id)
  }
  console.log(`✅ ${ids.length} usuários demo e todos os dados relacionados removidos.`)
}

async function seed() {
  console.log('🌱 Iniciando seed demo...\n')

  // 1. Criar usuários
  console.log('👤 Criando 50 usuários...')
  const userIds = {}
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: 'Demo2026!',
      email_confirm: true,
      user_metadata: { full_name: u.full_name }
    })
    if (error) { console.error(`  ❌ ${u.email}: ${error.message}`); continue }
    userIds[u.email] = data.user.id

    // Atualizar perfil (o trigger cria um básico, precisamos completar)
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: u.full_name,
      username: u.username,
      bio: u.bio,
      city: u.city,
      onboarding_completed: true,
    }, { onConflict: 'id' })

    process.stdout.write('.')
  }
  console.log(`\n  ✅ ${Object.keys(userIds).length} usuários criados\n`)

  // Atalhos por índice
  const u = (email) => userIds[email]
  const u01 = u('ana.silva@demo.tanalista.test')
  const u02 = u('bruno.oliveira@demo.tanalista.test')
  const u03 = u('camila.santos@demo.tanalista.test')
  const u04 = u('diego.alves@demo.tanalista.test')
  const u05 = u('elisa.mendes@demo.tanalista.test')
  const u06 = u('fabio.lima@demo.tanalista.test')
  const u07 = u('gabriela.rocha@demo.tanalista.test')
  const u08 = u('henrique.souza@demo.tanalista.test')
  const u09 = u('isabela.carvalho@demo.tanalista.test')
  const u10 = u('joao.pedro@demo.tanalista.test')
  const u11 = u('karla.teixeira@demo.tanalista.test')
  const u12 = u('leonardo.cardoso@demo.tanalista.test')
  const u13 = u('mariana.correia@demo.tanalista.test')
  const u14 = u('nicolas.castro@demo.tanalista.test')
  const u15 = u('olivia.fernandes@demo.tanalista.test')
  const u16 = u('paulo.campos@demo.tanalista.test')
  const u17 = u('quesia.pinto@demo.tanalista.test')
  const u18 = u('rafael.cunha@demo.tanalista.test')
  const u19 = u('sara.machado@demo.tanalista.test')
  const u20 = u('thiago.lopes@demo.tanalista.test')
  const u21 = u('ursula.borges@demo.tanalista.test')
  const u22 = u('vinicius.andrade@demo.tanalista.test')
  const u23 = u('wanderlei.fig@demo.tanalista.test')
  const u24 = u('ximena.azevedo@demo.tanalista.test')
  const u25 = u('yara.monteiro@demo.tanalista.test')
  const u26 = u('zeca.marques@demo.tanalista.test')
  const u27 = u('adriana.fonseca@demo.tanalista.test')
  const u28 = u('bernardo.tavares@demo.tanalista.test')
  const u29 = u('claudia.pires@demo.tanalista.test')
  const u30 = u('daniel.rezende@demo.tanalista.test')
  const u31 = u('eduarda.matos@demo.tanalista.test')
  const u32 = u('fernando.braga@demo.tanalista.test')
  const u33 = u('giovana.moura@demo.tanalista.test')
  const u34 = u('hugo.santana@demo.tanalista.test')
  const u35 = u('ingrid.coelho@demo.tanalista.test')
  const u36 = u('julia.medeiros@demo.tanalista.test')
  const u37 = u('kevin.nogueira@demo.tanalista.test')
  const u38 = u('laura.esteves@demo.tanalista.test')
  const u39 = u('matheus.leite@demo.tanalista.test')
  const u40 = u('natalia.brandt@demo.tanalista.test')
  const u41 = u('otavio.sousa@demo.tanalista.test')
  const u42 = u('priscila.mag@demo.tanalista.test')
  const u43 = u('quirino.bueno@demo.tanalista.test')
  const u44 = u('renata.sampaio@demo.tanalista.test')
  const u45 = u('sergio.tenorio@demo.tanalista.test')
  const u46 = u('tatiana.werneck@demo.tanalista.test')
  const u47 = u('ugo.bernardes@demo.tanalista.test')
  const u48 = u('valentina.godoy@demo.tanalista.test')
  const u49 = u('wellington.sq@demo.tanalista.test')
  const u50 = u('zilda.amaral@demo.tanalista.test')

  // 2. Criar grupos
  console.log('👥 Criando 12 grupos...')
  const { data: groups, error: gErr } = await supabase.from('groups').insert([
    { owner_id: u01, name: 'Corredores de SP',         description: 'Grupo para apaixonados por corrida de rua em São Paulo. Treinos coletivos, corridas noturnas e maratonas. Todos os níveis são bem-vindos!', visibility: 'PUBLIC', category: 'Esportes',    city: 'São Paulo',      member_count: 22, slug: 'corredores-de-sp' },
    { owner_id: u06, name: 'Foodie Club Curitiba',     description: 'O melhor grupo gastronômico de Curitiba. Jantares harmonizados, workshops de culinária e muito prazer à mesa.',                            visibility: 'PUBLIC', category: 'Gastronomia', city: 'Curitiba',       member_count: 17, slug: 'foodie-club-curitiba' },
    { owner_id: u03, name: 'Tech & Beers SP',          description: 'Encontros informais de tecnologia regados a boa cerveja. Palestras lightning, networking e troca de experiências.',                         visibility: 'PUBLIC', category: 'Tecnologia',  city: 'São Paulo',      member_count: 31, slug: 'tech-beers-sp' },
    { owner_id: u08, name: 'Trilhas e Natureza RJ',    description: 'Grupo dedicado a trilhas, escaladas e conexão com a natureza no Rio de Janeiro e região serrana.',                                          visibility: 'PUBLIC', category: 'Natureza',    city: 'Rio de Janeiro', member_count: 19, slug: 'trilhas-natureza-rj' },
    { owner_id: u11, name: 'Jazz & Blues Brasil',      description: 'Comunidade de amantes de jazz, blues e soul no Brasil. Shows, jam sessions e debates sobre música.',                                        visibility: 'PUBLIC', category: 'Música',      city: 'São Paulo',      member_count: 28, slug: 'jazz-blues-brasil' },
    { owner_id: u05, name: 'Yoga & Bem-Estar BH',      description: 'Prática de yoga, meditação e respiração consciente em Belo Horizonte. Aulas ao ar livre e retiros.',                                       visibility: 'PUBLIC', category: 'Saúde',       city: 'Belo Horizonte', member_count: 14, slug: 'yoga-bem-estar-bh' },
    { owner_id: u12, name: 'Cervejeiros Artesanais Sul',description: 'A maior comunidade de homebrewers e apreciadores de cervejas artesanais do Sul do Brasil.',                                                visibility: 'PUBLIC', category: 'Gastronomia', city: 'Porto Alegre',   member_count: 24, slug: 'cervejeiros-artesanais-sul' },
    { owner_id: u13, name: 'Cinema Cult SP',           description: 'Cineclube dedicado ao cinema de autor, nouvelle vague e produções independentes. Sessões comentadas e debates.',                            visibility: 'PUBLIC', category: 'Cultura',     city: 'São Paulo',      member_count: 16, slug: 'cinema-cult-sp' },
    { owner_id: u10, name: 'Surfistas de Floripa',     description: 'Comunidade de surfistas, SUPers e amantes do mar em Florianópolis. Sessões de surf e churrascos na praia.',                                visibility: 'PUBLIC', category: 'Esportes',    city: 'Florianópolis',  member_count: 20, slug: 'surfistas-de-floripa' },
    { owner_id: u15, name: 'Empreendedores Digitais',  description: 'Rede de empreendedores, founders e investidores do ecossistema digital brasileiro.',                                                        visibility: 'PUBLIC', category: 'Negócios',    city: 'São Paulo',      member_count: 35, slug: 'empreendedores-digitais' },
    { owner_id: u07, name: 'Dança de Salão SP',        description: 'O grupo mais animado de dança de salão de São Paulo. Forró, gafieira, bolero e zouk.',                                                     visibility: 'PUBLIC', category: 'Cultura',     city: 'São Paulo',      member_count: 21, slug: 'danca-de-salao-sp' },
    { owner_id: u14, name: 'Fotógrafos Urbanos RJ',    description: 'Coletivo de fotografia de rua e documental no Rio de Janeiro. Photo walks e exposições.',                                                   visibility: 'PUBLIC', category: 'Arte',        city: 'Rio de Janeiro', member_count: 18, slug: 'fotografos-urbanos-rj' },
  ]).select('id, name')
  if (gErr) { console.error('❌ Grupos:', gErr.message); return }
  const [g01,g02,g03,g04,g05,g06,g07,g08,g09,g10,g11,g12] = groups.map(g => g.id)
  console.log('  ✅ 12 grupos criados\n')

  // 3. Membros
  console.log('🔗 Adicionando membros...')
  const members = [
    {group_id:g01,user_id:u01,role:'OWNER'},{group_id:g01,user_id:u02,role:'MEMBER'},
    {group_id:g01,user_id:u17,role:'MEMBER'},{group_id:g01,user_id:u22,role:'MEMBER'},
    {group_id:g01,user_id:u35,role:'MEMBER'},{group_id:g01,user_id:u39,role:'MEMBER'},
    {group_id:g01,user_id:u49,role:'MEMBER'},{group_id:g01,user_id:u50,role:'MEMBER'},
    {group_id:g01,user_id:u09,role:'MEMBER'},{group_id:g01,user_id:u19,role:'MEMBER'},
    {group_id:g02,user_id:u06,role:'OWNER'},{group_id:g02,user_id:u20,role:'MEMBER'},
    {group_id:g02,user_id:u28,role:'MEMBER'},{group_id:g02,user_id:u38,role:'MEMBER'},
    {group_id:g02,user_id:u27,role:'MEMBER'},{group_id:g02,user_id:u31,role:'MEMBER'},
    {group_id:g02,user_id:u48,role:'MEMBER'},
    {group_id:g03,user_id:u03,role:'OWNER'},{group_id:g03,user_id:u02,role:'MEMBER'},
    {group_id:g03,user_id:u25,role:'MEMBER'},{group_id:g03,user_id:u32,role:'MEMBER'},
    {group_id:g03,user_id:u37,role:'MEMBER'},{group_id:g03,user_id:u45,role:'MEMBER'},
    {group_id:g03,user_id:u47,role:'MEMBER'},{group_id:g03,user_id:u28,role:'MEMBER'},
    {group_id:g03,user_id:u41,role:'MEMBER'},{group_id:g03,user_id:u04,role:'MEMBER'},
    {group_id:g04,user_id:u08,role:'OWNER'},{group_id:g04,user_id:u14,role:'MEMBER'},
    {group_id:g04,user_id:u26,role:'MEMBER'},{group_id:g04,user_id:u30,role:'MEMBER'},
    {group_id:g04,user_id:u42,role:'MEMBER'},{group_id:g04,user_id:u46,role:'MEMBER'},
    {group_id:g04,user_id:u16,role:'MEMBER'},
    {group_id:g05,user_id:u11,role:'OWNER'},{group_id:g05,user_id:u04,role:'MEMBER'},
    {group_id:g05,user_id:u18,role:'MEMBER'},{group_id:g05,user_id:u26,role:'MEMBER'},
    {group_id:g05,user_id:u36,role:'MEMBER'},{group_id:g05,user_id:u46,role:'MEMBER'},
    {group_id:g05,user_id:u13,role:'MEMBER'},{group_id:g05,user_id:u33,role:'MEMBER'},
    {group_id:g06,user_id:u05,role:'OWNER'},{group_id:g06,user_id:u24,role:'MEMBER'},
    {group_id:g06,user_id:u16,role:'MEMBER'},{group_id:g06,user_id:u44,role:'MEMBER'},
    {group_id:g06,user_id:u19,role:'MEMBER'},
    {group_id:g07,user_id:u12,role:'OWNER'},{group_id:g07,user_id:u20,role:'MEMBER'},
    {group_id:g07,user_id:u28,role:'MEMBER'},{group_id:g07,user_id:u40,role:'MEMBER'},
    {group_id:g07,user_id:u38,role:'MEMBER'},{group_id:g07,user_id:u02,role:'MEMBER'},
    {group_id:g07,user_id:u06,role:'MEMBER'},
    {group_id:g08,user_id:u13,role:'OWNER'},{group_id:g08,user_id:u33,role:'MEMBER'},
    {group_id:g08,user_id:u43,role:'MEMBER'},{group_id:g08,user_id:u11,role:'MEMBER'},
    {group_id:g08,user_id:u46,role:'MEMBER'},{group_id:g08,user_id:u04,role:'MEMBER'},
    {group_id:g09,user_id:u10,role:'OWNER'},{group_id:g09,user_id:u34,role:'MEMBER'},
    {group_id:g09,user_id:u08,role:'MEMBER'},{group_id:g09,user_id:u22,role:'MEMBER'},
    {group_id:g09,user_id:u49,role:'MEMBER'},
    {group_id:g10,user_id:u15,role:'OWNER'},{group_id:g10,user_id:u23,role:'MEMBER'},
    {group_id:g10,user_id:u25,role:'MEMBER'},{group_id:g10,user_id:u32,role:'MEMBER'},
    {group_id:g10,user_id:u41,role:'MEMBER'},{group_id:g10,user_id:u45,role:'MEMBER'},
    {group_id:g10,user_id:u47,role:'MEMBER'},{group_id:g10,user_id:u37,role:'MEMBER'},
    {group_id:g11,user_id:u07,role:'OWNER'},{group_id:g11,user_id:u29,role:'MEMBER'},
    {group_id:g11,user_id:u44,role:'MEMBER'},{group_id:g11,user_id:u19,role:'MEMBER'},
    {group_id:g11,user_id:u33,role:'MEMBER'},{group_id:g11,user_id:u36,role:'MEMBER'},
    {group_id:g12,user_id:u14,role:'OWNER'},{group_id:g12,user_id:u03,role:'MEMBER'},
    {group_id:g12,user_id:u21,role:'MEMBER'},{group_id:g12,user_id:u30,role:'MEMBER'},
    {group_id:g12,user_id:u42,role:'MEMBER'},{group_id:g12,user_id:u46,role:'MEMBER'},
  ].filter(m => m.group_id && m.user_id)
  const { error: mErr } = await supabase.from('group_members').insert(members)
  if (mErr) console.error('  ⚠️  Membros:', mErr.message)
  else console.log('  ✅ Membros adicionados\n')

  // 4. Eventos
  console.log('📅 Criando 25 eventos...')
  const mkEvent = (o) => ({
    ...o,
    waitlist_capacity: o.waitlist_capacity ?? 5,
    organizer_exempt: true,
    visibility: 'PUBLIC',
  })
  const { data: events, error: eErr } = await supabase.from('events').insert([
    mkEvent({ group_id:g01, organizer_id:u01, title:'5K do Parque Ibirapuera', description:'Corrida coletiva de 5km no Parque Ibirapuera. Concentração no Portão 3 às 6h30. Percurso plano, ideal para todos os níveis. Café da manhã coletivo após a corrida.', address:'Parque Ibirapuera, Portão 3', city:'São Paulo', category:'Esportes', status:'CONFIRMED', price:2500, capacity:40, min_participants:15, starts_at:daysFromNow(7), ends_at:hoursFromNow(7*24+2), registration_deadline:daysFromNow(5), min_check_at:hoursFromNow(7*24-12), slug:'5k-do-parque-ibirapuera' }),
    mkEvent({ group_id:g01, organizer_id:u01, title:'Treino Noturno — Vila Olímpia', description:'Treino técnico de ritmo e resistência pelas ruas da Vila Olímpia. Percurso de 8km com pausa para alongamento no km 4. Pace médio: 5:30/km. Traga o refletor!', address:'Rua Olimpíadas, 66 — Vila Olímpia', city:'São Paulo', category:'Esportes', status:'OPEN', price:1500, capacity:25, min_participants:8, starts_at:daysFromNow(14), ends_at:hoursFromNow(14*24+2), registration_deadline:daysFromNow(12), min_check_at:hoursFromNow(14*24-12), slug:'treino-noturno-vila-olimpia' }),
    mkEvent({ group_id:g01, organizer_id:u01, title:'Corrida da Primavera — 10K', description:'Corrida especial de primavera com percurso de 10km pelas margens do Rio Pinheiros. Kit participante com camiseta e medalha. Premiação para os 3 primeiros de cada categoria.', address:'Marginal Pinheiros — Ponte Cidade Universitária', city:'São Paulo', category:'Esportes', status:'COMPLETED', price:3500, capacity:60, min_participants:20, starts_at:daysAgo(15), ends_at:daysAgo(14), registration_deadline:daysAgo(17), min_check_at:daysAgo(16), slug:'corrida-da-primavera-10k' }),
    mkEvent({ group_id:g02, organizer_id:u06, title:'Jantar Harmonizado — Cucina Italiana', description:'Noite especial com menu degustação de 5 tempos inspirado na culinária italiana. Cada prato harmonizado com vinhos selecionados. Chef convidado formado pela Le Cordon Bleu.', address:'Rua Emiliano Perneta, 390 — Centro', city:'Curitiba', category:'Gastronomia', status:'CONFIRMED', price:12000, capacity:20, min_participants:10, starts_at:daysFromNow(5), ends_at:hoursFromNow(5*24+4), registration_deadline:daysFromNow(3), min_check_at:hoursFromNow(5*24-12), slug:'jantar-harmonizado-cucina-italiana' }),
    mkEvent({ group_id:g02, organizer_id:u06, title:'Workshop de Sushi Profissional', description:'Aula prática de sushi e sashimi com chef que trabalhou 10 anos em Tóquio. Ingredientes incluídos. Máximo 12 participantes para atenção individualizada.', address:'Rua XV de Novembro, 700 — Centro', city:'Curitiba', category:'Gastronomia', status:'OPEN', price:8000, capacity:12, min_participants:6, starts_at:daysFromNow(21), ends_at:hoursFromNow(21*24+3), registration_deadline:daysFromNow(19), min_check_at:hoursFromNow(21*24-12), slug:'workshop-de-sushi-profissional' }),
    mkEvent({ group_id:g02, organizer_id:u06, title:'Brunch Gourmet no Mercado Municipal', description:'Brunch com produtos selecionados do Mercado Municipal de Curitiba. Queijos artesanais, frios, pães de fermentação natural e frutas da estação.', address:'Mercado Municipal de Curitiba — Av. Sete de Setembro', city:'Curitiba', category:'Gastronomia', status:'COMPLETED', price:6500, capacity:30, min_participants:12, starts_at:daysAgo(10), ends_at:daysAgo(9), registration_deadline:daysAgo(12), min_check_at:daysAgo(11), slug:'brunch-gourmet-no-mercado-municipal' }),
    mkEvent({ group_id:g03, organizer_id:u03, title:'TechTalk: IA Generativa no Dia a Dia', description:'Palestra + debate sobre IA generativa para devs. Cases reais, ferramentas e demos ao vivo. Após a palestra, open bar de cerveja artesanal patrocinado.', address:'WeWork Faria Lima — Av. Brigadeiro Faria Lima, 3477', city:'São Paulo', category:'Tecnologia', status:'OPEN', price:0, capacity:80, min_participants:20, starts_at:daysFromNow(10), ends_at:hoursFromNow(10*24+3), registration_deadline:daysFromNow(8), min_check_at:hoursFromNow(10*24-12), slug:'techtalk-ia-generativa-no-dia-a-dia' }),
    mkEvent({ group_id:g03, organizer_id:u03, title:'Hackathon 24h — Soluções para o Clima', description:'Hackathon de 24h focado em soluções para mudanças climáticas. Times de 4-6 pessoas. Mentores de startups e VCs. Premiação total de R$15.000. Alimentação inclusa.', address:'Campus Party — Anhembi, Portão Principal', city:'São Paulo', category:'Tecnologia', status:'CONFIRMED', price:5000, capacity:60, min_participants:24, starts_at:daysFromNow(25), ends_at:daysFromNow(26), registration_deadline:daysFromNow(20), min_check_at:hoursFromNow(25*24-12), slug:'hackathon-24h-solucoes-para-o-clima' }),
    mkEvent({ group_id:g03, organizer_id:u03, title:'Beer & Code Night — Episódio 12', description:'Nossa noite de código e cerveja! Apresentações relâmpago de 5 min sobre projetos pessoais. Sem slides obrigatórios. Cerveja artesanal inclusa, pizza no intervalo.', address:'Cubo Itaú — Alameda Vicente Pinzon, 54', city:'São Paulo', category:'Tecnologia', status:'COMPLETED', price:3000, capacity:40, min_participants:15, starts_at:daysAgo(7), ends_at:daysAgo(6), registration_deadline:daysAgo(9), min_check_at:daysAgo(8), slug:'beer-code-night-episodio-12' }),
    mkEvent({ group_id:g04, organizer_id:u08, title:'Trilha da Pedra Bonita', description:'3,5km de subida até a Pedra Bonita com vista para a Barra da Tijuca. Nível moderado. Saída coletiva às 6h da Estrada das Paineiras.', address:'Estrada das Paineiras s/n — Floresta da Tijuca', city:'Rio de Janeiro', category:'Natureza', status:'CONFIRMED', price:0, capacity:20, min_participants:8, starts_at:daysFromNow(3), ends_at:hoursFromNow(3*24+4), registration_deadline:daysFromNow(2), min_check_at:hoursFromNow(3*24-12), slug:'trilha-da-pedra-bonita' }),
    mkEvent({ group_id:g04, organizer_id:u08, title:'Escalada Iniciante no Morro da Urca', description:'Aula de escalada para iniciantes com instrutores certificados. Equipamentos incluídos. Aprenda as técnicas básicas em ambiente seguro com vistas incríveis.', address:'Morro da Urca — Praia Vermelha, Urca', city:'Rio de Janeiro', category:'Natureza', status:'OPEN', price:4500, capacity:10, min_participants:5, starts_at:daysFromNow(30), ends_at:hoursFromNow(30*24+5), registration_deadline:daysFromNow(27), min_check_at:hoursFromNow(30*24-12), slug:'escalada-iniciante-no-morro-da-urca' }),
    mkEvent({ group_id:g05, organizer_id:u11, title:'Noite de Jazz no SESC Pinheiros', description:'Jam session especial com músicos convidados no SESC Pinheiros. Trio de piano, contrabaixo e bateria abrindo para outros músicos. Ambiente descontraído, bar disponível.', address:'SESC Pinheiros — Rua Paes Leme, 195', city:'São Paulo', category:'Música', status:'CONFIRMED', price:6000, capacity:60, min_participants:20, starts_at:daysFromNow(8), ends_at:hoursFromNow(8*24+4), registration_deadline:daysFromNow(6), min_check_at:hoursFromNow(8*24-12), slug:'noite-de-jazz-no-sesc-pinheiros' }),
    mkEvent({ group_id:g05, organizer_id:u11, title:'Blues & Vinho — Uma Noite Especial', description:'Seleção de blues clássico e contemporâneo com harmonização de vinhos tintos. DJ residente: Rafael Cunha. Ambiente intimista para 40 pessoas. Dress code: smart casual.', address:'Bar Astor — Rua Delfina, 163 — Vila Madalena', city:'São Paulo', category:'Música', status:'OPEN', price:8000, capacity:40, min_participants:15, starts_at:daysFromNow(18), ends_at:hoursFromNow(18*24+5), registration_deadline:daysFromNow(16), min_check_at:hoursFromNow(18*24-12), slug:'blues-vinho-uma-noite-especial' }),
    mkEvent({ group_id:g05, organizer_id:u11, title:'Festival de Jazz Independente SP', description:'Festival anual com 3 bandas ao vivo, food trucks, artesanato e exposição fotográfica. Das 14h às 22h. Evento ao ar livre com área kids.', address:'Parque Trianon — Av. Paulista, 1351', city:'São Paulo', category:'Música', status:'COMPLETED', price:9000, capacity:120, min_participants:40, starts_at:daysAgo(20), ends_at:daysAgo(19), registration_deadline:daysAgo(22), min_check_at:daysAgo(21), slug:'festival-de-jazz-independente-sp' }),
    mkEvent({ group_id:g06, organizer_id:u05, title:'Yoga ao Amanhecer — Praça da Liberdade', description:'Prática ao ar livre de hatha yoga ao nascer do sol. Todos os níveis bem-vindos. Traga seu tapete. Meditação guiada ao final.', address:'Praça da Liberdade s/n — Funcionários', city:'Belo Horizonte', category:'Saúde', status:'OPEN', price:3000, capacity:30, min_participants:10, starts_at:daysFromNow(4), ends_at:hoursFromNow(4*24+2), registration_deadline:daysFromNow(3), min_check_at:hoursFromNow(4*24-12), slug:'yoga-ao-amanhecer-praca-da-liberdade' }),
    mkEvent({ group_id:g06, organizer_id:u05, title:'Retiro de Meditação — Serra do Cipó', description:'Retiro de 2 dias com yoga, meditação, respiração consciente e alimentação orgânica. Chalés com vista para a natureza. Transforme sua relação com o presente.', address:'Pousada Refúgio do Cipó — Km 95 da MG-010', city:'Belo Horizonte', category:'Saúde', status:'CONFIRMED', price:25000, capacity:16, min_participants:8, starts_at:daysFromNow(45), ends_at:daysFromNow(47), registration_deadline:daysFromNow(38), min_check_at:hoursFromNow(45*24-12), slug:'retiro-de-meditacao-serra-do-cipo' }),
    mkEvent({ group_id:g07, organizer_id:u12, title:'Degustação de Cervejas Belgas', description:'Noite dedicada a 8 rótulos belgas importados e artesanais. Análise sensorial e harmonização com queijos importados. Técnico e descontraído.', address:'Empório Belga — Rua da Praia, 290', city:'Porto Alegre', category:'Gastronomia', status:'CONFIRMED', price:7000, capacity:24, min_participants:10, starts_at:daysFromNow(12), ends_at:hoursFromNow(12*24+3), registration_deadline:daysFromNow(10), min_check_at:hoursFromNow(12*24-12), slug:'degustacao-de-cervejas-belgas' }),
    mkEvent({ group_id:g07, organizer_id:u12, title:'Visita Guiada — Cervejaria Dado Bier', description:'Tour pela planta da Dado Bier, uma das maiores cervejarias artesanais do Sul. Processo de produção, adega de maturação e degustação ao final.', address:'Cervejaria Dado Bier — Av. Assis Brasil, 2700', city:'Porto Alegre', category:'Gastronomia', status:'OPEN', price:4500, capacity:20, min_participants:8, starts_at:daysFromNow(22), ends_at:hoursFromNow(22*24+3), registration_deadline:daysFromNow(20), min_check_at:hoursFromNow(22*24-12), slug:'visita-guiada-cervejaria-dado-bier' }),
    mkEvent({ group_id:g08, organizer_id:u13, title:'Maratona Kubrick — Eyes Wide Shut e Full Metal Jacket', description:'Maratona de dois filmes de Kubrick com debate mediado após cada sessão. Material de apoio impresso. Pipoca artesanal e bebidas disponíveis.', address:'Cine Belas Artes — Rua da Consolação, 2423', city:'São Paulo', category:'Cultura', status:'OPEN', price:2500, capacity:50, min_participants:15, starts_at:daysFromNow(6), ends_at:hoursFromNow(6*24+6), registration_deadline:daysFromNow(4), min_check_at:hoursFromNow(6*24-12), slug:'maratona-kubrick' }),
    mkEvent({ group_id:g08, organizer_id:u13, title:'Cineclube: A Nouvelle Vague e seus filhos', description:'Dois filmes da Nouvelle Vague francesa (Godard e Truffaut) com apresentação e debate. Uma viagem ao cinema que mudou o mundo.', address:'Cinemateca Brasileira — Largo Senador Raul Cardoso, 207', city:'São Paulo', category:'Cultura', status:'COMPLETED', price:2000, capacity:40, min_participants:12, starts_at:daysAgo(5), ends_at:daysAgo(4), registration_deadline:daysAgo(7), min_check_at:daysAgo(6), slug:'cineclube-nouvelle-vague' }),
    mkEvent({ group_id:g09, organizer_id:u10, title:'Surf + Churrasco na Praia do Campeche', description:'Dia completo: manhã de surf com instrução, tarde de churrasco e stand-up paddle. Pranchas disponíveis para aluguel. Leve protetor solar!', address:'Praia do Campeche — Florianópolis', city:'Florianópolis', category:'Esportes', status:'CONFIRMED', price:3500, capacity:25, min_participants:10, starts_at:daysFromNow(9), ends_at:hoursFromNow(9*24+8), registration_deadline:daysFromNow(7), min_check_at:hoursFromNow(9*24-12), slug:'surf-churrasco-na-praia-do-campeche' }),
    mkEvent({ group_id:g10, organizer_id:u15, title:'Pitch Night — Startups de Impacto Social', description:'8 startups com 5 min cada + Q&A. Banca de VCs e especialistas. Networking ao final com open bar. Entrada gratuita.', address:'Cubo Itaú — Alameda Vicente Pinzon, 54', city:'São Paulo', category:'Negócios', status:'OPEN', price:0, capacity:100, min_participants:30, starts_at:daysFromNow(15), ends_at:hoursFromNow(15*24+4), registration_deadline:daysFromNow(13), min_check_at:hoursFromNow(15*24-12), slug:'pitch-night-startups-de-impacto-social' }),
    mkEvent({ group_id:g10, organizer_id:u15, title:'Workshop: Growth Hacking para SaaS B2B', description:'6 horas sobre crescimento para SaaS B2B. Aquisição, ativação, retenção e receita com cases reais. Certificado de participação.', address:'WeWork — Av. Paulista, 2300', city:'São Paulo', category:'Negócios', status:'CONFIRMED', price:15000, capacity:30, min_participants:10, starts_at:daysFromNow(28), ends_at:hoursFromNow(28*24+6), registration_deadline:daysFromNow(23), min_check_at:hoursFromNow(28*24-12), slug:'workshop-growth-hacking-saas-b2b' }),
    mkEvent({ group_id:g11, organizer_id:u07, title:'Forró Universitário — Especial São João', description:'Festa de forró com temática junina! Forró pé de serra ao vivo com Banda Pé na Terra. Aula de aquecimento às 20h para iniciantes. Amendoim e quentão inclusos.', address:'Centro Universitário Belas Artes — Rua Dr. Álvaro Alvim, 70', city:'São Paulo', category:'Cultura', status:'OPEN', price:2500, capacity:100, min_participants:30, starts_at:daysFromNow(2), ends_at:hoursFromNow(2*24+6), registration_deadline:daysFromNow(1), min_check_at:hoursFromNow(2*24-12), slug:'forro-universitario-especial-sao-joao' }),
    mkEvent({ group_id:g11, organizer_id:u07, title:'Samba no Pé — Especial Arlindo Cruz', description:'Noite de samba dedicada a Arlindo Cruz com roda ao vivo e DJ de samba raiz. Participação especial de dançarinos de gafieira. Das 20h à 1h.', address:'Bar do Samba — Rua Wisard, 149 — Vila Madalena', city:'São Paulo', category:'Cultura', status:'COMPLETED', price:3000, capacity:80, min_participants:25, starts_at:daysAgo(8), ends_at:daysAgo(7), registration_deadline:daysAgo(10), min_check_at:daysAgo(9), slug:'samba-no-pe-especial-arlindo-cruz' }),
  ]).select('id')
  if (eErr) { console.error('❌ Eventos:', eErr.message); return }
  const [e01,e02,e03,e04,e05,e06,e07,e08,e09,e10,e11,e12,e13,e14,e15,e16,e17,e18,e19,e20,e21,e22,e23,e24,e25] = events.map(e => e.id)
  console.log('  ✅ 25 eventos criados\n')

  // 5. Participações
  console.log('🎫 Criando participações...')
  const parts = [
    {event_id:e01,user_id:u02,status:'CONFIRMED'},{event_id:e01,user_id:u17,status:'CONFIRMED'},
    {event_id:e01,user_id:u22,status:'CONFIRMED'},{event_id:e01,user_id:u35,status:'CONFIRMED'},
    {event_id:e01,user_id:u39,status:'CONFIRMED'},{event_id:e01,user_id:u49,status:'CONFIRMED'},
    {event_id:e01,user_id:u50,status:'CONFIRMED'},{event_id:e01,user_id:u09,status:'CONFIRMED'},
    {event_id:e01,user_id:u19,status:'CONFIRMED'},
    {event_id:e02,user_id:u17,status:'CONFIRMED'},{event_id:e02,user_id:u22,status:'CONFIRMED'},
    {event_id:e02,user_id:u39,status:'CONFIRMED'},{event_id:e02,user_id:u49,status:'CONFIRMED'},
    {event_id:e03,user_id:u02,status:'CONFIRMED'},{event_id:e03,user_id:u17,status:'CONFIRMED'},
    {event_id:e03,user_id:u22,status:'CONFIRMED'},{event_id:e03,user_id:u35,status:'CONFIRMED'},
    {event_id:e04,user_id:u20,status:'CONFIRMED'},{event_id:e04,user_id:u28,status:'CONFIRMED'},
    {event_id:e04,user_id:u38,status:'CONFIRMED'},{event_id:e04,user_id:u27,status:'CONFIRMED'},
    {event_id:e04,user_id:u31,status:'CONFIRMED'},{event_id:e04,user_id:u48,status:'CONFIRMED'},
    {event_id:e05,user_id:u20,status:'CONFIRMED'},{event_id:e05,user_id:u27,status:'CONFIRMED'},
    {event_id:e05,user_id:u31,status:'CONFIRMED'},
    {event_id:e06,user_id:u20,status:'CONFIRMED'},{event_id:e06,user_id:u28,status:'CONFIRMED'},
    {event_id:e06,user_id:u38,status:'CONFIRMED'},{event_id:e06,user_id:u31,status:'CONFIRMED'},
    {event_id:e07,user_id:u02,status:'CONFIRMED'},{event_id:e07,user_id:u25,status:'CONFIRMED'},
    {event_id:e07,user_id:u32,status:'CONFIRMED'},{event_id:e07,user_id:u37,status:'CONFIRMED'},
    {event_id:e07,user_id:u45,status:'CONFIRMED'},{event_id:e07,user_id:u47,status:'CONFIRMED'},
    {event_id:e08,user_id:u02,status:'CONFIRMED'},{event_id:e08,user_id:u25,status:'CONFIRMED'},
    {event_id:e08,user_id:u32,status:'CONFIRMED'},{event_id:e08,user_id:u37,status:'CONFIRMED'},
    {event_id:e08,user_id:u45,status:'CONFIRMED'},{event_id:e08,user_id:u47,status:'CONFIRMED'},
    {event_id:e08,user_id:u28,status:'CONFIRMED'},{event_id:e08,user_id:u41,status:'CONFIRMED'},
    {event_id:e09,user_id:u02,status:'CONFIRMED'},{event_id:e09,user_id:u32,status:'CONFIRMED'},
    {event_id:e09,user_id:u37,status:'CONFIRMED'},{event_id:e09,user_id:u47,status:'CONFIRMED'},
    {event_id:e10,user_id:u14,status:'CONFIRMED'},{event_id:e10,user_id:u26,status:'CONFIRMED'},
    {event_id:e10,user_id:u30,status:'CONFIRMED'},{event_id:e10,user_id:u42,status:'CONFIRMED'},
    {event_id:e10,user_id:u46,status:'CONFIRMED'},{event_id:e10,user_id:u16,status:'CONFIRMED'},
    {event_id:e12,user_id:u04,status:'CONFIRMED'},{event_id:e12,user_id:u18,status:'CONFIRMED'},
    {event_id:e12,user_id:u26,status:'CONFIRMED'},{event_id:e12,user_id:u36,status:'CONFIRMED'},
    {event_id:e12,user_id:u46,status:'CONFIRMED'},{event_id:e12,user_id:u33,status:'CONFIRMED'},
    {event_id:e14,user_id:u04,status:'CONFIRMED'},{event_id:e14,user_id:u18,status:'CONFIRMED'},
    {event_id:e14,user_id:u26,status:'CONFIRMED'},{event_id:e14,user_id:u33,status:'CONFIRMED'},
    {event_id:e15,user_id:u24,status:'CONFIRMED'},{event_id:e15,user_id:u16,status:'CONFIRMED'},
    {event_id:e15,user_id:u19,status:'CONFIRMED'},
    {event_id:e16,user_id:u24,status:'CONFIRMED'},{event_id:e16,user_id:u44,status:'CONFIRMED'},
    {event_id:e17,user_id:u20,status:'CONFIRMED'},{event_id:e17,user_id:u28,status:'CONFIRMED'},
    {event_id:e17,user_id:u40,status:'CONFIRMED'},{event_id:e17,user_id:u38,status:'CONFIRMED'},
    {event_id:e17,user_id:u02,status:'CONFIRMED'},{event_id:e17,user_id:u06,status:'CONFIRMED'},
    {event_id:e21,user_id:u34,status:'CONFIRMED'},{event_id:e21,user_id:u08,status:'CONFIRMED'},
    {event_id:e21,user_id:u22,status:'CONFIRMED'},{event_id:e21,user_id:u49,status:'CONFIRMED'},
    {event_id:e22,user_id:u23,status:'CONFIRMED'},{event_id:e22,user_id:u25,status:'CONFIRMED'},
    {event_id:e22,user_id:u32,status:'CONFIRMED'},{event_id:e22,user_id:u47,status:'CONFIRMED'},
    {event_id:e23,user_id:u23,status:'CONFIRMED'},{event_id:e23,user_id:u41,status:'CONFIRMED'},
    {event_id:e24,user_id:u29,status:'CONFIRMED'},{event_id:e24,user_id:u44,status:'CONFIRMED'},
    {event_id:e24,user_id:u19,status:'CONFIRMED'},{event_id:e24,user_id:u33,status:'CONFIRMED'},
    {event_id:e25,user_id:u29,status:'CONFIRMED'},{event_id:e25,user_id:u44,status:'CONFIRMED'},
    {event_id:e25,user_id:u19,status:'CONFIRMED'},{event_id:e25,user_id:u33,status:'CONFIRMED'},
  ].filter(p => p.event_id && p.user_id)
  const { error: pErr } = await supabase.from('participations').insert(parts)
  if (pErr) console.error('  ⚠️  Participações:', pErr.message)
  else console.log('  ✅ Participações criadas\n')

  // 6. Marketplace
  console.log('🛒 Criando anúncios de marketplace...')
  const listings = [
    { group_id:g01, user_id:u22, title:'Tênis Asics Gel-Kayano 30 — Tam 42', description:'Tênis em ótimo estado, usado em apenas 3 corridas (~30km). Comprei o tamanho errado. Caixa original e nota fiscal. Cor: azul navy com detalhes laranja.', type:'SELL', price:42000, price_negotiable:true,  payment_methods:['PIX','Dinheiro'],           contact:'(11) 99234-5678', status:'ACTIVE', published_at:daysAgo(20), expires_at:daysFromNow(10) },
    { group_id:g01, user_id:u17, title:'Relógio GPS Garmin Forerunner 265', description:'Garmin 265 com 8 meses de uso. Carregador original e pulseira sobressalente. Bateria até 13 dias. Perfeito para treinos com rotas salvas.', type:'SELL', price:185000, price_negotiable:false, payment_methods:['PIX','Transferência'],       contact:'(11) 91234-9876', status:'ACTIVE', published_at:daysAgo(15), expires_at:daysFromNow(15) },
    { group_id:g01, user_id:u35, title:'Empréstimo: Cinta de Frequência Polar H10', description:'Empresto minha cinta Polar H10 por até 30 dias. Compatível com Garmin e Strava. Ideal para testar antes de comprar.', type:'LOAN', price:null, price_negotiable:false, payment_methods:['Combinado'],               contact:'(11) 97654-3210', status:'ACTIVE', published_at:daysAgo(10), expires_at:daysFromNow(20) },
    { group_id:g01, user_id:u39, title:'Kit 3 Camisetas de Corrida Dry Fit — Tam M', description:'3 camisetas dry fit: 2 Nike + 1 Adidas. Sem manchas, sem rasgos. Ótimas para treinos. Vendo juntas.', type:'SELL', price:8000, price_negotiable:true,  payment_methods:['PIX'],                      contact:'(11) 98765-1234', status:'ACTIVE', published_at:daysAgo(8),  expires_at:daysFromNow(22) },
    { group_id:g02, user_id:u06, title:'Livros de Gastronomia — Lote com 5 volumes', description:'Larousse Gastronomique, Modernist Cuisine at Home, Salt Fat Acid Heat, The French Laundry Cookbook e Jerusalem. Todos em ótimo estado.', type:'SELL', price:32000, price_negotiable:true,  payment_methods:['PIX','Transferência'],       contact:'(41) 99887-6543', status:'ACTIVE', published_at:daysAgo(18), expires_at:daysFromNow(12) },
    { group_id:g02, user_id:u28, title:'Batedeira KitchenAid Artisan — Vermelha 4,8L', description:'KitchenAid em perfeito estado, usada raramente. 3 acessórios originais e capa protetora. Motivo: mudança para apartamento menor.', type:'SELL', price:189000, price_negotiable:false, payment_methods:['PIX','Cartão de Crédito'],   contact:'(41) 98765-4321', status:'ACTIVE', published_at:daysAgo(12), expires_at:daysFromNow(18) },
    { group_id:g02, user_id:u31, title:'Troco aulas de confeitaria por design', description:'Ofereço 4 aulas práticas (bolos decorados, macarons e tortas) em troca de identidade visual para meu negócio de confeitaria.', type:'EXCHANGE', price:null, price_negotiable:false, payment_methods:['Permuta'],                  contact:'(41) 97654-8765', status:'ACTIVE', published_at:daysAgo(7),  expires_at:daysFromNow(23) },
    { group_id:g03, user_id:u45, title:'MacBook Pro M3 14" — 16GB RAM 512GB SSD', description:'MacBook Pro M3, 8 meses de uso, perfeito estado. Bateria com 95% de saúde. Caixa e carregador originais. Nota fiscal disponível.', type:'SELL', price:1290000, price_negotiable:false, payment_methods:['PIX','Transferência'],       contact:'(11) 96543-2109', status:'ACTIVE', published_at:daysAgo(14), expires_at:daysFromNow(16) },
    { group_id:g03, user_id:u37, title:'Monitor LG UltraWide 34" Curvo', description:'LG 34WN80C-B, 3440x1440, 60Hz. Ideal para programação e design. USB-C e HDMI inclusos. 1 ano de uso, sem dead pixels.', type:'SELL', price:289000, price_negotiable:true,  payment_methods:['PIX','Transferência'],       contact:'(11) 95432-1098', status:'ACTIVE', published_at:daysAgo(11), expires_at:daysFromNow(19) },
    { group_id:g03, user_id:u47, title:'Mentoria gratuita em Product Management', description:'2h de mentoria gratuita em PM para quem está iniciando na carreira. Foco em priorização, discovery e roadmap.', type:'SERVICE', price:null, price_negotiable:false, payment_methods:['Gratuito'],                contact:'(11) 94321-0987', status:'ACTIVE', published_at:daysAgo(6),  expires_at:daysFromNow(24) },
    { group_id:g03, user_id:u25, title:'Teclado Mecânico Keychron K2 — Switch Brown', description:'Keychron K2 V2, switches Gateron Brown, Bluetooth 5.1 + USB-C, layout 75%, RGB. 6 meses de uso. Keycaps PBT impecáveis.', type:'SELL', price:39000, price_negotiable:true,  payment_methods:['PIX'],                      contact:'(11) 93210-9876', status:'ACTIVE', published_at:daysAgo(9),  expires_at:daysFromNow(21) },
    { group_id:g05, user_id:u04, title:'Violão Takamine EG363SC — Eletroacústico', description:'Takamine eletroacústico excelente estado. Captador original, afinação estável. Cordas D\'Addario EJ16 novas. Bag rígido incluso.', type:'SELL', price:198000, price_negotiable:true,  payment_methods:['PIX','Transferência'],       contact:'(11) 92109-8765', status:'ACTIVE', published_at:daysAgo(16), expires_at:daysFromNow(14) },
    { group_id:g05, user_id:u36, title:'Procuro: Contrabaixo acústico para empréstimo', description:'Violinista montando quinteto de jazz para apresentações. Procuro quem possa emprestar contrabaixo acústico para 3 ensaios + 1 show.', type:'BUY', price:null, price_negotiable:false, payment_methods:['Combinado'],               contact:'(21) 99876-5432', status:'ACTIVE', published_at:daysAgo(5),  expires_at:daysFromNow(25) },
    { group_id:g07, user_id:u20, title:'Kit Homebrewing para Iniciante — Completo', description:'Fermentador 20L, airlock, termômetro, densímetro, mangueira, garrafa PET e kit de limpeza. Nunca usado. Presente que recebi.', type:'SELL', price:28000, price_negotiable:false, payment_methods:['PIX','Dinheiro'],           contact:'(51) 98765-4321', status:'ACTIVE', published_at:daysAgo(13), expires_at:daysFromNow(17) },
    { group_id:g07, user_id:u40, title:'Garrafas americanas p/ cerveja — 50 unidades', description:'50 garrafas americanas 500ml com tampas novas. Higienizadas e prontas para uso. Retirar em Porto Alegre (Petrópolis).', type:'SELL', price:9000, price_negotiable:true,  payment_methods:['PIX','Dinheiro'],           contact:'(51) 97654-3210', status:'ACTIVE', published_at:daysAgo(10), expires_at:daysFromNow(20) },
    { group_id:g07, user_id:u12, title:'Doação: Livros técnicos de cerveja artesanal', description:'Doando 4 livros: Cerveja Artesanal (Beerland), Como Fazer Cerveja, Homebrewing para Iniciantes e The Complete Joy of Homebrewing.', type:'DONATION', price:null, price_negotiable:false, payment_methods:['Gratuito'],                contact:'(51) 96543-2109', status:'ACTIVE', published_at:daysAgo(4),  expires_at:daysFromNow(26) },
    { group_id:g08, user_id:u43, title:'Coleção Blu-ray Kubrick — 7 filmes completos', description:'2001, Clockwork Orange, The Shining, Full Metal Jacket, Eyes Wide Shut, Barry Lyndon, Paths of Glory. Caixas impecáveis, discos sem arranhões.', type:'SELL', price:42000, price_negotiable:false, payment_methods:['PIX','Transferência'],       contact:'(11) 91098-7654', status:'ACTIVE', published_at:daysAgo(17), expires_at:daysFromNow(13) },
    { group_id:g08, user_id:u33, title:'Aluguel: Projetor Full HD Epson EB-X41', description:'3600 lumens, HDMI e VGA. R$120/dia ou R$80/meio período. Caução de R$500. Ideal para sessões de cinema e apresentações.', type:'RENT', price:12000, price_negotiable:false, payment_methods:['PIX','Dinheiro'],           contact:'(11) 90987-6543', status:'ACTIVE', published_at:daysAgo(9),  expires_at:daysFromNow(21) },
    { group_id:g09, user_id:u34, title:'Prancha Longboard 9\'0 — Channel Islands', description:'Channel Islands 9 pés, volume 68L, ótimo estado. 3 quilhas FCS, leash e capa semi-rígida inclusos.', type:'SELL', price:289000, price_negotiable:true,  payment_methods:['PIX','Transferência'],       contact:'(48) 99876-5432', status:'ACTIVE', published_at:daysAgo(8),  expires_at:daysFromNow(22) },
    { group_id:g09, user_id:u10, title:'Aulas de SUP para iniciantes em Floripa', description:'Aulas na Lagoa da Conceição. 1h com prancha e remo incluídos. Turmas de até 3 alunos.', type:'SERVICE', price:8000, price_negotiable:false, payment_methods:['PIX','Dinheiro'],           contact:'(48) 98765-4321', status:'ACTIVE', published_at:daysAgo(5),  expires_at:daysFromNow(25) },
    { group_id:g10, user_id:u15, title:'Mentoria 1:1 — Estratégia GTM para SaaS B2B', description:'3 sessões de 1h sobre Go-to-Market para startups B2B. 3 exits, investidora anjo. Foco em ICP, sales motion e pricing.', type:'SERVICE', price:50000, price_negotiable:false, payment_methods:['PIX','Transferência'],       contact:'(11) 89876-5432', status:'ACTIVE', published_at:daysAgo(11), expires_at:daysFromNow(19) },
    { group_id:g10, user_id:u41, title:'Busco co-founder técnico para fintech', description:'Expertise em finanças + 150 usuários beta. Procuro dev full-stack ou mobile. Ideia validada em microcrédito para MEIs.', type:'BUY', price:null, price_negotiable:false, payment_methods:['Combinado'],               contact:'(11) 88765-4321', status:'ACTIVE', published_at:daysAgo(6),  expires_at:daysFromNow(24) },
    { group_id:g11, user_id:u07, title:'Sapatos de Dança Suot — Salão — Tam 38', description:'Sapatos femininos Suot, salto 5cm, sola de camurça, cor dourada. Usados em 4 eventos. Perfeito estado.', type:'SELL', price:18000, price_negotiable:true,  payment_methods:['PIX','Dinheiro'],           contact:'(11) 87654-3210', status:'ACTIVE', published_at:daysAgo(14), expires_at:daysFromNow(16) },
    { group_id:g11, user_id:u29, title:'Vestido de Forró Bordado — Tam M', description:'Vestido com bordados coloridos, alça fina, saia rodada. Usado 2 vezes, sem manchas. Lindo para festas juninas.', type:'SELL', price:12000, price_negotiable:false, payment_methods:['PIX'],                      contact:'(11) 86543-2109', status:'ACTIVE', published_at:daysAgo(7),  expires_at:daysFromNow(23) },
    { group_id:g12, user_id:u03, title:'Canon EOS R6 Mark II — Corpo', description:'2 anos de uso cuidadoso. Obturador com 45.000 disparos. Bateria, carregador e capa. Sem hot pixels.', type:'SELL', price:1450000, price_negotiable:true,  payment_methods:['PIX','Transferência'],       contact:'(21) 85432-1098', status:'ACTIVE', published_at:daysAgo(19), expires_at:daysFromNow(11) },
    { group_id:g12, user_id:u21, title:'Tripé Manfrotto MT190XPRO3 — Profissional', description:'Alumínio, capacidade 7kg, extensão máxima 1,57m. Cabeça hidráulica + bolsa de transporte. Nenhum arranhão.', type:'SELL', price:89000, price_negotiable:false, payment_methods:['PIX','Transferência'],       contact:'(11) 84321-0987', status:'ACTIVE', published_at:daysAgo(12), expires_at:daysFromNow(18) },
    { group_id:g12, user_id:u42, title:'Photo Walk toda última sexta — Lapa/Santa Teresa', description:'Gratuito, toda última sexta às 17h pela Lapa e Santa Teresa. Qualquer nível de experiência bem-vindo.', type:'SERVICE', price:null, price_negotiable:false, payment_methods:['Gratuito'],                contact:'(21) 83210-9876', status:'ACTIVE', published_at:daysAgo(3),  expires_at:daysFromNow(27) },
    { group_id:g12, user_id:u14, title:'Aluguel: Lente Canon RF 85mm f/1.2L', description:'R$250/dia, R$150/meio dia. Caução de R$2.000. Retirar no Centro do Rio.', type:'RENT', price:25000, price_negotiable:false, payment_methods:['PIX','Dinheiro'],           contact:'(21) 82109-8765', status:'ACTIVE', published_at:daysAgo(6),  expires_at:daysFromNow(24) },
  ].filter(l => l.group_id && l.user_id)

  const { error: lErr } = await supabase.from('marketplace_listings').insert(listings)
  if (lErr) console.error('  ⚠️  Marketplace:', lErr.message)
  else console.log('  ✅ 28 anúncios de marketplace criados\n')

  console.log('🎉 Seed demo concluído!\n')
  console.log('Para limpar tudo depois: node scripts/seed-demo.mjs --clean')
}

// ─── RUN ─────────────────────────────────────────────────────────────────────

const isClean = process.argv.includes('--clean')
if (isClean) {
  clean().catch(console.error)
} else {
  seed().catch(console.error)
}
