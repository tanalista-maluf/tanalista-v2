// Abre, no ambiente LOCAL, uma vaga no evento lotado: cancela a inscrição da
// Carla e chama a função que avisa o próximo da fila, como faz o servidor
// quando alguém cancela.
var headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

var event = json(http.get(SUPABASE_URL + '/rest/v1/events?slug=eq.racha-lotado&select=id', { headers: headers }).body)[0]
var carla = json(http.get(SUPABASE_URL + '/rest/v1/profiles?full_name=eq.Carla&select=id', { headers: headers }).body)[0]

var cancelled = json(
  http.request(SUPABASE_URL + '/rest/v1/participations?event_id=eq.' + event.id + '&user_id=eq.' + carla.id, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({ status: 'CANCELLED' }),
  }).body
)
if (cancelled.length !== 1) throw new Error('Inscrição da Carla não encontrada')

http.post(SUPABASE_URL + '/rest/v1/rpc/promote_waitlist_next', {
  headers: headers,
  body: JSON.stringify({ p_event_id: event.id }),
})
