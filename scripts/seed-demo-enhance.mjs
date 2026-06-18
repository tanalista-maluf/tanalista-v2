// Script de enriquecimento do seed demo — TáNaLista
// Adiciona fotos aos perfis e grupos, e popula participações nos eventos.
// Pré-requisito: seed-demo.mjs já executado com sucesso.
//
// Executar: node scripts/seed-demo-enhance.mjs

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

// ─── FOTOS DE PERFIL ─────────────────────────────────────────────────────────
// randomuser.me garante fotos de rosto reais, consistentes e gratuitas.
// Mapeamento: email (parcial) → { gender, index }

const PROFILE_PHOTOS = [
  { email: 'ana.silva',        gender: 'women', idx: 44 },
  { email: 'bruno.oliveira',   gender: 'men',   idx: 32 },
  { email: 'camila.santos',    gender: 'women', idx: 17 },
  { email: 'diego.alves',      gender: 'men',   idx: 57 },
  { email: 'elisa.mendes',     gender: 'women', idx: 65 },
  { email: 'fabio.lima',       gender: 'men',   idx: 11 },
  { email: 'gabriela.rocha',   gender: 'women', idx: 29 },
  { email: 'henrique.souza',   gender: 'men',   idx: 48 },
  { email: 'isabela.carvalho', gender: 'women', idx: 82 },
  { email: 'joao.pedro',       gender: 'men',   idx: 23 },
  { email: 'karla.teixeira',   gender: 'women', idx: 38 },
  { email: 'leonardo.cardoso', gender: 'men',   idx: 67 },
  { email: 'mariana.correia',  gender: 'women', idx: 55 },
  { email: 'nicolas.castro',   gender: 'men',   idx: 14 },
  { email: 'olivia.fernandes', gender: 'women', idx: 71 },
  { email: 'paulo.campos',     gender: 'men',   idx: 36 },
  { email: 'quesia.pinto',     gender: 'women', idx: 49 },
  { email: 'rafael.cunha',     gender: 'men',   idx: 79 },
  { email: 'sara.machado',     gender: 'women', idx: 13 },
  { email: 'thiago.lopes',     gender: 'men',   idx: 52 },
  { email: 'ursula.borges',    gender: 'women', idx: 61 },
  { email: 'vinicius.andrade', gender: 'men',   idx: 43 },
  { email: 'wanderlei.fig',    gender: 'men',   idx: 88 },
  { email: 'ximena.azevedo',   gender: 'women', idx: 26 },
  { email: 'yara.monteiro',    gender: 'women', idx: 34 },
  { email: 'zeca.marques',     gender: 'men',   idx: 19 },
  { email: 'adriana.fonseca',  gender: 'women', idx: 58 },
  { email: 'bernardo.tavares', gender: 'men',   idx: 6  },
  { email: 'claudia.pires',    gender: 'women', idx: 47 },
  { email: 'daniel.rezende',   gender: 'men',   idx: 91 },
  { email: 'eduarda.matos',    gender: 'women', idx: 22 },
  { email: 'fernando.braga',   gender: 'men',   idx: 73 },
  { email: 'giovana.moura',    gender: 'women', idx: 31 },
  { email: 'hugo.santana',     gender: 'men',   idx: 60 },
  { email: 'ingrid.coelho',    gender: 'women', idx: 76 },
  { email: 'julia.medeiros',   gender: 'women', idx: 9  },
  { email: 'kevin.nogueira',   gender: 'men',   idx: 27 },
  { email: 'laura.esteves',    gender: 'women', idx: 53 },
  { email: 'matheus.leite',    gender: 'men',   idx: 84 },
  { email: 'natalia.brandt',   gender: 'women', idx: 41 },
  { email: 'otavio.sousa',     gender: 'men',   idx: 16 },
  { email: 'priscila.mag',     gender: 'women', idx: 68 },
  { email: 'quirino.bueno',    gender: 'men',   idx: 39 },
  { email: 'renata.sampaio',   gender: 'women', idx: 86 },
  { email: 'sergio.tenorio',   gender: 'men',   idx: 5  },
  { email: 'tatiana.werneck',  gender: 'women', idx: 20 },
  { email: 'ugo.bernardes',    gender: 'men',   idx: 97 },
  { email: 'valentina.godoy',  gender: 'women', idx: 45 },
  { email: 'wellington.sq',    gender: 'men',   idx: 62 },
  { email: 'zilda.amaral',     gender: 'women', idx: 79 },
]

// ─── FOTOS DE GRUPOS (Unsplash) ───────────────────────────────────────────────
// URLs estáveis de imagens Unsplash curadas por tema

const GROUP_PHOTOS = {
  'corredores-de-sp':           'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=400&fit=crop',
  'foodie-club-curitiba':       'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop',
  'tech-beers-sp':              'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop',
  'trilhas-natureza-rj':        'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop',
  'jazz-blues-brasil':          'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop',
  'yoga-bem-estar-bh':          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop',
  'cervejeiros-artesanais-sul': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop',
  'cinema-cult-sp':             'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=400&fit=crop',
  'surfistas-de-floripa':       'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=400&fit=crop',
  'empreendedores-digitais':    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=400&fit=crop',
  'danca-de-salao-sp':          'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=400&fit=crop',
  'fotografos-urbanos-rj':      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=400&fit=crop',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function enhance() {
  console.log('✨ Enriquecendo dados demo...\n')

  // 1. Fotos de perfil
  // Busca perfis demo via join com auth.users (username dos perfis demo tem padrão único)
  console.log('📸 Atualizando fotos de perfil...')

  // Os usernames dos perfis demo são os mesmos definidos no PROFILE_PHOTOS (email prefix = username base)
  // Buscamos por username pattern para encontrar os perfis certos
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .not('username', 'is', null)

  // Mapeia username → photoMap
  const usernamePhotoMap = {
    'ana_carolina':    { gender: 'women', idx: 44 },
    'bruno_oliveira':  { gender: 'men',   idx: 32 },
    'camila_santos':   { gender: 'women', idx: 17 },
    'diego_alves':     { gender: 'men',   idx: 57 },
    'elisa_mendes':    { gender: 'women', idx: 65 },
    'fabio_lima':      { gender: 'men',   idx: 11 },
    'gabriela_rocha':  { gender: 'women', idx: 29 },
    'henrique_souza':  { gender: 'men',   idx: 48 },
    'isabela_carv':    { gender: 'women', idx: 82 },
    'joao_pedro':      { gender: 'men',   idx: 23 },
    'karla_teixeira':  { gender: 'women', idx: 38 },
    'leo_cardoso':     { gender: 'men',   idx: 67 },
    'mari_correia':    { gender: 'women', idx: 55 },
    'nicolas_castro':  { gender: 'men',   idx: 14 },
    'olivia_fern':     { gender: 'women', idx: 71 },
    'paulo_campos':    { gender: 'men',   idx: 36 },
    'quesia_pinto':    { gender: 'women', idx: 49 },
    'rafael_cunha':    { gender: 'men',   idx: 79 },
    'sara_machado':    { gender: 'women', idx: 13 },
    'thiago_lopes':    { gender: 'men',   idx: 52 },
    'ursula_borges':   { gender: 'women', idx: 61 },
    'vinicius_andr':   { gender: 'men',   idx: 43 },
    'wanderlei_fig':   { gender: 'men',   idx: 88 },
    'ximena_azevedo':  { gender: 'women', idx: 26 },
    'yara_monteiro':   { gender: 'women', idx: 34 },
    'zeca_marques':    { gender: 'men',   idx: 19 },
    'adriana_fonseca': { gender: 'women', idx: 58 },
    'bernardo_tav':    { gender: 'men',   idx: 6  },
    'claudia_pires':   { gender: 'women', idx: 47 },
    'daniel_rezende':  { gender: 'men',   idx: 91 },
    'eduarda_matos':   { gender: 'women', idx: 22 },
    'fernando_braga':  { gender: 'men',   idx: 73 },
    'giovana_moura':   { gender: 'women', idx: 31 },
    'hugo_santana':    { gender: 'men',   idx: 60 },
    'ingrid_coelho':   { gender: 'women', idx: 76 },
    'julia_medeiros':  { gender: 'women', idx: 9  },
    'kevin_nogueira':  { gender: 'men',   idx: 27 },
    'laura_esteves':   { gender: 'women', idx: 53 },
    'matheus_leite':   { gender: 'men',   idx: 84 },
    'natalia_brandt':  { gender: 'women', idx: 41 },
    'otavio_sousa':    { gender: 'men',   idx: 16 },
    'priscila_mag':    { gender: 'women', idx: 68 },
    'quirino_bueno':   { gender: 'men',   idx: 39 },
    'renata_sampaio':  { gender: 'women', idx: 86 },
    'sergio_tenorio':  { gender: 'men',   idx: 5  },
    'tatiana_werneck': { gender: 'women', idx: 20 },
    'ugo_bernardes':   { gender: 'men',   idx: 97 },
    'valentina_godoy': { gender: 'women', idx: 45 },
    'wellington_sq':   { gender: 'men',   idx: 62 },
    'zilda_amaral':    { gender: 'women', idx: 79 },
  }

  let photoCount = 0
  for (const profile of (allProfiles ?? [])) {
    const photoMap = usernamePhotoMap[profile.username]
    if (!photoMap) continue

    const avatarUrl = `https://randomuser.me/api/portraits/${photoMap.gender}/${photoMap.idx}.jpg`
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profile.id)

    if (!error) {
      photoCount++
      process.stdout.write('.')
    } else {
      process.stdout.write('x')
    }
  }
  console.log(`\n  ✅ ${photoCount} fotos de perfil atualizadas\n`)

  // 2. Logos de grupos
  console.log('🏷️  Atualizando logos de grupos...')
  let groupCount = 0
  for (const [slug, url] of Object.entries(GROUP_PHOTOS)) {
    const { error } = await supabase
      .from('groups')
      .update({ avatar_url: url })
      .eq('slug', slug)

    if (!error) {
      groupCount++
      process.stdout.write('.')
    } else {
      process.stdout.write('x')
    }
  }
  console.log(`\n  ✅ ${groupCount} logos de grupos atualizadas\n`)

  // 3. Participações — popular todos os eventos
  console.log('🎫 Populando participações nos eventos...')

  // Busca todos os eventos demo (de grupos demo)
  const { data: groups } = await supabase
    .from('groups')
    .select('id, slug')
    .in('slug', Object.keys(GROUP_PHOTOS))

  const groupIds = groups.map(g => g.id)

  const { data: events } = await supabase
    .from('events')
    .select('id, group_id, capacity, status, organizer_id')
    .in('group_id', groupIds)

  // Busca participações existentes para evitar duplicatas
  const eventIds = events.map(e => e.id)
  const { data: existingParts } = await supabase
    .from('participations')
    .select('event_id, user_id')
    .in('event_id', eventIds)

  const existingSet = new Set((existingParts ?? []).map(p => `${p.event_id}:${p.user_id}`))

  // Para cada evento, pega membros do grupo e adiciona participações aleatórias
  let totalAdded = 0
  for (const event of events) {
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', event.group_id)

    if (!members || members.length === 0) continue

    // Exclui o organizador (já é implicitamente participante) e quem já está inscrito
    const candidates = members
      .map(m => m.user_id)
      .filter(uid => uid !== event.organizer_id && !existingSet.has(`${event.id}:${uid}`))

    if (candidates.length === 0) continue

    // Sorteia entre 50% e 90% dos membros elegíveis (min 2, max capacity-1)
    const maxAllowed = Math.min(event.capacity - 1, candidates.length)
    const minCount = Math.max(2, Math.floor(candidates.length * 0.5))
    const count = randomInt(minCount, maxAllowed)

    const selected = shuffle(candidates).slice(0, count)

    // Status das participações
    const partStatus = event.status === 'COMPLETED' ? 'CONFIRMED'
      : event.status === 'CONFIRMED' ? 'CONFIRMED'
      : 'CONFIRMED'

    const newParts = selected.map(user_id => ({
      event_id: event.id,
      user_id,
      status: partStatus,
    }))

    if (newParts.length > 0) {
      const { error } = await supabase.from('participations').insert(newParts)
      if (!error) {
        totalAdded += newParts.length
        selected.forEach(uid => existingSet.add(`${event.id}:${uid}`))
        process.stdout.write('.')
      } else {
        process.stdout.write('x')
        if (error.message) console.error(`\n  ⚠️  ${event.id}: ${error.message}`)
      }
    }
  }
  console.log(`\n  ✅ ${totalAdded} participações adicionadas\n`)

  console.log('🎉 Enriquecimento concluído!')
}

enhance().catch(console.error)
