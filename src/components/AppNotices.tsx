import { useSyncExternalStore } from 'react'
import type { LoadStatus } from '../game/storage'
import { updateStore } from '../pwa/updates'

interface AppNoticesProps {
  loadStatus: LoadStatus
  saveFailed: boolean
  onDismissLoadStatus: () => void
}

/**
 * Functional placeholders for system messages. Wording, placement and visuals
 * are pending UX review (D-010); behavior and accessibility are final.
 */
export function AppNotices({ loadStatus, saveFailed, onDismissLoadStatus }: AppNoticesProps) {
  const update = useSyncExternalStore(updateStore.subscribe, updateStore.getSnapshot)

  return (
    <div className="app-notices" role="status">
      {loadStatus === 'recovered' && (
        <p className="app-notice">
          Il salvataggio precedente non era leggibile: è iniziata una nuova partita. Una copia del
          vecchio salvataggio è stata conservata sul dispositivo.
          <button type="button" className="quiet-button" onClick={onDismissLoadStatus}>
            Ok
          </button>
        </p>
      )}

      {saveFailed && (
        <p className="app-notice" data-tone="warning">
          Il salvataggio non è disponibile su questo dispositivo: i punteggi andranno persi se chiudi la
          pagina.
        </p>
      )}

      {update.needRefresh && (
        <p className="app-notice">
          È disponibile una nuova versione. I punteggi restano salvati.
          <button type="button" onClick={() => void updateStore.apply()}>
            Aggiorna
          </button>
          <button type="button" className="quiet-button" onClick={updateStore.dismiss}>
            Più tardi
          </button>
        </p>
      )}

    </div>
  )
}
