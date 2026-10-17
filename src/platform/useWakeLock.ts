import { useEffect } from 'react'

/**
 * Keeps the screen awake while the table is visible (D-009). The browser releases
 * the lock whenever the page is hidden, so it is requested again on return.
 * Unsupported browsers or refused requests degrade silently.
 */
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (disposed) await next.release()
        else sentinel = next
      } catch {
        // Battery saver, permissions policy or an unfocused page: the game still works.
      }
    }

    const handleVisibility = () => void acquire()
    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void sentinel?.release().catch(() => undefined)
    }
  }, [enabled])
}
