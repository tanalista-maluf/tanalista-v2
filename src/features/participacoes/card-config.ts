// Chave pública do Mercado Pago, da mesma aplicação de
// MERCADOPAGO_PLATFORM_ACCESS_TOKEN. Não é segredo (vai para o navegador dentro
// do formulário de cartão), mas é lida só no servidor e passada adiante.
export function getCardPublicKey(): string | null {
  return process.env.MERCADOPAGO_PLATFORM_PUBLIC_KEY || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || null
}

// O que o formulário de cartão precisa saber do servidor (ver CardPaymentForm)
export function getCardFormConfig() {
  const publicKey = getCardPublicKey()
  const stub = !publicKey && process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_STUB === '1'
  return { publicKey, stub }
}
