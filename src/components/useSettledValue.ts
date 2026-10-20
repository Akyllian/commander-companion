import { useEffect, useState } from 'react'

/** The value once it has stopped changing for `delay` ms: one announcement per tap burst. */
export function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}
