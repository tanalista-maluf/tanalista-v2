-- ═══════════════════════════════════════════════════════
-- MIGRATION 0005 — pg_cron Jobs e Seed PLATFORM_CONFIG
-- Doc 15 Adendo 01: 5 jobs agendados
-- ═══════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- JOB 1: Expirar entradas da fila notificadas há mais de 3h
-- Roda a cada 5 minutos
-- ──────────────────────────────────────────────────────
SELECT cron.schedule(
  'waitlist-expiry',
  '*/5 * * * *',
  $$
    UPDATE waitlist_entries
    SET status = 'EXPIRED'
    WHERE status = 'NOTIFIED'
      AND expires_at < now();
  $$
);

-- ──────────────────────────────────────────────────────
-- JOB 2: Completar automaticamente eventos encerrados
-- Roda a cada hora
-- ──────────────────────────────────────────────────────
SELECT cron.schedule(
  'event-auto-complete',
  '0 * * * *',
  $$
    UPDATE events
    SET status = 'COMPLETED'
    WHERE status = 'CONFIRMED'
      AND starts_at < now() - INTERVAL '2 hours';
  $$
);

-- ──────────────────────────────────────────────────────
-- JOB 3: Verificar mínimo de participantes em T-12h
-- Roda a cada 15 minutos
-- Doc 15 Adendo 02: cancelamento automático se abaixo do mínimo
-- ──────────────────────────────────────────────────────
SELECT cron.schedule(
  'event-min-check',
  '*/15 * * * *',
  $$
    -- Marcar como PENDING eventos que chegaram em T-12h e estão OPEN
    UPDATE events
    SET status = 'PENDING'
    WHERE status = 'OPEN'
      AND min_check_at <= now()
      AND min_check_at > now() - INTERVAL '15 minutes';

    -- Cancelar eventos PENDING com participantes abaixo do mínimo
    UPDATE events e
    SET status = 'CANCELLED'
    FROM (
      SELECT event_id, COUNT(*) AS cnt
      FROM participations
      WHERE status = 'CONFIRMED'
      GROUP BY event_id
    ) p
    WHERE e.id = p.event_id
      AND e.status = 'PENDING'
      AND p.cnt < e.min_participants;
  $$
);

-- ──────────────────────────────────────────────────────
-- JOB 4: Limpar pagamentos PIX pendentes há mais de 30min
-- Roda a cada 10 minutos
-- ──────────────────────────────────────────────────────
SELECT cron.schedule(
  'pending-payment-cleanup',
  '*/10 * * * *',
  $$
    UPDATE payments
    SET status = 'CANCELLED'
    WHERE status = 'PENDING'
      AND method = 'PIX'
      AND created_at < now() - INTERVAL '30 minutes';
  $$
);

-- ──────────────────────────────────────────────────────
-- JOB 5: Processar repasses pendentes ao organizador
-- Roda diariamente às 02:00 (menor tráfego)
-- ──────────────────────────────────────────────────────
SELECT cron.schedule(
  'payout-processor',
  '0 2 * * *',
  $$
    -- Este job apenas sinaliza eventos elegíveis para repasse.
    -- O processamento real (chamada à API MP) ocorre via Edge Function.
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      e.organizer_id,
      'PAYOUT_PROCESSED',
      'Repasse disponível',
      'O repasse do seu evento "' || e.title || '" está sendo processado.',
      jsonb_build_object('event_id', e.id)
    FROM events e
    WHERE e.status = 'COMPLETED'
      AND NOT EXISTS (
        SELECT 1 FROM wallet_transactions wt
        WHERE wt.event_id = e.id AND wt.type = 'PAYOUT'
      );
  $$
);

-- ──────────────────────────────────────────────────────
-- SEED: PLATFORM_CONFIG
-- Doc 15 Adendo 01: parâmetros configuráveis da plataforma
-- ──────────────────────────────────────────────────────
INSERT INTO platform_config (key, value, description) VALUES
  ('platform_fee_percent',     '5',       'Taxa da plataforma sobre o valor do ingresso (%)'),
  ('gateway_fee_pix_percent',  '0.99',    'Taxa do gateway para PIX (%)'),
  ('gateway_fee_cc_percent',   '2.99',    'Taxa do gateway para cartão de crédito (%)'),
  ('min_withdrawal_amount',    '1000',    'Valor mínimo para saque da carteira (centavos)'),
  ('max_withdrawal_amount',    '500000',  'Valor máximo por saque (centavos)'),
  ('waitlist_pix_window_min',  '180',     'Janela para pagamento PIX na fila de espera (minutos)'),
  ('pix_payment_window_min',   '30',      'Janela para pagamento PIX em inscrições normais (minutos)'),
  ('min_check_hours_before',   '12',      'Horas antes do início para verificação de mínimo de participantes'),
  ('min_cancel_hours_before',  '12',      'Horas mínimas de antecedência para cancelamento pelo participante')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();
