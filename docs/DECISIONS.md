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

## D-026 — Arte del comandante da Scryfall (Fase 2c)
- **Stato:** Accettata e implementata. Fonte di design: C2.1 di `docs/CANONICAL_VISUAL_GAP_REVIEW.md` (ritaglio e velo). Fonte dell'arte scelta dal product owner (2026-10-19): **il comandante del giocatore, cercato su Scryfall**. Strisce illustrate delle Regole rimandate.
- **Schema v3:** `PlayerState.commander: { cardId, name, artist } | null`. Migrazione pura v2 → v3 (`commander: null`) e v1 → v3, con test. La validazione accetta solo UUID canonici e testi già puliti (≤ 200 caratteri). Nuova azione `set-commander`, annullabile; il reset la conserva.
- **Rete isolata in `src/media/`** (CLAUDE.md: niente rete nel reducer né nei componenti): `scryfall.ts` fa una richiesta per ricerca inviata (mai a ogni tasto), con header `Accept`. Usa solo i ritagli `art_crop` di `cards.scryfall.io` (mai la carta intera, quindi niente proxy, D-025). Limite di 2 MB e verifica del tipo immagine.
- **Offline:** l'immagine viene scaricata una volta e salvata in IndexedDB (`commander-companion-art`) come `ArrayBuffer` + tipo, compatibile con Safari. All'avvio vengono eliminate le immagini che nessun giocatore usa. Verificato: a server spento le illustrazioni compaiono.
- **Ritaglio (C2.1):** `object-fit: cover` a tutta superficie, `object-position: var(--art-focus-x, 50%) var(--art-focus-y, 32%)`, nessuna parallasse. Scryfall non fornisce punti focali, quindi per ora valgono quelli predefiniti.
- **Velo (C2.1):**
  - tinta globale 34%;
  - velo verticale 24% → 46% (44%) → 88%;
  - protezione in alto 42% dietro il nome e 28% dietro il pulsante dettagli, con gradienti radiali (nessuna giuntura visibile);
  - **rinforzo per singola illustrazione**: al download l'app misura una volta il 98° percentile di luminosità nelle zone del nome e della vita, e aumenta il velo localmente per puntare a 5:1.
- **Contratto 4.5:1 verificato nel browser sul pixel peggiore:** l'illustrazione viene ricostruita col ritaglio reale e tutti gli strati del velo. Con Zimone e con Giada (arte molto chiara), nomi lunghi, layout standard e compatto, il minimo è 4,84:1. Due iterazioni dalle misure reali: con il 90° percentile Giada scendeva a 3,4:1; con una stima di trasmissione di 0,40 un nome lungo scendeva a 3,5:1.
- **Credito all'artista:** sempre visibile accanto al nome del comandante (pannello standard, sheet dei dettagli, selettore), in avorio corsivo perché il grigio attenuato non reggerebbe 4,5:1 sopra l'arte. **Nel pannello compatto il credito è solo nello sheet dei dettagli** (non c'è spazio), da confermare con il design.
- **Revisione design:** i tre punti aperti (picker, velatura delle immagini chiare e Partner) sono risolti dalla D-027.
- **Dipendenze:** `fake-indexeddb` (Apache-2.0) solo nei test. Il rinforzo è calcolato al download: se in futuro cambia la formula, le immagini già salvate andranno rianalizzate.

## D-027 — Revisione visuale dell’arte del comandante
- **Stato:** implementata dalla D-028; la sola geometria del velo locale è poi raffinata dalla D-029 dopo il playtest su telefono. Raffina D-026 senza modificare la gerarchia del segnapunti.
- **Luminosità e velatura:** scelta **(b), rinforzo adattivo locale**. Il velo C2.1 di base resta invariato; i valori calcolati per puntare a 5:1 non devono più scurire fasce estese del pannello. Il rinforzo viene applicato con maschere morbide solo dietro il blocco nome/credito e dietro la vita, estese di circa 16px oltre il contenuto e sfumate nei successivi 24–32px. L’arte fuori da queste zone conserva il velo base. Nessuna superficie separata dietro la vita, nessun contorno o glow pesante. Se serve più oscuramento per rispettare 4,5:1, si rafforza la maschera locale; il target di calcolo resta 5:1.
- **Selettore definitivo:** resta nel disclosure dei dettagli, rinominato **«Comandante e mazzo»**, dopo le sezioni usate durante la partita. All’interno, il comandante selezionato o la ricerca vengono prima del toggle Partner. I risultati sono una lista continua, non card: riga interamente cliccabile alta almeno 64px, thumbnail `art_crop` 48×48px con `cover` e focus 50%/32%, nome, «Illustrazione di …» e focus ring standard. Mostrare al massimo 5 risultati senza scroll interno; scorre soltanto lo sheet. Il comandante corrente usa la stessa struttura con anteprima, nome e credito; «Rimuovi comandante» resta un’azione quiet-danger separata. La nota Scryfall chiude la sezione.
- **Orizzontale:** stesso componente nello sheet «Dettagli», nessun popover o modal aggiuntivo. Campo e «Cerca» restano sulla stessa riga a 448px; possono impilarsi solo sotto 360px. L’apertura dei risultati usa 140ms opacity + 2px settle, senza stagger; è istantanea con reduced motion.
- **Credito artista:** nel pannello standard resta visibile. Nel compatto non compare sul pannello da 123px: è visibile in cima allo sheet «Dettagli», nel comandante corrente e nei risultati. Vietati microtesto sovrapposto, marquee e tooltip come unico credito.
- **Partner:** design finale a due slot. «Comandante 1» è a sinistra e «Comandante 2» a destra, coerenti con le etichette dei danni. Quando entrambi hanno arte, il pannello usa una divisione statica 50/50 con giunto diagonale lieve (48% in alto → 52% in basso) e una hairline oro; ogni metà usa `cover`, focus 50%/32% e rinforzo locale indipendente. Nessuna alternanza, crossfade o scelta manuale dell’arte visibile. Se esiste soltanto il primo comandante, la sua arte resta full-bleed con badge Partner: è il fallback ammesso, non il risultato finale. Lo sheet mostra entrambi i nomi e entrambi i crediti.
- **Vincoli invariati:** vita e azioni ≥4,5:1, il dato vita domina l’arte, pannelli compatti 123px, target 44px, nessun credito sul pannello compatto e nessuna animazione decorativa continua.

## D-028 — Implementazione della D-027 (velo locale, selettore, partner)
- **Stato:** Implementata (Claude, 2026-10-19), secondo la D-027. Il playtest su telefono approva selettore e giunto Partner, ma respinge la forma rettangolare della maschera locale; correzione definita in D-029.
- **Schema v4:** `commanders: [Comandante 1, Comandante 2]` al posto di `commander`; lo slot 2 esiste solo con il Partner (validazione e reducer). Togliere il Partner svuota lo slot 2. Migrazioni pure v3 → v4 (`commander` diventa lo slot 1) e v2 → v4, con test. Migrazione verificata dal vivo su una partita v3 reale con due comandanti. `set-commander` ora ha `slot`.
- **Velo locale (opzione b):** il velo di base C2.1 resta invariato su tutta l'immagine. Il rinforzo per singola illustrazione si applica solo con pseudo-elementi mascherati dietro il nome (dimensionato dal nome stesso tramite `attr(data-text)`), le righe comandante/credito e il valore vita: pieno fino a 16 px oltre il contenuto, sfumato nei 28 px successivi (`mask-composite: intersect`). Nessuna superficie separata, nessun bagliore. Escluso nello sheet «Dettagli», che è opaco.
- **Contrasto verificato sul pixel peggiore** con il modello effettivo (velo base più maschera locale), nel layout standard, compatto e con la divisione Partner: minimo **4,79:1** (Thrasios, metà destra); nel compatto ≥ 5,74:1. Target di calcolo 5:1 invariato.
- **Selettore:** sezione «Comandante e mazzo» dopo le sezioni di gioco, sia nel pannello standard sia nello sheet. Un selettore per slot (`role="group"` «Comandante» oppure «Comandante 1/2»), comandante corrente con anteprima 48×48 dalla cache, «Rimuovi …» in stile quiet-danger, ricerca su una riga che va a capo solo sotto 360 px (container query). Massimo 5 risultati in lista continua, righe da 64 px interamente cliccabili, anteprime `art_crop` 48×48 (`cover` 50% / 32%), comparsa in 140 ms (opacità + 2 px). Nota Scryfall in fondo alla sezione.
- **Partner:** due immagini, ciascuna ritagliata su una metà larga il 52% e tagliata da un giunto diagonale (48% → 52%), con una hairline oro sopra il velo. I veli locali condivisi (nome, vita) usano il rinforzo più forte dei due. Con un solo comandante l'arte resta a tutta superficie.
- **Credito:** pannello standard (una riga per comandante), cima dello sheet «Dettagli», comandante corrente e risultati. Mai sul pannello compatto.

## D-029 — Rifinitura della maschera locale dopo il playtest
- **Stato:** decisione di art direction approvata, pronta per implementazione (2026-10-19). Sostituisce soltanto la geometria della maschera descritta in D-027/D-028; selettore, giunto Partner, hairline e credito restano approvati e invariati.
- **Scelta:** soluzione ibrida **1 + deroga limitata alla 3**. Non usare le opzioni 2 o 4: il target di calcolo resta **5:1**, la soglia di accettazione resta **≥4,5:1** e il velo C2.1 di base non aumenta.
- **Vita:** sostituire il rettangolo con una maschera ellittica/radiale centrata sul totale. La zona a forza piena può superare l’ingombro del numero di **massimo 8px**; da lì sfuma continuamente fino a trasparente per circa **56px**. Nessun bordo, angolo, fascia o plateau rettangolare deve essere percepibile. La tinta è l’inchiostro del pannello, non nero neutro; la forza resta adattiva per illustrazione.
- **Testi piccoli sull’arte:** per nome del giocatore e righe comandante/credito è ammesso un alone di contrasto color inchiostro che segue le lettere, con **spread 0**, sfocatura **8–10px** e offset nullo o massimo 1px. È una deroga stretta al divieto C2.1: serve solo a fondere la protezione nell’immagine, non può sembrare un contorno, un’ombra decorativa o un glow. Va applicato solo nella misura necessaria all’illustrazione; vita, pulsanti e azioni non lo usano.
- **Ordine di correzione:** se una prova resta sotto soglia, prima allargare e ammorbidire la caduta della maschera; poi aumentare localmente la forza. Non aumentare il velo globale e non rendere visibile l’alone tipografico.
- **Accettazione visuale:** su Zimone, Giada e una coppia Partner chiara, misurare il composito finale sul pixel peggiore in standard e compatto. Tutti i contenuti protetti devono restare ≥4,5:1; osservando il telefono alla normale distanza d’uso non deve essere riconoscibile alcuna toppa, capsula o bordo della protezione. La vita domina, ma volto e cromia dell’illustrazione restano leggibili. Nessuna nuova animazione.

## D-030 — Implementazione della D-029 (maschere radiali + alone sulle lettere)
- **Stato:** Implementata (Claude, 2026-10-19). Velo di base C2.1 invariato; selettore, giunto Partner e hairline invariati.
- **Vita:** maschera radiale color inchiostro (`radial-gradient(closest-side)` su un pseudo-elemento esteso 64 px oltre il numero): forza piena fino al 55% del raggio, poi caduta continua (72% → 40% → 14% → 0) senza nessun bordo. Forza: `min(1, rinforzo × 1,3)`.
- **Nome e righe comandante/credito:** alone che segue le lettere (D-029): `text-shadow` a tre strati, spread 0, blur 9 px, offset 0, intensità `min(1, rinforzo × 1,6)`. È nullo sulle illustrazioni scure. Non si applica a vita, pulsanti o sheet.
- **Estensione necessaria (da confermare con il design):** misurato nel browser, **l'alone da solo non arriva a 4,5:1** sulle illustrazioni chiare (anche con 8 strati a piena intensità la coppia chiara si ferma a 3,36:1). Seguendo l'ordine della D-029 («prima allargare e ammorbidire la sfumatura locale») ho aggiunto la **stessa maschera radiale morbida** anche dietro il nome (dimensionata dal nome stesso) e dietro il blocco delle righe comandante/credito, con forza `min(1, rinforzo × 1,5)`. Senza bordi né rettangoli.
- **Misura sul composito finale** (illustrazione ricostruita col ritaglio reale, velo di base, maschere radiali e alone emulato nel canvas con lo stesso blur gaussiano), contrasto sul pixel peggiore nella fascia di 2 px attorno a ogni lettera:

  | Caso | Standard testo / vita | Compatto testo / vita |
  | --- | --- | --- |
  | Zimone | 6,84 / 7,20 | 10,07 / 9,25 |
  | Partner Giada + Thrasios | 11,40 / 7,42 | 9,98 / 9,30 |
  | Giada (nome lungo) | 9,83 / 5,21 | 8,12 / 8,34 |
  | Partner chiari (Giada + Giada) | **5,09** / 5,49 | 13,30 / 7,95 |

  Minimo 5,09:1, quindi target 5:1 rispettato ovunque. I moltiplicatori sono i più bassi che lo garantiscono: con la vita a ×1,25 Giada scendeva a 4,91:1.
- **Verifica visiva:** nessun rettangolo, capsula o bordo riconoscibile nel browser. Nel layout standard su illustrazioni chiare resta un'ombreggiatura morbida attorno a nome e vita: va confermata **sul telefono** come richiede la D-029.

## D-031 — Maschere leggere: l'ombra scura diventa un tocco, il contrasto passa all'alone
- **Stato:** Approvata (2026-10-19). Implementata da Claude su richiesta del product owner dopo la prova su iPhone: con la D-030 l'ombra attorno a nome e vita era «troppo pesante, basta sia una cosa molto leggera». Approvati tutti i punti: maschere leggere, alone sul numero della vita al posto del bagliore dorato quando c'è un'illustrazione, soglie WCAG AA per dimensione al posto del target unico 5:1. Supera i valori di forza della D-030.
- **Maschere radiali (vita, nome, righe comandante):** forza limitata a `--mask-max: 0.45` (`min(0.45, rinforzo × 0,7)`), estensione ridotta da 64 a 32 px oltre il contenuto, sfumatura senza plateau (100% → 85% al 30% del raggio → 45% → 12% → 0).
- **Alone sulle lettere:** nome e righe comandante passano da 3 a 5 strati (blur 9 px, stessa intensità). Il numero della vita riceve un alone analogo (14 px, 14 px, 6 px; intensità `min(1, rinforzo × 1,6)`) che con le illustrazioni sostituisce il bagliore dorato del numero. Nullo sulle illustrazioni scure.
- **Soglie:** si passa dal target uniforme 5:1 della D-029 alle soglie WCAG AA per dimensione: ≥ 4,5:1 per le righe comandante/credito (testo piccolo), ≥ 3:1 per nome e vita (testo grande).
- **Misura sul pixel peggiore** (stesso metodo della D-030), testo piccolo / nome / vita:

  | Caso | Standard | Compatto 844×390 (nome / vita) |
  | --- | --- | --- |
  | Zimone | 4,78 / 3,87 / 6,02 | 5,00 / 8,36 |
  | Partner Giada + Thrasios | 5,35 / 5,35 / 4,89 | 6,13 / 8,29 |
  | Giada (nome lungo) | 4,88 / 4,88 / 5,33 | 5,19 / 7,82 |
  | Partner chiari (Giada + Giada) | 4,56 / 4,56 / 4,55 | 5,98 / 8,29 |

  Tutte le soglie AA rispettate. Con le maschere leggere ma senza alone sulla vita, la vita scendeva a 2,56:1.

## D-032 — Rifinitura P3: comandi ad alto rischio più chiari
- **Stato:** Implementata (Claude, 2026-10-19) secondo le indicazioni del design (P3 della revisione art direction del 2026-10-18). La freccia su «Partita» c'era già.
- **Menu Partita:** un divisore (`<hr class="menu-divider">`, linea oro sottile) separa la gestione partita da «Mantieni lo schermo acceso»; se il Wake Lock non è supportato spariscono entrambi.
- **Azzera punteggi** (menu Partita e controlli standard): resta secondario, con sfondo trasparente e mai rosso, ma con testo chiaro (`--color-text`) e bordo `--color-gold-line` al posto del grigio attenuato, così non sembra disattivato.
- **Rimuovi giocatore** (scheda dettagli): sta in una zona separata da un divisore, 24 px di margine e 24 px di padding sopra (32 px misurati dal contenuto precedente). Testo e icona usano `--color-danger-foreground` con un bordo al 45%; il rosso pieno resta solo nel dialogo di conferma.
- Nessuna nuova animazione: stati e durate restano quelli definiti, reduced motion compreso.

## D-033 — Dock diretto per punteggi e stati frequenti
- **Stato:** Approvata dal product owner (2026-10-19). Implementata da Claude (2026-10-20), in attesa della revisione di ChatGPT prima del merge.
- **Decisione:** vita, danni Commander, veleno, energia, esperienza, radiazioni e tassa del comandante diventano raggiungibili dalla superficie principale di ogni pannello, senza `<details>` o overlay. Monarca e Iniziativa sono stati unici del tavolo assegnabili direttamente ai giocatori.
- **Gerarchia:** la vita resta dominante; gli altri valori condividono un dock in-place. Commander e tassa distinguono i due comandanti Partner. Il set curato esclude per ora contatori delle permanenti e contatori personalizzati.
- **Art e motion:** fascia continua dark-fantasy con hairline oro e selezione teal/oro; icone a tratto, niente emoji definitive. Cambio modo 120 ms, trasferimento stato 140 ms, nessun movimento di layout; immediato con reduced motion.
- **Specifica:** [`docs/superpowers/specs/2026-10-19-direct-scoring-design.md`](superpowers/specs/2026-10-19-direct-scoring-design.md).
- **Implementazione:**
  - **Schema v5:** `rad`, `commanderTax: [n, n]` (sempre pari, slot 2 a zero senza Partner), `monarchPlayerId` e `initiativePlayerId`, che si riferiscono solo a giocatori presenti. La migrazione pura `migrateV4` porta le v1–v4 alla v5 senza perdere nulla; è verificata anche su un salvataggio reale nel browser.
  - **Azioni:** `adjust-commander-tax` (passi di 2) e `set-table-role` (un possessore o `null`). Partner non si toglie finché danni o tassa del Comandante 2 non sono a zero.
  - **Undo:** la tassa si raggruppa per slot e direzione. I trasferimenti di Monarca e Iniziativa sono passi singoli.
  - **Interfaccia:** `QuickScoreDock`. La vita resta visibile in ogni modo. I danni Commander e i segnalini non sono più nello sheet dei dettagli né nei `<details>` del pannello standard. L'aiuto «solo danni da combattimento» della Fase 2a diventa la descrizione del gruppo delle fonti.
  - **R7:** non dice più «Non tracciata» e spiega la tassa nell'app.
- **Verifica:** 293 test. Controllo nel browser a 320×568, 390×844, 768, 1440, 844×390, 844×330 e 640×400 (≈200%): nessuno scroll orizzontale di pagina, nessun pulsante del dock sotto 44 px. La prova su telefono e al tavolo (checklist §11) è ancora da fare.

## D-034 — Layout manuale per quattro giocatori
- **Stato:** Approvata dal product owner (2026-10-19). Implementata da Claude (2026-10-20), in attesa della revisione di ChatGPT prima del merge.
- **Decisione:** con quattro giocatori si sceglie manualmente fra `Griglia`, `Fronte a fronte` e `Tavolo`. La scelta è una preferenza persistente, separata dallo stato partita e da Annulla/Ripeti.
- **Rotazione:** ruotare il dispositivo può cambiare soltanto densità e reflow responsive; non cambia mai il layout scelto. Overlay e ordine del focus restano dritti/logici anche quando i pannelli sono orientati verso i posti al tavolo.
- **Art e motion:** anteprime schematiche nel linguaggio oro/teal canonico, senza verde neon. Cambio tramite crossfade/assestamento di 140 ms, mai rotazione animata; immediato con reduced motion.
- **Specifica:** [`docs/superpowers/specs/2026-10-19-four-player-layout-selector-design.md`](superpowers/specs/2026-10-19-four-player-layout-selector-design.md).
- **Implementazione:**
  - **Preferenza:** `fourPlayerLayout` (`grid` predefinito e fallback campo per campo), fuori da partita, salvataggio e cronologia.
  - **Densità:** `useCompactDensity` (`max-height: 30rem`, senza orientamento) sostituisce `useCompactLandscape`.
  - **Selettore e posti:** `LayoutSelector` (foglio laterale, radiogroup) e `PlayerSeat` (wrapper stabili, nessun remount).
- **Scelte tecniche da confermare:**
  - Tavolo usa sempre i pannelli compatti.
  - In Tavolo le righe alta e bassa occupano tutta la larghezza.
  - La barra Annulla di un giocatore rimosso conta come quarto posto.
  - Con lo schermo basso si scorre invece di passare alla griglia.
- **Verifica:** 326 test. Browser: Tavolo a 768×1024 e 390×844, Fronte a fronte a 844×390, Griglia a 1440. Dettagli aperto da un posto a 90° resta dritto e restituisce il focus. La prova al tavolo con 4 persone (checklist §12) è ancora da fare.
- **Revisione ChatGPT (2026-10-20):** due correzioni.
  - Le colonne del selettore seguono la larghezza reale dello sheet (container query): una colonna a 768, 1024 e al 200%, nessun overflow interno.
  - Il radiogroup ha il roving tabindex con frecce, Home e End. Le frecce spostano il focus senza applicare il layout, che si sceglie con Spazio o Invio, perché la scelta chiude lo sheet.

## D-035 — Layout selezionabile anche con due giocatori
- **Stato:** Richiesta dal product owner (2026-10-20). Implementata da Claude; revisione di ChatGPT approvata (Giocatore 1 in basso, pannelli compatti, anteprime) dopo una correzione P2.
- **Decisione del product owner:** con due giocatori il comando «Layout» offre `Stesso lato` (predefinito, com'era prima) e `Fronte a fronte`, pensato per il telefono o tablet al centro del tavolo. Con tre giocatori resta la griglia per ora.
- **Implementazione:**
  - **Preferenza:** `twoPlayerLayout` (`same-side` | `facing`), separata da `fourPlayerLayout`, così passare da 2 a 4 giocatori ritrova la scelta di ciascun tavolo. Fallback campo per campo.
  - **Selettore:** stesso foglio «Layout dei giocatori», con due opzioni e anteprime schematiche. Il trigger si chiama «Layout dei due giocatori» o «Layout dei quattro giocatori».
  - **Fronte a fronte:** due metà orizzontali. Il Giocatore 1 sta sul bordo vicino (0°), il Giocatore 2 di fronte, ruotato di 180°. L'ordine DOM e di tabulazione resta 1→2.
- **Scelte tecniche da confermare:**
  - Il Giocatore 1 sta in basso e il 2 in alto.
  - In Fronte a fronte i pannelli sono sempre compatti e le due metà occupano esattamente lo spazio fra intestazione e piè di pagina, come per Tavolo: con il dispositivo al centro nessuno deve scorrere.
- **Verifica:** 335 test. Browser a 390×844, 844×390, 768×1024 e 1440: nessuno scroll, nessun overflow orizzontale, nessun pulsante sotto 44 px.
- **Correzione dalla revisione (P2):** il comando «Layout» compare solo quando le celle visibili coincidono con i giocatori. Mentre la barra «Annulla» di un giocatore rimosso occupa ancora una cella (per esempio da 3 a 2), il comando resta nascosto e la griglia non cambia, così foglio e tavolo non sono mai in disaccordo. C'è un test per il passaggio 3→2.

## D-036 — Delta cumulativo più evidente (proposta)
- **Stato:** Approvata (2026-10-20). Proposta di Claude su richiesta del design; domande aperte decise dal product owner; implementata da Claude; revisione finale di ChatGPT approvata (verifica indipendente: 353 test, coverage 97,65%, build PWA).
- **Risposte del product owner:**
  1. Le dimensioni proposte vanno bene per ora; si potranno ritoccare dopo la prova.
  2. Con i danni Commander il badge compare **anche speculare sulla vita**: `+N` sul valore Commander (danni ricevuti) e `−N` sulla vita, nello stesso gruppo.
  3. Il dock usa un solo annuncio assestato per raffica, senza live region a ogni tocco.
- **Sintesi:**
  - Si riusano raggruppamento e finestra di 700 ms della cronologia.
  - `DeltaBadge` resta montato per tutto il gruppo e aggiorna il numero sul posto (oggi si rimonta e lampeggia a ogni tocco).
  - Ingresso 90 ms con 2 px di assestamento, permanenza 700 ms dall'ultimo tocco, uscita 160 ms solo in opacità; immediato con reduced motion.
  - Dimensioni proporzionali al valore ma subordinate. Nessun cambio di layout.
  - Il badge resta `aria-hidden`; il dock passa a un solo annuncio assestato per raffica.
- **Ipotesi successive, non da implementare:** sheet Dettagli ancorato al pannello e sigillo centrale con al massimo quattro azioni nei layout da tavolo. Il sigillo richiederebbe di modificare D-034, che vuole il centro libero da comandi indispensabili.
- **Proposta:** [`docs/superpowers/specs/2026-10-20-cumulative-delta-proposal.md`](superpowers/specs/2026-10-20-cumulative-delta-proposal.md).
- **Implementazione:**
  - `getGroupDelta` aggiunge `key`, unica per raffica, e per i danni Commander `lifeDelta`.
  - `DeltaSlot`/`DeltaBadge`: un badge per raffica che aggiorna il numero sul posto, resta 700 ms dall'ultimo tocco, poi esce in 160 ms solo in opacità. Se la raffica successiva riguarda un altro valore, il badge precedente finisce comunque la sua uscita.
  - Badge speculare sulla vita per i danni Commander.
  - Annunci: gli `<output>` del dock sono `aria-live="off"`. Ogni pannello ha **una sola** regione `polite` che parla una volta per raffica assestata. Cambiare modo o sorgente non annuncia nulla. I danni Commander producono un solo annuncio con danni e vita (`Giocatore 1: 3 danni Commander da Giocatore 2; vita 37`). Le variazioni di vita fuori da una raffica (Annulla, Ripeti, Azzera, altra scheda) sono ancora annunciate una volta.
  - Token `--duration-delta-in: 90ms` e `--duration-delta-out: 160ms`; dimensioni 1,05 / 0,9 / 0,85 rem.
- **Aggiustamenti dalla verifica visiva:**
  - Nel dock il badge sta accanto al numero, non sopra le cifre.
  - Nel binario compatto il badge della vita sale sopra le cifre: misurati 13 px di margine dalle cifre, senza toccare la striscia dei modi né il pulsante +1.
- **Verifica:** 353 test (347 alla prima consegna, più i test sugli annunci della seconda revisione). Browser a 390×844 e 844×390, anche con Fronte a fronte ruotato: nessun cambio di layout durante i tocchi.
- **Seconda revisione ChatGPT (2026-10-20):** visual e motion approvati. Corretti gli annunci:
  - nessun aggiornamento della live region dopo il solo cambio di modo o di sorgente;
  - un solo annuncio finale per la raffica Commander, al posto di due regioni (vita e dock) aggiornate insieme.

  Test aggiunti per questi tre casi.

## D-037 — Ristrutturazione verso il progetto iniziale (Partita, Mazzi, Impara, Altro)
- **Stato:** Approvata dal product owner (2026-10-20). Da disegnare con ChatGPT fase per fase, poi da implementare.
- **Decisione:** l'app torna alla struttura del mockup iniziale, «molto simile, non al pixel».
  - Quattro schede: Partita, Mazzi, Impara, Altro (con Impostazioni).
  - In partita le schede sono nascoste; un rombo centrale le mostra e apre Dadi (d6, d20), Mana (cinque colori più incolore) e Testa o croce.
  - Carte giocatore con ±1, corona del Monarca e una tendina interna con tutti i contatori.
  - Mazzi importati da testo e Scryfall, con categorie automatiche, note e mano di prova solo a ritagli.
  - Impara: manuale interattivo che assorbe le Regole.
- **Supera:** Annulla e Ripeti (D-003) e la barra Annulla dopo la rimozione (D-014); intestazione e pulsanti di D-016, D-022 e D-034; il pulsante Regole (D-021, assorbita da Impara); l'interazione del dock D-033. La Fase 2b (cronologia) è eliminata.
- **Conferma:** D-019, D-025, D-034/D-035 (geometrie), D-036.
- **Import mazzi:** solo da testo incollato. Moxfield (403) e Archidekt (origine consentita solo `localhost:3000`) non si possono leggere da un link senza un server.
- **Specifica:** [`docs/superpowers/specs/2026-10-20-app-restructure-design.md`](superpowers/specs/2026-10-20-app-restructure-design.md).

## D-038 — R1: guscio a quattro sezioni (implementazione)
- **Stato:** Implementata da Claude (2026-10-20) secondo il design R1 approvato (`docs/superpowers/specs/2026-10-20-r1-shell-design.md`) e il piano `docs/superpowers/plans/2026-10-20-r1-shell.md`. In attesa della revisione di ChatGPT prima del merge.
- **Struttura:**
  - Sezioni nell'indirizzo (`#mazzi`, `#impara`, `#altro`; senza hash è Partita): il ricaricamento resta sulla sezione e il tasto Indietro torna alla precedente.
  - La partita resta montata e viene solo nascosta, quindi i pannelli non si rimontano mai.
  - Barra superiore `nav` con `aria-current`: fissa fuori dalla partita; in partita nascosta, rivelata dal rombo sopra il tavolo senza spostare le carte.
- **Rimossi** (superano D-003, D-014, D-016, D-022, D-034 per l'accesso): intestazione, marchio, piè di pagina, Annulla/Ripeti con le scorciatoie, barra Annulla dopo la rimozione, foglio laterale del layout, popover Partita, Preferenze e «Stato app».
- **Altro:**
  - layout inline secondo il numero di giocatori della partita corrente;
  - schermo acceso (switch);
  - nuova partita con bozza 2/3/4 e conferma;
  - azzera;
  - informazioni: versione, Scryfall, avviso Fan Content (D-025 resta visibile qui e nelle Regole).
- **Impara:** ponte «Riferimento rapido Commander» verso le Regole attuali fino a R4.
- **Rombo:**
  - pulsante da 56 px, con suggerimento al primo uso salvato in `rhombusHintSeen`;
  - posizione e zona libera da 64 px calcolate da un modulo geometrico puro (`src/shell/centre.ts`) e misurate dal vivo. Il rombo sta al centro del tavolo; se il centro cade dentro una carta (3 in fila o impilate), si sposta sulla giuntura più vicina;
  - ogni carta toccata riserva il proprio lato o angolo (`data-clear`) senza cambiare proporzioni.
- **Schermo acceso:** il Wake Lock è attivo solo con Partita visibile.
- **Verifica:**
  - 390 test;
  - browser a 390×844, 320×568, 640×400, 768×1024, 844×390, 844×330 e 1440×900, con Griglia, Fronte a fronte, Tavolo, 2 giocatori (stesso lato e fronte a fronte) e 3 giocatori. Nessuna sovrapposizione del rombo con controlli o testi visibili, nessun pulsante sotto 44 px, nessuno scroll orizzontale; le carte non si muovono quando la barra compare.
- **Revisione ChatGPT (design §13), correzioni applicate:**
  1. **Colonna verticale:** se la zona da 64 px intorno al centro non è tutta nel primo schermo, il rombo usa la prima giuntura interna che ci sta. Il punto è ancorato nel documento e non segue lo scroll. A 390×844 e 320×568 il rombo è a y=456, sulla giuntura fra Giocatore 1 e Giocatore 2, visibile subito.
  2. **Suggerimento:** «Tocca ◇ per le sezioni» sopra il rombo, al massimo 9rem, senza timer, nascosto agli screen reader (il pulsante dice già «Mostra le sezioni»). La carta che coprirebbe riserva una fascia libera sul lato rivolto all'etichetta (`data-hint-side`, `--hint-reserve`): fondo della carta sopra in colonna e agli incroci, lati affiancati con due giocatori. Misurato: zero sovrapposizioni a 390×844, 320×568 e 844×390.
  3. **Due giocatori, Fronte a fronte:** stessa geometria, dimensioni e densità di Stesso lato; ruota solo il Giocatore 2 di 180°. Tolte le due metà a tutta altezza e i pannelli compatti forzati, e le anteprime hanno ora la stessa sagoma. Misurato: altezza del tavolo, scroll, dimensioni delle carte e posizione del rombo identici fra le due opzioni a 390×844 e 844×390. Supera la parte geometrica della D-035.
- **Effetto accettato:** mentre il suggerimento è visibile, la carta sopra la giuntura è più alta della fascia riservata (in colonna). Al primo tocco del rombo la fascia sparisce e il rombo risale una sola volta.
