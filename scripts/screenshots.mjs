// Script de captura de screenshots — TáNaLista
// Gera prints de todas as telas do app para uso em vídeo de divulgação.
// Executar: node scripts/screenshots.mjs

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import os from 'os'

const BASE = 'http://localhost:3001'
const OUT  = path.join(os.homedir(), 'Desktop', 'Prints v1')
const DEMO_EMAIL    = 'ana.silva@demo.tanalista.test'
const DEMO_PASSWORD = 'Demo2026!'

// Viewport mobile (iPhone 14 Pro)
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }

fs.mkdirSync(OUT, { recursive: true })

async function shot(page, filename, { fullPage = true, delay = 800 } = {}) {
  await new Promise(r => setTimeout(r, delay))
  // Remove scrollbars, cursor piscante e overlay de erros do Next.js dev
  await page.evaluate(() => {
    document.documentElement.style.overflow = 'hidden'
    const style = document.createElement('style')
    style.textContent = '* { caret-color: transparent !important; } ::-webkit-scrollbar { display: none !important; }'
    document.head.appendChild(style)
    // Esconde o portal de erros do Next.js (shadow DOM)
    document.querySelectorAll('nextjs-portal').forEach(el => {
      el.style.display = 'none'
    })
  })
  const filepath = path.join(OUT, filename)
  await page.screenshot({ path: filepath, fullPage })
  console.log(`✅  ${filename}`)
  return filepath
}

async function scrollAndShot(page, filename, scrollSteps = 3) {
  // Para telas longas: tira print em posição inicial
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, filename)
}

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  })
  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)

  // ─── 1. LOGIN ────────────────────────────────────────────────────────────
  console.log('\n📸 Telas públicas...')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
  await shot(page, '01_login.png')

  // ─── 2. CADASTRO ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/cadastro`, { waitUntil: 'networkidle2' })
  await shot(page, '02_cadastro.png')

  // ─── FAZ LOGIN ───────────────────────────────────────────────────────────
  console.log('\n🔐 Fazendo login...')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
  await page.type('input[type="email"]', DEMO_EMAIL, { delay: 30 })
  await page.type('input[type="password"]', DEMO_PASSWORD, { delay: 30 })
  await page.click('button[type="submit"]')
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
  console.log('  → Logado como', DEMO_EMAIL)

  // ─── 3. HOME ─────────────────────────────────────────────────────────────
  console.log('\n📸 Telas autenticadas...')
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2' })
  await shot(page, '03_home.png')

  // Home — parte de baixo (scroll)
  await page.evaluate(() => window.scrollTo(0, 600))
  await shot(page, '03b_home_scroll.png', { fullPage: false })

  // ─── 4. EVENTOS — LISTAGEM ───────────────────────────────────────────────
  await page.goto(`${BASE}/eventos`, { waitUntil: 'networkidle2' })
  await shot(page, '04_eventos_lista.png')

  // Eventos — com scroll para ver mais
  await page.evaluate(() => window.scrollTo(0, 600))
  await shot(page, '04b_eventos_lista_scroll.png', { fullPage: false })

  // ─── 5. EVENTO — FORRÓ UNIVERSITÁRIO (aberto, populado) ──────────────────
  await page.goto(`${BASE}/eventos/forro-universitario-especial-sao-joao`, { waitUntil: 'networkidle2' })
  await shot(page, '05_evento_forro_detalhe.png')

  // Scroll para ver mais do evento
  await page.evaluate(() => window.scrollTo(0, 500))
  await shot(page, '05b_evento_forro_scroll.png', { fullPage: false })

  // ─── 6. EVENTO — ABA PARTICIPANTES ───────────────────────────────────────
  // Clica na aba Participantes
  await page.goto(`${BASE}/eventos/forro-universitario-especial-sao-joao`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[value="participantes"], button:has-text("Participantes")', { timeout: 5000 }).catch(() => {})
  // Tenta clicar na aba
  const tabClicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'))
    const tab = tabs.find(t => t.textContent?.includes('Participantes'))
    if (tab) { tab.click(); return true }
    return false
  })
  await new Promise(r => setTimeout(r, 1200))
  await shot(page, '06_evento_participantes.png')

  // ─── 7. EVENTO LOTADO — TREINO NOTURNO (fila de espera) ──────────────────
  await page.goto(`${BASE}/eventos/treino-noturno-vila-olimpia`, { waitUntil: 'networkidle2' })
  await shot(page, '07_evento_lotado.png')

  // Aba Participantes — fila de espera
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'))
    const tab = tabs.find(t => t.textContent?.includes('Participantes'))
    if (tab) tab.click()
  })
  await new Promise(r => setTimeout(r, 1200))
  await shot(page, '07b_evento_fila_espera.png')

  // Scroll para ver a seção da fila
  await page.evaluate(() => window.scrollTo(0, 1200))
  await shot(page, '07c_evento_fila_espera_scroll.png', { fullPage: false })

  // ─── 8. INSCRIÇÃO ────────────────────────────────────────────────────────
  // Evento Blues & Vinho — que tem vagas e tem preço
  await page.goto(`${BASE}/eventos/blues-vinho-uma-noite-especial`, { waitUntil: 'networkidle2' })
  await shot(page, '08_evento_blues.png')

  // Clica em Inscrever-se
  const inscBtn = await page.$('a[href*="inscricao"], button')
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('a, button'))
    const b = btns.find(b => b.textContent?.includes('Inscrever'))
    if (b) b.click()
  })
  await new Promise(r => setTimeout(r, 2000))
  await shot(page, '08b_evento_inscricao.png')

  // ─── 9. GRUPOS — LISTAGEM ────────────────────────────────────────────────
  await page.goto(`${BASE}/grupos`, { waitUntil: 'networkidle2' })
  await shot(page, '09_grupos_lista.png')

  await page.evaluate(() => window.scrollTo(0, 600))
  await shot(page, '09b_grupos_lista_scroll.png', { fullPage: false })

  // ─── 10. GRUPO DETALHE — JAZZ & BLUES ────────────────────────────────────
  await page.goto(`${BASE}/grupos/jazz-blues-brasil`, { waitUntil: 'networkidle2' })
  await shot(page, '10_grupo_jazz_detalhe.png')

  await page.evaluate(() => window.scrollTo(0, 500))
  await shot(page, '10b_grupo_jazz_scroll.png', { fullPage: false })

  // ─── 11. GRUPO — TECH & BEERS (com mais membros) ─────────────────────────
  await page.goto(`${BASE}/grupos/tech-beers-sp`, { waitUntil: 'networkidle2' })
  await shot(page, '11_grupo_tech.png')

  // ─── 12. GRUPO — MARKETPLACE ─────────────────────────────────────────────
  await page.goto(`${BASE}/grupos/jazz-blues-brasil/marketplace`, { waitUntil: 'networkidle2' })
  await shot(page, '12_marketplace.png')

  await page.evaluate(() => window.scrollTo(0, 500))
  await shot(page, '12b_marketplace_scroll.png', { fullPage: false })

  // Detalhe de um anúncio
  const listingLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="marketplace"]'))
    return links[0]?.href
  })
  if (listingLink) {
    await page.goto(listingLink, { waitUntil: 'networkidle2' })
    await shot(page, '12c_marketplace_anuncio.png')
  }

  // ─── 13. CORREDORES — MARKETPLACE ────────────────────────────────────────
  await page.goto(`${BASE}/grupos/corredores-de-sp/marketplace`, { waitUntil: 'networkidle2' })
  await shot(page, '13_marketplace_corredores.png')

  // ─── 14. GRUPO — CONFIGURAÇÕES ───────────────────────────────────────────
  // Precisa de um grupo que o usuário logado seja dono
  // Ana Silva é dona de "corredores-de-sp"
  await page.goto(`${BASE}/grupos/corredores-de-sp/configuracoes`, { waitUntil: 'networkidle2' })
  await shot(page, '14_grupo_configuracoes.png')

  // ─── 15. PERFIL PÚBLICO ──────────────────────────────────────────────────
  await page.goto(`${BASE}/u/ana_carolina`, { waitUntil: 'networkidle2' })
  await shot(page, '15_perfil_publico.png')

  await page.evaluate(() => window.scrollTo(0, 600))
  await shot(page, '15b_perfil_publico_scroll.png', { fullPage: false })

  // Perfil de outro usuário (com foto e eventos)
  await page.goto(`${BASE}/u/leo_cardoso`, { waitUntil: 'networkidle2' })
  await shot(page, '15c_perfil_leo.png')

  // ─── 16. MEU PERFIL / EDITAR ─────────────────────────────────────────────
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle2' })
  await shot(page, '16_editar_perfil.png')

  // ─── 17. CRIAR EVENTO ────────────────────────────────────────────────────
  await page.goto(`${BASE}/eventos/novo`, { waitUntil: 'networkidle2' })
  await shot(page, '17_criar_evento.png')

  await page.evaluate(() => window.scrollTo(0, 600))
  await shot(page, '17b_criar_evento_scroll.png', { fullPage: false })

  // ─── 18. CRIAR GRUPO ─────────────────────────────────────────────────────
  await page.goto(`${BASE}/grupos/novo`, { waitUntil: 'networkidle2' })
  await shot(page, '18_criar_grupo.png')

  // ─── 19. EVENTOS — ABA MEUS EVENTOS ──────────────────────────────────────
  await page.goto(`${BASE}/eventos?tab=meus`, { waitUntil: 'networkidle2' })
  await shot(page, '19_meus_eventos.png')

  // ─── 20. NOTIFICAÇÕES ────────────────────────────────────────────────────
  await page.goto(`${BASE}/notificacoes`, { waitUntil: 'networkidle2' })
  await shot(page, '20_notificacoes.png')

  // ─── 21. FINANCEIRO ──────────────────────────────────────────────────────
  // Ana é organizadora, deve ter financeiro
  await page.goto(`${BASE}/financeiro`, { waitUntil: 'networkidle2' })
  await shot(page, '21_financeiro.png')

  // ─── 22. EVENTO — DETALHES RICOS (Tech Talk, maior) ─────────────────────
  await page.goto(`${BASE}/eventos/techtalk-ia-generativa-no-dia-a-dia`, { waitUntil: 'networkidle2' })
  await shot(page, '22_evento_techtalk.png')

  // ─── 23. EVENTO — HACKATHON (grande, confirmado) ─────────────────────────
  await page.goto(`${BASE}/eventos/hackathon-24h-solucoes-para-o-clima`, { waitUntil: 'networkidle2' })
  await shot(page, '23_evento_hackathon.png')

  // ─── 24. SURFISTAS DE FLORIPA ────────────────────────────────────────────
  await page.goto(`${BASE}/grupos/surfistas-de-floripa`, { waitUntil: 'networkidle2' })
  await shot(page, '24_grupo_surfistas.png')

  // ─── 25. EMPREENDEDORES DIGITAIS ─────────────────────────────────────────
  await page.goto(`${BASE}/grupos/empreendedores-digitais`, { waitUntil: 'networkidle2' })
  await shot(page, '25_grupo_empreendedores.png')

  // ─── FIM ─────────────────────────────────────────────────────────────────
  await browser.close()

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'))
  console.log(`\n🎉 ${files.length} screenshots salvas em:\n   ${OUT}\n`)
  files.forEach(f => console.log(`   • ${f}`))
})()
