// O que o formulário de cartão precisa saber do servidor (ver CardPaymentForm)
export function getCardFormConfig() {
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || null
  const stub = !publicKey && process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_STUB === '1'
  return { publicKey, stub }
}
