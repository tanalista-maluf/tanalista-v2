import { NextResponse } from 'next/server'

// Habilita Universal Links no iOS: um link https://www.tanalista.app/e/...,
// /g/... ou /grupos/entrar/... abre direto no app, se instalado, em vez do
// navegador. Exige um novo build nativo (associatedDomains é um entitlement) —
// não funciona só com OTA.
//
// TODO: troque TEAMID pelo Apple Team ID (Apple Developer > Membership, ou
// `eas credentials -p ios`). O bundle id (app.tanalista) já está certo.
export async function GET() {
  return NextResponse.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAMID.app.tanalista',
          paths: ['/e/*', '/g/*', '/grupos/entrar/*'],
        },
      ],
    },
  })
}
