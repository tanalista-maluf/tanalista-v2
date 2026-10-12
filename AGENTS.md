<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mudanças no banco de dados

O banco de produção é o projeto Supabase linkado em `supabase/`. O histórico
de migrations dele precisa bater com `supabase/migrations/`.

- Toda mudança de schema, policy, grant, função ou job do pg_cron é um arquivo
  novo em `supabase/migrations/`, commitado junto com o código que depende dele.
- Aplique com `supabase db push`. Nunca rode SQL de schema direto no SQL Editor
  do dashboard nem com `supabase db query`.
- Se um SQL já foi rodado direto no banco, registre a migration correspondente
  com `supabase migration repair --status applied <versão>` na mesma sessão.
- Antes de aplicar, rode `supabase migration list --linked`: toda linha deve
  ter as colunas Local e Remote preenchidas, exceto a migration nova.
- Não edite nem apague uma migration que já está no histórico remoto; corrija
  com uma migration nova.
- `anon` e `authenticated` têm GRANT por coluna em `profiles` e `events`, e
  nenhuma escrita em `participations`, `coupons` e `coupon_uses`. Coluna nova
  nessas tabelas nasce sem acesso pela API; escritas passam pelo service_role.
- Aplicar migration em produção exige confirmação explícita do usuário.
