'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseDashboardRefreshOptions = {
  intervalMs?: number
  storageKeys?: string[]
  onRefresh: () => Promise<unknown>
  /**
   * When true, background/storage/interval refresh runs without toggling `isRefreshing`
   * (no flickering UI). Manual callers can still track loading separately.
   */
  silent?: boolean
}

export function useDashboardRefresh({
  intervalMs = 5000,
  storageKeys = [],
  onRefresh,
  silent = false,
}: UseDashboardRefreshOptions) {
  const isRefreshingRef = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    if (!silent) setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      isRefreshingRef.current = false
      if (!silent) setIsRefreshing(false)
    }
  }, [onRefresh, silent])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (event: StorageEvent) => {
      if (storageKeys.includes(event.key || '')) {
        void refresh()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refresh, storageKeys])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.visibilityState !== 'visible') return

    void refresh()

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }, intervalMs)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs, refresh])

  return { isRefreshing, refresh }
}
