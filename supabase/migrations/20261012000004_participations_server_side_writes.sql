-- Inscrições só são criadas ou alteradas pelo servidor (service_role).
--
-- "participations_insert" e "participations_update_own" só conferiam
-- user_id = auth.uid(). Direto pela API, o usuário podia criar a própria
-- inscrição já como CONFIRMED em evento pago, ou trocar PENDING por
-- CONFIRMED sem pagar — além de furar lotação e prazo e gravar
-- discount_cents. Todo fluxo legítimo (evento gratuito, carteira, PIX,
-- cartão, webhook do Mercado Pago, fila de espera) já grava via service_role.
--
-- SELECT continua como está: a tela de pagamento consulta o status da
-- própria inscrição pelo navegador.

DROP POLICY IF EXISTS "participations_insert"     ON participations;
DROP POLICY IF EXISTS "participations_update_own" ON participations;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON participations FROM anon, authenticated;
