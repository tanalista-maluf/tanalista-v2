import { NextResponse } from 'next/server'

// Habilita Universal Links no iOS: um link https://www.tanalista.app/e/...,
// /g/... ou /grupos/entrar/... abre direto no app, se instalado, em vez do
// navegador. Exige um novo build nativo (associatedDomains é um entitlement) —
// não funciona só com OTA.
//
// Apple Team ID (AP3ZSN49YZ) confirmado no log do build de produção do EAS.
export async function GET() {
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: 'AP3ZSN49YZ.app.tanalista',
          paths: ['/e/*', '/g/*', '/grupos/entrar/*'],
        },
      ],
    },
  })
}
