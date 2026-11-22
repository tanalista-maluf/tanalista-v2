import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { EventFinancialDetail, EventParticipant } from '../queries'

// Sem 'use client': este componente é renderizado tanto no navegador (botão
// de download na página de financeiro) quanto no servidor (rota de
// relatório usada pelo app mobile, em api/v1/events/[id]/relatorio).

// Mesmo fuso usado no resto do app (src/lib/timezone.ts) — o relatório não
// pode depender do fuso de quem gera (navegador do organizador, ou servidor)
// nem do dispositivo que abre, então formata sempre em America/Sao_Paulo.
const TIME_ZONE = 'America/Sao_Paulo'

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX', CREDIT_CARD: 'Cartão', WALLET: 'Carteira',
}

function paymentLabel(p: EventParticipant): string {
  if (p.payment_amount !== null) return fmtMoney(p.payment_amount)
  if (p.is_exempt) return p.coupon_code ? `Isento (cupom ${p.coupon_code})` : 'Isento'
  return 'Gratuito'
}

function methodLabel(p: EventParticipant): string {
  if (p.payment_method) return METHOD_LABELS[p.payment_method] ?? p.payment_method
  return p.is_exempt ? 'Cupom' : '—'
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  cover: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 4, marginBottom: 14 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#555', marginBottom: 2 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8, color: '#111' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statsRowGap: { marginTop: 10 },
  statBox: { flex: 1, backgroundColor: '#f4f4f4', borderRadius: 4, padding: 8 },
  statBoxGhost: { flex: 1 },
  statLabel: { fontSize: 8, color: '#666', marginBottom: 3, textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  table: { borderTop: '1 solid #ddd', borderLeft: '1 solid #ddd' },
  tr: { flexDirection: 'row', borderBottom: '1 solid #ddd' },
  trHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderBottom: '1 solid #ddd' },
  td: { padding: 5, fontSize: 9, borderRight: '1 solid #ddd' },
  thText: { padding: 5, fontSize: 8, fontFamily: 'Helvetica-Bold', borderRight: '1 solid #ddd', textTransform: 'uppercase', color: '#444' },
  colIdx: { width: 24 },
  colName: { flex: 3 },
  colEmail: { flex: 2 },
  colMethod: { flex: 1.3 },
  colValue: { flex: 1.5, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, fontSize: 8, color: '#999', textAlign: 'center' },
})

export interface EventReportProps {
  event: EventFinancialDetail
  participants: EventParticipant[]
  generatedAt: Date
}

export function EventReportDocument({ event, participants, generatedAt }: EventReportProps) {
  const occupancyPct = event.capacity > 0 ? Math.round((event.confirmed_count / event.capacity) * 100) : 0
  const payingCount = participants.filter((p) => p.payment_amount !== null).length
  const exemptCount = participants.filter((p) => p.is_exempt).length

  return (
    <Document title={`Relatório - ${event.title}`}>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image aqui é do @react-pdf/renderer (PDF), não a tag HTML */}
        {event.cover_url && <Image src={event.cover_url} style={styles.cover} />}

        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.subtitle}>{fmtDateTime(event.starts_at)}</Text>
        <Text style={styles.subtitle}>{event.address}, {event.city}</Text>
        <Text style={styles.subtitle}>
          Organizado por {event.organizer_name}{event.group_name ? ` · ${event.group_name}` : ''}
        </Text>

        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Vagas</Text>
            <Text style={styles.statValue}>{event.confirmed_count} / {event.capacity}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ocupação</Text>
            <Text style={styles.statValue}>{occupancyPct}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Arrecadado</Text>
            <Text style={styles.statValue}>{fmtMoney(event.gross_revenue)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Líquido</Text>
            <Text style={styles.statValue}>{fmtMoney(event.net_revenue)}</Text>
          </View>
        </View>
        <View style={[styles.statsRow, styles.statsRowGap]}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pagantes</Text>
            <Text style={styles.statValue}>{payingCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Isentos</Text>
            <Text style={styles.statValue}>{exemptCount}</Text>
          </View>
          {/* Boxes vazios: mantém a mesma largura de coluna da linha de cima (4 colunas) */}
          <View style={styles.statBoxGhost} />
          <View style={styles.statBoxGhost} />
        </View>

        <Text style={styles.sectionTitle}>Inscritos ({participants.length})</Text>
        <View style={styles.table}>
          <View style={styles.trHeader}>
            <Text style={[styles.thText, styles.colIdx]}>#</Text>
            <Text style={[styles.thText, styles.colName]}>Nome</Text>
            <Text style={[styles.thText, styles.colEmail]}>Usuário</Text>
            <Text style={[styles.thText, styles.colMethod]}>Forma</Text>
            <Text style={[styles.thText, styles.colValue]}>Valor</Text>
          </View>
          {participants.map((p, i) => (
            <View style={styles.tr} key={p.participation_id} wrap={false}>
              <Text style={[styles.td, styles.colIdx]}>{i + 1}</Text>
              <Text style={[styles.td, styles.colName]}>{p.name}</Text>
              <Text style={[styles.td, styles.colEmail]}>@{p.email}</Text>
              <Text style={[styles.td, styles.colMethod]}>{methodLabel(p)}</Text>
              <Text style={[styles.td, styles.colValue, { borderRight: 0 }]}>{paymentLabel(p)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Gerado por TáNaLista em {fmtDateTime(generatedAt.toISOString())}
        </Text>
      </Page>
    </Document>
  )
}
