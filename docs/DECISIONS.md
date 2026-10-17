# Decisioni architetturali

Registro delle decisioni tecniche. Ogni voce ha uno stato: **Accettata**, **Proposta** (in attesa di conferma) o **Superata**.
Le scelte di art direction, UX, visual e motion design sono di competenza di ChatGPT e non vengono decise qui; quando una decisione tecnica ha un impatto sulla UI lo si indica esplicitamente.

---

## D-001 — Stato con reducer puro + React state, nessuna libreria di stato
- **Stato:** Accettata (ereditata dallo scaffold)
- **Contesto:** lo stato di una partita è piccolo (2–4 giocatori, pochi contatori).
- **Decisione:** tutte le regole stanno in `src/game/game.ts` come funzioni pure; `App` possiede history e persistenza.
- **Conseguenze:** testabilità completa senza DOM. Si rivaluta solo se React state smette di bastare in modo dimostrabile.

## D-002 — Persistenza della partita attiva in `localStorage`
- **Stato:** Accettata e implementata (Fase 1)
- **Contesto:** serve scrittura sincrona e immediata a ogni azione; il payload è < 2 kB.
- **Decisione:** restare su `localStorage` per la partita attiva, scrivendo a ogni cambiamento di stato. Aggiungere: backup del payload non valido prima di sovrascriverlo (chiave `…backup`), `navigator.storage.persist()`, sincronizzazione tra schede via evento `storage`, stato di errore di salvataggio esposto alla UI.
- **Alternative scartate:** IndexedDB (asincrono, più complesso, nessun beneficio per un payload così piccolo). Da riconsiderare per un'eventuale cronologia partite.
- **Conseguenze:** nessuna perdita silenziosa di dati; l'indicatore visivo di "salvataggio non disponibile" richiede design.

## D-003 — Undo/redo in memoria, non persistito
- **Stato:** Accettata e implementata (Fase 1)
- **Decisione:** massimo 50 snapshot in memoria; solo lo stato corrente è persistito. La logica vive in `src/game/history.ts` (reducer puro); le azioni che non cambiano lo stato non creano passi. Una partita scritta da un'altra scheda entra come passo annullabile. Scorciatoie: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y (ignorate nei campi di testo).
- **Conseguenze:** dopo un refresh l'undo riparte vuoto (comportamento documentato).

## D-004 — Il reducer valida i propri input
- **Stato:** Accettata e implementata (Fase 1)
- **Contesto:** un valore non valido (es. `NaN`) salvato porta al rifiuto dell'intero payload al riavvio.
- **Decisione:** `amount` deve essere un intero sicuro diverso da 0; ID sconosciuti e danni Commander verso se stessi sono no-op che restituiscono lo stesso riferimento; vita limitata a −999 999…+999 999, contatori e danni a 0…999 999.
- **Invariante:** ogni stato prodotto dal reducer è accettato dal validatore dello storage (verificato con test property-based).

## D-005 — PWA con aggiornamento su conferma
- **Stato:** Accettata e implementata (Fase 0)
- **Decisione:** manifest + service worker con precache dell'app shell (`vite-plugin-pwa` 2.0, compatibile con Vite 8: il rischio R-01 non si è verificato). Il SW è registrato solo in produzione. Strategia `prompt`: il nuovo SW si attiva solo su conferma, mai con reload automatico a metà partita.
- **Conseguenze:** funzionamento offline completo dopo la prima visita. Icone e avviso di aggiornamento sono segnaposto in attesa di design.

## D-006 — Danni Commander e punti vita
- **Stato:** Accettata dal product owner (2026-10-17) e implementata
- **Contesto:** regola 903.10a: i danni da combattimento di un comandante causano perdita di vita e contano verso la soglia di 21. Oggi i due valori sono indipendenti.
- **Decisione:** `adjust-commander-damage` è un'unica azione atomica: la vita si muove esattamente del danno *applicato* (dopo il clamp a 0), quindi una correzione verso il basso restituisce solo la vita realmente tolta. Un solo passo di undo.
- **Conseguenze:** l'utente non deve più togliere la vita a mano; la UI lo dichiara con un testo di aiuto. Rimuovere un giocatore cancella i riferimenti ai suoi danni ma non restituisce la vita persa (il danno è avvenuto).

## D-007 — Comandanti partner
- **Stato:** Accettata dal product owner (2026-10-17) e implementata
- **Contesto:** la soglia di 21 è per singolo comandante; con partner il modello attuale (per giocatore sorgente) dà sconfitte errate.
- **Decisione:** schema v2. `PlayerState.hasPartner` e `commanderDamage: Record<sourceId, [comandante1, comandante2]>`. Migrazione pura v1→v2 testata. Il partner si può togliere solo se nessuno ha danni registrati dal secondo comandante (altrimenti si perderebbero dati): l'azione è un no-op e la UI lo spiega.
- **Impatto UI:** casella "due comandanti (partner)" provvisoria nel pannello; design definitivo a ChatGPT.

## D-008 — Lint indipendente dal compilatore TypeScript
- **Stato:** Accettata e implementata (Fase 0)
- **Contesto:** lo scaffold usa TypeScript 7; il supporto di `typescript-eslint` va verificato.
- **Decisione:** `oxlint` con plugin typescript, react (incl. hooks), jsx-a11y, vitest, unicorn; `--deny-warnings`. Disattivata `jsx-a11y/prefer-tag-over-role` (`role="group"` su `div` è voluto: `fieldset` cambierebbe la resa visiva).

## D-009 — Screen Wake Lock
- **Stato:** Accettata e implementata (Fase 1)
- **Decisione:** richiedere il Wake Lock durante la partita, riacquisirlo su `visibilitychange`, degradare in silenzio se non supportato. Eventuale interruttore utente: da definire in UX.

## D-010 — Nessuna modifica visiva senza approvazione UX
- **Stato:** Accettata
- **Decisione:** le correzioni tecniche che non alterano l'aspetto (ruoli ARIA, nomi accessibili, `touch-action`) procedono; quelle che lo alterano (dialog di conferma, avvisi, nuovi controlli) restano segnaposto finché ChatGPT non fornisce il design. Eccezione: adeguamenti richiesti da regole già concordate (es. target ≥ 44px).

## D-011 — Verifica end-to-end con il browser integrato
- **Stato:** Accettata (2026-10-17, "il più comodo")
- **Decisione:** niente Playwright per ora (download pesante). La verifica E2E si fa sulla build di produzione (`vite preview`) con il browser integrato, seguendo la checklist in `docs/UX_REVIEW_FASE_1.md`. I flussi critici restano coperti da test di integrazione in jsdom.
- **Rivalutare:** quando esisterà una CI, introdurre Playwright solo con Chromium.

## D-012 — Schema v2 e chiave di storage
- **Stato:** Accettata
- **Decisione:** la chiave resta `commander-companion.game.v1` (nome storico); conta il campo `version` del payload. I payload v1 vengono migrati con clamp dei valori fuori intervallo invece di essere scartati. I payload di versione futura vengono salvati in backup e non sovrascritti silenziosamente.

## D-013 — Contratto di coverage
- **Stato:** Accettata
- **Decisione:** `src/game/**` (regole, persistenza, history) deve restare al 100% di righe, branch, funzioni e statement; `npm run verify` fallisce altrimenti. Gli invarianti del reducer sono verificati con `fast-check` (≥ 1000 sequenze casuali di azioni, incluse quantità ostili).
