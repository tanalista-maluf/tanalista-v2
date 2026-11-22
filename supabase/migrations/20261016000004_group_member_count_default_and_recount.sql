-- Contador de membros dos grupos: corrige o valor inicial e recalcula.
--
-- groups.member_count nascia com 1, contando o dono por antecipação, mas o
-- trigger sync_group_member_count soma 1 de novo quando o dono é inserido em
-- group_members: todo grupo recém-criado mostrava 2 membros tendo 1.
-- (O outro defeito — entradas de quem não é o dono não eram contadas — foi
-- corrigido em 20261016000001, que tornou o trigger SECURITY DEFINER.)
ALTER TABLE groups ALTER COLUMN member_count SET DEFAULT 0;

-- Recalcula os grupos que já estavam com o contador errado
UPDATE groups g
SET member_count = (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id)
WHERE g.member_count <> (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id);
