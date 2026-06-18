import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, Lock } from 'lucide-react'
import type { GroupRow } from '@/types/database'

interface GroupCardProps {
  group: GroupRow
  isMember?: boolean
  isOwner?: boolean
}

export function GroupCard({ group, isMember, isOwner }: GroupCardProps) {
  return (
    <Link href={`/grupos/${group.slug ?? group.id}`} className="block">
      <div className="card-dark rounded-2xl p-4 hover:border-primary/30 transition-all space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold text-lg overflow-hidden">
            {group.avatar_url ? (
              <Image src={group.avatar_url} alt={group.name} fill className="object-cover" />
            ) : (
              group.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm leading-tight truncate text-white">{group.name}</h3>
              {group.visibility === 'PRIVATE' && (
                <Lock className="size-3 text-white/30 shrink-0" />
              )}
            </div>
            {group.description && (
              <p className="text-xs text-white/40 line-clamp-2 mt-0.5">
                {group.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadados */}
        <div className="flex items-center gap-3 text-xs text-white/40">
          {group.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {group.city}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
          </span>
          {group.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
              {group.category}
            </span>
          )}
        </div>

        {/* Badges */}
        {(isOwner || isMember) && (
          <div className="flex items-center gap-2">
            {isOwner && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                Dono
              </span>
            )}
            {isMember && !isOwner && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-white/5 text-white/40 border border-white/10">
                Membro
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
