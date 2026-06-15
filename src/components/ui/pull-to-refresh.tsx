'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const THRESHOLD = 72 // px puxados para ativar
const MAX_PULL = 100

export function PullToRefresh() {
  const router = useRouter()
  const startY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pulling = useRef(false)

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta, MAX_PULL))
    }
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      router.refresh()
      // Aguarda animação mínima de 600ms
      await new Promise((r) => setTimeout(r, 600))
      setRefreshing(false)
    }
    setPullDistance(0)
  }, [pullDistance, router])

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd])

  if (pullDistance === 0 && !refreshing) return null

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const opacity = refreshing ? 1 : progress
  const scale = refreshing ? 1 : 0.5 + progress * 0.5

  return (
    <div
      className="fixed top-14 inset-x-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${refreshing ? 16 : pullDistance * 0.4}px)` }}
    >
      <div
        className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center transition-opacity"
        style={{ opacity, transform: `scale(${scale})` }}
      >
        <Loader2
          className="size-4 text-primary"
          style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}
        />
      </div>
    </div>
  )
}
