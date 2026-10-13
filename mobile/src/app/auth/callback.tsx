import { Redirect } from 'expo-router'

// O retorno do login com Google (tanalista://auth/callback) é tratado em ctx.tsx
// por quem abriu o navegador. No Android o mesmo endereço também chega ao
// roteador como link; esta rota existe só para ele não cair em "não encontrado".
export default function AuthCallback() {
  return <Redirect href="/" />
}
