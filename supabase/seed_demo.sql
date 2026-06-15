-- ═══════════════════════════════════════════════════════
-- SEED DEMO — 20 usuários + 15 eventos + participações
-- ═══════════════════════════════════════════════════════

-- Limpa dados de demo anteriores (preserva o usuário real)
DO $$
DECLARE
  real_user_id UUID;
BEGIN
  SELECT id INTO real_user_id FROM auth.users WHERE email = 'r.maluf@gmail.com' LIMIT 1;

  DELETE FROM waitlist_entries;
  DELETE FROM participations;
  DELETE FROM events;
  DELETE FROM group_members WHERE user_id != real_user_id;
  DELETE FROM groups WHERE owner_id != real_user_id;
  DELETE FROM profiles WHERE id != real_user_id;
  DELETE FROM auth.users WHERE email != 'r.maluf@gmail.com';
END $$;

-- ─────────────────────────────────────────────────────
-- 20 USUÁRIOS FICTÍCIOS
-- ─────────────────────────────────────────────────────
DO $$
DECLARE
  users TEXT[][] := ARRAY[
    ['lucio.wagner@email.com',      'Lucio Wagner',       'lucio_wagner',    'Porto Alegre'],
    ['peu.holder@email.com',        'Peu Holder',         'peu_holder',      'São Paulo'],
    ['rafael.barcellos@email.com',  'Rafael Barcellos',   'rafael_b',        'Rio de Janeiro'],
    ['guilherme.grimaldi@email.com','Guilherme Grimaldi',  'ggrimaldi',       'São Paulo'],
    ['diego.timmers@email.com',     'Diego Timmers',      'diego_t',         'Curitiba'],
    ['eduardo.hauck@email.com',     'Eduardo Hauck',      'eduhauck',        'Porto Alegre'],
    ['fernanda.costa@email.com',    'Fernanda Costa',     'fecosta',         'São Paulo'],
    ['mariana.lima@email.com',      'Mariana Lima',       'mariana_lima',    'Belo Horizonte'],
    ['thiago.mendes@email.com',     'Thiago Mendes',      'tmendes',         'Rio de Janeiro'],
    ['carolina.alves@email.com',    'Carolina Alves',     'carol_alves',     'São Paulo'],
    ['rodrigo.farias@email.com',    'Rodrigo Farias',     'rod_farias',      'Florianópolis'],
    ['amanda.souza@email.com',      'Amanda Souza',       'amanda_s',        'São Paulo'],
    ['pedro.nunes@email.com',       'Pedro Nunes',        'pedro_nunes',     'Recife'],
    ['julia.santos@email.com',      'Julia Santos',       'ju_santos',       'São Paulo'],
    ['marco.vieira@email.com',      'Marco Vieira',       'mvieira',         'Porto Alegre'],
    ['isabela.rocha@email.com',     'Isabela Rocha',      'isa_rocha',       'Curitiba'],
    ['andre.pires@email.com',       'André Pires',        'andrepires',      'São Paulo'],
    ['camila.ferreira@email.com',   'Camila Ferreira',    'camila_f',        'Rio de Janeiro'],
    ['gustavo.melo@email.com',      'Gustavo Melo',       'gus_melo',        'Belo Horizonte'],
    ['leticia.campos@email.com',    'Letícia Campos',     'le_campos',       'São Paulo']
  ];
  u TEXT[];
  new_user_id UUID;
BEGIN
  FOREACH u SLICE 1 IN ARRAY users LOOP
    -- Pula se já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = u[1]) THEN
      CONTINUE;
    END IF;

    -- Cria usuário no auth
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, aud, role
    ) VALUES (
      uuid_generate_v4(),
      u[1],
      crypt('Demo@12345', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', u[2]),
      now(), now(), 'authenticated', 'authenticated'
    )
    RETURNING id INTO new_user_id;

    IF new_user_id IS NOT NULL THEN
      INSERT INTO profiles (id, full_name, username, city, wallet_balance, onboarding_completed)
      VALUES (
        new_user_id, u[2], u[3], u[4],
        (floor(random() * 50000 + 500))::BIGINT,
        TRUE
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────
-- GRUPOS
-- ─────────────────────────────────────────────────────
DO $$
DECLARE
  real_user UUID;
  u1 UUID; u2 UUID; u3 UUID; u4 UUID;
  g1 UUID; g2 UUID; g3 UUID; g4 UUID; g5 UUID;
BEGIN
  SELECT id INTO real_user FROM profiles WHERE username = 'sabom' LIMIT 1;
  SELECT id INTO u1 FROM profiles WHERE username = 'lucio_wagner';
  SELECT id INTO u2 FROM profiles WHERE username = 'peu_holder';
  SELECT id INTO u3 FROM profiles WHERE username = 'rafael_b';
  SELECT id INTO u4 FROM profiles WHERE username = 'ggrimaldi';

  -- Grupo 1: do usuário real
  IF real_user IS NOT NULL THEN
    INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
    VALUES (uuid_generate_v4(), real_user, 'Galera do Airsoft', 'Grupo de airsoft de Porto Alegre. Jogos toda semana!', 'PUBLIC', 'Esportes', 'Porto Alegre')
    RETURNING id INTO g1;

    INSERT INTO group_members (group_id, user_id, role) VALUES (g1, real_user, 'OWNER') ON CONFLICT DO NOTHING;
    IF u1 IS NOT NULL THEN INSERT INTO group_members (group_id, user_id) VALUES (g1, u1) ON CONFLICT DO NOTHING; END IF;
    IF u2 IS NOT NULL THEN INSERT INTO group_members (group_id, user_id) VALUES (g1, u2) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Grupo 2: Lucio Wagner
  IF u1 IS NOT NULL THEN
    INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
    VALUES (uuid_generate_v4(), u1, 'Tech Beers SP', 'Happy hour mensal para devs de SP', 'PUBLIC', 'Tecnologia', 'São Paulo')
    RETURNING id INTO g2;
    INSERT INTO group_members (group_id, user_id, role) VALUES (g2, u1, 'OWNER') ON CONFLICT DO NOTHING;
    IF u2 IS NOT NULL THEN INSERT INTO group_members (group_id, user_id) VALUES (g2, u2) ON CONFLICT DO NOTHING; END IF;
    IF u3 IS NOT NULL THEN INSERT INTO group_members (group_id, user_id) VALUES (g2, u3) ON CONFLICT DO NOTHING; END IF;
    IF u4 IS NOT NULL THEN INSERT INTO group_members (group_id, user_id) VALUES (g2, u4) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Grupo 3: Peu Holder
  IF u2 IS NOT NULL THEN
    INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
    VALUES (uuid_generate_v4(), u2, 'Trilheiros SP', 'Trilhas e aventuras na serra', 'PUBLIC', 'Esportes', 'São Paulo')
    RETURNING id INTO g3;
    INSERT INTO group_members (group_id, user_id, role) VALUES (g3, u2, 'OWNER') ON CONFLICT DO NOTHING;
  END IF;

  -- Grupo 4: Rafael
  IF u3 IS NOT NULL THEN
    INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
    VALUES (uuid_generate_v4(), u3, 'Churrasco Carioca', 'Churrascos mensais no RJ', 'PUBLIC', 'Social', 'Rio de Janeiro')
    RETURNING id INTO g4;
    INSERT INTO group_members (group_id, user_id, role) VALUES (g4, u3, 'OWNER') ON CONFLICT DO NOTHING;
    IF u4 IS NOT NULL THEN INSERT INTO group_members (group_id, user_id) VALUES (g4, u4) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Grupo 5: Guilherme
  IF u4 IS NOT NULL THEN
    INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
    VALUES (uuid_generate_v4(), u4, 'Futebol Society', 'Rachas de fut society toda quinta', 'PUBLIC', 'Esportes', 'São Paulo')
    RETURNING id INTO g5;
    INSERT INTO group_members (group_id, user_id, role) VALUES (g5, u4, 'OWNER') ON CONFLICT DO NOTHING;
  END IF;

  -- Atualiza member_count
  UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id);
END $$;

-- ─────────────────────────────────────────────────────
-- 15 EVENTOS FICTÍCIOS
-- ─────────────────────────────────────────────────────
DO $$
DECLARE
  real_user UUID;
  u1 UUID; u2 UUID; u3 UUID; u4 UUID; u5 UUID;
  u6 UUID; u7 UUID; u8 UUID; u9 UUID; u10 UUID;
  u11 UUID; u12 UUID; u13 UUID; u14 UUID; u15 UUID;
  g1 UUID; g2 UUID; g3 UUID; g4 UUID; g5 UUID;
  ev UUID;
  all_users UUID[];
  uid UUID;
  cnt INT;
  slot INT;
BEGIN
  SELECT id INTO real_user FROM profiles WHERE username = 'sabom';
  SELECT id INTO u1  FROM profiles WHERE username = 'lucio_wagner';
  SELECT id INTO u2  FROM profiles WHERE username = 'peu_holder';
  SELECT id INTO u3  FROM profiles WHERE username = 'rafael_b';
  SELECT id INTO u4  FROM profiles WHERE username = 'ggrimaldi';
  SELECT id INTO u5  FROM profiles WHERE username = 'diego_t';
  SELECT id INTO u6  FROM profiles WHERE username = 'eduhauck';
  SELECT id INTO u7  FROM profiles WHERE username = 'fecosta';
  SELECT id INTO u8  FROM profiles WHERE username = 'mariana_lima';
  SELECT id INTO u9  FROM profiles WHERE username = 'tmendes';
  SELECT id INTO u10 FROM profiles WHERE username = 'carol_alves';
  SELECT id INTO u11 FROM profiles WHERE username = 'rod_farias';
  SELECT id INTO u12 FROM profiles WHERE username = 'amanda_s';
  SELECT id INTO u13 FROM profiles WHERE username = 'pedro_nunes';
  SELECT id INTO u14 FROM profiles WHERE username = 'ju_santos';
  SELECT id INTO u15 FROM profiles WHERE username = 'mvieira';

  SELECT id INTO g1 FROM groups WHERE name = 'Galera do Airsoft';
  SELECT id INTO g2 FROM groups WHERE name = 'Tech Beers SP';
  SELECT id INTO g3 FROM groups WHERE name = 'Trilheiros SP';
  SELECT id INTO g4 FROM groups WHERE name = 'Churrasco Carioca';
  SELECT id INTO g5 FROM groups WHERE name = 'Futebol Society';

  all_users := ARRAY[u1,u2,u3,u4,u5,u6,u7,u8,u9,u10,u11,u12,u13,u14,u15];

  -- Só continua se grupos existem
  IF g1 IS NULL OR g2 IS NULL THEN RETURN; END IF;

  -- EVENTO 1 — Jogo de Airsoft #12 (OPEN, futuro)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g1, real_user, 'Jogo de Airsoft #12', 'Campo principal, traga seu equipamento. Aluguel disponível no local.', 'Rua das Araucárias, 500', 'Porto Alegre', 'Esportes', 'OPEN', 5000, 20, 8, 4, now() + interval '7 days', now() + interval '7 days 4 hours', now() + interval '5 days', now() + interval '6 days 12 hours')
  RETURNING id INTO ev;
  -- Participações confirmadas
  FOREACH uid IN ARRAY all_users[1:12] LOOP
    IF uid IS NOT NULL THEN
      INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  -- Real user também
  IF real_user IS NOT NULL THEN
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED') ON CONFLICT DO NOTHING;
  END IF;

  -- EVENTO 2 — Happy Hour Tech (OPEN, futuro)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g2, u1, 'Happy Hour Tech #8', 'Cervejaria Artesanal Vila Madalena. 2 consumações inclusas.', 'R. Harmonia, 200 — Vila Madalena', 'São Paulo', 'Tecnologia', 'OPEN', 8000, 30, 10, 5, now() + interval '10 days', now() + interval '10 days 3 hours', now() + interval '8 days', now() + interval '9 days 12 hours')
  RETURNING id INTO ev;
  FOREACH uid IN ARRAY all_users[1:18] LOOP
    IF uid IS NOT NULL THEN
      INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- EVENTO 3 — Churrasco Carioca (OPEN, futuro)
  IF g4 IS NOT NULL AND u3 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g4, u3, 'Churrasco de Inverno RJ', 'Churrasqueira coberta, bebida à vontade. Venha com a família!', 'Av. das Américas, 4100 — Barra da Tijuca', 'Rio de Janeiro', 'Social', 'OPEN', 12000, 25, 10, 5, now() + interval '14 days', now() + interval '14 days 6 hours', now() + interval '12 days', now() + interval '13 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[3:14] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 4 — Trilha (OPEN, futuro)
  IF g3 IS NOT NULL AND u2 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g3, u2, 'Trilha da Pedra Grande', 'Nível médio, 8km. Leve água e lanche. Saída às 7h30.', 'Parque Estadual da Serra do Mar — Atibaia', 'São Paulo', 'Esportes', 'OPEN', 3000, 15, 5, 3, now() + interval '5 days', now() + interval '5 days 6 hours', now() + interval '3 days', now() + interval '4 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[2:10] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 5 — Futebol Society (OPEN, futuro, gratuito)
  IF g5 IS NOT NULL AND u4 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g5, u4, 'Racha de Quinta #22', 'Society na Arena SP. Times de 7. Água fornecida.', 'Arena SP — Rua dos Esportes, 100', 'São Paulo', 'Esportes', 'OPEN', 0, 14, 7, 2, now() + interval '3 days', now() + interval '3 days 2 hours', now() + interval '2 days', now() + interval '2 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[4:13] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    IF real_user IS NOT NULL THEN
      INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- EVENTO 6 — Workshop de Fotografia (OPEN, futuro)
  IF u6 IS NOT NULL AND g2 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g2, u6, 'Workshop de Fotografia Urbana', 'Aprenda técnicas de street photography com o fotógrafo Eduardo Hauck.', 'R. Augusta, 888 — Consolação', 'São Paulo', 'Arte & Cultura', 'OPEN', 15000, 12, 5, 2, now() + interval '20 days', now() + interval '20 days 4 hours', now() + interval '18 days', now() + interval '19 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[5:11] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'PENDING') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 7 — Noite de Board Games (OPEN, futuro)
  IF u7 IS NOT NULL AND g3 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g3, u7, 'Noite de Board Games', 'Trazemos +30 jogos. Petiscos inclusos. 18+', 'Av. Rebouças, 1500 — Pinheiros', 'São Paulo', 'Social', 'OPEN', 4000, 20, 8, 4, now() + interval '8 days', now() + interval '8 days 5 hours', now() + interval '6 days', now() + interval '7 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[6:15] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 8 — Corrida de Rua (OPEN, futuro)
  IF u5 IS NOT NULL AND g3 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g3, u5, 'Corrida 5K Parque Barigui', 'Prova não oficial de 5km no Barigui. Percurso flat, ideal para iniciantes.', 'Parque Barigui — Entrada Principal', 'Curitiba', 'Esportes', 'OPEN', 2500, 40, 10, 8, now() + interval '12 days', now() + interval '12 days 2 hours', now() + interval '10 days', now() + interval '11 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[1:15] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 9 — Jantar Temático (OPEN, poucos lugares)
  IF u8 IS NOT NULL AND g4 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g4, u8, 'Jantar Italiano em Casa', 'Mariana cozinha para um grupo seleto. Menu completo com entrada, massa e sobremesa.', 'Rua Voluntários da Pátria, 300 — Botafogo', 'Rio de Janeiro', 'Gastronomia', 'OPEN', 18000, 8, 4, 2, now() + interval '16 days', now() + interval '16 days 4 hours', now() + interval '14 days', now() + interval '15 days 12 hours')
    RETURNING id INTO ev;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED') ON CONFLICT DO NOTHING;
  END IF;

  -- EVENTO 10 — Pedal Urbano (OPEN, futuro)
  IF u11 IS NOT NULL AND g3 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g3, u11, 'Pedal Urbano Floripa', '30km pelo centrinho. Bicicleta obrigatória, saída da Praça XV.', 'Praça XV de Novembro — Centro', 'Florianópolis', 'Esportes', 'OPEN', 0, 25, 8, 5, now() + interval '6 days', now() + interval '6 days 4 hours', now() + interval '4 days', now() + interval '5 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[10:15] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 11 — Karaokê (OPEN, futuro)
  IF u12 IS NOT NULL AND g2 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g2, u12, 'Noite de Karaokê', 'Bar privativo com sistema profissional. Drinks e petiscos à parte.', 'Bar do Karan — R. Bela Cintra, 900', 'São Paulo', 'Social', 'OPEN', 6000, 16, 6, 3, now() + interval '9 days', now() + interval '9 days 4 hours', now() + interval '7 days', now() + interval '8 days 12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[7:14] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- EVENTO 12 — Camping (OPEN, futuro)
  IF u13 IS NOT NULL AND g3 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g3, u13, 'Camping Serra Gaúcha', '2 dias na Serra. Barraca não inclusa. Fogueira, chimarrão e muita natureza.', 'Acampamento Serra Verde — Gramado', 'Porto Alegre', 'Esportes', 'OPEN', 9000, 20, 8, 4, now() + interval '25 days', now() + interval '27 days', now() + interval '22 days', now() + interval '24 days 12 hours')
    RETURNING id INTO ev;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED') ON CONFLICT DO NOTHING;
  END IF;

  -- EVENTO 13 — Aula de Surf (OPEN, futuro)
  IF u14 IS NOT NULL AND g3 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g3, u14, 'Aula de Surf em Ubatuba', 'Instructor certificado, prancha e roupa inclusa. Nível iniciante.', 'Praia do Lazaro — Ubatuba', 'São Paulo', 'Esportes', 'OPEN', 13000, 10, 4, 2, now() + interval '18 days', now() + interval '18 days 3 hours', now() + interval '16 days', now() + interval '17 days 12 hours')
    RETURNING id INTO ev;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED') ON CONFLICT DO NOTHING;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'PENDING') ON CONFLICT DO NOTHING;
  END IF;

  -- EVENTO 14 — PASSADO / COMPLETED
  IF g1 IS NOT NULL AND real_user IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g1, real_user, 'Jogo de Airsoft #11', 'Edição passada. Campo norte, mato fechado.', 'Rua das Araucárias, 500', 'Porto Alegre', 'Esportes', 'COMPLETED', 5000, 20, 8, 4, now() - interval '15 days', now() - interval '15 days' + interval '4 hours', now() - interval '18 days', now() - interval '15 days' - interval '12 hours')
    RETURNING id INTO ev;
    FOREACH uid IN ARRAY all_users[1:10] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED') ON CONFLICT DO NOTHING;
  END IF;

  -- EVENTO 15 — Quase lotado com waitlist (OPEN)
  IF g2 IS NOT NULL AND u1 IS NOT NULL THEN
    INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
    VALUES (g2, u1, 'Masterclass de Product Design', 'Com Lucio Wagner. Ferramentas, processo e portfólio. Vagas LIMITADAS.', 'WeWork Faria Lima — Av. Brigadeiro Faria Lima, 3732', 'São Paulo', 'Tecnologia', 'OPEN', 25000, 10, 5, 3, now() + interval '30 days', now() + interval '30 days 4 hours', now() + interval '28 days', now() + interval '29 days 12 hours')
    RETURNING id INTO ev;
    -- Lotado — 10/10
    FOREACH uid IN ARRAY all_users[1:10] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO participations (event_id, user_id, status) VALUES (ev, uid, 'CONFIRMED') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    -- Waitlist com 3 pessoas
    slot := 1;
    FOREACH uid IN ARRAY ARRAY[u11, u12, u13] LOOP
      IF uid IS NOT NULL THEN
        INSERT INTO waitlist_entries (event_id, user_id, position, status) VALUES (ev, uid, slot, 'WAITING') ON CONFLICT DO NOTHING;
        slot := slot + 1;
      END IF;
    END LOOP;
  END IF;

END $$;
