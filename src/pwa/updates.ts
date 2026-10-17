type Listener = () => void

export interface UpdateState {
  /** A new service worker is installed and waiting for the user's confirmation. */
  needRefresh: boolean
  /** The app shell is cached and the app can start without a network. */
  offlineReady: boolean
}

let state: UpdateState = { needRefresh: false, offlineReady: false }
let applyUpdate: (() => Promise<void>) | null = null
const listeners = new Set<Listener>()

function setState(next: Partial<UpdateState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

export const updateStore = {
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: (): UpdateState => state,
  markNeedRefresh(update: () => Promise<void>) {
    applyUpdate = update
    setState({ needRefresh: true })
  },
  markOfflineReady() {
    setState({ offlineReady: true })
  },
  dismiss() {
    setState({ needRefresh: false, offlineReady: false })
  },
  async apply() {
    await applyUpdate?.()
  },
  /** Test helper: restore the initial state. */
  reset() {
    state = { needRefresh: false, offlineReady: false }
    applyUpdate = null
    listeners.clear()
  },
}
