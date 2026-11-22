-- Dois jobs expiravam os convites vencidos da fila de espera a cada 5 minutos:
-- 'expire-waitlist' (process_waitlist_expiry: expira E chama o próximo da
-- fila) e o antigo 'waitlist-expiry' (só expira). Quando o antigo rodava
-- primeiro, o convite já estava EXPIRED quando process_waitlist_expiry
-- procurava, e o próximo da fila nunca era chamado. Fica só o completo.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'waitlist-expiry';
