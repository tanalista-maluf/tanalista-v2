-- Tabela de saques: nunca foi criada, apesar de já ser usada por
-- requestWithdrawalAction/confirmWithdrawalAction/cancelWithdrawalAction e
-- pelo painel /admin/saques. Sem ela, o insert do pedido de saque falhava
-- silenciosamente (erro não verificado) depois do débito já ter sido
-- aplicado na carteira — o saldo desaparecia sem nenhum registro para o
-- admin processar.

CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'PAID', 'CANCELLED');

CREATE TABLE withdrawals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  fee_cents     BIGINT NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  net_cents     BIGINT NOT NULL CHECK (net_cents > 0),
  cpf           TEXT NOT NULL,
  pix_key       TEXT NOT NULL,
  pix_key_type  TEXT NOT NULL CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random')),
  status        withdrawal_status NOT NULL DEFAULT 'PENDING',
  admin_note    TEXT,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_user      ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status    ON withdrawals(status);
CREATE INDEX idx_withdrawals_created   ON withdrawals(created_at DESC);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas os próprios saques; escrita só via service_role
-- (requestWithdrawalAction/confirmWithdrawalAction/cancelWithdrawalAction
-- usam createAdminClient).
CREATE POLICY "withdrawals_select_own"
  ON withdrawals FOR SELECT
  USING (user_id = auth.uid());
