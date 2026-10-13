// Confere, no ambiente LOCAL, que a exclusão de conta apagou os dados pessoais
// do perfil e manteve o histórico de pagamento.
var headers = { apikey: SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SERVICE_ROLE_KEY }

var kept = json(http.get(SUPABASE_URL + '/rest/v1/profiles?username=eq.' + USERNAME + '&select=id', { headers: headers }).body)
if (kept.length !== 0) throw new Error('O perfil ' + USERNAME + ' ainda existe com o mesmo username')

var removed = json(
  http.get(SUPABASE_URL + '/rest/v1/profiles?username=like.excluido_*&select=id,full_name,city,phone', { headers: headers }).body
)
if (removed.length !== 1 || removed[0].full_name !== 'Conta excluída' || removed[0].city || removed[0].phone) {
  throw new Error('Perfil deveria estar anonimizado: ' + JSON.stringify(removed))
}

var payments = json(
  http.get(SUPABASE_URL + '/rest/v1/payments?payer_id=eq.' + removed[0].id + '&select=method,status&order=created_at', {
    headers: headers,
  }).body
)
var summary = payments.map(function (p) { return p.method + ':' + p.status }).join(',')
if (summary !== 'CREDIT_CARD:REJECTED,CREDIT_CARD:REFUNDED') {
  throw new Error('Histórico de pagamentos inesperado: ' + summary)
}
output.deleted = removed[0].id
