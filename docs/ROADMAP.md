# Roadmap

Documento vivo: si aggiorna alla fine di ogni fase. Ultimo aggiornamento: 2026-10-19.

## Stato

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 0 | Fondamenta: git, lint, coverage, test property-based, PWA offline | ✅ conclusa ([piano](PLAN_FASE_0_1.md)) |
| 1 | Contatori affidabili, regole corrette, revisione UX (D-014–D-016) | ✅ conclusa ([resoconto](UX_REVIEW_FASE_1.md)) |
| 1.5 | CI, deploy su GitHub Pages, prova al tavolo | ✅ conclusa ([checklist](PLAYTEST_CHECKLIST.md)) |
| 1.6 | Layout compatto in orizzontale | ✅ implementata (D-020) — in attesa di prova su iPhone e revisione visiva |
| 2a | Riferimento rapido alle regole | ✅ implementata (D-021) — in attesa di revisione visiva |
| 2.v | Identità visiva canonica: font serif, palette, illustrazioni ([riferimento](art-direction/CANONICAL_ART_DIRECTION.md)) | ✅ implementata (D-024), tranne le strisce illustrate: attendono immagini originali |
| 2b | Cronologia partite | da iniziare |
| 2c | Arte del comandante da Scryfall (C2.1) | ✅ implementata (D-026), revisione D-027 implementata (D-028); strisce delle Regole rimandate |
| 2d | Layout manuale a 4 giocatori | design approvato (D-034), da implementare |
| 2e | Dock diretto per punteggi frequenti | design approvato (D-033), da implementare |

Sito: https://akyllian.github.io/commander-companion/

## Obiettivo

App per il **proprio gruppo di gioco**, solo in **italiano**: niente store, niente analitiche, niente account (D-019). Pubblica e gratuita come Fan Content secondo la Fan Content Policy di Wizards (D-025).

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

### Fase 2d — Layout manuale a quattro giocatori
- **Specifica:** [selettore manuale del layout](superpowers/specs/2026-10-19-four-player-layout-selector-design.md), D-034.
- **Tecnica:** preferenza persistente separata dalla partita; `Griglia`, `Fronte a fronte`, `Tavolo`; densità responsive distinta dalla disposizione scelta.
- **Rischi:** pannelli a 90°/180°, ordine del focus, dimensionamento dei wrapper, overlay che devono restare dritti e reflow al 200%.
- **Uscita:** scelta invariata a rotazione/reload e prova con quattro persone attorno al dispositivo.

### Fase 2e — Dock diretto per punteggi frequenti
- **Specifica:** [accesso diretto ai punteggi secondari](superpowers/specs/2026-10-19-direct-scoring-design.md), D-033.
- **Contenuto:** danni Commander, veleno, energia, esperienza, radiazioni e tassa; Monarca e Iniziativa come stati del tavolo.
- **Tecnica:** nuova versione dello schema partita; migrazione pura, persistenza e cronologia; dock in-place senza overlay e Partner separato per danni/tassa.
- **Rischi:** densità compatta, controlli da 44 px, unicità degli stati e aggiornamento della regola R7 sulla tassa.
- **Uscita:** tutti i valori approvati modificabili dalla schermata principale, verificati a 320, 768, 1440, 844×390 e zoom 200%.

### Ordine e dipendenze
Ordine proposto per il nuovo lavoro: `2e (accesso diretto) → 2d (layout manuale) → 2b (cronologia)`. Il dock risponde al problema di gioco più frequente; il layout usa poi il dock definitivo nei pannelli ruotati. Le due specifiche restano implementabili e verificabili separatamente.
