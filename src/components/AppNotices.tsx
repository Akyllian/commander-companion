import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { LoadStatus } from '../game/storage'
import { updateStore } from '../pwa/updates'
import { PopoverMenu } from './PopoverMenu'

interface AppNoticesProps {
  loadStatus: LoadStatus
  saveFailed: boolean
  onDismissLoadStatus: () => void
  /** Compact landscape: notices live behind a "Stato app" header button and take no grid height. */
  compact?: boolean
  supportsPopover?: boolean
}

/**
 * System messages. Standard layout: inline under the header. Compact landscape: the same
 * notices and actions inside a top-layer panel, with the count exposed to assistive technology.
 */
export function AppNotices({ loadStatus, saveFailed, onDismissLoadStatus, compact = false, supportsPopover }: AppNoticesProps) {
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

  if (!compact) {
    return (
      <div className="app-notices" role="status">
        {notices.map(({ key, node }) => (
          <div key={key}>{node}</div>
        ))}
      </div>
    )
  }

  const count = notices.length
  const summary = count === 1 ? '1 avviso' : `${count} avvisi`
  return (
    <>
      {/* Announces new notices even though their text is inside a closed panel. */}
      <span className="sr-only" role="status">
        {count > 0 ? `Stato app: ${summary}` : ''}
      </span>
      {count > 0 && (
        <PopoverMenu
          label="Stato app"
          description={summary}
          buttonClassName="status-button"
          supportsPopover={supportsPopover}
          trigger={
            <>
              <span className="status-button__marker" aria-hidden="true">
                !
              </span>
              <span>Stato app</span>
            </>
          }
        >
          {() => <div className="app-notices app-notices--panel">{notices.map(({ key, node }) => <div key={key}>{node}</div>)}</div>}
        </PopoverMenu>
      )}
    </>
  )
}
