'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  badge?: number
}

export function AdminNav({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Menu"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-white/10 py-1 shadow-xl" style={{ background: '#0D1A14' }}>
            {nav.map(({ href, label, badge }) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="relative flex items-center justify-between px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                {label}
                {badge ? (
                  <span className="size-5 rounded-full bg-yellow-400 text-black text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
