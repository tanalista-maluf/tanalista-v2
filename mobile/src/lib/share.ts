import { Share } from 'react-native'

// Os links compartilhados abrem as páginas públicas do site (/e/... e /g/...),
// que mostram o evento ou o grupo mesmo para quem não tem conta
const SITE_URL = 'https://www.tanalista.app'

export async function shareLink(title: string, path: string) {
  const url = `${SITE_URL}${path}`
  try {
    // No iOS o endereço vai separado, para aparecer como link; no Android só existe a mensagem
    await Share.share(process.env.EXPO_OS === 'ios' ? { message: title, url } : { message: `${title}\n${url}` })
  } catch {
    // A pessoa fechou a folha de compartilhamento, ou o sistema não tem uma
  }
}

// Mensagem já pronta (ex.: convite com a lista de participantes), com o link
// incluído no próprio texto — por isso não usa o campo `url` separado do iOS.
export async function shareText(message: string) {
  try {
    await Share.share({ message })
  } catch {
    // A pessoa fechou a folha de compartilhamento, ou o sistema não tem uma
  }
}
