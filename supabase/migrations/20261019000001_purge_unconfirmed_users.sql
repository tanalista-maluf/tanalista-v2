-- Limpeza automática de contas nunca confirmadas.
--
-- Bots criavam contas com e-mail de terceiros e nome aleatório, que ficavam
-- para sempre sem confirmação. Uma vez por dia, apaga quem se cadastrou por
-- e-mail há mais de 7 dias, nunca confirmou nem entrou. Login com Google e
-- Apple já nasce confirmado e não é afetado.
--
-- Conta com qualquer registro que impeça a exclusão (inscrição, evento,
-- grupo, pagamento, carteira, saque, cupom) fica de fora em vez de travar o
-- job. O perfil sai junto (profiles.id referencia auth.users com CASCADE).

CREATE OR REPLACE FUNCTION purge_unconfirmed_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  removed INTEGER;
BEGIN
  WITH gone AS (
    DELETE FROM auth.users u
    WHERE u.email_confirmed_at IS NULL
      AND u.last_sign_in_at IS NULL
      AND u.created_at < now() - INTERVAL '7 days'
      AND COALESCE(u.raw_app_meta_data->>'provider', 'email') = 'email'
      AND NOT EXISTS (SELECT 1 FROM public.participations x WHERE x.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.events x WHERE x.organizer_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.groups x WHERE x.owner_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.payments x WHERE x.payer_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.wallet_transactions x WHERE x.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.withdrawals x WHERE x.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM public.coupon_uses x WHERE x.user_id = u.id)
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM gone;

  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION purge_unconfirmed_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION purge_unconfirmed_users() TO service_role;

-- Todo dia às 07:00 UTC (04:00 em Brasília)
SELECT cron.schedule(
  'purge-unconfirmed-users',
  '0 7 * * *',
  $$ SELECT purge_unconfirmed_users(); $$
);
