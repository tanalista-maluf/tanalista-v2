-- Cupons de evento guardam o desconto como percentual, não como centavos
-- congelados, para que o desconto acompanhe reajustes de preço do evento
-- (ex.: cupom de 20% continua 20% mesmo que o evento mude de valor).
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS percent_off SMALLINT
    CHECK (percent_off IS NULL OR (percent_off BETWEEN 1 AND 100));
