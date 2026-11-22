-- Sistema de reputação de membros, privado (só dono/gestores do grupo
-- veem — nunca o próprio avaliado nem os demais membros): critérios
-- abertos definidos pelo dono, nota de 0 a 10 de cada gestor por
-- critério, e mini-missões que valem nota 10 automática quando
-- cumpridas. A nota final de um membro é a média de todas as notas de
-- todos os critérios (de todos os gestores) mais um 10 para cada
-- cumprimento de missão — calculada em código (ver
-- features/reputacao/queries.ts), não armazenada, porque o volume por
-- grupo é pequeno. Gestor que ainda não votou num critério simplesmente
-- não tem linha em group_rating_scores: a média ignora ausências, nunca
-- pune por falta de voto.
--
-- Só o servidor (service_role) lê e grava — a autorização (dono cria
-- critério; dono ou gestor vota, cria missão e marca cumprimento) é
-- conferida em código, no mesmo padrão das demais ações de grupo.

CREATE TABLE IF NOT EXISTS group_rating_criteria (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_by UUID        NOT NULL REFERENCES profiles(id),
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_rating_criteria_group_idx ON group_rating_criteria(group_id);

-- Um gestor tem no máximo uma nota vigente por critério+membro — pode
-- atualizar o próprio voto, não acumula histórico de votos antigos.
CREATE TABLE IF NOT EXISTS group_rating_scores (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id UUID        NOT NULL REFERENCES group_rating_criteria(id) ON DELETE CASCADE,
  group_id     UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_by     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score        SMALLINT    NOT NULL CHECK (score BETWEEN 0 AND 10),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (criterion_id, member_id, rated_by)
);

CREATE INDEX IF NOT EXISTS group_rating_scores_member_idx ON group_rating_scores(group_id, member_id);

-- Mini-missões: campos abertos (título + descrição livre), criadas por
-- dono ou gestor. Podem repetir — cada cumprimento é uma linha própria
-- em group_task_completions, valendo outra nota 10 na média.
CREATE TABLE IF NOT EXISTS group_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_tasks_group_idx ON group_tasks(group_id);

CREATE TABLE IF NOT EXISTS group_task_completions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID        NOT NULL REFERENCES group_tasks(id) ON DELETE CASCADE,
  group_id     UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  marked_by    UUID        NOT NULL REFERENCES profiles(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_task_completions_member_idx ON group_task_completions(group_id, member_id);

ALTER TABLE group_rating_criteria   ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_rating_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_task_completions  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON group_rating_criteria   FROM anon, authenticated;
REVOKE ALL ON group_rating_scores     FROM anon, authenticated;
REVOKE ALL ON group_tasks             FROM anon, authenticated;
REVOKE ALL ON group_task_completions  FROM anon, authenticated;

GRANT ALL ON group_rating_criteria   TO service_role;
GRANT ALL ON group_rating_scores     TO service_role;
GRANT ALL ON group_tasks             TO service_role;
GRANT ALL ON group_task_completions  TO service_role;

-- Registros de velocidade de cronagem e afins: cada grupo define os
-- campos que quer acompanhar (nome, unidade), e cada medição vira uma
-- linha datada — histórico, não só o valor mais recente. Mesma
-- visibilidade e padrão de acesso acima.
CREATE TABLE IF NOT EXISTS group_member_fields (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL,
  unit       TEXT,
  created_by UUID        NOT NULL REFERENCES profiles(id),
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_member_fields_group_idx ON group_member_fields(group_id);

CREATE TABLE IF NOT EXISTS group_member_field_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    UUID        NOT NULL REFERENCES group_member_fields(id) ON DELETE CASCADE,
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value       TEXT        NOT NULL,
  recorded_at DATE        NOT NULL,
  recorded_by UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_member_field_entries_member_idx ON group_member_field_entries(group_id, member_id, field_id);

ALTER TABLE group_member_fields         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member_field_entries  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON group_member_fields         FROM anon, authenticated;
REVOKE ALL ON group_member_field_entries  FROM anon, authenticated;

GRANT ALL ON group_member_fields         TO service_role;
GRANT ALL ON group_member_field_entries  TO service_role;
