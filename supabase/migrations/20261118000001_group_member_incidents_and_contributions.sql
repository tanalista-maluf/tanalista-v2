-- Substitui o sistema de critérios + nota 0-10 (group_rating_criteria,
-- group_rating_scores) e mini-missões (group_tasks, group_task_completions)
-- por um registro de ocorrências: "faltas" (leve/média/grave) e
-- "contribuições" (pequena/média/grande), cada uma com justificativa em
-- texto livre. Sem nota agregada nem critério configurável — menos
-- propenso a discussão sobre "quanto vale cada nota" do sistema anterior.
--
-- Ainda não há dado real lançado nessas tabelas (feature recém-criada),
-- por isso apaga em vez de migrar.
DROP TABLE IF EXISTS group_rating_scores;
DROP TABLE IF EXISTS group_rating_criteria;
DROP TABLE IF EXISTS group_task_completions;
DROP TABLE IF EXISTS group_tasks;

CREATE TYPE group_incident_severity AS ENUM ('LEVE', 'MEDIA', 'GRAVE');
CREATE TYPE group_contribution_size AS ENUM ('PEQUENA', 'MEDIA', 'GRANDE');

-- "Faltas": dono ou gestor registra quando um membro comete alguma falta,
-- com gravidade e justificativa — histórico pra decidir sobre casos
-- recorrentes (excluir ou banir fica a critério dos gestores, fora daqui).
CREATE TABLE group_member_incidents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  severity    group_incident_severity NOT NULL,
  description TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX group_member_incidents_member_idx ON group_member_incidents(group_id, member_id);

-- "Contribuições": mesma ideia, para quando um membro se destaca ou ajuda.
CREATE TABLE group_member_contributions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  size        group_contribution_size NOT NULL,
  description TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX group_member_contributions_member_idx ON group_member_contributions(group_id, member_id);

-- Mesmo padrão de acesso do restante do módulo de reputação: só o
-- service_role lê e grava, autorização (dono ou gestor) conferida em
-- código — nunca visível ao próprio avaliado nem aos demais membros.
ALTER TABLE group_member_incidents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member_contributions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON group_member_incidents     FROM anon, authenticated;
REVOKE ALL ON group_member_contributions FROM anon, authenticated;

GRANT ALL ON group_member_incidents     TO service_role;
GRANT ALL ON group_member_contributions TO service_role;
