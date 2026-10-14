# TáNaLista mobile

App de iPhone e Android em React Native com Expo (SDK 57) e Expo Router.

## Como o app fala com o backend

- **Leituras** vão direto ao Supabase com a sessão do usuário (`src/lib/supabase.ts`). A RLS e os GRANTs por coluna do banco restringem o que cada um vê.
- **Escritas** passam pela API do site, em `/api/v1`, autenticadas com o token de acesso do Supabase no cabeçalho `Authorization: Bearer` (`src/lib/api.ts`). As regras de negócio ficam no servidor, nos mesmos módulos que as server actions do site usam.

Os tipos do banco são os do site: `../src/types/database.ts`.

## O que existe hoje

Cadastro (com onboarding: username, cidade e WhatsApp), login por e-mail e senha ou com Google, lista de próximos eventos, "Meus eventos", página do evento, inscrição em evento gratuito ou pago (cupom de desconto, PIX copia e cola, cartão de crédito ou saldo da carteira), escolha e troca de time, fila de espera (entrar, sair e confirmar a vaga reservada), cancelamento de inscrição, recuperação de senha e perfil com exclusão de conta. Evento privado aparece com o motivo de não dar para se inscrever pelo app. Barra de abas inferior (Eventos, Grupos, Perfil), botão de compartilhar em evento e grupo, e grupos: meus grupos, busca de grupos públicos, página do grupo (eventos e membros), entrar e sair, criar grupo, enviar convite de grupo privado e aprovar pedidos de entrada. Editar ou excluir grupo, comunicados, marketplace e criação de eventos continuam só no site.

## Configuração fora do código

- **Login com Google:** `tanalista://auth/callback` precisa estar em Authentication → URL Configuration → Redirect URLs do Supabase. Sem isso o Google volta para o site em vez do app.
- **Recuperação de senha:** usa o mesmo endereço de retorno. O link do e-mail só funciona no aparelho em que o pedido foi feito, com o app instalado.
- **Confirmação de e-mail do cadastro:** o link do e-mail abre `https://www.tanalista.app/app/email-confirmado`, que também precisa estar nas Redirect URLs.
- **Cartão:** o formulário é o Card Payment Brick do Mercado Pago, numa página do site (`/embed/cartao`) aberta em WebView; o app recebe só o token do cartão. Depende de `MERCADOPAGO_PLATFORM_PUBLIC_KEY` no site (a chave pública da mesma aplicação de `MERCADOPAGO_PLATFORM_ACCESS_TOKEN`). Sem ela, a opção de cartão não aparece nem no app nem no site.

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
# precisa do build próprio (o app usa módulos nativos fora do Expo Go); ver o cabeçalho de e2e/main-flow.yaml
eval "$(supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY)=')"
maestro test -e APP_ID=app.tanalista \
  -e APP_URL='exp+tanalista://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081' \
  -e SUPABASE_URL=$API_URL -e SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY e2e/main-flow.yaml
# recuperação de senha, times e fila de espera: mesmo comando com
#   -e MAILPIT_URL=http://127.0.0.1:54324 e2e/extras-flow.yaml (banco zerado antes: supabase db reset + seed)
# abas, grupos e compartilhar: e2e/groups-flow.yaml, também com o banco zerado
```
