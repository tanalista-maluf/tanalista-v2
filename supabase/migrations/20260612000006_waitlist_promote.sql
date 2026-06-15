-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 8: Funções de promoção da fila de espera
-- ─────────────────────────────────────────────────────────────────────────────

-- Promove o próximo WAITING para NOTIFIED quando uma vaga abre
CREATE OR REPLACE FUNCTION promote_waitlist_next(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next           RECORD;
  v_window_minutes INT;
BEGIN
  SELECT value::INT INTO v_window_minutes
  FROM platform_config WHERE key = 'waitlist_pix_window_min';
  v_window_minutes := COALESCE(v_window_minutes, 180);

  SELECT id, user_id INTO v_next
  FROM waitlist_entries
  WHERE event_id = p_event_id AND status = 'WAITING'
  ORDER BY position ASC
  LIMIT 1;

  IF v_next IS NULL THEN RETURN; END IF;

  UPDATE waitlist_entries
  SET status      = 'NOTIFIED',
      notified_at = now(),
      expires_at  = now() + (v_window_minutes || ' minutes')::INTERVAL
  WHERE id = v_next.id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_next.user_id,
    'WAITLIST_PROMOTED',
    'Vaga disponível! 🎉',
    'Uma vaga abriu no evento que você aguardava. Confirme sua inscrição antes do prazo expirar.',
    jsonb_build_object(
      'event_id',         p_event_id,
      'waitlist_entry_id', v_next.id,
      'expires_minutes',  v_window_minutes
    )
  );
END;
$$;

-- Expira entradas NOTIFIED vencidas e promove o próximo da fila
-- Substitui o cron simples de UPDATE; chamada a cada 5min pelo pg_cron
CREATE OR REPLACE FUNCTION process_waitlist_expiry()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id, event_id
    FROM waitlist_entries
    WHERE status = 'NOTIFIED' AND expires_at < now()
  LOOP
    UPDATE waitlist_entries SET status = 'EXPIRED' WHERE id = v_row.id;
    PERFORM promote_waitlist_next(v_row.event_id);
  END LOOP;
END;
$$;

-- Atualizar o job do pg_cron para usar a nova função (remove o anterior se existir)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'expire-waitlist';
SELECT cron.schedule(
  'expire-waitlist',
  '*/5 * * * *',
  $$ SELECT process_waitlist_expiry() $$
);
