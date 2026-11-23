import { NextResponse } from 'next/server'

// Habilita App Links no Android: mesmo papel do apple-app-site-association,
// pro Android abrir o link direto no app em vez do navegador. Exige um novo
// build nativo (vai pro AndroidManifest.xml) — não funciona só com OTA.
//
// TODO: troque o fingerprint pelo SHA-256 do certificado de assinatura
// (`eas credentials -p android`, ou Play Console > Configuração > Integridade
// do app > Assinatura do app). Pode ter mais de um (debug + produção).
export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'app.tanalista',
        sha256_cert_fingerprints: ['TODO:SUBSTITUA:PELO:FINGERPRINT:SHA256:DO:CERTIFICADO'],
      },
    },
  ])
}
