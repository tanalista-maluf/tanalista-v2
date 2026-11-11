-- Para de gerar o username a partir do e-mail ao criar a conta. Dois
-- usuários diferentes com a mesma parte antes do "@" (ex.: joao@gmail.com e
-- joao@yahoo.com, ou um e-mail digitado errado e depois corrigido) faziam a
-- segunda conta falhar com erro de username duplicado (SQLSTATE 23505 em
-- profiles_username_key), derrubando o cadastro inteiro com um erro genérico.
--
-- O username agora nasce NULL e é escolhido pela própria pessoa na etapa 1
-- do onboarding (onboardingStep1Action em features/auth/actions.ts), que já
-- faz a checagem de disponibilidade com mensagem amigável antes de salvar.
-- UNIQUE não é violado por múltiplos NULL, e username_format (CHECK) já
-- tolera NULL sem precisar de ajuste.

ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
