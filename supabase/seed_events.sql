-- ═══════════════════════════════════════════════════════
-- SEED EVENTOS — usa usernames reais do banco
-- ═══════════════════════════════════════════════════════
DO $$
DECLARE
  real_user UUID; u1 UUID; u2 UUID; u3 UUID; u4 UUID; u5 UUID;
  u6 UUID; u7 UUID; u8 UUID; u9 UUID; u10 UUID;
  u11 UUID; u12 UUID; u13 UUID; u14 UUID; u15 UUID;
  g1 UUID; g2 UUID; g3 UUID; g4 UUID; g5 UUID;
  ev UUID; slot INT;

  -- grupos novos que vamos criar
  g4_id UUID; g5_id UUID;
BEGIN
  -- Carrega usuários
  SELECT id INTO real_user FROM profiles WHERE username = 'maluf';
  SELECT id INTO u1  FROM profiles WHERE username = 'lucio_wagner';
  SELECT id INTO u2  FROM profiles WHERE username = 'peu_holder';
  SELECT id INTO u3  FROM profiles WHERE username = 'rafael_barcellos';
  SELECT id INTO u4  FROM profiles WHERE username = 'guilherme_grimaldi';
  SELECT id INTO u5  FROM profiles WHERE username = 'diego_timmers';
  SELECT id INTO u6  FROM profiles WHERE username = 'eduardo_hauck';
  SELECT id INTO u7  FROM profiles WHERE username = 'fernanda_costa';
  SELECT id INTO u8  FROM profiles WHERE username = 'mariana_lima';
  SELECT id INTO u9  FROM profiles WHERE username = 'thiago_mendes';
  SELECT id INTO u10 FROM profiles WHERE username = 'carolina_alves';
  SELECT id INTO u11 FROM profiles WHERE username = 'rodrigo_farias';
  SELECT id INTO u12 FROM profiles WHERE username = 'amanda_souza';
  SELECT id INTO u13 FROM profiles WHERE username = 'pedro_nunes';
  SELECT id INTO u14 FROM profiles WHERE username = 'julia_santos';
  SELECT id INTO u15 FROM profiles WHERE username = 'marco_vieira';

  -- Carrega grupos existentes
  SELECT id INTO g1 FROM groups WHERE name = 'Airsoft';
  SELECT id INTO g2 FROM groups WHERE name = 'Tech Beers SP';
  SELECT id INTO g3 FROM groups WHERE name = 'Trilheiros SP';

  -- Cria grupos extras
  INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
  VALUES (uuid_generate_v4(), u3, 'Churrasco Carioca', 'Churrascos mensais no RJ', 'PUBLIC', 'Social', 'Rio de Janeiro')
  RETURNING id INTO g4_id;
  INSERT INTO group_members (group_id, user_id, role) VALUES (g4_id, u3, 'OWNER');
  INSERT INTO group_members (group_id, user_id) VALUES (g4_id, u4) ON CONFLICT DO NOTHING;
  INSERT INTO group_members (group_id, user_id) VALUES (g4_id, u9) ON CONFLICT DO NOTHING;

  INSERT INTO groups (id, owner_id, name, description, visibility, category, city)
  VALUES (uuid_generate_v4(), u4, 'Futebol Society SP', 'Rachas de fut society toda quinta', 'PUBLIC', 'Esportes', 'São Paulo')
  RETURNING id INTO g5_id;
  INSERT INTO group_members (group_id, user_id, role) VALUES (g5_id, u4, 'OWNER');
  INSERT INTO group_members (group_id, user_id) VALUES (g5_id, u5) ON CONFLICT DO NOTHING;
  INSERT INTO group_members (group_id, user_id) VALUES (g5_id, u9) ON CONFLICT DO NOTHING;

  UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id);

  -- ── EVENTO 1: Airsoft #12 (OPEN, 13/20 inscritos)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g1, real_user, 'Jogo de Airsoft #12', 'Campo principal, traga seu equipamento. Aluguel disponível no local.', 'Rua das Araucárias, 500', 'Porto Alegre', 'Esportes', 'OPEN', 5000, 20, 8, 4, now() + interval '7 days', now() + interval '7 days 4 hours', now() + interval '5 days', now() + interval '6 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u4, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'PENDING');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'PENDING');

  -- ── EVENTO 2: Happy Hour Tech #8 (OPEN, 18/30)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g2, u1, 'Happy Hour Tech #8', 'Cervejaria Artesanal Vila Madalena. 2 consumações inclusas.', 'R. Harmonia, 200 — Vila Madalena', 'São Paulo', 'Tecnologia', 'OPEN', 8000, 30, 10, 5, now() + interval '10 days', now() + interval '10 days 3 hours', now() + interval '8 days', now() + interval '9 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u4, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED');

  -- ── EVENTO 3: Churrasco Carioca (OPEN, 11/25)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g4_id, u3, 'Churrasco de Inverno RJ', 'Churrasqueira coberta, bebida à vontade. Venha com a família!', 'Av. das Américas, 4100 — Barra da Tijuca', 'Rio de Janeiro', 'Social', 'OPEN', 12000, 25, 10, 5, now() + interval '14 days', now() + interval '14 days 6 hours', now() + interval '12 days', now() + interval '13 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u4, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'PENDING');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'PENDING');

  -- ── EVENTO 4: Trilha da Pedra Grande (OPEN, 8/15)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g3, u2, 'Trilha da Pedra Grande', 'Nível médio, 8km. Leve água e lanche. Saída às 7h30.', 'Parque Estadual da Serra do Mar — Atibaia', 'São Paulo', 'Esportes', 'OPEN', 3000, 15, 5, 3, now() + interval '5 days', now() + interval '5 days 6 hours', now() + interval '3 days', now() + interval '4 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');

  -- ── EVENTO 5: Racha de Quinta (OPEN, gratuito, 10/14)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g5_id, u4, 'Racha de Quinta #22', 'Society na Arena SP. Times de 7. Água fornecida.', 'Arena SP — Rua dos Esportes, 100', 'São Paulo', 'Esportes', 'OPEN', 0, 14, 7, 2, now() + interval '3 days', now() + interval '3 days 2 hours', now() + interval '2 days', now() + interval '2 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u4, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED');

  -- ── EVENTO 6: Workshop de Fotografia (OPEN, 6/12)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g2, u6, 'Workshop de Fotografia Urbana', 'Aprenda técnicas de street photography com Eduardo Hauck.', 'R. Augusta, 888 — Consolação', 'São Paulo', 'Arte & Cultura', 'OPEN', 15000, 12, 5, 2, now() + interval '20 days', now() + interval '20 days 4 hours', now() + interval '18 days', now() + interval '19 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'PENDING');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'PENDING');

  -- ── EVENTO 7: Noite de Board Games (OPEN, 9/20)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g3, u7, 'Noite de Board Games', 'Trazemos +30 jogos. Petiscos inclusos. 18+', 'Av. Rebouças, 1500 — Pinheiros', 'São Paulo', 'Social', 'OPEN', 4000, 20, 8, 4, now() + interval '8 days', now() + interval '8 days 5 hours', now() + interval '6 days', now() + interval '7 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');

  -- ── EVENTO 8: Corrida 5K Barigui (OPEN, 15/40)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g3, u5, 'Corrida 5K Parque Barigui', 'Prova não oficial de 5km no Barigui. Percurso flat, ideal para iniciantes.', 'Parque Barigui — Entrada Principal', 'Curitiba', 'Esportes', 'OPEN', 2500, 40, 10, 8, now() + interval '12 days', now() + interval '12 days 2 hours', now() + interval '10 days', now() + interval '11 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u4, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');

  -- ── EVENTO 9: Jantar Italiano (OPEN, poucos lugares, 3/8)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g4_id, u8, 'Jantar Italiano em Casa', 'Mariana cozinha para um grupo seleto. Menu completo com entrada, massa e sobremesa.', 'Rua Voluntários da Pátria, 300 — Botafogo', 'Rio de Janeiro', 'Gastronomia', 'OPEN', 18000, 8, 4, 2, now() + interval '16 days', now() + interval '16 days 4 hours', now() + interval '14 days', now() + interval '15 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');

  -- ── EVENTO 10: Pedal Urbano Floripa (OPEN, gratuito, 5/25)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g3, u11, 'Pedal Urbano Floripa', '30km pelo centrinho. Bicicleta obrigatória, saída da Praça XV.', 'Praça XV de Novembro — Centro', 'Florianópolis', 'Esportes', 'OPEN', 0, 25, 8, 5, now() + interval '6 days', now() + interval '6 days 4 hours', now() + interval '4 days', now() + interval '5 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');

  -- ── EVENTO 11: Noite de Karaokê (OPEN, 8/16)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g2, u12, 'Noite de Karaokê', 'Bar privativo com sistema profissional. Drinks e petiscos à parte.', 'Bar do Karan — R. Bela Cintra, 900', 'São Paulo', 'Social', 'OPEN', 6000, 16, 6, 3, now() + interval '9 days', now() + interval '9 days 4 hours', now() + interval '7 days', now() + interval '8 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u12, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED');

  -- ── EVENTO 12: Camping Serra Gaúcha (OPEN, 5/20)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g3, u13, 'Camping Serra Gaúcha', '2 dias na Serra. Barraca não inclusa. Fogueira, chimarrão e muita natureza.', 'Acampamento Serra Verde — Gramado', 'Porto Alegre', 'Esportes', 'OPEN', 9000, 20, 8, 4, now() + interval '25 days', now() + interval '27 days', now() + interval '22 days', now() + interval '24 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u13, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');

  -- ── EVENTO 13: Aula de Surf em Ubatuba (OPEN, 3/10)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g3, u14, 'Aula de Surf em Ubatuba', 'Instructor certificado, prancha e roupa inclusa. Nível iniciante.', 'Praia do Lazaro — Ubatuba', 'São Paulo', 'Esportes', 'OPEN', 13000, 10, 4, 2, now() + interval '18 days', now() + interval '18 days 3 hours', now() + interval '16 days', now() + interval '17 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u14, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'PENDING');

  -- ── EVENTO 14: Airsoft #11 (COMPLETED — passado)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g1, real_user, 'Jogo de Airsoft #11', 'Edição passada. Campo norte, mato fechado.', 'Rua das Araucárias, 500', 'Porto Alegre', 'Esportes', 'COMPLETED', 5000, 20, 8, 4, now() - interval '15 days', now() - interval '15 days' + interval '4 hours', now() - interval '18 days', now() - interval '15 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, real_user, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u11, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u15, 'CONFIRMED');

  -- ── EVENTO 15: Masterclass Design (OPEN, LOTADO 10/10 + waitlist)
  INSERT INTO events (group_id, organizer_id, title, description, address, city, category, status, price, capacity, min_participants, waitlist_capacity, starts_at, ends_at, registration_deadline, min_check_at)
  VALUES (g2, u1, 'Masterclass de Product Design', 'Com Lucio Wagner. Ferramentas, processo e portfólio. Vagas LIMITADAS.', 'WeWork Faria Lima — Av. Brigadeiro Faria Lima, 3732', 'São Paulo', 'Tecnologia', 'OPEN', 25000, 10, 5, 3, now() + interval '30 days', now() + interval '30 days 4 hours', now() + interval '28 days', now() + interval '29 days 12 hours')
  RETURNING id INTO ev;
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u1, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u2, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u3, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u4, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u5, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u6, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u7, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u8, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u9, 'CONFIRMED');
  INSERT INTO participations (event_id, user_id, status) VALUES (ev, u10, 'CONFIRMED');
  -- Waitlist: 3 pessoas
  INSERT INTO waitlist_entries (event_id, user_id, position, status) VALUES (ev, u11, 1, 'WAITING');
  INSERT INTO waitlist_entries (event_id, user_id, position, status) VALUES (ev, u12, 2, 'WAITING');
  INSERT INTO waitlist_entries (event_id, user_id, position, status) VALUES (ev, u13, 3, 'WAITING');

END $$;
