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
- **Stato:** Proposta (estende lo scaffold)
- **Contesto:** serve scrittura sincrona e immediata a ogni azione; il payload è < 2 kB.
- **Decisione:** restare su `localStorage` per la partita attiva, scrivendo a ogni cambiamento di stato. Aggiungere: backup del payload non valido prima di sovrascriverlo (chiave `…backup`), `navigator.storage.persist()`, sincronizzazione tra schede via evento `storage`, stato di errore di salvataggio esposto alla UI.
- **Alternative scartate:** IndexedDB (asincrono, più complesso, nessun beneficio per un payload così piccolo). Da riconsiderare per un'eventuale cronologia partite.
- **Conseguenze:** nessuna perdita silenziosa di dati; l'indicatore visivo di "salvataggio non disponibile" richiede design.

## D-003 — Undo/redo in memoria, non persistito
- **Stato:** Accettata (ereditata), con modifica proposta
- **Decisione:** massimo 50 snapshot in memoria; solo lo stato corrente è persistito. Proposta: estrarre la logica in `src/game/history.ts` (pura e testata) e non registrare azioni che non cambiano lo stato.
- **Conseguenze:** dopo un refresh l'undo riparte vuoto (comportamento documentato).

## D-004 — Il reducer valida i propri input
- **Stato:** Proposta
- **Contesto:** un valore non valido (es. `NaN`) salvato porta al rifiuto dell'intero payload al riavvio.
- **Decisione:** `amount` deve essere un intero sicuro diverso da 0; ID sconosciuti e danni Commander verso se stessi sono no-op che restituiscono lo stesso riferimento; vita limitata a un intervallo di dominio (es. −999 999…+999 999), contatori a 0…999 999.
- **Invariante:** ogni stato prodotto dal reducer è accettato dal validatore dello storage (verificato con test property-based).

## D-005 — PWA con aggiornamento su conferma
- **Stato:** Proposta
- **Decisione:** manifest + service worker con precache dell'app shell (`vite-plugin-pwa`, fallback SW manuale se incompatibile con Vite 8). Strategia `prompt`: il nuovo SW si attiva solo su conferma, mai con reload automatico a metà partita.
- **Conseguenze:** funzionamento offline completo dopo la prima visita. Icone e avviso di aggiornamento sono segnaposto in attesa di design.

## D-006 — Danni Commander e punti vita
- **Stato:** Proposta — **richiede conferma** (regole + UX)
- **Contesto:** regola 903.10a: i danni da combattimento di un comandante causano perdita di vita e contano verso la soglia di 21. Oggi i due valori sono indipendenti.
- **Opzione raccomandata:** un'unica azione atomica che incrementa il danno Commander e riduce la vita dello stesso valore (un solo passo di undo); il decremento corregge entrambi.
- **Alternativa:** valori indipendenti come oggi, eventualmente con un'impostazione.

## D-007 — Comandanti partner
- **Stato:** Proposta — **richiede conferma**
- **Contesto:** la soglia di 21 è per singolo comandante; con partner il modello attuale (per giocatore sorgente) dà sconfitte errate.
- **Opzione raccomandata:** schema v2 con danni indicizzati per comandante (`sourcePlayerId` + indice 0/1), migrazione pura v1→v2 testata.
- **Impatto UI:** serve un controllo per dichiarare il secondo comandante (ChatGPT).

## D-008 — Lint indipendente dal compilatore TypeScript
- **Stato:** Proposta
- **Contesto:** lo scaffold usa TypeScript 7; il supporto di `typescript-eslint` va verificato.
- **Decisione:** preferire `oxlint`; passare a ESLint solo se servono regole type-aware non disponibili.

## D-009 — Screen Wake Lock
- **Stato:** Proposta
- **Decisione:** richiedere il Wake Lock durante la partita, riacquisirlo su `visibilitychange`, degradare in silenzio se non supportato. Eventuale interruttore utente: da definire in UX.

## D-010 — Nessuna modifica visiva senza approvazione UX
- **Stato:** Accettata
- **Decisione:** le correzioni tecniche che non alterano l'aspetto (ruoli ARIA, nomi accessibili, `touch-action`) procedono; quelle che lo alterano (dialog di conferma, avvisi, nuovi controlli) restano segnaposto finché ChatGPT non fornisce il design. Eccezione: adeguamenti richiesti da regole già concordate (es. target ≥ 44px).
