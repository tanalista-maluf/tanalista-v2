// Confere, no ambiente LOCAL, que o cancelamento da inscrição paga devolveu o
// valor para a carteira e marcou o pagamento como estornado.
var headers = { apikey: SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SERVICE_ROLE_KEY }

var payments = json(http.get(SUPABASE_URL + '/rest/v1/payments?select=status,amount,payer_id', { headers: headers }).body)
if (payments.length !== 1 || payments[0].status !== 'REFUNDED') {
  throw new Error('Pagamento deveria estar REFUNDED: ' + JSON.stringify(payments))
}

var profile = json(
  http.get(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + payments[0].payer_id + '&select=wallet_balance', {
    headers: headers,
  }).body
)
if (profile[0].wallet_balance !== payments[0].amount) {
  throw new Error('Carteira deveria ter ' + payments[0].amount + ', tem ' + profile[0].wallet_balance)
}
output.refunded = profile[0].wallet_balance
