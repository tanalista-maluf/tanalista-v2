-- Cupons deixam de ser acessíveis pela API pública.
--
-- "coupons_select" deixava qualquer usuário logado listar todos os cupons
-- ativos, com os códigos — inclusive os que viram crédito de carteira. Nenhum
-- código do app lê coupons ou coupon_uses com o cliente do usuário: validação,
-- resgate e listagem para o organizador passam pelo service_role.

DROP POLICY IF EXISTS "coupons_select" ON coupons;

REVOKE ALL ON coupons     FROM anon, authenticated;
REVOKE ALL ON coupon_uses FROM anon, authenticated;
