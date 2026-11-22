-- Arquivar uma mini-missão feita há tempos esconde ela da lista principal
-- de gerenciamento e do painel do membro (sem apagar o histórico de
-- cumprimentos, que continua contando na média) — diferente de só
-- desativar, que mantém a missão visível na lista normal, só sem permitir
-- novos cumprimentos. Arquivar também desativa; desarquivar não reativa
-- sozinho, o gestor decide separadamente se ela volta a valer.
ALTER TABLE group_tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
