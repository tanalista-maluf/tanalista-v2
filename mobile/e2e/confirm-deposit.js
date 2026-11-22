// Faz o papel do webhook do Mercado Pago no ambiente LOCAL para uma recarga de
// carteira: credita o valor e apaga o registro de controle, como o webhook faz.
var headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
}

var pending = json(
  http.get(SUPABASE_URL + '/rest/v1/wallet_transactions?description=like.*aguardando*&select=id,user_id,amount', {
    headers: headers,
  }).body
)
if (pending.length !== 1) throw new Error('Esperava 1 recarga pendente, achei ' + pending.length)

http.post(SUPABASE_URL + '/rest/v1/rpc/wallet_credit', {
  headers: headers,
  body: JSON.stringify({
    p_user_id: pending[0].user_id,
    p_amount: pending[0].amount,
    p_type: 'DEPOSIT',
    p_description: 'Recarga de carteira via PIX',
  }),
})
http.request(SUPABASE_URL + '/rest/v1/payments?wallet_transaction_id=eq.' + pending[0].id, {
  method: 'PATCH',
  headers: headers,
  body: JSON.stringify({ status: 'APPROVED' }),
})
http.request(SUPABASE_URL + '/rest/v1/wallet_transactions?id=eq.' + pending[0].id, {
  method: 'DELETE',
  headers: headers,
})
