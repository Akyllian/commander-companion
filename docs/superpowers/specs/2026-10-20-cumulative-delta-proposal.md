# Commander Companion — Delta cumulativo più evidente (proposta D-036)

Data: 2026-10-20
Stato: **proposta**, da approvare prima di implementare
Decisione: D-036
Vincoli: restano invariate D-033 (dock), D-034 e D-035 (layout) e la direzione dark-fantasy oro/teal. Non si copiano la ruota multicolore, i comandi solo icona, le zone di tocco invisibili né gli sfondi liberi dell'app di riferimento.

## 1. Cosa esiste già

Buona parte del comportamento c'è; la proposta corregge solo i punti deboli.

| Aspetto | Oggi | Dove |
| --- | --- | --- |
| Accumulo `+N` / `−N` | ✅ Lo stesso valore, nella stessa direzione ed entro 700 ms dall'ultimo tocco, forma un gruppo; il gruppo è anche un solo passo di Annulla | `historyReducer`, `GROUP_WINDOW_MS = 700`, `getGroupDelta` |
| Valori coperti | ✅ Vita, danni Commander (per avversario e per comandante Partner), veleno, energia, esperienza, radiazioni, tassa (per slot) | `GroupTarget`: `life`, `counter`, `commander`, `commander-tax` |
| Badge | ✅ `DeltaBadge`, pillola oro accanto al valore attivo | `src/components/DeltaBadge.tsx` |
| Screen reader | ✅ Il badge è `aria-hidden` | — |
| Ingresso | ⚠️ 140 ms, che si **ripete a ogni tocco**: il badge è montato di nuovo a ogni tocco (`key={at}`) e quindi lampeggia | `deltaFor` |
| Uscita | ❌ Sparisce di colpo dopo 700 ms | `setVisible(false)` → `null` |
| Peso visivo | ⚠️ 0,82 rem a ogni densità: discreto vicino alla vita standard (6,25 rem) e poco leggibile a distanza di tavolo | `.delta-badge` |
| Annunci | ⚠️ Badge muto, ma l'`<output>` dei contatori del dock è una live region implicita e annuncia **ogni tocco** | `ScoreAdjust` |

## 2. Comportamento proposto

### 2.1 Accumulo
- Non cambia: lo stesso `GroupTarget`, la stessa direzione ed entro 700 ms dall'ultimo tocco continuano lo stesso gruppo e lo stesso `+N`.
- Un tocco nella direzione opposta, su un altro valore o un'altra sorgente apre un gruppo nuovo, quindi un badge nuovo.
- Il badge mostra il delta netto del gruppo. Se un limite rende nullo l'effetto (per esempio veleno a 0 con «−1»), non compare.

### 2.2 Ciclo di vita del badge (nuovo)
Il badge resta montato per tutto il gruppo, legato al bersaglio e non al tocco. Il valore si aggiorna sul posto.

| Fase | Quando | Animazione |
| --- | --- | --- |
| Ingresso | primo tocco del gruppo | 90 ms: opacità da 0 a 1 e `translateY(2px → 0)` |
| Aggiornamento | ogni tocco successivo | nessuna animazione: cambia solo il numero, con cifre tabulari e larghezza minima fissa, così non si sposta nulla |
| Permanenza | fino a 700 ms dopo l'ultimo tocco | — |
| Uscita | 700 ms dopo l'ultimo tocco, oppure quando inizia un altro gruppo | 160 ms: solo opacità da 1 a 0, nessun movimento |

- Niente rimbalzo, scala, bagliore o conteggio animato.
- Il badge è sovrapposto (`position: absolute`) all'angolo del valore e non ne cambia le dimensioni: nessun cambio di layout.
- Con `prefers-reduced-motion: reduce` il badge compare e scompare subito, senza traslazione e senza dissolvenza (la regola globale va già in questa direzione).

### 2.3 Visibilità, subordinata al punteggio
- Testo oro chiaro su inchiostro, bordo `--color-gold-line` e cifre tabulari, come oggi; nessun colore per la direzione. Il segno `+` / `−` (meno tipografico) basta e non dipende dal colore.
- Dimensione in proporzione al valore a cui è attaccato, sempre molto più piccola:

| Valore | Dimensione del valore | Badge proposto |
| --- | --- | --- |
| Vita, pannello standard | 6,25–9 rem | 1,05 rem, peso 700, altezza minima 1,9 rem |
| Vita, binario compatto | ~3 rem | 0,9 rem, altezza 1,6 rem |
| Valore del dock (D-033) | 2,25 / 1,6 rem | 0,85 rem, altezza 1,5 rem |

- Posizione: angolo in alto a destra del valore attivo, nel verso del pannello, quindi ruota con il pannello in Fronte a fronte e Tavolo. Mai sopra i pulsanti ±.
- Quando i danni Commander riducono anche la vita, il badge compare solo sul valore attivo (Commander). La vita si aggiorna con il bagliore D-024 già esistente; un secondo badge renderebbe più affollato il punto in cui si sta toccando.

### 2.4 Screen reader
- Il badge resta `aria-hidden`: è decorativo.
- Proposta collegata: gli `<output>` del dock smettono di essere live region a ogni tocco (`aria-live="off"`). Il dock riceve un solo annuncio «assestato» dopo 700 ms dall'ultimo tocco, sul modello di quello della vita (`Giocatore 1: veleno 3`). Così una raffica di 10 tocchi produce un annuncio, non dieci.

## 3. Implementazione prevista (dopo l'approvazione)

- **Nessun cambiamento al dominio né alla cronologia:** si riusano `getGroupDelta` e `GROUP_WINDOW_MS`.
- **`DeltaBadge`:**
  - montato una volta per bersaglio (`key` = bersaglio, non `at`);
  - stato `phase: 'enter' | 'shown' | 'exit'` guidato da `at`: ogni nuovo `at` riavvia il timer di 700 ms;
  - all'uscita resta montato per 160 ms con `data-phase="exit"`;
  - quando il gruppo passa a un altro bersaglio, il badge precedente esce con la sua dissolvenza invece di sparire.
- **Token:** `--duration-delta-in: 90ms`, `--duration-delta-out: 160ms`. Le dimensioni vanno nei selettori esistenti (`.life-value`, `.score-rail`, `.score-adjust__value`).
- **Test, scritti prima del codice:**
  - una raffica di tocchi produce un solo badge, che non si rimonta;
  - il valore si aggiorna sul posto;
  - dopo 700 ms dall'ultimo tocco entra in `exit` e dopo altri 160 ms sparisce;
  - cambiare bersaglio fa uscire il vecchio badge;
  - delta nullo, nessun badge;
  - `aria-hidden` sul badge, un solo annuncio assestato per raffica;
  - con reduced motion nessuna fase intermedia visibile.
- **Verifica visiva:** 390×844, 844×390, 768, 1440, 200% di zoom; Fronte a fronte e Tavolo ruotati; arte chiara (contrasto D-031).

## 4. Domande per il design

1. Le dimensioni della tabella 2.3 vanno bene, o il badge della vita standard deve essere ancora più presente?
2. Con i danni Commander, il badge solo sul valore Commander (raccomandato) o anche un badge speculare sulla vita?
3. Approvi l'annuncio assestato del dock al posto della live region a ogni tocco?

## 5. Ipotesi successive (non da implementare ora)

### 5.1 Sheet Dettagli che lascia visibili gli altri giocatori
- **Idea:** al posto del foglio laterale modale a tutta altezza, un pannello di dettagli **ancorato al pannello del giocatore**, che copre solo quella cella. Gli altri segnapunti restano visibili e utilizzabili.
- **Questioni da decidere:**
  - **Modale o no.** Se gli altri pannelli restano utilizzabili, non è più un dialog modale: serve una gestione esplicita del focus (ingresso, Esc, ritorno all'opener) e un nome chiaro per lo screen reader. In alternativa resta modale ma rimpicciolito, con gli altri visibili ma inerti.
  - **Orientamento.** D-034 chiede overlay sempre dritti. Un pannello ancorato a un posto ruotato di 90°/180° dovrebbe ruotare con il posto, cosa che contraddice D-034, oppure restare dritto dentro una cella ruotata, con spazio molto limitato in Tavolo. Serve una deroga esplicita o una geometria diversa.
  - **Spazio.** «Comandante e mazzo», con ricerca Scryfall e tastiera aperta, non entra in una cella compatta. Probabilmente la ricerca resta nel foglio completo e la cella mostra solo crediti, Partner e rimozione.
- **Rischi:** sovrapposizioni a 844×330 e al 200%; focus trap meno robusto del `<dialog>` nativo; regressioni su D-032 (zona di rimozione separata).

### 5.2 Sigillo centrale per al massimo quattro azioni globali (layout da tavolo)
- **Idea:** in Tavolo e in Fronte a fronte (a 2 e a 4) il centro del tavolo ospita il sigillo di Commander Companion come pulsante. Toccandolo si aprono fino a quattro azioni globali, per esempio Annulla, Ripeti, Regole e Partita (con Layout dentro Partita, o Layout al posto di Ripeti). L'intestazione, in quei layout, si potrebbe ridurre o nascondere per guadagnare spazio.
- **Vincoli da rispettare:**
  - Pulsante vero da almeno 44 px, con nome accessibile («Azioni della partita»); niente pressione prolungata, nessuna zona invisibile.
  - Le azioni sono **pulsanti con testo**, non solo icone, e dritte rispetto al viewport, come gli overlay D-034. Da decidere da quale lato si leggono.
  - Il menu è un popover o sheet nativo, con focus, Esc e ritorno al sigillo.
- **Conflitto da risolvere:** D-034 dice che il centro libero «non ospita comandi indispensabili». Il sigillo li ospiterebbe, quindi serve una modifica esplicita di D-034, oppure il sigillo deve solo duplicare comandi che restano anche nell'intestazione.
- **Rischi:** il centro in Fronte a fronte a 2 è sottile (la giuntura fra le due metà); servirebbe un sigillo sovrapposto alla giuntura, da verificare con le dita dei giocatori vicine ai ±; in Tavolo su telefono la colonna centrale è stretta.
