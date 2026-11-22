-- Restringe por coluna o que anon/authenticated leem e gravam em events.
--
-- Leitura: "events_select" libera todo evento não-rascunho para qualquer
-- requisição, e o privilégio era da tabela inteira — o que incluía
-- mp_access_token, o token do Mercado Pago do organizador.
--
-- Escrita: "events_update_organizer" só confere organizer_id, então o
-- organizador podia, direto pela API, zerar payout_claimed_at (e resgatar a
-- receita do mesmo evento de novo), ou alterar status, confirmed_count e
-- rating_*. Agora só as colunas do formulário de evento são graváveis; as
-- demais mudam apenas via service_role, triggers ou pg_cron.
--
-- Como em profiles: REVOKE na tabela + GRANT por coluna. Toda coluna nova em
-- events nasce sem acesso para anon/authenticated e precisa de GRANT explícito.

REVOKE ALL ON events FROM anon, authenticated;

GRANT SELECT (
  id, group_id, organizer_id, title, slug, description, cover_url, address,
  city, category, status, price, capacity, min_participants, waitlist_capacity,
  starts_at, ends_at, registration_deadline, min_check_at, organizer_exempt,
  visibility, invite_token, confirmed_count, rating_average, rating_count,
  cancel_before_hours, custom_rules, recurrence_rule, parent_event_id,
  recurrence_index, payout_claimed_at, search_vec, created_at, updated_at
) ON events TO anon, authenticated;

GRANT INSERT (
  group_id, organizer_id, title, slug, description, address, city, category,
  price, capacity, min_participants, waitlist_capacity, starts_at, ends_at,
  registration_deadline, min_check_at, organizer_exempt, visibility,
  cancel_before_hours, status
) ON events TO authenticated;

GRANT UPDATE (
  title, slug, description, address, city, category, price, capacity,
  min_participants, waitlist_capacity, starts_at, ends_at,
  registration_deadline, min_check_at, organizer_exempt, visibility,
  cancel_before_hours, invite_token
) ON events TO authenticated;

-- Estes triggers gravam colunas denormalizadas de events que o usuário não
-- pode mais alterar. Rodando como o chamador, falhariam com permission denied
-- quando disparados por uma escrita feita com o cliente do usuário.
ALTER FUNCTION update_event_rating_stats()    SECURITY DEFINER SET search_path = public;
ALTER FUNCTION update_event_confirmed_count() SECURITY DEFINER SET search_path = public;
