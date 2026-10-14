// Lê, no ambiente LOCAL, o e-mail de recuperação de senha mais recente (Mailpit
// do `supabase start`) e segue o link até o endereço que abre o app. É o que a
// pessoa faz ao tocar no link do e-mail.
var messages = json(http.get(MAILPIT_URL + '/api/v1/messages').body).messages
if (!messages.length) throw new Error('Nenhum e-mail no Mailpit')

var text = json(http.get(MAILPIT_URL + '/api/v1/message/' + messages[0].ID).body).Text
var link = text.match(/https?:\/\/[^\s)\]]*\/auth\/v1\/verify[^\s)\]]*/)
if (!link) throw new Error('E-mail sem link de recuperação: ' + text)

// O Supabase confere o link e redireciona para tanalista://auth/callback?code=...
var response = http.get(link[0])
var location = response.headers.Location || response.headers.location
if (!location || location.indexOf('code=') === -1) {
  throw new Error('Redirecionamento inesperado: ' + response.status + ' ' + JSON.stringify(response.headers))
}
output.appLink = location
