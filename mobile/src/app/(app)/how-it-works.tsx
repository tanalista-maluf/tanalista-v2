import { Stack } from 'expo-router'
import { ChevronDown, ChevronUp, Mail } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen } from '@/components/ui'
import { apiUrl } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

// Mesmos tipos de src/features/ajuda/como-funciona.ts, de onde vem o conteúdo
type Block =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'table'; head: [string, string]; rows: [string, string][] }

type Section = { id: string; title: string; summary: string; blocks: Block[] }
type Content = { sections: Section[]; contactEmail: string }

async function fetchContent(): Promise<Content | null> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/como-funciona`)
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

// "Como funciona": o texto vem do site (/api/v1/como-funciona), o mesmo da
// página tanalista.app/como-funciona, então uma correção vale para os dois
// sem precisar de um app novo
export default function HowItWorksScreen() {
  const headerInset = useHeaderInset()
  const [content, setContent] = useState<Content | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchContent().then((result) => {
      if (result) setContent(result)
      else setFailed(true)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function retry() {
    setFailed(false)
    load()
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Como funciona' }} />
      {content ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]}>
          <Text style={styles.intro}>
            Tudo sobre o TáNaLista, do cadastro ao check-in. Toque num tema para ver os detalhes.
          </Text>

          {content.sections.map((section) => {
            const expanded = open === section.id
            return (
              <Card key={section.id} style={styles.card}>
                <Pressable
                  testID={`how-${section.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? null : section.id)}
                  style={styles.header}>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{section.title}</Text>
                    <Text style={styles.summary}>{section.summary}</Text>
                  </View>
                  {expanded ? <ChevronUp size={18} color={colors.text40} /> : <ChevronDown size={18} color={colors.text40} />}
                </Pressable>
                {expanded && (
                  <View style={styles.body}>
                    {section.blocks.map((block, index) => (
                      <BlockView key={index} block={block} />
                    ))}
                  </View>
                )}
              </Card>
            )
          })}

          <Card style={styles.contact}>
            <Text style={styles.title}>Ainda com dúvida?</Text>
            <Pressable
              testID="how-contact"
              accessibilityRole="link"
              onPress={() => Linking.openURL(`mailto:${content.contactEmail}`).catch(() => {})}
              style={styles.mail}>
              <Mail size={16} color={colors.primary} />
              <Text style={styles.link}>{content.contactEmail}</Text>
            </Pressable>
          </Card>
        </ScrollView>
      ) : failed ? (
        <View style={[styles.center, { paddingTop: headerInset }]}>
          <Text style={styles.failed}>Não foi possível carregar. Verifique sua conexão.</Text>
          <Button label="Tentar de novo" onPress={retry} />
        </View>
      ) : (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      )}
    </Screen>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <Text style={styles.text}>{block.text}</Text>
    case 'tip':
      return <Text style={[styles.text, styles.tip]}>{block.text}</Text>
    case 'steps':
      return (
        <View style={styles.items}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.number}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.text, styles.itemText]}>{item}</Text>
            </View>
          ))}
        </View>
      )
    case 'list':
      return (
        <View style={styles.items}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.bullet} />
              <Text style={[styles.text, styles.itemText]}>{item}</Text>
            </View>
          ))}
        </View>
      )
    case 'table':
      return (
        <View style={styles.table}>
          {block.rows.map(([label, value], index) => (
            <View key={label} style={[styles.row, index > 0 && styles.rowDivider]}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>
      )
    default:
      return null
  }
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text50, marginBottom: 4 },
  card: { padding: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  summary: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text40 },
  body: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.text70 },
  tip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    backgroundColor: 'rgba(74,222,128,0.05)',
  },
  items: { gap: 8 },
  item: { flexDirection: 'row', gap: 10 },
  itemText: { flex: 1 },
  number: {
    width: 20,
    height: 20,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(74,222,128,0.15)',
  },
  numberText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  bullet: { width: 5, height: 5, marginTop: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  table: { borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  row: { gap: 2, paddingHorizontal: 12, paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  rowValue: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50 },
  contact: { gap: 8, marginTop: 6 },
  mail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  failed: { fontFamily: fonts.body, fontSize: 14, color: colors.text50, textAlign: 'center' },
  loading: { marginTop: 80 },
})
