-- Cupom de grupo: 1 uso por evento, não 1 uso na vida do cupom.
--
-- 20261014000001 adicionou coupon_uses.event_id para isso, mas a unicidade
-- continuou sendo (coupon_id, user_id). O registro do uso num segundo evento
-- do grupo era rejeitado — e, como o código não confere o erro desse insert,
-- o desconto era aplicado sem o uso ficar registrado.
--
-- NULLS NOT DISTINCT mantém a regra antiga para usos sem evento (resgate de
-- cupom de plataforma na carteira, event_id nulo): continua 1 por usuário.
ALTER TABLE coupon_uses
  DROP CONSTRAINT IF EXISTS coupon_uses_coupon_id_user_id_key;

ALTER TABLE coupon_uses
  ADD CONSTRAINT coupon_uses_coupon_user_event_key
  UNIQUE NULLS NOT DISTINCT (coupon_id, user_id, event_id);
