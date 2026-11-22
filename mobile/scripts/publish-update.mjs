// Publica uma atualização pela internet (EAS Update) para quem já tem o app.
// Uso: npm run update -- "o que mudou"            (canal production)
//      npm run update -- "o que mudou" preview    (canal preview)
//
// A atualização é montada nesta máquina, não no servidor da Expo: as
// variáveis EXPO_PUBLIC_* saem do mesmo perfil do eas.json usado no build,
// para nunca publicar com o .env.local (backend local) nem sem o botão da
// Apple. Só chega aos aparelhos com o mesmo código nativo (runtimeVersion por
// fingerprint); mudança nativa (biblioteca nova, app.json) pede build novo.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const [message, channel = 'production'] = process.argv.slice(2)
if (!message) {
  console.error('Informe o que mudou: npm run update -- "Corrige ..."')
  process.exit(1)
}

const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'))
const profile = eas.build?.[channel]
if (!profile?.env) {
  console.error(`Perfil "${channel}" sem env no eas.json`)
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['eas-cli', 'update', '--channel', channel, '--environment', channel, '--message', message, '--non-interactive'],
  { stdio: 'inherit', env: { ...process.env, ...profile.env } }
)
process.exit(result.status ?? 1)
