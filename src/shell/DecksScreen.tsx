import { DecksIcon } from '../components/icons'

/** Mazzi until R3 (R1 design §7): an honest "in preparation" page, no disabled buttons. */
export function DecksScreen() {
  return (
    <div className="screen placeholder-screen placeholder-screen--decks">
      <h1 tabIndex={-1}>Mazzi</h1>
      <div className="placeholder-screen__body">
        <span className="placeholder-screen__icon">
          <DecksIcon />
        </span>
        <h2>Il tuo grimorio è in preparazione</h2>
        <p>Qui potrai importare le tue liste, aggiungere strategie e provare una mano iniziale.</p>
        <p className="placeholder-screen__status">In preparazione</p>
      </div>
    </div>
  )
}
