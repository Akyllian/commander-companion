# Roadmap

Documento vivo: si aggiorna alla fine di ogni fase. Ultimo aggiornamento: 2026-10-18.

## Stato

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 0 | Fondamenta: git, lint, coverage, test property-based, PWA offline | ✅ conclusa ([piano](PLAN_FASE_0_1.md)) |
| 1 | Contatori affidabili, regole corrette, revisione UX (D-014–D-016) | ✅ conclusa ([resoconto](UX_REVIEW_FASE_1.md)) |
| 1.5 | CI, deploy su GitHub Pages, prova al tavolo | ✅ conclusa ([checklist](PLAYTEST_CHECKLIST.md)) |
| 1.6 | Layout compatto in orizzontale | ✅ implementata (D-020) — in attesa di prova su iPhone e revisione visiva |
| 2a | Riferimento rapido alle regole | 🔨 in corso (spec approvata) |
| 2b | Cronologia partite | da iniziare |
| 2c | Immagini dei giocatori | da iniziare |
| 2d | Vista tavolo per tablet | da iniziare (serve prima una prova su tablet) |

Sito: https://akyllian.github.io/commander-companion/

## Obiettivo

App per il **proprio gruppo di gioco**, solo in **italiano**: niente store, niente analitiche, niente account (D-019).

## Regole di lavoro (valgono per ogni fase)

1. **Ruoli.** Claude si occupa di architettura, codice, stato, persistenza, test e correttezza delle regole. ChatGPT si occupa di UX, layout, visual e motion. Ogni fase con impatto sull'interfaccia parte da un **brief di design** (come [UX_BRIEF_ORIZZONTALE.md](UX_BRIEF_ORIZZONTALE.md)) e si chiude con un **resoconto** per la revisione.
2. **Flusso Git.** Si lavora su un branch per fase, si fa push e si apre una **pull request**. Si unisce solo con la CI verde, poi il deploy su Pages parte da solo. Così la CI controlla ogni modifica prima che arrivi su `main`.
3. **Definizione di fatto.**
   - `npm run verify` verde, con dominio e preferenze al 100%;
   - verifica nel browser a 320, 768 e 1440 px e, da ora, anche a **844×390 in orizzontale**;
   - checklist di prova al tavolo aggiornata per la fase;
   - decisioni registrate in `DECISIONS.md`.
4. **Fuori ambito** in modo permanente, salvo nuova decisione: AI, cloud e sincronizzazione, pagamenti, account, analitiche, animazioni complesse, app store, inglese.

## Roadmap

### Fase 1.6 — Layout compatto in orizzontale *(bloccata: attende ChatGPT)*
- **Input:** le risposte alle 7 domande di [UX_BRIEF_ORIZZONTALE.md](UX_BRIEF_ORIZZONTALE.md).
- **Tecnica:**
  - media query `orientation: landscape` più `max-height`;
  - header compatto;
  - pannello ridotto a nome, vita e 4 pulsanti;
  - le sezioni secondarie si aprono in un pannello sovrapposto, riusando il `<dialog>` di `ConfirmDialog` (`src/components/ConfirmDialog.tsx`) per focus trap ed Esc;
  - nessun cambiamento al dominio.
- **Rischi:** l'altezza utile in Safari non installato (~330 px) è minore di quella della PWA installata (390 px); deve funzionare in entrambi i casi.
- **Uscita:** 4 pannelli visibili senza scorrere a 844×390 e a 844×330; prova su iPhone, passi 3 e 4 della checklist.

### Fase 2a — Riferimento rapido alle regole *(per prima: rischio basso, nessuno schema nuovo)*
- **Tecnica:**
  - modulo di contenuto statico, versionato e tipizzato, `src/content/rules.ts`, come previsto in ARCHITECTURE (*"static, versioned content module"*);
  - nessuna rete;
  - testi riassunti con parole nostre e con il numero di regola, senza copiare testo ufficiale;
  - test che controllano che le soglie citate nel testo coincidano con le costanti di `src/game/game.ts` (`POISON_LIMIT`, `COMMANDER_DAMAGE_LIMIT`, `STARTING_LIFE`), così il riferimento non può divergere dalle regole implementate.
- **Contenuti** (bozza di Claude, da rivedere): vita iniziale, 0 vita, 10 veleno, 21 danni Commander per singolo comandante, Partner, i danni Commander contano come danni normali, data di aggiornamento delle regole.
- **Design:** dove si apre il pannello, come è strutturato, come si accede in orizzontale.
- **Uscita:** contenuto verificato da Claude contro le Comprehensive Rules in vigore; consultabile offline.

### Fase 2b — Cronologia partite *(solo locale)*
- **Dominio:**
  - nuovo concetto di **fine partita**: o un'azione esplicita «Termina partita», o la proposta automatica quando resta un solo giocatore non sconfitto. Da decidere con il design;
  - record immutabile: data, durata, giocatori, vincitore, cause di sconfitta.
- **Persistenza:**
  - storage separato dalla partita attiva, con chiave e versione proprie;
  - validazione come in `parseStoredGame` (`src/game/storage.ts`);
  - limite di record (per esempio 200), così `localStorage` basta e non serve IndexedDB. Si rivaluta con D-002;
  - cancellazione del singolo record e di tutto.
- **Rischi:** l'inizio della partita deve essere tracciato, quindi la partita attiva passa allo schema v3 con `startedAt`, con una migrazione pura dalla v2 sul modello di `migrateV1`.
- **Design:** quando proporre la fine partita, schermata cronologia, conferma di cancellazione.
- **Uscita:** coverage al 100% sul nuovo modulo; test property-based: ogni partita conclusa produce un record valido.

### Fase 2c — Immagini dei giocatori
- **Persistenza:**
  - le immagini non possono stare in `localStorage` (limite ~5 MB): si usa **IndexedDB** per i blob, con un adattatore dedicato `src/game/media.ts` e test con un'implementazione finta;
  - il ridimensionamento e la ricompressione avvengono sul dispositivo (`createImageBitmap` + canvas → WebP/JPEG ~512 px), per non far crescere lo spazio occupato;
  - `PlayerState` ottiene un riferimento `mediaId` validato, quindi serve un'altra versione dello schema;
  - le immagini orfane vengono eliminate;
  - si chiede `storage.persist()`, già presente in `requestPersistentStorage`.
- **Accessibilità e design:** overlay di contrasto obbligatorio (vita leggibile ≥ 4.5:1), rimozione dell'immagine, ritaglio. Il design deve decidere ritaglio e contrasto.
- **Rischi:** quota di storage su iOS; foto HEIC; memoria su dispositivi lenti; immagini che sbagliano il contrasto.
- **Uscita:** caricamento, riavvio e uso offline con 4 immagini su iPhone; nessuna perdita di dati se lo spazio si esaurisce (errore mostrato e partita intatta).

### Fase 2d — Vista tavolo per tablet *(per ultima: il design l'ha rimandata a dopo test reali)*
- **Prerequisito:** una prova su un tablet vero con la vista attuale, per raccogliere i problemi concreti.
- **Tecnica:** è un'impostazione opzionale in Preferenze (`src/settings/preferences.ts`, nuovo campo validato); rotazione dei pannelli via CSS; nessun cambiamento al dominio.
- **Rischi:** lettori di schermo e focus con contenuti ruotati; dialog e popover devono restare dritti.
- **Uscita:** prova a 4 giocatori seduti intorno a un tablet.

### Ordine e dipendenze
`1.6 → 2a → 2b → 2c → 2d`. La 2a non dipende dalla 1.6 e può partire mentre si aspetta il design della 1.6. La 2b viene prima della 2c perché fissa il pattern di migrazione dello schema (v3) che la 2c riusa.
