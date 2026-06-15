-- Requer extensão pg_cron (disponível no Supabase)
-- Em local dev, chamar o endpoint manualmente

-- Agendamento: a cada hora, chama a rota de lembretes
-- Descomentado apenas em produção (pg_cron disponível no Supabase hosted)
/*
SELECT cron.schedule(
  'send-event-reminders',
  '0 * * * *',  -- toda hora
  $$
  SELECT net.http_post(
    url := current_setting('app.url') || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);
*/

-- Configurar as variáveis em produção via:
-- ALTER DATABASE postgres SET app.url = 'https://tanalista.com.br';
-- ALTER DATABASE postgres SET app.cron_secret = 'your-secret';
