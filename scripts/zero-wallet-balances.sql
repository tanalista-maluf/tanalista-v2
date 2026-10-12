-- Ajuste único: zera o saldo de todas as carteiras.
--
-- Para cada perfil com saldo, debita o saldo inteiro por wallet_debit(), que
-- trava a linha do perfil e grava um lançamento ADJUSTMENT no extrato com
-- balance_after = 0. Não toca em payments, withdrawals nem nos lançamentos
-- anteriores. Rodar de novo não faz nada (não sobra perfil com saldo).
--
-- Requer a migration 20261015000001 (tipo ADJUSTMENT) já aplicada.
SELECT (wallet_debit(
  id,
  wallet_balance,
  'ADJUSTMENT'::wallet_transaction_type,
  'Ajuste administrativo: saldo da carteira zerado'
)).id
FROM profiles
WHERE wallet_balance > 0;
