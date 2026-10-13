# TáNaLista mobile

App de iPhone e Android em React Native com Expo (SDK 57) e Expo Router.

## Como o app fala com o backend

- **Leituras** vão direto ao Supabase com a sessão do usuário (`src/lib/supabase.ts`). A RLS e os GRANTs por coluna do banco restringem o que cada um vê.
- **Escritas** passam pela API do site, em `/api/v1`, autenticadas com o token de acesso do Supabase no cabeçalho `Authorization: Bearer` (`src/lib/api.ts`). As regras de negócio ficam no servidor, nos mesmos módulos que as server actions do site usam.

Os tipos do banco são os do site: `../src/types/database.ts`.

## O que existe hoje

Login por e-mail e senha, lista de próximos eventos, página do evento e inscrição em evento gratuito. Evento pago, privado ou lotado aparece com o motivo de não dar para se inscrever pelo app.

## Rodar localmente

```sh
./e2e/setup-local.sh        # Supabase local, .env.local do site e do app, dados de teste
(cd .. && npm run dev)      # site, que serve a API, em http://localhost:3000
npx expo start --ios        # app no simulador, via Expo Go
```

Para apontar o app para outro ambiente, copie `.env.example` para `.env.local` e preencha.

## Verificações

```sh
npx tsc --noEmit
npx expo lint
maestro test e2e/main-flow.yaml   # com os três comandos acima rodando
```
