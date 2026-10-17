import { registerSW } from 'virtual:pwa-register'
import { updateStore } from './updates'

/** Registers the service worker; activation of a new version waits for the user (D-005). */
export function registerServiceWorker() {
  const updateSW = registerSW({
    // Offline readiness is a capability, not an event worth a notice (UX decision 8).
    onNeedRefresh() {
      updateStore.markNeedRefresh(() => updateSW(true))
    },
  })
}
