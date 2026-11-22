-- Ajuste único: marca como REFUNDED os pagamentos que já foram estornados
-- pelo fluxo antigo de cancelamento, que creditava a carteira mas deixava o
-- pagamento como APPROVED.
--
-- O estorno novo (src/lib/refunds.ts) devolve todo pagamento APPROVED da
-- inscrição. Sem este ajuste, quem cancelou pelo fluxo antigo e se inscrever
-- de novo no mesmo evento receberia o pagamento antigo outra vez num segundo
-- cancelamento, e ele voltaria a contar no repasse ao organizador.
--
-- Só toca em pagamentos de inscrições CANCELLED para as quais existe um
-- lançamento REFUND do mesmo usuário, evento e valor.
UPDATE payments p
SET status = 'REFUNDED'
FROM participations pt
WHERE pt.id = p.participation_id
  AND pt.status = 'CANCELLED'
  AND p.status = 'APPROVED'
  AND EXISTS (
    SELECT 1 FROM wallet_transactions w
    WHERE w.user_id = pt.user_id
      AND w.event_id = pt.event_id
      AND w.type = 'REFUND'
      AND w.amount = p.amount
  )
RETURNING p.id, p.amount;
