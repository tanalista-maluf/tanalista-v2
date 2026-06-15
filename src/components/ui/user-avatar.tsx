import { cn } from '@/lib/utils'

const COLORS = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-orange-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-amber-600',
  'bg-cyan-600',
]

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  xs: { container: 'size-6',  text: 'text-[9px]',  px: 24 },
  sm: { container: 'size-8',  text: 'text-[11px]', px: 32 },
  md: { container: 'size-10', text: 'text-sm',      px: 40 },
  lg: { container: 'size-16', text: 'text-2xl',     px: 64 },
}

export function UserAvatar({ name, avatarUrl, size = 'sm', className }: UserAvatarProps) {
  const { container, text, px } = SIZE[size]
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={px}
        height={px}
        className={cn('rounded-full object-cover shrink-0', container, className)}
      />
    )
  }

  return (
    <div className={cn('rounded-full shrink-0 flex items-center justify-center font-bold text-white', container, text, colorForName(name), className)}>
      {initials}
    </div>
  )
}
