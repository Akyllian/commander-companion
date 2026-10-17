# Resoconto Fase 0–1 per la revisione UX

Data: 2026-10-17 · Branch: `fase-0-1` · Destinatario: ChatGPT (art direction, UX, visual e motion design)
Mittente: Lead Software Engineer (Claude)

Questo documento elenca cosa è cambiato nel **comportamento** dell'app, quali elementi di interfaccia sono **segnaposto funzionali** in attesa di design e quali **decisioni UX** servono. Il design concordato (token, colori, tipografia, layout, motion) non è stato modificato, salvo gli adeguamenti richiesti da regole già concordate (target ≥ 44px, nessun overflow a 320px).

---

## 1. Stato tecnico

- `npm run verify` verde: typecheck strict, lint (oxlint, incluse regole jsx-a11y), 110 test, coverage 100% su regole/persistenza/history, build di produzione.
- Invarianti del reducer verificati su migliaia di sequenze casuali di azioni (fast-check).
- PWA installabile, funziona offline dopo la prima visita (verificato a server spento).
- Verificato nel browser alle larghezze 320, 768 e 1440px: nessuno scroll orizzontale, nessun controllo fuori dal pannello, tutti i target ≥ 44px.

## 2. Comportamenti nuovi o cambiati (da conoscere per il design)

| # | Comportamento | Note per la UX |
| --- | --- | --- |
| B1 | **I danni Commander riducono anche i punti vita** (un solo passo di annulla). Correggere i danni verso il basso restituisce la vita tolta. | Il giocatore non deve più toccare la vita a mano: va comunicato con chiarezza. Oggi c'è una riga di aiuto provvisoria. |
| B2 | **Comandanti partner**: ogni giocatore può dichiarare due comandanti; gli avversari vedono due righe di danni separate ("da X, comandante 1/2"). Soglia 21 per singolo comandante. | Il partner non si può togliere se ci sono danni registrati dal secondo comandante (la casella si disattiva con una spiegazione). |
| B3 | **Etichetta "Sconfitto"** invariata visivamente; ora gli screen reader ne leggono anche il motivo (vita, veleno, danni Commander). | Valutare se mostrare il motivo anche a schermo. |
| B4 | **Annunci per screen reader**: un solo annuncio "Nome: N punti vita" ~0,7 s dopo l'ultimo tocco (prima: un annuncio per tocco, senza nome). | — |
| B5 | **Rinomina**: Invio conferma, Esc annulla (prima solo blur). | — |
| B6 | **Scorciatoie**: Ctrl/Cmd+Z annulla, Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y ripete. | Valutare se renderle scopribili (tooltip/aiuto). |
| B7 | Il selettore "Giocatori" parte dal numero attuale di giocatori (prima sempre 4). | — |
| B8 | **Schermo sempre acceso** durante la partita dove supportato. Nessun controllo per disattivarlo. | Serve un interruttore? |
| B9 | **Più schede** dello stesso dispositivo restano sincronizzate; un cambio da un'altra scheda è annullabile. | — |
| B10 | **Doppio tocco rapido** su +1 non fa più zoom su mobile. | — |

## 3. Segnaposto funzionali da progettare (D-010)

Tutti funzionano e sono accessibili, ma aspetto, testo e posizione sono provvisori. Usano solo token esistenti.

| ID | Elemento | Dove | Stato attuale |
| --- | --- | --- | --- |
| P1 | **Avviso aggiornamento**: "È disponibile una nuova versione…" con *Aggiorna* / *Più tardi* | sotto l'header | riquadro neutro |
| P2 | **Avviso offline pronto**: "L'app ora funziona anche senza connessione." + *Ok* | sotto l'header | appare alla prima installazione del service worker; forse superfluo? |
| P3 | **Avviso salvataggio non disponibile** (modalità privata, spazio pieno) | sotto l'header | bordo oro; non chiudibile |
| P4 | **Avviso salvataggio illeggibile** sostituito, con copia di backup conservata | sotto l'header | chiudibile con *Ok* |
| P5 | **Casella "Il mazzo di X ha due comandanti (partner)"** + testo d'aiuto | fondo di "Segnalini e danni" | checkbox nativa con `accent-color` |
| P6 | **Riga d'aiuto** "Ogni danno Commander riduce anche i punti vita." | sotto "Danni Commander subiti" | testo muted |
| P7 | **Icone PWA** (192, 512, maskable, apple-touch) | `public/icons/` | derivate dal brand mark dell'header |
| P8 | **Righe danni con partner**: le etichette lunghe vanno a capo a 320px invece di essere troncate (altrimenti "comandante 1/2" sparisce) | pannello giocatore | funzionale, da rifinire |

Dialoghi di conferma (*Nuova partita*, *Azzera punteggi*) usano ancora `window.confirm`: aspettano un design di dialog.

## 4. Decisioni UX richieste

1. **Dialog di conferma** al posto di `window.confirm` (P1 incluso?): stile, testo, focus iniziale.
2. **Rimozione giocatore** (×): oggi immediata e recuperabile solo con Annulla. Serve conferma?
3. **Raggruppamento dei tocchi**: 10 tocchi su +1 = 10 passi di annulla. Raggruppare entro una finestra di tempo e/o mostrare un indicatore "+7" temporaneo?
4. **Posizione dei danni Commander**: oggi dentro un `<details>` chiuso. Dato che ora riducono la vita, sono un'azione frequente: restano nascosti?
5. **Disposizione al tavolo**: su tablet in mezzo al tavolo, i pannelli degli avversari andrebbero ruotati di 180°? (cambio di layout importante, interamente di competenza design).
6. **Motivo della sconfitta** visibile a schermo (B3)?
7. **Interruttore Wake Lock** (B8)?
8. **Avviso "offline pronto"** (P2): mostrarlo, renderlo discreto o eliminarlo?
9. **Partner**: la casella va in fondo al pannello del giocatore o in un passaggio di configurazione a inizio partita?

## 5. Fuori ambito (non implementato)

AI, sincronizzazione cloud, pagamenti, animazioni complesse, cronologia partite, media dei giocatori.

## 6. Checklist di verifica manuale (D-011)

Da ripetere sulla build di produzione (`npm run build && npm run preview`) dopo ogni modifica visiva:

- [ ] 320 / 768 / 1440px: nessuno scroll orizzontale, nessun controllo tagliato, target ≥ 44px.
- [ ] Solo tastiera: tutti i controlli raggiungibili, focus visibile, Invio/Esc sul nome, scorciatoie annulla/ripeti.
- [ ] `prefers-reduced-motion`: nessun movimento.
- [ ] Danni Commander +2 → vita −2; Annulla ripristina entrambi in un passo.
- [ ] Partner attivo → due righe per quell'avversario; casella bloccata se ci sono danni dal comandante 2.
- [ ] Ricarica: punteggi ripristinati.
- [ ] Offline: aprire una volta, spegnere il server, ricaricare → l'app si apre con la partita.
- [ ] Nuova build: l'avviso di aggiornamento appare e non ricarica finché non si tocca *Aggiorna*.
