#!/bin/sh
# Prepara um ambiente LOCAL para rodar o app e o teste de ponta a ponta:
# sobe o Supabase local, grava os .env.local do site e do app apontando para
# ele e cria usuários e eventos de teste. Nada aqui toca em produção.
set -e
cd "$(dirname "$0")/../.."

supabase start -x studio,imgproxy,mailpit,logflare,vector,realtime,storage-api,edge-runtime,supavisor,postgres-meta
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

cat > .env.local <<ENV
# Ambiente LOCAL (supabase start). Não é o banco de produção.
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
# cobrança PIX de mentira: sem credenciais do Mercado Pago no ambiente local
MERCADOPAGO_STUB=1
ENV

cat > mobile/.env.local <<ENV
# Ambiente LOCAL (supabase start + next dev). Não é produção.
EXPO_PUBLIC_SUPABASE_URL=$API_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
ENV

API_URL="$API_URL" SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" python3 mobile/e2e/seed-local.py
