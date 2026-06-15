'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/home',    icon: Home,     label: 'Início' },
  { href: '/eventos', icon: Calendar, label: 'Eventos' },
  { href: '/grupos',  icon: Users,    label: 'Grupos' },
  { href: '/perfil',  icon: User,     label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-primary/8 bg-[#080e0b]/97 backdrop-blur-xl safe-area-pb">
      <div className="max-w-2xl mx-auto px-3 h-16 flex items-center justify-around">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200',
                active
                  ? 'bg-primary/8'
                  : 'hover:bg-white/4'
              )}
            >
              <Icon
                className={cn(
                  'size-5 transition-all duration-200',
                  active
                    ? 'text-primary drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                    : 'text-white/30'
                )}
              />
              <span className={cn(
                'text-[10px] font-bold tracking-[0.02em] transition-colors duration-200',
                active ? 'text-primary' : 'text-white/25'
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
