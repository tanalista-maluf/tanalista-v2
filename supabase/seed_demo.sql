-- ═══════════════════════════════════════════════════════════════════════
-- SEED DEMO — TáNaLista
-- 50 perfis · 12 grupos · 25 eventos · participações · marketplace
-- Marcador: email *@demo.tanalista.test
--
-- PARA LIMPAR (executar nesta ordem):
--   DELETE FROM marketplace_listings
--     WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.tanalista.test');
--   DELETE FROM participations
--     WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.tanalista.test');
--   DELETE FROM events
--     WHERE organizer_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.tanalista.test');
--   DELETE FROM group_members
--     WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.tanalista.test');
--   DELETE FROM groups
--     WHERE owner_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.tanalista.test');
--   DELETE FROM auth.users WHERE email LIKE '%@demo.tanalista.test';
-- ═══════════════════════════════════════════════════════════════════════

-- Garante que colunas adicionadas em migrações pendentes existam
ALTER TABLE groups ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'PUBLIC';

DO $$
DECLARE
  u01 uuid; u02 uuid; u03 uuid; u04 uuid; u05 uuid;
  u06 uuid; u07 uuid; u08 uuid; u09 uuid; u10 uuid;
  u11 uuid; u12 uuid; u13 uuid; u14 uuid; u15 uuid;
  u16 uuid; u17 uuid; u18 uuid; u19 uuid; u20 uuid;
  u21 uuid; u22 uuid; u23 uuid; u24 uuid; u25 uuid;
  u26 uuid; u27 uuid; u28 uuid; u29 uuid; u30 uuid;
  u31 uuid; u32 uuid; u33 uuid; u34 uuid; u35 uuid;
  u36 uuid; u37 uuid; u38 uuid; u39 uuid; u40 uuid;
  u41 uuid; u42 uuid; u43 uuid; u44 uuid; u45 uuid;
  u46 uuid; u47 uuid; u48 uuid; u49 uuid; u50 uuid;
  g01 uuid; g02 uuid; g03 uuid; g04 uuid; g05 uuid;
  g06 uuid; g07 uuid; g08 uuid; g09 uuid; g10 uuid;
  g11 uuid; g12 uuid;
  e01 uuid; e02 uuid; e03 uuid; e04 uuid; e05 uuid;
  e06 uuid; e07 uuid; e08 uuid; e09 uuid; e10 uuid;
  e11 uuid; e12 uuid; e13 uuid; e14 uuid; e15 uuid;
  e16 uuid; e17 uuid; e18 uuid; e19 uuid; e20 uuid;
  e21 uuid; e22 uuid; e23 uuid; e24 uuid; e25 uuid;
BEGIN
  u01:=gen_random_uuid(); u02:=gen_random_uuid(); u03:=gen_random_uuid(); u04:=gen_random_uuid(); u05:=gen_random_uuid();
  u06:=gen_random_uuid(); u07:=gen_random_uuid(); u08:=gen_random_uuid(); u09:=gen_random_uuid(); u10:=gen_random_uuid();
  u11:=gen_random_uuid(); u12:=gen_random_uuid(); u13:=gen_random_uuid(); u14:=gen_random_uuid(); u15:=gen_random_uuid();
  u16:=gen_random_uuid(); u17:=gen_random_uuid(); u18:=gen_random_uuid(); u19:=gen_random_uuid(); u20:=gen_random_uuid();
  u21:=gen_random_uuid(); u22:=gen_random_uuid(); u23:=gen_random_uuid(); u24:=gen_random_uuid(); u25:=gen_random_uuid();
  u26:=gen_random_uuid(); u27:=gen_random_uuid(); u28:=gen_random_uuid(); u29:=gen_random_uuid(); u30:=gen_random_uuid();
  u31:=gen_random_uuid(); u32:=gen_random_uuid(); u33:=gen_random_uuid(); u34:=gen_random_uuid(); u35:=gen_random_uuid();
  u36:=gen_random_uuid(); u37:=gen_random_uuid(); u38:=gen_random_uuid(); u39:=gen_random_uuid(); u40:=gen_random_uuid();
  u41:=gen_random_uuid(); u42:=gen_random_uuid(); u43:=gen_random_uuid(); u44:=gen_random_uuid(); u45:=gen_random_uuid();
  u46:=gen_random_uuid(); u47:=gen_random_uuid(); u48:=gen_random_uuid(); u49:=gen_random_uuid(); u50:=gen_random_uuid();
  g01:=gen_random_uuid(); g02:=gen_random_uuid(); g03:=gen_random_uuid(); g04:=gen_random_uuid(); g05:=gen_random_uuid();
  g06:=gen_random_uuid(); g07:=gen_random_uuid(); g08:=gen_random_uuid(); g09:=gen_random_uuid(); g10:=gen_random_uuid();
  g11:=gen_random_uuid(); g12:=gen_random_uuid();
  e01:=gen_random_uuid(); e02:=gen_random_uuid(); e03:=gen_random_uuid(); e04:=gen_random_uuid(); e05:=gen_random_uuid();
  e06:=gen_random_uuid(); e07:=gen_random_uuid(); e08:=gen_random_uuid(); e09:=gen_random_uuid(); e10:=gen_random_uuid();
  e11:=gen_random_uuid(); e12:=gen_random_uuid(); e13:=gen_random_uuid(); e14:=gen_random_uuid(); e15:=gen_random_uuid();
  e16:=gen_random_uuid(); e17:=gen_random_uuid(); e18:=gen_random_uuid(); e19:=gen_random_uuid(); e20:=gen_random_uuid();
  e21:=gen_random_uuid(); e22:=gen_random_uuid(); e23:=gen_random_uuid(); e24:=gen_random_uuid(); e25:=gen_random_uuid();

  -- ── 1. AUTH USERS (senha: Demo2026!) ──────────────────
  INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,is_super_admin) VALUES
    ('00000000-0000-0000-0000-000000000000',u01,'authenticated','authenticated','ana.silva@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'90 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u02,'authenticated','authenticated','bruno.oliveira@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'85 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u03,'authenticated','authenticated','camila.santos@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'80 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u04,'authenticated','authenticated','diego.alves@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'78 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u05,'authenticated','authenticated','elisa.mendes@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'75 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u06,'authenticated','authenticated','fabio.lima@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'72 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u07,'authenticated','authenticated','gabriela.rocha@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'70 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u08,'authenticated','authenticated','henrique.souza@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'68 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u09,'authenticated','authenticated','isabela.carvalho@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'65 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u10,'authenticated','authenticated','joao.pedro@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'63 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u11,'authenticated','authenticated','karla.teixeira@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'60 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u12,'authenticated','authenticated','leonardo.cardoso@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'58 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u13,'authenticated','authenticated','mariana.correia@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'55 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u14,'authenticated','authenticated','nicolas.castro@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'53 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u15,'authenticated','authenticated','olivia.fernandes@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'50 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u16,'authenticated','authenticated','paulo.campos@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'48 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u17,'authenticated','authenticated','quesia.pinto@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'45 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u18,'authenticated','authenticated','rafael.cunha@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'43 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u19,'authenticated','authenticated','sara.machado@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'40 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u20,'authenticated','authenticated','thiago.lopes@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'38 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u21,'authenticated','authenticated','ursula.borges@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'36 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u22,'authenticated','authenticated','vinicius.andrade@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'34 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u23,'authenticated','authenticated','wanderlei.fig@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'32 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u24,'authenticated','authenticated','ximena.azevedo@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'30 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u25,'authenticated','authenticated','yara.monteiro@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'28 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u26,'authenticated','authenticated','zeca.marques@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'27 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u27,'authenticated','authenticated','adriana.fonseca@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'26 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u28,'authenticated','authenticated','bernardo.tavares@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'25 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u29,'authenticated','authenticated','claudia.pires@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'24 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u30,'authenticated','authenticated','daniel.rezende@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'23 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u31,'authenticated','authenticated','eduarda.matos@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'22 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u32,'authenticated','authenticated','fernando.braga@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'21 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u33,'authenticated','authenticated','giovana.moura@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'20 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u34,'authenticated','authenticated','hugo.santana@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'19 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u35,'authenticated','authenticated','ingrid.coelho@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'18 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u36,'authenticated','authenticated','julia.medeiros@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'17 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u37,'authenticated','authenticated','kevin.nogueira@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'16 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u38,'authenticated','authenticated','laura.esteves@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'15 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u39,'authenticated','authenticated','matheus.leite@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'14 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u40,'authenticated','authenticated','natalia.brandt@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'13 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u41,'authenticated','authenticated','otavio.sousa@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'12 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u42,'authenticated','authenticated','priscila.mag@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'11 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u43,'authenticated','authenticated','quirino.bueno@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'10 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u44,'authenticated','authenticated','renata.sampaio@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'9 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u45,'authenticated','authenticated','sergio.tenorio@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'8 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u46,'authenticated','authenticated','tatiana.werneck@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'7 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u47,'authenticated','authenticated','ugo.bernardes@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'6 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u48,'authenticated','authenticated','valentina.godoy@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'5 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u49,'authenticated','authenticated','wellington.sq@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'4 days',now(),'','',false),
    ('00000000-0000-0000-0000-000000000000',u50,'authenticated','authenticated','zilda.amaral@demo.tanalista.test',crypt('Demo2026!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now()-interval'3 days',now(),'','',false);

  -- ── 2. PROFILES ───────────────────────────────────────
  INSERT INTO profiles (id,full_name,username,bio,city,onboarding_completed,created_at) VALUES
    (u01,'Ana Carolina Silva','ana_carolina','Corredora e apaixonada por eventos ao ar livre. Maratonista amadora desde 2019.','São Paulo',true,now()-interval'90 days'),
    (u02,'Bruno Henrique Oliveira','bruno_oliveira','Desenvolvedor de software, entusiasta de cerveja artesanal e tecnologia.','São Paulo',true,now()-interval'85 days'),
    (u03,'Camila Santos Ferreira','camila_santos','Fotógrafa freelancer. Amo capturar momentos únicos em eventos e viagens.','Rio de Janeiro',true,now()-interval'80 days'),
    (u04,'Diego Alves Rodrigues','diego_alves','Músico e produtor musical. Jazz, blues e MPB são minha paixão.','São Paulo',true,now()-interval'78 days'),
    (u05,'Elisa Mendes Costa','elisa_mendes','Professora de yoga e meditação. Bem-estar é meu estilo de vida.','Belo Horizonte',true,now()-interval'75 days'),
    (u06,'Fábio Lima Pereira','fabio_lima','Chef de cozinha e blogueiro gastronômico. Culinária italiana é especialidade.','Curitiba',true,now()-interval'72 days'),
    (u07,'Gabriela Rocha Martins','gabriela_rocha','Dançarina e professora de forró e samba de gafieira. 12 anos de experiência.','São Paulo',true,now()-interval'70 days'),
    (u08,'Henrique Souza Barbosa','henrique_souza','Guia de trilhas certificado. Conheço cada sentiero do Rio de Janeiro.','Rio de Janeiro',true,now()-interval'68 days'),
    (u09,'Isabela Carvalho Gomes','isabela_carvalho','Nutricionista e entusiasta de gastronomia saudável. Amo eventos foodie.','São Paulo',true,now()-interval'65 days'),
    (u10,'João Pedro Nascimento','joao_pedro','Surfista desde os 14 anos. Floripa é minha casa, o mar é minha vida.','Florianópolis',true,now()-interval'63 days'),
    (u11,'Karla Teixeira Moreira','karla_teixeira','Jornalista cultural, crítica musical e fã número 1 de jazz brasileiro.','São Paulo',true,now()-interval'60 days'),
    (u12,'Leonardo Cardoso Araújo','leonardo_cardoso','Mestre cervejeiro e sócio de microcervejaria. Fundador do Cervejeiros Artesanais.','Porto Alegre',true,now()-interval'58 days'),
    (u13,'Mariana Correia Santos','mariana_correia','Cineasta independente e curadora de cinema cult. Godard e Kubrick forever.','São Paulo',true,now()-interval'55 days'),
    (u14,'Nicolas Castro Ramos','nicolas_castro','Street photographer. Urbano e irreverente, câmera sempre no pescoço.','Rio de Janeiro',true,now()-interval'53 days'),
    (u15,'Olivia Fernandes Nunes','olivia_fernandes','Empreendedora serial, 3 startups no currículo. Mentora de novos fundadores.','São Paulo',true,now()-interval'50 days'),
    (u16,'Paulo Ricardo Campos','paulo_campos','Engenheiro de dados e apaixonado por trilhas e montanhismo.','Belo Horizonte',true,now()-interval'48 days'),
    (u17,'Quésia Pinto Rocha','quesia_pinto','Designer UX/UI, corredora de 10K e fã de eventos culturais.','São Paulo',true,now()-interval'45 days'),
    (u18,'Rafael Cunha Melo','rafael_cunha','DJ e produtor musical. Sets de jazz e soul nos melhores bares de SP.','Rio de Janeiro',true,now()-interval'43 days'),
    (u19,'Sara Machado Cavalcanti','sara_machado','Médica, praticante de yoga e admiradora da gastronomia japonesa.','São Paulo',true,now()-interval'40 days'),
    (u20,'Thiago Lopes Vieira','thiago_lopes','Sommelier de cervejas, homebrewer há 8 anos. Curitiba tem a melhor cena craft.','Curitiba',true,now()-interval'38 days'),
    (u21,'Úrsula Borges Freitas','ursula_borges','Arquiteta e fotógrafa urbana. Amo documentar a transformação das cidades.','São Paulo',true,now()-interval'36 days'),
    (u22,'Vinícius Andrade Dias','vinicius_andrade','Personal trainer e corredor de maratona. 42km me completam.','Rio de Janeiro',true,now()-interval'34 days'),
    (u23,'Wanderlei Figueiredo','wanderlei_fig','Empreendedor no setor de eventos, produtor cultural há 15 anos.','São Paulo',true,now()-interval'32 days'),
    (u24,'Ximena Azevedo Batista','ximena_azevedo','Instrutora de meditação mindfulness e professora de pilates.','Belo Horizonte',true,now()-interval'30 days'),
    (u25,'Yara Monteiro Vasconcelos','yara_monteiro','Marketing digital, growth hacker e entusiasta de eventos tech.','São Paulo',true,now()-interval'28 days'),
    (u26,'Zeca Marques Cruz','zeca_marques','Músico e produtor de eventos culturais no Rio. Trilha sonora da cidade.','Rio de Janeiro',true,now()-interval'27 days'),
    (u27,'Adriana Fonseca Paiva','adriana_fonseca','Nutricionista clínica e apaixonada por culinária funcional e eventos gastronômicos.','São Paulo',true,now()-interval'26 days'),
    (u28,'Bernardo Tavares Silva','bernardo_tavares','Desenvolvedor mobile, ciclista urbano e homebrewer iniciante.','Curitiba',true,now()-interval'25 days'),
    (u29,'Cláudia Pires Oliveira','claudia_pires','Publicitária, dançarina amadora de salsa e forró desde 2015.','São Paulo',true,now()-interval'24 days'),
    (u30,'Daniel Rezende Ferreira','daniel_rezende','Diretor de fotografia e documentarista. RJ é meu palco.','Rio de Janeiro',true,now()-interval'23 days'),
    (u31,'Eduarda Matos Rodrigues','eduarda_matos','Estudante de gastronomia, confeiteira e viciada em eventos de culinária.','São Paulo',true,now()-interval'22 days'),
    (u32,'Fernando Braga Costa','fernando_braga','CTO de startup fintech, palestrante de tecnologia e mentor de devs júnior.','Belo Horizonte',true,now()-interval'21 days'),
    (u33,'Giovana Moura Pereira','giovana_moura','Atriz e diretora teatral, cinéfila inveterada e fã de Bergman.','São Paulo',true,now()-interval'20 days'),
    (u34,'Hugo Santana Florêncio','hugo_santana','Instrutor de surf e praticante de stand-up paddle. Mar e montanha.','Florianópolis',true,now()-interval'19 days'),
    (u35,'Ingrid Coelho Barbosa','ingrid_coelho','Advogada, corredora de meia maratona e amante de vinhos naturais.','São Paulo',true,now()-interval'18 days'),
    (u36,'Júlia Medeiros Gama','julia_medeiros','Violinista clássica reconvertida ao jazz. Toco em bares e festivais de SP.','Rio de Janeiro',true,now()-interval'17 days'),
    (u37,'Kevin Nogueira Lira','kevin_nogueira','Engenheiro de software, CTF player e fã de hackathons.','São Paulo',true,now()-interval'16 days'),
    (u38,'Laura Esteves Prado','laura_esteves','Sommelier de café especial. Curitiba tem o melhor cenário de specialty coffee.','Curitiba',true,now()-interval'15 days'),
    (u39,'Matheus Leite Guedes','matheus_leite','Triatleta amador, nutricionista esportivo e atleta de fim de semana.','São Paulo',true,now()-interval'14 days'),
    (u40,'Natalia Brandt Kauer','natalia_brandt','Cervejeira e embaixadora de marcas craft na região Sul. Mestra em lúpulo.','Porto Alegre',true,now()-interval'13 days'),
    (u41,'Otávio Sousa Drummond','otavio_sousa','Empreendedor, investidor anjo e apaixonado por metodologias ágeis.','São Paulo',true,now()-interval'12 days'),
    (u42,'Priscila Magalhães Brum','priscila_mag','Fotógrafa documental, especialista em fotografia de rua e retratos urbanos.','Rio de Janeiro',true,now()-interval'11 days'),
    (u43,'Quirino Bueno Falcão','quirino_bueno','Historiador e cineasta, curador de acervos cinematográficos raros.','São Paulo',true,now()-interval'10 days'),
    (u44,'Renata Sampaio Vilaça','renata_sampaio','Professora de dança, coreógrafa e organizadora de festivais de samba.','Belo Horizonte',true,now()-interval'9 days'),
    (u45,'Sérgio Tenório Paixão','sergio_tenorio','CTO, dev full-stack e evangelista de open source. GitHub é meu portfólio.','São Paulo',true,now()-interval'8 days'),
    (u46,'Tatiana Werneck Freire','tatiana_werneck','Jornalista, podcast host e documentarista de cenas culturais urbanas.','Rio de Janeiro',true,now()-interval'7 days'),
    (u47,'Ugo Bernardes Maia','ugo_bernardes','Product manager, ávido leitor e praticante de meditação zen.','São Paulo',true,now()-interval'6 days'),
    (u48,'Valentina Godoy Sena','valentina_godoy','Designer gráfica, ilustradora e organizadora de workshops criativos.','Curitiba',true,now()-interval'5 days'),
    (u49,'Wellington Siqueira Porto','wellington_sq','Triatleta, personal trainer e especialista em performance esportiva.','São Paulo',true,now()-interval'4 days'),
    (u50,'Zilda Amaral Penteado','zilda_amaral','Professora aposentada, corredora de 70 anos que inspira a todos no grupo.','São Paulo',true,now()-interval'3 days');

  -- ── 3. GROUPS ─────────────────────────────────────────
  INSERT INTO groups (id,owner_id,name,description,visibility,category,city,member_count,slug,created_at) VALUES
    (g01,u01,'Corredores de SP','Grupo para apaixonados por corrida de rua em São Paulo. Treinos coletivos, corridas noturnas e maratonas. Todos os níveis são bem-vindos!','PUBLIC','Esportes','São Paulo',22,'corredores-de-sp',now()-interval'88 days'),
    (g02,u06,'Foodie Club Curitiba','O melhor grupo gastronômico de Curitiba. Jantares harmonizados, workshops de culinária e muito prazer à mesa.','PUBLIC','Gastronomia','Curitiba',17,'foodie-club-curitiba',now()-interval'82 days'),
    (g03,u03,'Tech & Beers SP','Encontros informais de tecnologia regados a boa cerveja. Palestras lightning, networking e troca de experiências.','PUBLIC','Tecnologia','São Paulo',31,'tech-beers-sp',now()-interval'77 days'),
    (g04,u08,'Trilhas e Natureza RJ','Grupo dedicado a trilhas, escaladas e conexão com a natureza no Rio de Janeiro e região serrana.','PUBLIC','Natureza','Rio de Janeiro',19,'trilhas-natureza-rj',now()-interval'73 days'),
    (g05,u11,'Jazz & Blues Brasil','Comunidade de amantes de jazz, blues e soul no Brasil. Shows, jam sessions e debates sobre música.','PUBLIC','Música','São Paulo',28,'jazz-blues-brasil',now()-interval'69 days'),
    (g06,u05,'Yoga & Bem-Estar BH','Prática de yoga, meditação e respiração consciente em Belo Horizonte. Aulas ao ar livre e retiros.','PUBLIC','Saúde','Belo Horizonte',14,'yoga-bem-estar-bh',now()-interval'64 days'),
    (g07,u12,'Cervejeiros Artesanais Sul','A maior comunidade de homebrewers e apreciadores de cervejas artesanais do Sul do Brasil.','PUBLIC','Gastronomia','Porto Alegre',24,'cervejeiros-artesanais-sul',now()-interval'59 days'),
    (g08,u13,'Cinema Cult SP','Cineclube dedicado ao cinema de autor, nouvelle vague e produções independentes. Sessões comentadas e debates.','PUBLIC','Cultura','São Paulo',16,'cinema-cult-sp',now()-interval'54 days'),
    (g09,u10,'Surfistas de Floripa','Comunidade de surfistas, SUPers e amantes do mar em Florianópolis. Sessões de surf e churrascos na praia.','PUBLIC','Esportes','Florianópolis',20,'surfistas-de-floripa',now()-interval'49 days'),
    (g10,u15,'Empreendedores Digitais','Rede de empreendedores, founders e investidores do ecossistema digital brasileiro.','PUBLIC','Negócios','São Paulo',35,'empreendedores-digitais',now()-interval'44 days'),
    (g11,u07,'Dança de Salão SP','O grupo mais animado de dança de salão de São Paulo. Forró, gafieira, bolero e zouk.','PUBLIC','Cultura','São Paulo',21,'danca-de-salao-sp',now()-interval'39 days'),
    (g12,u14,'Fotógrafos Urbanos RJ','Coletivo de fotografia de rua e documental no Rio de Janeiro. Photo walks e exposições.','PUBLIC','Arte','Rio de Janeiro',18,'fotografos-urbanos-rj',now()-interval'34 days');

  -- ── 4. GROUP MEMBERS ──────────────────────────────────
  INSERT INTO group_members (group_id,user_id,role,joined_at) VALUES
    (g01,u01,'OWNER',now()-interval'88 days'),(g01,u02,'MEMBER',now()-interval'86 days'),
    (g01,u17,'MEMBER',now()-interval'84 days'),(g01,u22,'MEMBER',now()-interval'80 days'),
    (g01,u35,'MEMBER',now()-interval'75 days'),(g01,u39,'MEMBER',now()-interval'70 days'),
    (g01,u49,'MEMBER',now()-interval'65 days'),(g01,u50,'MEMBER',now()-interval'60 days'),
    (g01,u09,'MEMBER',now()-interval'55 days'),(g01,u19,'MEMBER',now()-interval'50 days'),
    (g02,u06,'OWNER',now()-interval'82 days'),(g02,u20,'MEMBER',now()-interval'78 days'),
    (g02,u28,'MEMBER',now()-interval'74 days'),(g02,u38,'MEMBER',now()-interval'70 days'),
    (g02,u27,'MEMBER',now()-interval'66 days'),(g02,u31,'MEMBER',now()-interval'62 days'),
    (g02,u48,'MEMBER',now()-interval'55 days'),
    (g03,u03,'OWNER',now()-interval'77 days'),(g03,u02,'MEMBER',now()-interval'75 days'),
    (g03,u25,'MEMBER',now()-interval'72 days'),(g03,u32,'MEMBER',now()-interval'68 days'),
    (g03,u37,'MEMBER',now()-interval'64 days'),(g03,u45,'MEMBER',now()-interval'60 days'),
    (g03,u47,'MEMBER',now()-interval'55 days'),(g03,u28,'MEMBER',now()-interval'50 days'),
    (g03,u41,'MEMBER',now()-interval'45 days'),(g03,u04,'MEMBER',now()-interval'40 days'),
    (g04,u08,'OWNER',now()-interval'73 days'),(g04,u14,'MEMBER',now()-interval'70 days'),
    (g04,u26,'MEMBER',now()-interval'66 days'),(g04,u30,'MEMBER',now()-interval'62 days'),
    (g04,u42,'MEMBER',now()-interval'58 days'),(g04,u46,'MEMBER',now()-interval'54 days'),
    (g04,u16,'MEMBER',now()-interval'50 days'),
    (g05,u11,'OWNER',now()-interval'69 days'),(g05,u04,'MEMBER',now()-interval'66 days'),
    (g05,u18,'MEMBER',now()-interval'62 days'),(g05,u26,'MEMBER',now()-interval'58 days'),
    (g05,u36,'MEMBER',now()-interval'54 days'),(g05,u46,'MEMBER',now()-interval'50 days'),
    (g05,u13,'MEMBER',now()-interval'46 days'),(g05,u33,'MEMBER',now()-interval'42 days'),
    (g06,u05,'OWNER',now()-interval'64 days'),(g06,u24,'MEMBER',now()-interval'60 days'),
    (g06,u16,'MEMBER',now()-interval'56 days'),(g06,u44,'MEMBER',now()-interval'52 days'),
    (g06,u19,'MEMBER',now()-interval'48 days'),
    (g07,u12,'OWNER',now()-interval'59 days'),(g07,u20,'MEMBER',now()-interval'56 days'),
    (g07,u28,'MEMBER',now()-interval'52 days'),(g07,u40,'MEMBER',now()-interval'48 days'),
    (g07,u38,'MEMBER',now()-interval'44 days'),(g07,u02,'MEMBER',now()-interval'40 days'),
    (g07,u06,'MEMBER',now()-interval'36 days'),
    (g08,u13,'OWNER',now()-interval'54 days'),(g08,u33,'MEMBER',now()-interval'50 days'),
    (g08,u43,'MEMBER',now()-interval'46 days'),(g08,u11,'MEMBER',now()-interval'42 days'),
    (g08,u46,'MEMBER',now()-interval'38 days'),(g08,u04,'MEMBER',now()-interval'34 days'),
    (g09,u10,'OWNER',now()-interval'49 days'),(g09,u34,'MEMBER',now()-interval'46 days'),
    (g09,u08,'MEMBER',now()-interval'42 days'),(g09,u22,'MEMBER',now()-interval'38 days'),
    (g09,u49,'MEMBER',now()-interval'34 days'),
    (g10,u15,'OWNER',now()-interval'44 days'),(g10,u23,'MEMBER',now()-interval'40 days'),
    (g10,u25,'MEMBER',now()-interval'36 days'),(g10,u32,'MEMBER',now()-interval'32 days'),
    (g10,u41,'MEMBER',now()-interval'28 days'),(g10,u45,'MEMBER',now()-interval'24 days'),
    (g10,u47,'MEMBER',now()-interval'20 days'),(g10,u37,'MEMBER',now()-interval'16 days'),
    (g11,u07,'OWNER',now()-interval'39 days'),(g11,u29,'MEMBER',now()-interval'36 days'),
    (g11,u44,'MEMBER',now()-interval'32 days'),(g11,u19,'MEMBER',now()-interval'28 days'),
    (g11,u33,'MEMBER',now()-interval'24 days'),(g11,u36,'MEMBER',now()-interval'20 days'),
    (g12,u14,'OWNER',now()-interval'34 days'),(g12,u03,'MEMBER',now()-interval'30 days'),
    (g12,u21,'MEMBER',now()-interval'26 days'),(g12,u30,'MEMBER',now()-interval'22 days'),
    (g12,u42,'MEMBER',now()-interval'18 days'),(g12,u46,'MEMBER',now()-interval'14 days');

  -- ── 5. EVENTS ─────────────────────────────────────────
  INSERT INTO events (id,group_id,organizer_id,title,description,address,city,category,status,price,capacity,min_participants,waitlist_capacity,starts_at,ends_at,registration_deadline,min_check_at,organizer_exempt,slug,visibility,created_at) VALUES
    (e01,g01,u01,'5K do Parque Ibirapuera','Corrida coletiva de 5 quilômetros no Parque Ibirapuera. Concentração no Portão 3 às 6h30. Percurso plano ideal para todos os níveis. Após a corrida, café da manhã compartilhado.','Parque Ibirapuera, Portão 3','São Paulo','Esportes','CONFIRMED',2500,40,15,5,now()+interval'7 days',now()+interval'7 days 2 hours',now()+interval'5 days',now()+interval'7 days'-interval'12 hours',true,'5k-do-parque-ibirapuera','PUBLIC',now()-interval'30 days'),
    (e02,g01,u01,'Treino Noturno — Vila Olímpia','Treino técnico de ritmo e resistência pelas ruas tranquilas da Vila Olímpia. Percurso de 8km com pausa para alongamento no km 4. Pace médio esperado: 5:30/km. Traga o refletor!','Rua Olimpíadas, 66 — Vila Olímpia','São Paulo','Esportes','OPEN',1500,25,8,3,now()+interval'14 days',now()+interval'14 days 90 minutes',now()+interval'12 days',now()+interval'14 days'-interval'12 hours',true,'treino-noturno-vila-olimpia','PUBLIC',now()-interval'20 days'),
    (e03,g01,u01,'Corrida da Primavera — 10K','Corrida especial de primavera com percurso de 10km pelas margens do Rio Pinheiros. Kit participante inclui camiseta e medalha. Premiação para os 3 primeiros de cada categoria.','Marginal Pinheiros — Ponte Cidade Universitária','São Paulo','Esportes','COMPLETED',3500,60,20,8,now()-interval'15 days',now()-interval'15 days'+interval'3 hours',now()-interval'17 days',now()-interval'15 days'-interval'12 hours',true,'corrida-da-primavera-10k','PUBLIC',now()-interval'45 days'),
    (e04,g02,u06,'Jantar Harmonizado — Cucina Italiana','Noite especial com menu degustação de 5 tempos inspirado na culinária italiana. Cada prato harmonizado com vinhos selecionados. Chef convidado formado pela Le Cordon Bleu em Florença.','Rua Emiliano Perneta, 390 — Centro','Curitiba','Gastronomia','CONFIRMED',12000,20,10,2,now()+interval'5 days',now()+interval'5 days 4 hours',now()+interval'3 days',now()+interval'5 days'-interval'12 hours',true,'jantar-harmonizado-cucina-italiana','PUBLIC',now()-interval'25 days'),
    (e05,g02,u06,'Workshop de Sushi Profissional','Aula prática de sushi e sashimi com o chef Kenji Yamamoto, que trabalhou 10 anos em Tóquio. Ingredientes incluídos. Máximo 12 participantes para atenção individualizada.','Rua XV de Novembro, 700 — Centro','Curitiba','Gastronomia','OPEN',8000,12,6,2,now()+interval'21 days',now()+interval'21 days 3 hours',now()+interval'19 days',now()+interval'21 days'-interval'12 hours',true,'workshop-de-sushi-profissional','PUBLIC',now()-interval'15 days'),
    (e06,g02,u06,'Brunch Gourmet no Mercado Municipal','Brunch com produtos selecionados do Mercado Municipal de Curitiba. Queijos artesanais, frios, pães de fermentação natural e frutas da estação.','Mercado Municipal de Curitiba — Av. Sete de Setembro','Curitiba','Gastronomia','COMPLETED',6500,30,12,4,now()-interval'10 days',now()-interval'10 days'+interval'3 hours',now()-interval'12 days',now()-interval'10 days'-interval'12 hours',true,'brunch-gourmet-no-mercado-municipal','PUBLIC',now()-interval'35 days'),
    (e07,g03,u03,'TechTalk: IA Generativa no Dia a Dia','Palestra + debate sobre como usar IA generativa para aumentar sua produtividade. Cases reais, ferramentas e demos ao vivo. Após a palestra, open bar de cerveja artesanal.','WeWork Faria Lima — Av. Brigadeiro Faria Lima, 3477','São Paulo','Tecnologia','OPEN',0,80,20,10,now()+interval'10 days',now()+interval'10 days 3 hours',now()+interval'8 days',now()+interval'10 days'-interval'12 hours',true,'techtalk-ia-generativa-no-dia-a-dia','PUBLIC',now()-interval'18 days'),
    (e08,g03,u03,'Hackathon 24h — Soluções para o Clima','Hackathon de 24 horas focado em soluções tecnológicas para mudanças climáticas. Times de 4-6 pessoas. Mentores de startups e VCs. Premiação total de R$15.000. Alimentação inclusa.','Campus Party — Anhembi, Portão Principal','São Paulo','Tecnologia','CONFIRMED',5000,60,24,8,now()+interval'25 days',now()+interval'26 days',now()+interval'20 days',now()+interval'25 days'-interval'12 hours',true,'hackathon-24h-solucoes-para-o-clima','PUBLIC',now()-interval'22 days'),
    (e09,g03,u03,'Beer & Code Night — Episódio 12','Nossa tradicional noite de código e cerveja. Apresentações relâmpago de 5 minutos sobre projetos pessoais. Sem slides obrigatórios. Cerveja artesanal inclusa, pizza no intervalo.','Cubo Itaú — Alameda Vicente Pinzon, 54','São Paulo','Tecnologia','COMPLETED',3000,40,15,5,now()-interval'7 days',now()-interval'7 days'+interval'4 hours',now()-interval'9 days',now()-interval'7 days'-interval'12 hours',true,'beer-code-night-episodio-12','PUBLIC',now()-interval'30 days'),
    (e10,g04,u08,'Trilha da Pedra Bonita','Uma das trilhas mais bonitas do Rio! 3,5km de subida até a Pedra Bonita com vista panorâmica para a Barra da Tijuca. Nível moderado. Saída coletiva às 6h da Estrada das Paineiras.','Estrada das Paineiras s/n — Floresta da Tijuca','Rio de Janeiro','Natureza','CONFIRMED',0,20,8,3,now()+interval'3 days',now()+interval'3 days 4 hours',now()+interval'2 days',now()+interval'3 days'-interval'12 hours',true,'trilha-da-pedra-bonita','PUBLIC',now()-interval'12 days'),
    (e11,g04,u08,'Escalada Iniciante no Morro da Urca','Aula de escalada para iniciantes no Morro da Urca com instrutores certificados. Equipamentos incluídos. Aprenda as técnicas básicas em ambiente seguro com vistas incríveis.','Morro da Urca — Praia Vermelha, Urca','Rio de Janeiro','Natureza','OPEN',4500,10,5,1,now()+interval'30 days',now()+interval'30 days 5 hours',now()+interval'27 days',now()+interval'30 days'-interval'12 hours',true,'escalada-iniciante-no-morro-da-urca','PUBLIC',now()-interval'8 days'),
    (e12,g05,u11,'Noite de Jazz no SESC Pinheiros','Jam session especial com músicos convidados no SESC Pinheiros. Trio de piano, contrabaixo e bateria abrindo para outros músicos. Ambiente descontraído, consumação no bar.','SESC Pinheiros — Rua Paes Leme, 195','São Paulo','Música','CONFIRMED',6000,60,20,8,now()+interval'8 days',now()+interval'8 days 4 hours',now()+interval'6 days',now()+interval'8 days'-interval'12 hours',true,'noite-de-jazz-no-sesc-pinheiros','PUBLIC',now()-interval'20 days'),
    (e13,g05,u11,'Blues & Vinho — Uma Noite Especial','Seleção de blues clássico e contemporâneo com harmonização de vinhos tintos. DJ residente: Rafael Cunha. Ambiente intimista para no máximo 40 pessoas. Dress code: smart casual.','Bar Astor — Rua Delfina, 163 — Vila Madalena','São Paulo','Música','OPEN',8000,40,15,5,now()+interval'18 days',now()+interval'18 days 5 hours',now()+interval'16 days',now()+interval'18 days'-interval'12 hours',true,'blues-vinho-uma-noite-especial','PUBLIC',now()-interval'14 days'),
    (e14,g05,u11,'Festival de Jazz Independente SP','Edição anual do festival com 3 bandas ao vivo, food trucks, artesanato e exposição fotográfica. Das 14h às 22h. Evento ao ar livre com área kids.','Parque Trianon — Av. Paulista, 1351','São Paulo','Música','COMPLETED',9000,120,40,15,now()-interval'20 days',now()-interval'20 days'+interval'8 hours',now()-interval'22 days',now()-interval'20 days'-interval'12 hours',true,'festival-de-jazz-independente-sp','PUBLIC',now()-interval'50 days'),
    (e15,g06,u05,'Yoga ao Amanhecer — Praça da Liberdade','Prática ao ar livre de hatha yoga ao nascer do sol na Praça da Liberdade. Todos os níveis bem-vindos. Traga seu tapete. Meditação guiada ao final.','Praça da Liberdade s/n — Funcionários','Belo Horizonte','Saúde','OPEN',3000,30,10,4,now()+interval'4 days',now()+interval'4 days 90 minutes',now()+interval'3 days',now()+interval'4 days'-interval'12 hours',true,'yoga-ao-amanhecer-praca-da-liberdade','PUBLIC',now()-interval'10 days'),
    (e16,g06,u05,'Retiro de Meditação — Serra do Cipó','Retiro de 2 dias na Serra do Cipó com yoga, meditação, respiração consciente e alimentação orgânica. Acomodação em chalés com vista para a natureza.','Pousada Refúgio do Cipó — Km 95 da MG-010','Belo Horizonte','Saúde','CONFIRMED',25000,16,8,2,now()+interval'45 days',now()+interval'47 days',now()+interval'38 days',now()+interval'45 days'-interval'12 hours',true,'retiro-de-meditacao-serra-do-cipo','PUBLIC',now()-interval'7 days'),
    (e17,g07,u12,'Degustação de Cervejas Belgas','Noite dedicada a 8 rótulos belgas importados e artesanais. Cada cerveja apresentada com análise sensorial e harmonização com queijos importados.','Empório Belga — Rua da Praia, 290','Porto Alegre','Gastronomia','CONFIRMED',7000,24,10,3,now()+interval'12 days',now()+interval'12 days 3 hours',now()+interval'10 days',now()+interval'12 days'-interval'12 hours',true,'degustacao-de-cervejas-belgas','PUBLIC',now()-interval'16 days'),
    (e18,g07,u12,'Visita Guiada — Cervejaria Dado Bier','Visita exclusiva com tour pela planta da Dado Bier, uma das maiores cervejarias artesanais do Sul. Processo de produção, adega de maturação e degustação ao final.','Cervejaria Dado Bier — Av. Assis Brasil, 2700','Porto Alegre','Gastronomia','OPEN',4500,20,8,2,now()+interval'22 days',now()+interval'22 days 3 hours',now()+interval'20 days',now()+interval'22 days'-interval'12 hours',true,'visita-guiada-cervejaria-dado-bier','PUBLIC',now()-interval'12 days'),
    (e19,g08,u13,'Maratona Kubrick — Eyes Wide Shut e Full Metal Jacket','Maratona de dois filmes de Kubrick com debate mediado após cada sessão. Material de apoio impresso. Pipoca artesanal e bebidas disponíveis.','Cine Belas Artes — Rua da Consolação, 2423','São Paulo','Cultura','OPEN',2500,50,15,6,now()+interval'6 days',now()+interval'6 days 6 hours',now()+interval'4 days',now()+interval'6 days'-interval'12 hours',true,'maratona-kubrick-eyes-wide-shut','PUBLIC',now()-interval'9 days'),
    (e20,g08,u13,'Cineclube: A Nouvelle Vague e seus filhos','Sessão com dois filmes da Nouvelle Vague francesa (Godard e Truffaut) com apresentação e debate. Uma viagem ao cinema que mudou o mundo.','Cinemateca Brasileira — Largo Senador Raul Cardoso, 207','São Paulo','Cultura','COMPLETED',2000,40,12,5,now()-interval'5 days',now()-interval'5 days'+interval'5 hours',now()-interval'7 days',now()-interval'5 days'-interval'12 hours',true,'cineclube-nouvelle-vague','PUBLIC',now()-interval'28 days'),
    (e21,g09,u10,'Surf + Churrasco na Praia do Campeche','Dia completo no Campeche: manhã de surf com instrução, tarde de churrasco e stand-up paddle. Pranchas disponíveis para aluguel. Leve protetor solar!','Praia do Campeche — Florianópolis','Florianópolis','Esportes','CONFIRMED',3500,25,10,4,now()+interval'9 days',now()+interval'9 days 8 hours',now()+interval'7 days',now()+interval'9 days'-interval'12 hours',true,'surf-churrasco-na-praia-do-campeche','PUBLIC',now()-interval'11 days'),
    (e22,g10,u15,'Pitch Night — Startups de Impacto Social','Noite de pitches de startups focadas em impacto social. 8 startups com 5 minutos cada + Q&A. Banca de VCs e especialistas. Networking ao final com open bar.','Cubo Itaú — Alameda Vicente Pinzon, 54','São Paulo','Negócios','OPEN',0,100,30,12,now()+interval'15 days',now()+interval'15 days 4 hours',now()+interval'13 days',now()+interval'15 days'-interval'12 hours',true,'pitch-night-startups-de-impacto-social','PUBLIC',now()-interval'13 days'),
    (e23,g10,u15,'Workshop: Growth Hacking para SaaS B2B','Workshop intensivo de 6 horas sobre crescimento para SaaS B2B. Aquisição, ativação, retenção e receita com cases reais. Certificado de participação.','Espaço WeWork — Av. Paulista, 2300','São Paulo','Negócios','CONFIRMED',15000,30,10,3,now()+interval'28 days',now()+interval'28 days 6 hours',now()+interval'23 days',now()+interval'28 days'-interval'12 hours',true,'workshop-growth-hacking-saas-b2b','PUBLIC',now()-interval'6 days'),
    (e24,g11,u07,'Forró Universitário — Especial São João','Festa de forró especial com temática junina! Forró pé de serra ao vivo com Banda Pé na Terra. Aula de aquecimento às 20h para iniciantes. Amendoim e quentão inclusos.','Centro Universitário Belas Artes — Rua Dr. Álvaro Alvim, 70','São Paulo','Cultura','OPEN',2500,100,30,10,now()+interval'2 days',now()+interval'2 days 6 hours',now()+interval'1 day',now()+interval'2 days'-interval'12 hours',true,'forro-universitario-especial-sao-joao','PUBLIC',now()-interval'5 days'),
    (e25,g11,u07,'Samba no Pé — Especial Arlindo Cruz','Noite de samba dedicada a Arlindo Cruz com roda ao vivo e DJ de samba raiz. Participação especial de dançarinos de gafieira. Das 20h à 1h.','Bar do Samba — Rua Wisard, 149 — Vila Madalena','São Paulo','Cultura','COMPLETED',3000,80,25,10,now()-interval'8 days',now()-interval'8 days'+interval'5 hours',now()-interval'10 days',now()-interval'8 days'-interval'12 hours',true,'samba-no-pe-especial-arlindo-cruz','PUBLIC',now()-interval'22 days');

  -- ── 6. PARTICIPATIONS ─────────────────────────────────
  INSERT INTO participations (event_id,user_id,status,created_at) VALUES
    (e01,u02,'CONFIRMED',now()-interval'28 days'),(e01,u17,'CONFIRMED',now()-interval'27 days'),
    (e01,u22,'CONFIRMED',now()-interval'26 days'),(e01,u35,'CONFIRMED',now()-interval'25 days'),
    (e01,u39,'CONFIRMED',now()-interval'24 days'),(e01,u49,'CONFIRMED',now()-interval'23 days'),
    (e01,u50,'CONFIRMED',now()-interval'22 days'),(e01,u09,'CONFIRMED',now()-interval'21 days'),
    (e01,u19,'CONFIRMED',now()-interval'20 days'),
    (e02,u17,'CONFIRMED',now()-interval'18 days'),(e02,u22,'CONFIRMED',now()-interval'17 days'),
    (e02,u39,'CONFIRMED',now()-interval'16 days'),(e02,u49,'CONFIRMED',now()-interval'15 days'),
    (e03,u02,'CONFIRMED',now()-interval'43 days'),(e03,u17,'CONFIRMED',now()-interval'43 days'),
    (e03,u22,'CONFIRMED',now()-interval'42 days'),(e03,u35,'CONFIRMED',now()-interval'42 days'),
    (e03,u39,'CONFIRMED',now()-interval'41 days'),(e03,u50,'CONFIRMED',now()-interval'40 days'),
    (e04,u20,'CONFIRMED',now()-interval'23 days'),(e04,u28,'CONFIRMED',now()-interval'22 days'),
    (e04,u38,'CONFIRMED',now()-interval'21 days'),(e04,u27,'CONFIRMED',now()-interval'20 days'),
    (e04,u31,'CONFIRMED',now()-interval'19 days'),(e04,u48,'CONFIRMED',now()-interval'18 days'),
    (e05,u20,'CONFIRMED',now()-interval'13 days'),(e05,u27,'CONFIRMED',now()-interval'12 days'),
    (e05,u31,'CONFIRMED',now()-interval'11 days'),
    (e06,u20,'CONFIRMED',now()-interval'33 days'),(e06,u28,'CONFIRMED',now()-interval'33 days'),
    (e06,u38,'CONFIRMED',now()-interval'32 days'),(e06,u31,'CONFIRMED',now()-interval'31 days'),
    (e07,u02,'CONFIRMED',now()-interval'16 days'),(e07,u25,'CONFIRMED',now()-interval'15 days'),
    (e07,u32,'CONFIRMED',now()-interval'14 days'),(e07,u37,'CONFIRMED',now()-interval'13 days'),
    (e07,u45,'CONFIRMED',now()-interval'12 days'),(e07,u47,'CONFIRMED',now()-interval'11 days'),
    (e07,u41,'CONFIRMED',now()-interval'10 days'),
    (e08,u02,'CONFIRMED',now()-interval'20 days'),(e08,u25,'CONFIRMED',now()-interval'19 days'),
    (e08,u32,'CONFIRMED',now()-interval'18 days'),(e08,u37,'CONFIRMED',now()-interval'17 days'),
    (e08,u45,'CONFIRMED',now()-interval'16 days'),(e08,u47,'CONFIRMED',now()-interval'15 days'),
    (e08,u28,'CONFIRMED',now()-interval'14 days'),(e08,u41,'CONFIRMED',now()-interval'13 days'),
    (e09,u02,'CONFIRMED',now()-interval'28 days'),(e09,u32,'CONFIRMED',now()-interval'27 days'),
    (e09,u37,'CONFIRMED',now()-interval'26 days'),(e09,u47,'CONFIRMED',now()-interval'25 days'),
    (e10,u14,'CONFIRMED',now()-interval'10 days'),(e10,u26,'CONFIRMED',now()-interval'9 days'),
    (e10,u30,'CONFIRMED',now()-interval'8 days'),(e10,u42,'CONFIRMED',now()-interval'7 days'),
    (e10,u46,'CONFIRMED',now()-interval'6 days'),(e10,u16,'CONFIRMED',now()-interval'5 days'),
    (e12,u04,'CONFIRMED',now()-interval'18 days'),(e12,u18,'CONFIRMED',now()-interval'17 days'),
    (e12,u26,'CONFIRMED',now()-interval'16 days'),(e12,u36,'CONFIRMED',now()-interval'15 days'),
    (e12,u46,'CONFIRMED',now()-interval'14 days'),(e12,u33,'CONFIRMED',now()-interval'13 days'),
    (e14,u04,'CONFIRMED',now()-interval'48 days'),(e14,u18,'CONFIRMED',now()-interval'48 days'),
    (e14,u26,'CONFIRMED',now()-interval'47 days'),(e14,u33,'CONFIRMED',now()-interval'46 days'),
    (e15,u24,'CONFIRMED',now()-interval'8 days'),(e15,u16,'CONFIRMED',now()-interval'7 days'),
    (e15,u19,'CONFIRMED',now()-interval'6 days'),
    (e16,u24,'CONFIRMED',now()-interval'5 days'),(e16,u44,'CONFIRMED',now()-interval'4 days'),
    (e16,u19,'CONFIRMED',now()-interval'3 days'),
    (e17,u20,'CONFIRMED',now()-interval'14 days'),(e17,u28,'CONFIRMED',now()-interval'13 days'),
    (e17,u40,'CONFIRMED',now()-interval'12 days'),(e17,u38,'CONFIRMED',now()-interval'11 days'),
    (e17,u02,'CONFIRMED',now()-interval'10 days'),(e17,u06,'CONFIRMED',now()-interval'9 days'),
    (e21,u34,'CONFIRMED',now()-interval'9 days'),(e21,u08,'CONFIRMED',now()-interval'8 days'),
    (e21,u22,'CONFIRMED',now()-interval'7 days'),(e21,u49,'CONFIRMED',now()-interval'6 days'),
    (e22,u23,'CONFIRMED',now()-interval'11 days'),(e22,u25,'CONFIRMED',now()-interval'10 days'),
    (e22,u32,'CONFIRMED',now()-interval'9 days'),(e22,u47,'CONFIRMED',now()-interval'8 days'),
    (e23,u23,'CONFIRMED',now()-interval'4 days'),(e23,u41,'CONFIRMED',now()-interval'3 days'),
    (e23,u37,'CONFIRMED',now()-interval'2 days'),
    (e24,u29,'CONFIRMED',now()-interval'3 days'),(e24,u44,'CONFIRMED',now()-interval'3 days'),
    (e24,u19,'CONFIRMED',now()-interval'2 days'),(e24,u33,'CONFIRMED',now()-interval'2 days'),
    (e25,u29,'CONFIRMED',now()-interval'20 days'),(e25,u44,'CONFIRMED',now()-interval'20 days'),
    (e25,u19,'CONFIRMED',now()-interval'19 days'),(e25,u33,'CONFIRMED',now()-interval'19 days');

  -- ── 7. MARKETPLACE LISTINGS ───────────────────────────
  INSERT INTO marketplace_listings (id,group_id,user_id,title,description,type,price,price_negotiable,payment_methods,contact,status,published_at,expires_at,created_at) VALUES
    -- Corredores SP
    (gen_random_uuid(),g01,u22,'Tênis Asics Gel-Kayano 30 — Tam 42','Tênis em ótimo estado, usado em apenas 3 corridas (~30km). Comprei o tamanho errado. Acompanha caixa original e nota fiscal. Cor: azul navy com detalhes laranja.','SELL',42000,true,'{"PIX","Dinheiro"}'::text[],'(11) 99234-5678','ACTIVE',now()-interval'20 days',now()+interval'10 days',now()-interval'20 days'),
    (gen_random_uuid(),g01,u17,'Relógio GPS Garmin Forerunner 265','Garmin 265 com 8 meses de uso. Carregador original e pulseira sobressalente. Bateria até 13 dias no modo smartwatch. Perfeito para treinos com rotas salvas.','SELL',185000,false,'{"PIX","Transferência"}'::text[],'(11) 91234-9876','ACTIVE',now()-interval'15 days',now()+interval'15 days',now()-interval'15 days'),
    (gen_random_uuid(),g01,u35,'Empréstimo: Cinta de Frequência Polar H10','Empresto minha cinta Polar H10 por até 30 dias. Compatível com Garmin, Strava e qualquer app Bluetooth. Ideal para testar antes de comprar.','LOAN',null,false,'{"Combinado"}'::text[],'(11) 97654-3210','ACTIVE',now()-interval'10 days',now()+interval'20 days',now()-interval'10 days'),
    (gen_random_uuid(),g01,u39,'Kit 3 Camisetas de Corrida Dry Fit — Tam M','Lote com 3 camisetas dry fit: 2 Nike + 1 Adidas. Sem manchas, sem rasgos. Ótimas para treinos. Vendo juntas.','SELL',8000,true,'{"PIX"}'::text[],'(11) 98765-1234','ACTIVE',now()-interval'8 days',now()+interval'22 days',now()-interval'8 days'),
    -- Foodie Curitiba
    (gen_random_uuid(),g02,u06,'Livros de Gastronomia — Lote com 5 volumes','Larousse Gastronomique, Modernist Cuisine at Home, Salt Fat Acid Heat, The French Laundry Cookbook e Jerusalem. Todos em ótimo estado.','SELL',32000,true,'{"PIX","Transferência"}'::text[],'(41) 99887-6543','ACTIVE',now()-interval'18 days',now()+interval'12 days',now()-interval'18 days'),
    (gen_random_uuid(),g02,u28,'Batedeira KitchenAid Artisan — Vermelha 4,8L','KitchenAid em perfeito estado, usada raramente. Acompanha 3 acessórios originais e capa protetora. Motivo: mudança para apartamento menor.','SELL',189000,false,'{"PIX","Cartão de Crédito"}'::text[],'(41) 98765-4321','ACTIVE',now()-interval'12 days',now()+interval'18 days',now()-interval'12 days'),
    (gen_random_uuid(),g02,u31,'Troco aulas de confeitaria por design','Ofereço 4 aulas práticas (bolos decorados, macarons e tortas) em troca de identidade visual para meu negócio de confeitaria. Procuro designer com portfólio sólido.','EXCHANGE',null,false,'{"Permuta"}'::text[],'(41) 97654-8765','ACTIVE',now()-interval'7 days',now()+interval'23 days',now()-interval'7 days'),
    -- Tech & Beers
    (gen_random_uuid(),g03,u45,'MacBook Pro M3 14" — 16GB RAM 512GB SSD','MacBook Pro M3, 8 meses de uso, perfeito estado, sem riscos. Bateria com 95% de saúde. Caixa e carregador originais. Nota fiscal disponível.','SELL',1290000,false,'{"PIX","Transferência"}'::text[],'(11) 96543-2109','ACTIVE',now()-interval'14 days',now()+interval'16 days',now()-interval'14 days'),
    (gen_random_uuid(),g03,u37,'Monitor LG UltraWide 34" Curvo','LG 34WN80C-B, 3440x1440, 60Hz. Ideal para programação e design. USB-C e HDMI inclusos. 1 ano de uso, sem dead pixels.','SELL',289000,true,'{"PIX","Transferência"}'::text[],'(11) 95432-1098','ACTIVE',now()-interval'11 days',now()+interval'19 days',now()-interval'11 days'),
    (gen_random_uuid(),g03,u47,'Mentoria gratuita em Product Management','2h de mentoria gratuita em PM para quem está migrando de área ou iniciando na carreira. Foco em priorização, discovery e roadmap.','SERVICE',null,false,'{"Gratuito"}'::text[],'(11) 94321-0987','ACTIVE',now()-interval'6 days',now()+interval'24 days',now()-interval'6 days'),
    (gen_random_uuid(),g03,u25,'Teclado Mecânico Keychron K2 — Switch Brown','Keychron K2 V2, switches Gateron Brown, Bluetooth 5.1 + USB-C, layout 75%, RGB. 6 meses de uso. Keycaps PBT impecáveis.','SELL',39000,true,'{"PIX"}'::text[],'(11) 93210-9876','ACTIVE',now()-interval'9 days',now()+interval'21 days',now()-interval'9 days'),
    -- Jazz & Blues
    (gen_random_uuid(),g05,u04,'Violão Takamine EG363SC — Eletroacústico','Takamine eletroacústico em excelente estado. Captador original, afinação estável. Cordas D''Addario EJ16 novas. Bag rígido incluso.','SELL',198000,true,'{"PIX","Transferência"}'::text[],'(11) 92109-8765','ACTIVE',now()-interval'16 days',now()+interval'14 days',now()-interval'16 days'),
    (gen_random_uuid(),g05,u36,'Procuro: Contrabaixo acústico para empréstimo','Violinista montando quinteto de jazz para apresentações. Procuro quem possa emprestar contrabaixo acústico para 3 ensaios + 1 show.','BUY',null,false,'{"Combinado"}'::text[],'(21) 99876-5432','ACTIVE',now()-interval'5 days',now()+interval'25 days',now()-interval'5 days'),
    -- Cervejeiros
    (gen_random_uuid(),g07,u20,'Kit Homebrewing para Iniciante — Completo','Fermentador 20L, airlock, termômetro, densímetro, mangueira, garrafa PET e kit de limpeza. Nunca usado. Presente que recebi e não vou usar.','SELL',28000,false,'{"PIX","Dinheiro"}'::text[],'(51) 98765-4321','ACTIVE',now()-interval'13 days',now()+interval'17 days',now()-interval'13 days'),
    (gen_random_uuid(),g07,u40,'Garrafas americanas p/ cerveja artesanal — 50un','50 garrafas americanas 500ml com tampas novas. Higienizadas e prontas para uso. Retirar em Porto Alegre (Petrópolis).','SELL',9000,true,'{"PIX","Dinheiro"}'::text[],'(51) 97654-3210','ACTIVE',now()-interval'10 days',now()+interval'20 days',now()-interval'10 days'),
    (gen_random_uuid(),g07,u12,'Doação: Livros técnicos de cerveja artesanal','Doando 4 livros: Cerveja Artesanal (Beerland), Como Fazer Cerveja, Homebrewing para Iniciantes e The Complete Joy of Homebrewing.','DONATION',null,false,'{"Gratuito"}'::text[],'(51) 96543-2109','ACTIVE',now()-interval'4 days',now()+interval'26 days',now()-interval'4 days'),
    -- Cinema Cult
    (gen_random_uuid(),g08,u43,'Coleção Blu-ray Kubrick — Completa (7 filmes)','2001, Clockwork Orange, The Shining, Full Metal Jacket, Eyes Wide Shut, Barry Lyndon, Paths of Glory. Caixas impecáveis, discos sem arranhões.','SELL',42000,false,'{"PIX","Transferência"}'::text[],'(11) 91098-7654','ACTIVE',now()-interval'17 days',now()+interval'13 days',now()-interval'17 days'),
    (gen_random_uuid(),g08,u33,'Aluguel: Projetor Full HD Epson EB-X41','3600 lumens, HDMI e VGA. R$120/dia ou R$80/meio período. Caução de R$500. Ideal para sessões de cinema e apresentações.','RENT',12000,false,'{"PIX","Dinheiro"}'::text[],'(11) 90987-6543','ACTIVE',now()-interval'9 days',now()+interval'21 days',now()-interval'9 days'),
    -- Surfistas Floripa
    (gen_random_uuid(),g09,u34,'Prancha Longboard 9''0 — Channel Islands','Channel Islands 9 pés, volume 68L, ótimo estado. 3 quilhas FCS, leash e capa semi-rígida inclusos.','SELL',289000,true,'{"PIX","Transferência"}'::text[],'(48) 99876-5432','ACTIVE',now()-interval'8 days',now()+interval'22 days',now()-interval'8 days'),
    (gen_random_uuid(),g09,u10,'Aulas de SUP para iniciantes em Floripa','Aulas na Lagoa da Conceição. 1h com prancha e remo incluídos. Turmas de até 3 alunos.','SERVICE',8000,false,'{"PIX","Dinheiro"}'::text[],'(48) 98765-4321','ACTIVE',now()-interval'5 days',now()+interval'25 days',now()-interval'5 days'),
    -- Empreendedores
    (gen_random_uuid(),g10,u15,'Mentoria 1:1 — Estratégia GTM para SaaS B2B','3 sessões de 1h sobre Go-to-Market para startups B2B. 3 exits, investidora anjo. Foco em ICP, sales motion e pricing.','SERVICE',50000,false,'{"PIX","Transferência"}'::text[],'(11) 89876-5432','ACTIVE',now()-interval'11 days',now()+interval'19 days',now()-interval'11 days'),
    (gen_random_uuid(),g10,u41,'Busco co-founder técnico para fintech','Expertise em finanças + 150 usuários beta. Procuro dev full-stack ou mobile. Ideia validada no mercado de microcrédito para MEIs.','BUY',null,false,'{"Combinado"}'::text[],'(11) 88765-4321','ACTIVE',now()-interval'6 days',now()+interval'24 days',now()-interval'6 days'),
    -- Dança SP
    (gen_random_uuid(),g11,u07,'Sapatos de Dança Suot — Salão — Tam 38','Sapatos femininos Suot, salto 5cm, sola de camurça, cor dourada. Usados em 4 eventos. Perfeito estado.','SELL',18000,true,'{"PIX","Dinheiro"}'::text[],'(11) 87654-3210','ACTIVE',now()-interval'14 days',now()+interval'16 days',now()-interval'14 days'),
    (gen_random_uuid(),g11,u29,'Vestido de Forró Bordado — Tam M','Vestido com bordados coloridos, alça fina, saia rodada. Usado apenas 2 vezes, sem manchas. Lindo para festas juninas.','SELL',12000,false,'{"PIX"}'::text[],'(11) 86543-2109','ACTIVE',now()-interval'7 days',now()+interval'23 days',now()-interval'7 days'),
    -- Fotógrafos RJ
    (gen_random_uuid(),g12,u03,'Canon EOS R6 Mark II — Corpo','2 anos de uso cuidadoso. Obturador com 45.000 disparos. Bateria, carregador e capa. Sem hot pixels.','SELL',1450000,true,'{"PIX","Transferência"}'::text[],'(21) 85432-1098','ACTIVE',now()-interval'19 days',now()+interval'11 days',now()-interval'19 days'),
    (gen_random_uuid(),g12,u21,'Tripé Manfrotto MT190XPRO3 — Profissional','Alumínio, capacidade 7kg, extensão máxima 1,57m. Cabeça hidráulica + bolsa de transporte. Nenhum arranhão.','SELL',89000,false,'{"PIX","Transferência"}'::text[],'(11) 84321-0987','ACTIVE',now()-interval'12 days',now()+interval'18 days',now()-interval'12 days'),
    (gen_random_uuid(),g12,u42,'Photo Walk toda última sexta — Lapa/Santa Teresa','Gratuito, toda última sexta às 17h pelos bairros da Lapa e Santa Teresa. Qualquer nível de experiência bem-vindo.','SERVICE',null,false,'{"Gratuito"}'::text[],'(21) 83210-9876','ACTIVE',now()-interval'3 days',now()+interval'27 days',now()-interval'3 days'),
    (gen_random_uuid(),g12,u14,'Aluguel: Lente Canon RF 85mm f/1.2L','R$250/dia, R$150/meio dia. Caução de R$2.000. Retirar no Centro do Rio.','RENT',25000,false,'{"PIX","Dinheiro"}'::text[],'(21) 82109-8765','ACTIVE',now()-interval'6 days',now()+interval'24 days',now()-interval'6 days');

  RAISE NOTICE 'SEED DEMO concluído: 50 usuários · 12 grupos · 25 eventos · participações · 28 anúncios de marketplace inseridos.';
END $$;
