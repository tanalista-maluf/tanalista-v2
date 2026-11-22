// Inscreve, no ambiente LOCAL, a Carla no primeiro time do evento recém-publicado
// pelo drafts-flow.yaml, para a lista separada por times ter alguém
var headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

var event = json(
  http.get(SUPABASE_URL + '/rest/v1/events?title=eq.Torneio%20rascunho&status=eq.OPEN&select=id', { headers: headers }).body
)[0]
if (!event) throw new Error('Evento publicado não encontrado')
var team = json(
  http.get(SUPABASE_URL + '/rest/v1/event_teams?event_id=eq.' + event.id + '&order=position&limit=1&select=id', {
    headers: headers,
  }).body
)[0]
if (!team) throw new Error('O evento não tem times')
var carla = json(http.get(SUPABASE_URL + '/rest/v1/profiles?full_name=eq.Carla&select=id', { headers: headers }).body)[0]

var created = json(
  http.post(SUPABASE_URL + '/rest/v1/participations', {
    headers: headers,
    body: JSON.stringify({ event_id: event.id, user_id: carla.id, status: 'CONFIRMED', team_id: team.id }),
  }).body
)
if (!created.length) throw new Error('Inscrição não criada')
