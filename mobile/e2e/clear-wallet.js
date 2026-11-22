// Zera, no ambiente LOCAL, a carteira de quem tem o username dado, como se a
// pessoa tivesse sacado o saldo: é o que falta para ela poder excluir a conta.
var headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

var updated = json(
  http.request(SUPABASE_URL + '/rest/v1/profiles?username=eq.' + USERNAME, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({ wallet_balance: 0 }),
  }).body
)
if (updated.length !== 1) throw new Error('Perfil não encontrado: ' + USERNAME)
