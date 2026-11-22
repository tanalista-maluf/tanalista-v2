-- Ajuste único: devolve os usos de cupom presos em inscrições canceladas.
--
-- Até o cancelamento passar a devolver o cupom, cancelar uma inscrição só
-- mudava o status: o registro em coupon_uses ficava, e a pessoa recebia
-- "Você já utilizou este cupom" ao tentar se inscrever de novo.
--
-- Para cada inscrição CANCELLED que ainda aponta para um cupom: apaga o uso
-- daquele cupom, usuário e evento, decrementa uses_count e limpa cupom e
-- desconto da inscrição. Rodar de novo não faz nada.
WITH stale AS (
  SELECT id AS participation_id, coupon_id, user_id, event_id
  FROM participations
  WHERE status = 'CANCELLED' AND coupon_id IS NOT NULL
),
deleted AS (
  DELETE FROM coupon_uses cu
  USING stale s
  WHERE cu.coupon_id = s.coupon_id
    AND cu.user_id = s.user_id
    AND cu.event_id = s.event_id
  RETURNING cu.coupon_id
),
counted AS (
  SELECT coupon_id, count(*) AS released FROM deleted GROUP BY coupon_id
),
decremented AS (
  UPDATE coupons c
  SET uses_count = GREATEST(0, c.uses_count - counted.released)
  FROM counted
  WHERE c.id = counted.coupon_id
  RETURNING c.id
)
UPDATE participations pt
SET coupon_id = NULL, discount_cents = 0
FROM stale s
WHERE pt.id = s.participation_id
RETURNING pt.id;
