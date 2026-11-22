// Faz o papel do webhook do Mercado Pago no ambiente LOCAL: aprova o PIX
// pendente e confirma a inscrição. Roda no Maestro (runScript), no computador.
var headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
}

var pending = json(
  http.get(SUPABASE_URL + '/rest/v1/payments?status=eq.PENDING&method=eq.PIX&select=id,participation_id', {
    headers: headers,
  }).body
)
if (pending.length !== 1) throw new Error('Esperava 1 PIX pendente, achei ' + pending.length)

http.request(SUPABASE_URL + '/rest/v1/payments?id=eq.' + pending[0].id, {
  method: 'PATCH',
  headers: headers,
  body: JSON.stringify({ status: 'APPROVED' }),
})
http.request(SUPABASE_URL + '/rest/v1/participations?id=eq.' + pending[0].participation_id, {
  method: 'PATCH',
  headers: headers,
  body: JSON.stringify({ status: 'CONFIRMED' }),
})
