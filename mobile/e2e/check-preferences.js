// Confere, no ambiente LOCAL, que as preferências escolhidas no app foram gravadas
var headers = { apikey: SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SERVICE_ROLE_KEY }
var rows = json(
  http.get(SUPABASE_URL + '/rest/v1/profiles?username=eq.bruno&select=notif_email,notif_new_event_channel', {
    headers: headers,
  }).body
)
if (rows[0].notif_email !== false || rows[0].notif_new_event_channel !== 'NONE') {
  throw new Error('Preferências não gravadas: ' + JSON.stringify(rows[0]))
}
