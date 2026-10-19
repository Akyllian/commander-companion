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

## D-014 — Decisioni UX della revisione Fase 1 (ricevute il 2026-10-17)
- **Stato:** Accettate (owner: design) e implementate sul branch `fase-1-ux`
- **Fonte:** risposte alle 9 domande di `docs/UX_REVIEW_FASE_1.md`.
- **Note tecniche di implementazione:**
  1. Dialog nativo `<dialog>` + `showModal()` (`ConfirmDialog`): focus trap e sfondo inerte del browser, focus iniziale su *Annulla*, Esc gestito via evento `cancel`, focus restituito al pulsante d'origine. Nessun pulsante `submit`, quindi Invio attiva solo il pulsante con focus.
  2. Rimozione immediata + `UndoSnackbar` (6 s). Il timer si ferma mentre il pulsante ha il focus (WCAG 2.2.1). Lo snackbar resta visibile **solo finché la rimozione è l'ultimo passo**: qualunque altra azione lo nasconde, così il suo *Annulla* non può mai annullare un'altra cosa. L'undo globale resta disponibile.
  3. Raggruppamento in `historyReducer`: stessa chiave (azione, giocatore, contatore/sorgente/comandante, direzione) entro `GROUP_WINDOW_MS = 700` dall'ultimo tocco = un solo passo. Il timestamp arriva nell'azione (`at`) per mantenere il reducer puro. Il delta mostrato è calcolato rispetto allo snapshot d'inizio gruppo, quindi riflette i valori **applicati** (dopo i clamp). Annuncio screen reader con lo stesso intervallo.
  4. Due `<details>` distinti; il riepilogo Commander è il **massimo** per singolo comandante. Lo stato aperto è tenuto in memoria per pannello (sopravvive alle azioni, non a un ricaricamento).
  5. Nessuna rotazione: nessun cambiamento.
  6. Riga "Sconfitto · motivo" sotto il nome; con più motivi "N condizioni" e testo completo solo per screen reader.
  7. Preferenza `keepScreenOn` (default `true`) in `src/settings/preferences.ts`, chiave `commander-companion.preferences`, validata campo per campo. Il controllo non viene renderizzato se `navigator.wakeLock` non esiste.
  8. Rimosso l'avviso "offline pronto" e il relativo stato. Indicatore "Offline" non implementato (indicato come opzionale).
  9. Sezione "Configurazione mazzo" sotto il nome, etichetta testuale "Partner" nell'header.

## D-015 — Decisioni definitive sui quattro punti aperti (ricevute il 2026-10-17)
- **Stato:** Accettate (owner: design) e implementate sul branch `fase-1-ux-2`
- **Note tecniche:**
  1. **Pulsante distruttivo pieno** solo nel dialog. Nuovi token: `--color-danger-hover` (L 0.55), `--color-danger-active` (L 0.45), `--color-on-danger`. Contrasto testo: 6.3:1 base, 5.1:1 hover, 7.6:1 active.
  2. **Icona `user-minus`** standard (stroke 1.75, 22px, target 44px), muted a riposo, rossa su hover/focus/active. Il rosso base su superficie scura dava solo 3.0:1, quindi per i primi piani si usa `--color-danger-foreground` (L 0.65, 5.6:1). `title` + `aria-label` "Rimuovi Giocatore N".
  3. **Barra Annulla inline** (`UndoBar`) nella cella del pannello rimosso, uguale su ogni larghezza; overlay eliminato. Poiché il pulsante cliccato scompare, il focus passa alla barra (non al suo pulsante, così il timer non si ferma); quando la barra sparisce con il focus dentro, il focus va alla griglia `#main`. Valgono ancora: pausa del timer sul focus del pulsante, visibilità solo finché la rimozione è l'ultimo passo, undo globale.
  4. **Preferenze in popover** nativo (`popover="auto"`, `popovertarget`) dopo "Azzera punteggi": top layer, chiusura con Esc, clic esterno o pulsante. Il pannello è ancorato in `beforetoggle` (sincrono) tramite `top`/`right`, senza misure. Lo stato aperto arriva dall'evento DOM `toggle` (asincrono, non passa da React). `aria-expanded` è lasciato al browser in modalità nativa. Fallback con lo stesso comportamento dove l'API manca (e in jsdom). A 320px solo icona.
- **Bug trovati in verifica:** la regola mobile `.match-controls label > span` nascondeva anche il testo del popover; ristretta ai figli diretti.

## D-016 — Header dei controlli partita (ricevuta il 2026-10-17)
- **Stato:** Accettata (owner: design) e implementata sul branch `fase-1-ux-3`. Solo CSS.
- **Regole:** i pulsanti dei controlli partita hanno `white-space: nowrap` e `flex-shrink: 0`; "Preferenze" diventa solo icona sotto 52rem (tooltip e `aria-label` invariati); "Giocatori" resta sempre visibile; sotto 46rem i pulsanti possono andare a capo come blocchi, ma il loro testo no. L'header resta su due livelli (brand sopra, controlli sotto) fino a 62rem, come prima; sopra 62rem resta su una riga sola.
- **Verifica:** misurata a 320, 375, 600, 737, 768, 833, 993 e 1440px: nessun testo spezzato, nessun pulsante fuori dall'header, nessuno scroll orizzontale; "Nuova partita" e "Azzera punteggi" sulla stessa riga da 46rem in su.

## D-017 — CI e build indipendente dall'hosting (Fase 1.5)
- **Stato:** Accettata e implementata sul branch `fase-1-5-preparazione`. Hosting e repository remoto **non ancora scelti** (decisione del product owner).
- **CI:** `.github/workflows/ci.yml` (GitHub Actions) esegue `npm ci` e `npm run verify` su Node 22 e 24 a ogni push su `main` e a ogni pull request, poi controlla una build servita da sottocartella. Permessi in sola lettura. Nessun deploy configurato.
- **Percorso base:** `BASE_PATH` (es. `/commander-companion/`) imposta `base` di Vite, `id`/`start_url`/`scope` del manifest e il fallback di navigazione del service worker. Default `/`. Serve per host che pubblicano in una sottocartella (GitHub Pages); per Netlify o Cloudflare Pages non serve.
- **Verificato:** build con `BASE_PATH=/commander-companion/`, service worker con scope corretto, riapertura offline a server spento, anche su un link profondo.
- **Engines:** `jsdom` richiede Node `^22.22.2 || >=24.15.0`; `package.json` ora lo dichiara (prima `>=22`, troppo largo).
- **Prova al tavolo:** `docs/PLAYTEST_CHECKLIST.md`. I problemi di gravità alta bloccano la Fase 2.

## D-018 — Hosting: GitHub + GitHub Pages
- **Stato:** Attiva dal 2026-10-17. Repository **pubblico** `Akyllian/commander-companion` (scelta del product owner per usare Pages con GitHub Free); sito https://akyllian.github.io/commander-companion/. Primo giro: CI verde su Node 22 e 24, deploy riuscito, service worker attivo in HTTPS.
- **Deploy:** `.github/workflows/deploy.yml` pubblica su Pages solo dopo che il workflow CI è riuscito su `main` (`workflow_run`), costruendo esattamente il commit verificato, con `BASE_PATH=/<nome-repo>/`. Deploy mai annullati a metà. Avvio manuale possibile (`workflow_dispatch`).
- **Vincoli GitHub** (documentazione ufficiale): con GitHub Free il repository deve essere **pubblico** per usare Pages; un repository privato richiede un piano a pagamento (es. Pro). In ogni caso il **sito** Pages è pubblico su internet anche se il repository è privato (salvo il controllo d'accesso di Enterprise Cloud). L'app non contiene dati personali: i punteggi restano sul dispositivo.

## D-019 — Perimetro del prodotto e flusso di lavoro (2026-10-18)
- **Stato:** Accettata (product owner), con la roadmap in `docs/ROADMAP.md`.
- **Pubblico:** il gruppo di gioco del product owner. Niente app store, analitiche o account. **Lingua:** solo italiano (nessun sistema di traduzioni).
- **Fase 2:** tutte e quattro le funzioni (riferimento regole, cronologia partite, immagini giocatori, vista tavolo per tablet), nell'ordine 2a → 2b → 2c → 2d, dopo o in parallelo alla Fase 1.6 (orizzontale).
- **Flusso Git:** da ora ogni fase vive su un branch e arriva su `main` con una pull request, unita solo con la CI verde. Il push diretto su `main` del 2026-10-18 è l'ultimo.
- **Definizione di fatto:** aggiunta la verifica a 844×390 in orizzontale.

## D-020 — Layout compatto in orizzontale (Fase 1.6)
- **Stato:** Accettata. Spec e piano di ChatGPT: `docs/superpowers/specs/2026-10-18-compact-landscape-design.md`, `docs/superpowers/plans/2026-10-18-compact-landscape.md`.
- **Divisione:** Claude ha implementato la struttura (componenti, geometria, focus, accessibilità, test). Art direction e animazioni restano a ChatGPT: i nuovi elementi usano solo token esistenti e nessuna transizione nuova.
- **Una sola fonte per la condizione:** `COMPACT_LANDSCAPE_QUERY` (`(orientation: landscape) and (max-height: 30rem)`) è valutata in JS (`useCompactLandscape`). Il CSS usa `[data-compact-landscape='true']` invece di ripetere la media query, così struttura e stili non possono divergere.
- **Componenti condivisi:** `PopoverMenu` (Preferenze, Partita, Stato app), con lo stesso fallback e lo spostamento del focus dentro il menu all'apertura; `ModalSideSheet` (dettagli giocatore, poi regole), con `<dialog>` nativo e fallback a portal, `inert` e trappola del Tab; `PlayerSections`, usato sia nel pannello standard sia nello sheet.
- **Ripiego accessibile:** sotto 32rem di larghezza (per esempio zoom 200% su 844 px) la griglia compatta passa a una colonna e scorre in verticale, così i controlli da 44 px non vengono mai tagliati.
- **Scostamenti dalla spec, da confermare con il design:**
  1. sotto 32rem la griglia va su **una colonna**: la spec diceva solo che «può riorganizzarsi»;
  2. il badge compatto accorcia solo il motivo e mantiene la parola «Sconfitto»;
  3. la riga vita è limitata a 24rem nelle celle larghe (2 giocatori e terzo pannello a tutta larghezza), così i pulsanti non si ingrandiscono;
  4. «21 danni Commander» diventa «21 Commander» solo nel badge compatto, come da spec; il layout standard resta invariato.
- **Verifica:** a 844×390, 844×330 e 568×320 i 4 pannelli e i 16 pulsanti vita sono visibili senza scroll, l'header è alto 52 px e tutti i target sono ≥ 44 px; 2 e 3 giocatori come da spec; valori −999 e 999 e nomi lunghi senza sovrapposizioni; zoom 200% simulato senza scroll orizzontale e senza controlli tagliati; layout standard invariato a 390, 768 e 1440 px.

## D-021 — Riferimento rapido alle regole (Fase 2a)
- **Stato:** Accettata. Spec e piano di ChatGPT: `docs/superpowers/specs/2026-10-18-rules-reference-design.md`, `docs/superpowers/plans/2026-10-18-rules-reference.md`.
- **Contenuto statico e tipizzato** in `src/content/rules.ts`, incluso nella build, quindi disponibile offline. Ogni soglia è letta dalle costanti del dominio (`STARTING_LIFE`, `LIFE_DEFEAT_LIMIT`, aggiunta ora senza cambiare comportamento, `POISON_LIMIT`, `COMMANDER_DAMAGE_LIMIT`), così il riferimento non può contraddire le regole applicate. Testi e numeri di regola verificati sulle Comprehensive Rules in vigore dal 25/09/2026.
- **Un solo documento** in `ModalSideSheet` (lo stesso dei dettagli giocatore): niente schede, ricerca o fisarmoniche. Aprirlo o chiuderlo non tocca partita, history o storage (testato).
- **Accesso:** «Regole» è un pulsante di primo livello (nome accessibile «Regole Commander»): nell'header standard dopo «Azzera punteggi», in quello compatto subito prima di «Partita».
- **Correttezza:** il testo d'aiuto dei danni Commander ora dice che contano solo i danni da combattimento, sia nel pannello standard sia nello sheet compatto.
- **Art direction in sospeso:** badge «Non tracciata dall'app», simbolo `{2}`, tipografia dello sheet. Ora c'è solo struttura con i token esistenti.

## D-022 — Header standard: i gruppi di controlli vanno a capo come blocchi (P1 della revisione di art direction)
- **Stato:** Accettata. Fonte: `docs/ART_DIRECTION_REVIEW_2026-10-18.md`, P1.
- **Causa:** aggiungendo «Regole» (D-021) l'header standard non è stato rimisurato. Tra 46rem e ~1050 px i controlli uscivano dall'header: 31 px a 768 px, 62 px a 736 px, 65 px a 993 px. Errore di verifica di Claude.
- **Correzione (solo CSS):** i due gruppi, Annulla/Ripeti e gestione partita, vanno a capo come blocchi interi (`flex-wrap` su `.table-controls` e `.match-controls`). Il testo dei pulsanti non si spezza mai (D-016) e le etichette restano visibili.
- **Verifica:** 320, 736, 768, 900, 993, 1100 e 1440 px → nessun overflow, nessun controllo fuori dall'header, nessun testo spezzato, target ≥ 44 px, «Nuova partita» e «Azzera punteggi» sulla stessa riga da 46rem in su. Layout compatto invariato (844×330: header 52 px, 4 pannelli senza scroll).
- **Regola di processo:** ogni nuovo controllo nell'header richiede di rimisurare l'header su tutta la fascia 320–1440 px, non solo sui tre punti 320, 768 e 1440.

## D-023 — Art direction P2: misure compatte, struttura delle Regole e animazioni
- **Stato:** Accettata e implementata. Fonte: `docs/ART_DIRECTION_REVIEW_2026-10-18.md` (P2) e `docs/ART_DIRECTION_AND_MOTION.md`.
- **Perimetro (scelta del product owner, 2026-10-18):** solo animazioni e misure. **Font, colori della nuova identità e illustrazioni** del riferimento canonico (`docs/art-direction/CANONICAL_ART_DIRECTION.md`) sono rimandati a una fase dedicata, dopo che il design avrà indicato il font (con licenza libera e incluso per l'uso offline) e la fonte delle illustrazioni (nessuna arte delle carte Wizards). La tipografia delle Regole ha ora le dimensioni e i pesi richiesti, ma usa ancora il font di sistema.
- **Misure compatte:** raggio 12 px su header, pannelli, barra Annulla e sheet; nuovo token `--shadow-panel-compact`, circa un terzo più leggero; gap di 4 px nell'header e 8 px prima di Regole/Partita; simbolo da 36 px in uno spazio da 44 px con alone dimezzato; sfondo con un alone appena percettibile; nome 14/18 px peso 700; badge 11/14 px. Vita a 40–48 px (46 px a 844 px) con cella ≥ 64 px e colonne fisse, così i pulsanti restano fermi con −10, 9, 100, 999 e −999.
- **Regole:** colonna R1–R7 attenuata, divisori da 1 px tra le regole e prima della nota finale, gettone `{2}` da 24 px con bordo oro, pastiglia «Non tracciata» con bordo oro e mai rossa, scala tipografica della revisione (titolo 18/24, gruppi 15/20, regole 14/21, riferimenti 12/18).
- **Animazioni** (solo `--duration-fast`, `--duration-normal`, `--ease-out`):
  - delta vita: 140 ms, opacità e 2 px di spostamento;
  - badge di sconfitta e bordo del pannello: 140 ms, senza pulsazioni;
  - barra Annulla e contenuto delle sezioni: dissolvenza da 140 ms;
  - menu: 140 ms con 4 px di spostamento in entrata, dissolvenza in uscita;
  - sheet: 220 ms in entrata con 12 px di scorrimento, 140 ms in uscita con 8 px; lo sfondo scuro segue gli stessi tempi.
- **Tecnica:** entrata e uscita sono animate con `@starting-style` e `transition-behavior: allow-discrete` su `display`/`overlay`, così chiusura e ritorno del focus non vengono mai ritardati (verificato: il focus torna subito). Dove non è supportato, la comparsa è istantanea. Il contenuto degli sheet resta montato quando sono chiusi (`display: none`, fuori dall'albero di accessibilità), così l'uscita ha qualcosa da animare.
- **Movimento ridotto:** la regola globale ora copre anche `::backdrop`. Durate quasi nulle, quindi nessuna trasformazione resta a metà.
- **Non incluso:** il P3 (freccia su Partita, divisori nei menu, contrasto dei comandi distruttivi poco visibili), che può seguire senza bloccare.

## D-024 — Identità visiva canonica (fase 2.v)
- **Stato:** Accettata e implementata. Fonti: `docs/art-direction/CANONICAL_ART_DIRECTION.md` (bloccato dal product owner), `docs/CANONICAL_VISUAL_GAP_REVIEW.md`, tavola `docs/art-direction/canonical-compact-and-rules.svg`.
- **Font (C1):** **Cormorant Garamond** (OFL-1.1) tramite `@fontsource`, solo set latino (con le lettere accentate italiane), pesi 600 e 700, circa 45 KB. È incluso nella build e nella cache offline (`woff2` aggiunto ai `globPatterns`), con ripiego `Georgia`. Lo usano brand, totali vita (cifre allineate e tabulari), nomi dei giocatori quando non si modificano, titoli degli sheet e dei gruppi delle Regole, numerazione delle regole. Il font di sistema resta per pulsanti, campi, testi lunghi, riferimenti e contatori.
- **Token (C2–C5):** primitivi `ink-950/900`, `teal-900`, `arcane-400`, `gold-300/400/700`, `ivory-100`; semantici `--color-ink`, `--color-ink-raised`, `--color-depth`, `--color-arcane`, `--color-gold`, `--color-gold-bright`, `--color-gold-line`, `--color-gold-hairline`, `--color-ivory`, `--font-display`. Tutti in OKLCH, convertiti dalla tavola.
- **Atmosfera senza immagini:** canvas di inchiostro e verde-blu con alone teal e alone oro e una trama di costellazioni; nei pannelli compatti un sigillo arcano in un solo angolo; in cima alle Regole una fascia di linee arcane. Sono SVG inline disegnati da Claude: nessuna immagine esterna, nessuna arte Wizards, tutto offline. Le **strisce illustrate** delle Regole aspettano illustrazioni originali e non sono implementate.
- **Pannelli e controlli:** cornice in oro sottile, linea di energia nel colore del giocatore (due segmenti, mai un riempimento), sfondo scuro sfumato nel colore del giocatore. Pulsanti con bordo in oro sottile al posto del grigio; al passaggio del mouse oro; menu aperto con bordo teal e sottolineatura oro. Famiglia di icone a tratto 1,75 px: nuove icone Annulla, Ripeti, Chiudi e freccia di «Partita», nuovo sigillo del brand.
- **Animazioni una tantum** (tempi esistenti): fioritura avorio/oro di 140 ms sul totale vita solo quando cambia (mai al caricamento, numero mai ingrandito); sottolineatura oro di 140 ms sul menu aperto; bordo dei menu che si illumina una volta; linea dell'header dello sheet che si illumina una volta in 220 ms; linea del pannello più luminosa quando un suo controllo ha il focus; passaggio unico del bordo da oro a rosso alla sconfitta.
- **Interpretazione da confermare:** la gap review dice «one red-to-gold border handoff». L'ho realizzato come passaggio **dall'oro al rosso**, perché il bordo rosso della sconfitta resta il segnale di stato (insieme al testo).
- **Misure invariate:** a 844×330 header 52 px, pannelli 123 px, nessuno scroll; vita 61 px (cifre serif più esili, quindi più grandi), ridotta solo sulle righe strette con una container query (`-999` mantiene ≥ 6 px di spazio a 568×320); 768 px senza overflow; zoom 200% senza controlli tagliati; target ≥ 44 px.
- **Contrasti** (calcolati): avorio su inchiostro 16,8:1; titoli oro 13,4:1; numeri oro 10,5:1; testo attenuato 7,4:1; testo avorio sui ±1 del giocatore ≥ 5,9:1.
- **Regole di design aggiornate** in `CLAUDE.md`: le precedenti («nessun font decorativo», «solo font di sistema») sono superate dal riferimento canonico.

## D-025 — Arte e materiale Wizards secondo la Fan Content Policy
- **Stato:** Accettata dal product owner (2026-10-19). Supera, per questo punto, il divieto di arte Wizards scritto in D-024.
- **Contesto:** l'app non è in vendita, ma repository e sito sono pubblici (D-018). Il product owner sceglie di restare pubblico e di rispettare la [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy), verificata il 2026-10-19.
- **Requisiti applicati:**
  1. **Avviso obbligatorio**, testo esatto in inglese, in `src/content/legal.ts` (con test sulla formulazione esatta). È mostrato nel footer e in fondo alle Regole, che restano raggiungibili anche in orizzontale dove il footer è nascosto, e nel README. È marcato `lang="en"` per gli screen reader.
  2. **Gratuito per tutti:** niente paywall, registrazione, raccolta di email, abbonamenti o vendita.
  3. **Niente loghi o marchi Wizards** usati come branding dell'app.
- **Vincoli per quando aggiungeremo l'arte (Fase 2c e successive):**
  - non mostrare carte intere che possano fare da proxy: usare solo il ritaglio dell'illustrazione;
  - non modificare né rimuovere loghi o diciture già presenti nel materiale Wizards;
  - indicare l'artista;
  - niente testo ufficiale copiato parola per parola (le Regole restano riassunti nostri);
  - se le immagini arrivano da servizi terzi (per esempio Scryfall), vanno rispettati anche i loro termini.
- **Punti di attenzione (da rivalutare prima di qualsiasi uscita più ampia):**
  - la policy vieta di usare la proprietà intellettuale Wizards «in qualsiasi gioco o componente di gioco»; un contapunti con l'arte delle carte è un caso non esplicitamente coperto;
  - «Commander» compare nel nome dell'app;
  - Wizards può chiedere di rimuovere il materiale in qualsiasi momento.
- **Regola di processo:** qualsiasi vendita, sponsorizzazione, pubblicazione negli store o cambio di licenza richiede di fermarsi e chiedere al product owner prima di procedere.
