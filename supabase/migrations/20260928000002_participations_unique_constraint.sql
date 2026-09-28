-- Evita corrida em inscrição duplicada: a checagem de "já inscrito" era feita
-- via SELECT antes do INSERT no código da aplicação, sem garantia no banco.
-- Dois cliques quase simultâneos podiam, em teoria, criar duas participações
-- para o mesmo usuário no mesmo evento.
ALTER TABLE participations
  ADD CONSTRAINT participations_event_user_unique UNIQUE (event_id, user_id);
