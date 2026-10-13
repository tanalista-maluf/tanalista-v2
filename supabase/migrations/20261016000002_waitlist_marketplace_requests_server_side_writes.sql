-- Fila de espera, anúncios do marketplace e pedidos de entrada só são
-- gravados pelo servidor (service_role). As policies de escrita só conferiam
-- quem era o dono da linha, não o que estava sendo gravado:
--
-- - waitlist_entries: o usuário podia criar ou alterar a própria entrada com
--   qualquer status e posição. Marcando-se NOTIFIED, a confirmação de vaga o
--   inscrevia num evento lotado.
-- - marketplace_listings: dava para criar um anúncio já ACTIVE, ou reativar
--   um rascunho, sem pagar a taxa e sem o limite por grupo.
-- - event_join_requests / group_join_requests: dava para criar o próprio
--   pedido já APPROVED.
--
-- Nenhuma dessas tabelas é escrita pelo app com o cliente do usuário.
-- SELECT continua como está em todas.

DROP POLICY IF EXISTS "waitlist_insert"     ON waitlist_entries;
DROP POLICY IF EXISTS "waitlist_update_own" ON waitlist_entries;

DROP POLICY IF EXISTS "Membro cria anúncio no seu grupo" ON marketplace_listings;
DROP POLICY IF EXISTS "Dono edita/exclui seu anúncio"    ON marketplace_listings;

DROP POLICY IF EXISTS "insert own"       ON event_join_requests;
DROP POLICY IF EXISTS "organizer update" ON event_join_requests;

DROP POLICY IF EXISTS "insert own"   ON group_join_requests;
DROP POLICY IF EXISTS "admin update" ON group_join_requests;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON waitlist_entries, marketplace_listings, event_join_requests, group_join_requests
  FROM anon, authenticated;
