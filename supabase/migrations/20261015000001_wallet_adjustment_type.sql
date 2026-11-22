-- Tipo de lançamento para ajustes administrativos de saldo (por exemplo,
-- zerar carteiras). Evita registrar um ajuste como saque ou pagamento.
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'ADJUSTMENT';
