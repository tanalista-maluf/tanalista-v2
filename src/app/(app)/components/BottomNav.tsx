'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, User, Wallet, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/home',     icon: Home,     label: 'Início' },
  { href: '/eventos',  icon: Calendar, label: 'Eventos' },
  { href: '/grupos',   icon: Users,    label: 'Grupos' },
  { href: '/carteira', icon: Wallet,   label: 'Carteira' },
  { href: '/perfil',   icon: User,     label: 'Perfil' },
]

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const nav = isAdmin
    ? [...NAV, { href: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : NAV

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-primary/8 bg-[#080e0b]/97 backdrop-blur-xl safe-area-pb">
      <div className="max-w-2xl mx-auto px-2 h-16 flex items-center justify-around">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
          const isAdminItem = href === '/admin'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2 rounded-2xl transition-all duration-200',
                active
                  ? isAdminItem ? 'bg-yellow-400/8' : 'bg-primary/8'
                  : 'hover:bg-white/4'
              )}
            >
              <Icon
                className={cn(
                  'size-5 transition-all duration-200',
                  active
                    ? isAdminItem
                      ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                      : 'text-primary drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                    : isAdminItem ? 'text-yellow-400/40' : 'text-white/30'
                )}
              />
              <span className={cn(
                'text-[10px] font-bold tracking-[0.02em] transition-colors duration-200',
                active
                  ? isAdminItem ? 'text-yellow-400' : 'text-primary'
                  : isAdminItem ? 'text-yellow-400/40' : 'text-white/25'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
