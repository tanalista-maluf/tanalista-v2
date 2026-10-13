# TáNaLista mobile

App de iPhone e Android em React Native com Expo (SDK 57) e Expo Router.

## Como o app fala com o backend

- **Leituras** vão direto ao Supabase com a sessão do usuário (`src/lib/supabase.ts`). A RLS e os GRANTs por coluna do banco restringem o que cada um vê.
- **Escritas** passam pela API do site, em `/api/v1`, autenticadas com o token de acesso do Supabase no cabeçalho `Authorization: Bearer` (`src/lib/api.ts`). As regras de negócio ficam no servidor, nos mesmos módulos que as server actions do site usam.

Os tipos do banco são os do site: `../src/types/database.ts`.

## O que existe hoje

Login por e-mail e senha, lista de próximos eventos, "Meus eventos", página do evento, inscrição em evento gratuito ou pago (cupom de desconto, PIX copia e cola ou saldo da carteira) e cancelamento de inscrição. Evento privado ou lotado aparece com o motivo de não dar para se inscrever pelo app. Cartão, escolha de time e fila de espera ainda são só pelo site.

## Rodar localmente

```sh
./e2e/setup-local.sh        # Supabase local, .env.local do site e do app, dados de teste
(cd .. && npm run dev)      # site, que serve a API, em http://localhost:3000
npx expo start --ios        # app no simulador, via Expo Go
```

Sem `.env.local`, o app usa o `.env` versionado, que aponta para **produção**. O `setup-local.sh` cria um `.env.local`, que tem precedência; apague-o para voltar a produção. No Android, o emulador alcança os serviços locais com `adb reverse tcp:54321 tcp:54321 && adb reverse tcp:3000 tcp:3000`.

## Verificações

```sh
npx tsc --noEmit
npx expo lint
# precisa do build próprio (o app usa expo-clipboard); ver o cabeçalho de e2e/main-flow.yaml
eval "$(supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY)=')"
maestro test -e APP_ID=app.tanalista \
  -e APP_URL='exp+tanalista://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081' \
  -e SUPABASE_URL=$API_URL -e SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY e2e/main-flow.yaml
```
