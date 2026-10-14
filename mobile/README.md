# TáNaLista mobile

App de iPhone e Android em React Native com Expo (SDK 57) e Expo Router.

## Como o app fala com o backend

- **Leituras** vão direto ao Supabase com a sessão do usuário (`src/lib/supabase.ts`). A RLS e os GRANTs por coluna do banco restringem o que cada um vê.
- **Escritas** passam pela API do site, em `/api/v1`, autenticadas com o token de acesso do Supabase no cabeçalho `Authorization: Bearer` (`src/lib/api.ts`). As regras de negócio ficam no servidor, nos mesmos módulos que as server actions do site usam.

Os tipos do banco são os do site: `../src/types/database.ts`.

## O que existe hoje

Cadastro (com onboarding: username, cidade e WhatsApp), login por e-mail e senha ou com Google, recuperação de senha. Barra de abas com Início (saudação, saldo, próximos eventos, atividade nos grupos), Eventos, Grupos e Perfil.

- **Eventos:** busca por nome e filtro por categoria, "Meus eventos" (próximos e concluídos), página do evento com capa, adicionar ao calendário, compartilhar, participantes, mural com enquetes, regras, ingresso com QR code para o check-in, fotos, avaliação de evento concluído e denúncia. Inscrição gratuita ou paga (cupom, PIX, cartão ou carteira), times, fila de espera, cancelamento e pedido de entrada em evento privado.
- **Grupos:** meus grupos, busca de grupos públicos, página do grupo (eventos e membros), entrar e sair, criar grupo, convite de grupo privado, aprovar pedidos de entrada e denúncia.
- **Perfil:** foto, dados pessoais, senha e e-mail, atividade da conta, perfil público (o próprio e o de outras pessoas), termos, política de privacidade e exclusão de conta.

Só no site: criar e gerenciar eventos (organizador), editar e excluir grupo, marketplace, carteira (depósito, saque, cupom de crédito), financeiro, notificações e o painel de admin. O envio de fotos de evento depende das variáveis do Cloudinary no servidor (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` e `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`); sem elas o botão não aparece.

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
# conta: e2e/account-flow.yaml; início e seções do evento: e2e/event-flow.yaml (banco zerado antes de cada um)
```
