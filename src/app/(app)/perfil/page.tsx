import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AvatarUpload } from '@/features/perfil/components/AvatarUpload'
import { NotificationSettings } from '@/features/notificacoes/components/NotificationSettings'
import { logoutAction } from '@/features/auth/actions'
import { Wallet, BarChart2, Activity, User, KeyRound, LogOut, ChevronRight, FileText, Lock } from 'lucide-react'
import Link from 'next/link'
import { formatBalance } from '@/utils/format'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <main className="max-w-lg mx-auto pb-8">
      {/* Header com avatar */}
      <div
        className="px-6 pt-8 pb-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(160deg, #16532E 0%, #0A2918 100%)' }}
      >
        <div className="mb-3">
          <AvatarUpload
            name={profile.full_name ?? profile.username ?? '?'}
            currentAvatarUrl={profile.avatar_url}
          />
        </div>
        <h1 className="text-lg font-bold text-white">{profile.full_name}</h1>
        <p className="text-sm text-white/50 mt-0.5">@{profile.username}</p>
        {profile.city && <p className="text-xs text-white/35 mt-0.5">{profile.city}</p>}
        {profile.bio && <p className="text-sm text-white/60 mt-2 max-w-xs">{profile.bio}</p>}
      </div>

      <div className="px-4 space-y-3 mt-4">

        {/* Perfil */}
        <div className="space-y-2">
          <p className="text-xs text-white/35 uppercase tracking-widest px-1">Perfil</p>

          <Link href="/perfil/dados" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <User className="size-4 text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Dados pessoais</p>
              <p className="text-xs text-white/40">Nome, e-mail, telefone, cidade</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>

          <Link href="/perfil/senha" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <KeyRound className="size-4 text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Senha e segurança</p>
              <p className="text-xs text-white/40">Alterar senha ou e-mail</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>
        </div>

        {/* Financeiro */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-white/35 uppercase tracking-widest px-1">Financeiro</p>

          <Link href="/carteira" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Carteira</p>
              <p className="text-xs text-white/40">Saldo: {formatBalance(profile.wallet_balance ?? 0)}</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>

          <Link href="/financeiro" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <BarChart2 className="size-4 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Financeiro</p>
              <p className="text-xs text-white/40">Receitas dos seus eventos</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>

          <Link href="/configuracoes/atividade" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <Activity className="size-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Atividade da conta</p>
              <p className="text-xs text-white/40">Histórico de ações</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>
        </div>

        {/* Notificações */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-white/35 uppercase tracking-widest px-1">Notificações</p>
          <NotificationSettings
            initialEmail={profile.notif_email ?? true}
            initialPush={profile.notif_push ?? true}
          />
        </div>

        {/* Legal */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-white/35 uppercase tracking-widest px-1">Legal</p>

          <Link href="/termos" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="size-4 text-white/40" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Termos de uso</p>
              <p className="text-xs text-white/40">Condições de utilização da plataforma</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>

          <Link href="/privacidade" className="card-dark rounded-2xl p-3.5 flex items-center gap-3 block">
            <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Lock className="size-4 text-white/40" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Política de privacidade</p>
              <p className="text-xs text-white/40">Como usamos seus dados</p>
            </div>
            <ChevronRight className="size-4 text-white/20" />
          </Link>
        </div>

        {/* Logout */}
        <div className="pt-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-sm font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/15 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="size-4" />
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
