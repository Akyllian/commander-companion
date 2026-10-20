import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { LoadStatus } from '../game/storage'
import { updateStore } from '../pwa/updates'

interface AppNoticesProps {
  loadStatus: LoadStatus
  saveFailed: boolean
  onDismissLoadStatus: () => void
  /** In the page flow outside the game; a compact toast during play, outside the table (R1). */
  placement: 'inline' | 'toast'
}

/** System messages: never inside the table, never under the rhombus. */
export function AppNotices({ loadStatus, saveFailed, onDismissLoadStatus, placement }: AppNoticesProps) {
  const update = useSyncExternalStore(updateStore.subscribe, updateStore.getSnapshot)

  const notices: Array<{ key: string; node: ReactNode }> = []
  if (loadStatus === 'recovered') {
    notices.push({
      key: 'recovered',
      node: (
        <p className="app-notice">
          Il salvataggio precedente non era leggibile: è iniziata una nuova partita. Una copia del vecchio
          salvataggio è stata conservata sul dispositivo.
          <button type="button" className="quiet-button" onClick={onDismissLoadStatus}>
            Ok
          </button>
        </p>
      ),
    })
  }
  if (saveFailed) {
    notices.push({
      key: 'save-failed',
      node: (
        <p className="app-notice" data-tone="warning">
          Il salvataggio non è disponibile su questo dispositivo: i punteggi andranno persi se chiudi la pagina.
        </p>
      ),
    })
  }
  if (update.needRefresh) {
    notices.push({
      key: 'update',
      node: (
        <p className="app-notice">
          È disponibile una nuova versione. I punteggi restano salvati.
          <button type="button" onClick={() => void updateStore.apply()}>
            Aggiorna
          </button>
          <button type="button" className="quiet-button" onClick={updateStore.dismiss}>
            Più tardi
          </button>
        </p>
      ),
    })
  }

  return (
    <div className="app-notices" data-placement={placement} role="status">
      {notices.map(({ key, node }) => (
        <div key={key}>{node}</div>
      ))}
    </div>
  )
}
