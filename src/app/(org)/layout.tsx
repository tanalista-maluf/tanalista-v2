// Layout para organizadores autenticados
// A sidebar de navegação será adicionada na Fase 3
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      {children}
    </div>
  )
}
