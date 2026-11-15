-- Prazo de inscrição passa a ser opcional: em branco, as inscrições ficam
-- abertas até o início do evento (ver join-event.ts, mobile events/[id].tsx
-- e actions.ts, que já tratam NULL como "vale o starts_at"). O cancelamento
-- automático por mínimo não atingido em T-12h (job event-min-check) não
-- depende deste campo — continua baseado só em starts_at.
--
-- CHECK deadline_before_start (registration_deadline < starts_at) não
-- precisa mudar: NULL nunca viola um CHECK.
ALTER TABLE events ALTER COLUMN registration_deadline DROP NOT NULL;
