// Confere, no ambiente LOCAL, que o saque pedido no app chegou para a equipe
var headers = { apikey: SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SERVICE_ROLE_KEY }
var rows = json(
  http.get(SUPABASE_URL + '/rest/v1/withdrawals?select=amount_cents,pix_key_type,status', { headers: headers }).body
)
if (rows.length !== 1 || rows[0].amount_cents !== 1500 || rows[0].status !== 'PENDING') {
  throw new Error('Saque inesperado: ' + JSON.stringify(rows))
}
