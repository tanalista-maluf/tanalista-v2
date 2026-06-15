'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { useSession } from './useSession'

type Profile = Database['public']['Tables']['profiles']['Row']

export function useProfile() {
  const { user, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [user, sessionLoading])

  return { profile, loading: sessionLoading || loading }
}
