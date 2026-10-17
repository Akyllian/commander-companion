# Piano tecnico — Fase 0 e Fase 1

Stato: **approvato il 2026-10-17 e completato** (vedi `docs/UX_REVIEW_FASE_1.md`). Risposte: fasi confermate; D-006 sì; D-007 subito; E2E "il più comodo" → D-011.
Autore: Lead Software Engineer (Claude). Ambito UX/visual/motion: ChatGPT.

I documenti esistenti non definiscono formalmente "Fase 0" e "Fase 1": le definizioni qui sotto sono una proposta da confermare.

---

## 1. Stato attuale dello scaffold (verificato)

| Verifica | Esito |
| --- | --- |
| `npm ci` (Node 24.18, npm 11.16) | OK, 0 vulnerabilità |
| `npm test` (Vitest 5) | 3 file, 14 test, tutti verdi |
| `npm run build` (tsc 7 strict + Vite 8) | OK — JS 228 kB (71 kB gzip), CSS 9.8 kB |
| Repository git | **assente** |
| Manifest PWA / Service Worker / icone | **assenti** — oggi non è una PWA né funziona offline dopo il primo caricamento |
| Lint / formatter / coverage | assenti |

Architettura: reducer puro (`src/game/game.ts`) → `App.tsx` con history in memoria (50 snapshot) → `storage.ts` con validazione del payload `localStorage` (v1). Base solida e coerente con `docs/ARCHITECTURE.md`.

### Difetti rilevati nello scaffold

**Affidabilità contatori / persistenza**
1. **Perdita dati silenziosa**: se il payload salvato non supera la validazione, `loadGame()` restituisce una partita nuova e l'effetto di salvataggio sovrascrive subito il dato originale. Nessun backup, nessun avviso.
2. **Il reducer non valida gli input**: `amount` accetta `NaN`, `Infinity`, frazioni. Un `NaN` in `life` verrebbe salvato e al riavvio l'intera partita sarebbe scartata (vedi punto 1).
3. **Nessun limite superiore**: `life`/contatori possono superare `Number.MAX_SAFE_INTEGER` in teoria → stesso effetto a catena. Serve un clamp di dominio.
4. **Danni Commander verso se stessi o da sorgente sconosciuta** sono accettati dal reducer (lo storage poi li rifiuta → reset).
5. **Più schede aperte** sovrascrivono a vicenda lo stato (nessuna gestione dell'evento `storage`).
6. Lo storage del browser non è richiesto come persistente (`navigator.storage.persist()`); su iOS i siti non installati possono essere svuotati dopo 7 giorni di inattività.

**Correttezza regole**
7. **I danni Commander non riducono i punti vita.** Per la regola 903.10a i danni da combattimento del comandante sono danni normali (causano perdita di vita) *e* vengono conteggiati per la soglia di 21. Oggi l'utente deve aggiornare due valori separatamente → doppia azione, doppio passo di undo, alto rischio di errore. Va deciso il comportamento (vedi D-006).
8. **Comandanti partner** (due comandanti per giocatore): il conteggio di 21 è per *singolo* comandante, oggi è per giocatore sorgente. Con partner il modello dà sconfitte errate (es. 11+10 dallo stesso avversario non è letale).
9. Soglie 0 vita / 10 veleno / 21 danni Commander: **corrette** (704.5a, 704.5c, 704.6c).

**Accessibilità (senza cambi visivi)**
10. `aria-label` su `<div>` senza ruolo (`life-controls`, `table-controls`): l'etichetta viene ignorata dagli screen reader → servono `role="group"`.
11. La live region annuncia solo il numero ("41") senza il nome del giocatore; tocchi rapidi producono annunci a raffica.
12. Gli `<output>` dei danni Commander non hanno nome accessibile.
13. Input nome giocatore alto 40px (< 44px richiesti dal design system).
14. Manca `touch-action: manipulation`: il doppio tocco rapido su `+1` può attivare lo zoom su mobile.

**Comportamento**
15. Rinomina confermata solo su blur (Invio non conferma).
16. Il selettore "Giocatori" parte sempre da 4, non dal numero attuale.
17. Rimozione giocatore senza conferma (recuperabile con Annulla, ma da validare in UX).
18. `window.confirm` per azioni distruttive: funziona, ma è da sostituire quando la UX fornisce il dialog (non lo cambio autonomamente).
19. Lo schermo si spegne durante la partita (nessun Wake Lock).

---

## 2. Fase 0 — Fondamenta verificabili

Obiettivo: repository versionato, controlli automatici, app installabile e funzionante offline. **Nessuna modifica di design.**

| # | Attività | Verifica di uscita |
| --- | --- | --- |
| 0.1 | `git init`, commit baseline dello scaffold così com'è | `git log` con baseline |
| 0.2 | Script `npm run verify` = typecheck + lint + test con coverage + build | comando unico verde |
| 0.3 | Lint (vedi rischio R-02 su compatibilità TS 7) | 0 errori |
| 0.4 | Soglia coverage su `src/game/**`: 100% righe e branch | report coverage |
| 0.5 | Test property-based (`fast-check`) sugli invarianti del reducer | test verdi con ≥1000 run |
| 0.6 | PWA: manifest, service worker con precache dell'app shell, `registerType: 'prompt'` (nessun reload a metà partita) | app installabile; reload offline funzionante in `vite preview` |
| 0.7 | Icone PWA **segnaposto** derivate dal brand mark SVG esistente (arte definitiva: ChatGPT) | manifest valido |
| 0.8 | `docs/DECISIONS.md` (fatto, in revisione) | — |

Nota 0.6: l'avviso "aggiornamento disponibile" sarà un testo minimale non stilizzato, marcato come **in attesa di design**.

## 3. Fase 1 — Contatori affidabili e regole corrette

Obiettivo: ogni tocco produce esattamente lo stato atteso, sopravvive a refresh/chiusura/offline, e le regole implementate sono corrette.

| # | Attività | Tipo | Dipende da |
| --- | --- | --- | --- |
| 1.1 | Hardening reducer: `amount` intero sicuro e ≠ 0, ID sconosciuti = no-op (stesso riferimento → nessun passo di undo), niente danni a se stessi, clamp di dominio | dominio | — |
| 1.2 | Danni Commander collegati alla vita (azione atomica, un solo passo di undo) | regole | **D-006** |
| 1.3 | Comandanti partner: schema v2 + migrazione v1→v2 | regole/schema | **D-007**, UI da ChatGPT |
| 1.4 | Persistenza robusta: backup del payload invalido, `storage.persist()`, sync tra schede, gestione quota/errore con stato esposto alla UI | persistenza | — |
| 1.5 | Estrazione history in `src/game/history.ts` (pura e testata), scorciatoie tastiera Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z | stato | — |
| 1.6 | Correzioni a11y senza cambio visivo (difetti 10–14) | a11y | — |
| 1.7 | Rinomina con Invio/Esc; selettore giocatori sincronizzato | comportamento | — |
| 1.8 | Screen Wake Lock con riacquisizione su `visibilitychange`, degradazione silenziosa se non supportato | piattaforma | — |
| 1.9 | Test end-to-end su browser reale: persistenza al reload, offline, installabilità | test | R-04 |
| 1.10 | Resoconto per revisione UX con ChatGPT, poi **stop** | handoff | tutto |

Fuori ambito (come richiesto): AI, sincronizzazione cloud, pagamenti, animazioni complesse, cronologia partite.

---

## 4. Dipendenze

| Dipendenza | Scopo | Fase | Note |
| --- | --- | --- | --- |
| `vite-plugin-pwa` (Workbox) | manifest + SW precache | 0 | verificare compatibilità Vite 8 (R-01); alternativa: SW scritto a mano |
| `@vitest/coverage-v8` | coverage | 0 | stessa major di Vitest 5 |
| `fast-check` | test property-based | 0 | solo dev |
| `oxlint` **oppure** `eslint` + `typescript-eslint` | lint | 0 | R-02 |
| `@playwright/test` | E2E offline/persistenza | 1 | scarica i browser (~centinaia di MB); in alternativa verifica manuale col browser integrato |

Nessuna nuova dipendenza runtime oltre al client del service worker.

## 5. Rischi

| ID | Rischio | Impatto | Mitigazione |
| --- | --- | --- | --- |
| R-01 | `vite-plugin-pwa` non ancora compatibile con Vite 8 | blocca 0.6 | prova in branch; fallback a SW manuale (~60 righe) con lista asset generata dal build |
| R-02 | `typescript-eslint` non supporta TypeScript 7 (compilatore nativo) | blocca 0.3 | usare `oxlint` (indipendente dal compilatore TS) |
| R-03 | SW che serve asset vecchi o bloccati dopo un deploy | app "congelata" | precache con hash, `prompt` per l'update, `skipWaiting` solo su conferma utente, test di aggiornamento |
| R-04 | Peso di Playwright in CI/locale | tempo di setup | limitare a Chromium; oppure checklist manuale documentata |
| R-05 | Migrazione schema v1→v2 errata = partite perse | dati utente | migrazione pura e testata con fixture v1 reali; backup del raw prima di migrare |
| R-06 | iOS Safari: eviction storage, Wake Lock solo da iOS 16.4+, nessun `beforeinstallprompt` | funzionalità ridotte | feature detection, degradazione silenziosa, documentazione |
| R-07 | Decisioni di regola (D-006/D-007) che impattano la UI | blocco lato design | implemento solo il dominio dietro azioni tipizzate; la UI attende ChatGPT |

## 6. Casi limite da coprire con test

- Vita negativa che continua a scendere; ritorno sopra 0 annulla la sconfitta visualizzata.
- Veleno/danni Commander a 0 con decremento → resta 0 **e nessun passo di undo inutile**.
- Esattamente 10 veleno, esattamente 21 danni da un comandante, 20+20 da due sorgenti (non letale), 11+10 da partner dello stesso avversario (non letale).
- Danni Commander collegati alla vita: decremento sotto 0 non deve restituire vita inesistente.
- Rimozione di un giocatore con danni inflitti/subiti; undo della rimozione ripristina tutto.
- Rimozione con 2 giocatori: no-op.
- Reset: preserva ID, nomi, accenti; svuota history? (oggi è un passo annullabile — da mantenere).
- Nuova partita: svuota la history (comportamento attuale).
- 51 azioni consecutive: la più vecchia esce dalla history; redo invalidato dopo nuova azione.
- Nomi: solo spazi, 28+ caratteri, emoji (surrogate pair non spezzata dal taglio), stesso nome per più giocatori.
- Storage: assente, pieno (`QuotaExceededError`), bloccato (modalità privata), JSON malformato, versione futura (v3 aperta da un'app v2), payload v1 valido da migrare.
- Due schede: modifica in A riflessa in B senza perdere azioni.
- Offline: primo avvio online, poi reload in modalità aereo; aggiornamento SW con partita in corso.
- Wake Lock: rilascio su tab nascosta e riacquisizione al ritorno.
- `StrictMode`: updater puri (doppia invocazione non deve applicare due volte un'azione).

## 7. Test previsti

- **Unit dominio** (`game.test.ts`): ogni azione, ogni soglia, ogni no-op.
- **Property-based**: per sequenze casuali di azioni valide → contatori sempre ≥ 0, valori sempre interi sicuri, nessun riferimento a giocatori inesistenti, `undo^n(redo^n(s)) = s`, lo stato è sempre accettato da `isValidGame` (round-trip storage garantito).
- **Storage**: round-trip, rifiuti, backup, migrazione v1→v2, versioni future.
- **History**: limiti, invalidazione redo, no-op non registrati.
- **Integrazione UI** (Testing Library): flussi principali, nomi accessibili, live region, tastiera.
- **E2E** (Fase 1): reload persistente, offline, installabilità.

## 8. Domande aperte

1. Confermare le definizioni di Fase 0 / Fase 1 sopra.
2. D-006: i danni Commander devono ridurre automaticamente la vita?
3. D-007: supporto partner in Fase 1 o rinviato?
4. Playwright o verifica manuale per l'E2E?
