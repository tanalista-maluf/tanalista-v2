// Gera o "Secret Key" do provedor Apple no Supabase (JWT ES256, vale ~6 meses).
// Uso: node scripts/apple-secret.mjs <caminho do .p8> | pbcopy
// Cole o resultado em Supabase > Authentication > Sign In / Providers > Apple >
// Secret Key (for OAuth). A Apple não aceita segredo com mais de 6 meses.
import { createPrivateKey, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const TEAM_ID = 'AP3ZSN49YZ'
const KEY_ID = '7V82S26U5L'
const CLIENT_ID = 'app.tanalista.web'

const path = process.argv[2]
if (!path) {
  console.error('Informe o caminho do arquivo .p8')
  process.exit(1)
}

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' }
const payload = { iss: TEAM_ID, iat: now, exp: now + 180 * 24 * 3600, aud: 'https://appleid.apple.com', sub: CLIENT_ID }
const input = `${b64url(header)}.${b64url(payload)}`
const key = createPrivateKey(readFileSync(path))
const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')

process.stdout.write(`${input}.${signature}`)
const expires = new Date((now + 180 * 24 * 3600) * 1000).toISOString().slice(0, 10)
console.error(`Segredo copiado. Vence em ${expires}: gere outro antes disso.`)
