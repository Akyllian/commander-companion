# Commander Companion — R1 Guscio app

Data: 2026-10-20

Stato: **approvata dal product owner** (2026-10-20), con il ponte «Riferimento rapido Commander» in Impara fino a R4 e addendum di revisione della PR #20. Piano tecnico: [`../plans/2026-10-20-r1-shell.md`](../plans/2026-10-20-r1-shell.md)

Dipendenza: D-037, `2026-10-20-app-restructure-design.md`

Tavola visiva: [`../../art-direction/r1-shell-navigation.svg`](../../art-direction/r1-shell-navigation.svg)

## 1. Intento

R1 trasforma il segnapunti in un'app con quattro sezioni riconoscibili senza anticipare le funzioni di Mazzi, Impara o gli strumenti di R2. La partita deve continuare a occupare quasi tutto lo schermo; fuori dalla partita, la navigazione deve ricordare il mockup iniziale con icone a tratto, etichette editoriali e stato attivo oro.

La scena fisica resta quella canonica: **un telefono o tablet scuro al centro di un tavolo, illuminato da una linea teal e da piccoli accenti oro, mentre più persone devono riconoscere il proprio punteggio senza avvicinarsi allo schermo**.

### Obiettivi R1

- introdurre `Partita`, `Mazzi`, `Impara`, `Altro` come navigazione principale;
- togliere intestazione, ingranaggio, Annulla e Ripeti dalla superficie di gioco;
- rendere `Altro` una schermata Impostazioni completa e ordinata;
- pubblicare placeholder credibili per Mazzi e Impara, senza pulsanti finti;
- introdurre il rombo centrale come unico comando che rivela la navigazione durante la partita;
- preservare geometrie, orientamento, contrasto, focus e target da 44 px già approvati.

### Fuori ambito R1

- nuovo disegno delle carte giocatore e tendina contatori (R2);
- Dadi, Mana e Testa o croce nel rombo (R2);
- archivio e importazione mazzi (R3);
- nuova architettura e nuovi testi di Impara (R4).

## 2. Architettura del guscio

L'app ha due stati di navigazione:

1. **Sezione non-Partita:** la barra delle quattro sezioni è persistente in alto.
2. **Partita:** la barra è nascosta e non occupa spazio. Il rombo centrale resta visibile. Attivandolo, la barra compare sopra la partita senza ridimensionare o rimontare i pannelli.

Le sezioni sono navigazione di primo livello, non un `tablist` applicativo. Usare un elemento `nav` con quattro link o pulsanti di navigazione e `aria-current="page"`; non usare `role="tab"` se le sezioni diventano route o viste autonome.

Ordine DOM e visivo invariabile:

1. Partita
2. Mazzi
3. Impara
4. Altro

Cambiare sezione non modifica partita, layout o preferenze.

## 3. Barra delle sezioni

### 3.1 Geometria

- Occupa tutta la larghezza del viewport; contenuto interno centrato e largo al massimo `56rem`.
- Altezza contenuto: **60 px** in verticale e su tablet/desktop; **52 px** con densità compatta.
- Sommare `env(safe-area-inset-top)` al padding superiore, senza ridurre i target.
- Ogni sezione occupa un quarto della larghezza disponibile e ha target minimo **48 × 48 px**.
- Nessuna capsula esterna o barra flottante: è una fascia continua in inchiostro, separata dal contenuto da una hairline oro.

### 3.2 Icone e testo

Icone 24×24, `currentColor`, stroke arrotondato **1,75 px**:

| Sezione | Icona |
| --- | --- |
| Partita | cuore a tratto |
| Mazzi | tre livelli/carte sovrapposte |
| Impara | libro aperto |
| Altro | tre punti orizzontali |

- Etichetta visibile sempre, anche a 844×330: `Partita`, `Mazzi`, `Impara`, `Altro`.
- Etichette in utility face, 0,68rem compatta / 0,72rem normale, maiuscoletto tramite `text-transform: uppercase`, tracking 0,08em. Non usare Cormorant sotto 14 px.
- Inattivo: icona e testo in ivory attenuato; nessuna tinta piena.
- Attivo: oro caldo su icona e testo, linea da 2 px sotto l'elemento e alone oro molto leggero confinato alla linea.
- Hover: oro attenuato. Focus: doppio anello oro già canonico. Active: assestamento di 1 px, senza scale elastiche.

### 3.3 Barra persistente fuori dalla partita

Su Mazzi, Impara e Altro la barra partecipa al flusso della pagina ed è `sticky` in alto. Lo sfondo è opaco (`--color-ink`/`--color-depth`), non vetro sfocato. Deve restare leggibile sopra contenuti illustrati futuri.

### 3.4 Barra temporanea in Partita

Quando è rivelata dal rombo:

- usa il top layer o un layer `fixed` dedicato sopra la partita;
- non causa reflow e non modifica altezza o orientamento dei pannelli;
- usa una superficie opaca inchiostro/depth con hairline oro, non glassmorphism;
- copre soltanto la propria altezza; nessuno scrim e nessun blocco del resto del tavolo;
- resta aperta finché l'utente sceglie una sezione, riattiva il rombo o preme `Esc`;
- non si chiude con timer e non trasforma un tocco sul punteggio in un gesto di chiusura.

Toccando `Partita` mentre si è già in Partita, la barra si nasconde. Scegliendo Mazzi, Impara o Altro si cambia vista e la barra diventa persistente. Tornando a Partita, la barra scompare al termine della transizione di sezione.

## 4. Motion della navigazione

### 4.1 Comparsa e scomparsa

- Entrata: **180 ms**, opacità 0→1 e `translateY(-8px)`→0, `--ease-out`.
- Uscita: **140 ms**, sola opacità 1→0 più `translateY(-4px)`.
- Le icone non entrano in sequenza e non ruotano.
- La linea attiva si accende in **140 ms**; nessun indicatore che scivola fra le sezioni.
- Con `prefers-reduced-motion: reduce`: presenza/assenza immediata; resta il cambio di colore/stato.

### 4.2 Cambio di sezione

- Il contenuto nuovo appare con crossfade **140 ms** e assestamento massimo **2 px**.
- Il contenuto precedente non deve sparire prima che il nuovo sia disponibile; niente schermate nere intermedie.
- Il focus programmatico va al titolo `h1` della nuova vista solo per navigazione da tastiera/screen reader; il titolo usa `tabindex="-1"`.

## 5. Rombo centrale R1

### 5.1 Forma

- Un vero `<button>` di **56 × 56 px**; il target resta quadrato e non viene ruotato.
- Il rombo è disegnato con pseudo-elemento o SVG ruotato all'interno: superficie inchiostro opaca, doppia hairline oro, piccolo sigillo a quattro punte teal/oro.
- Stato chiuso: `aria-label="Mostra le sezioni"`, `aria-expanded="false"`.
- Stato aperto: `aria-label="Nascondi le sezioni"`, `aria-expanded="true"` e `aria-controls` verso la navigazione.
- Nessuna etichetta permanente dentro il tavolo. Al primo utilizzo, un suggerimento non modale «Tocca il sigillo per le sezioni» compare sotto il rombo, sparisce alla prima attivazione e viene memorizzato nelle preferenze per non ricomparire.

### 5.2 Posizione e orientamento

Il rombo appartiene al viewport, non a un giocatore: è sempre diritto rispetto allo schermo e mantiene lo stesso ordine di focus.

| Layout | Posizione |
| --- | --- |
| 2 — Stesso lato | centro geometrico del gruppo dei due pannelli, nella separazione fra le due carte |
| 2 — Fronte a fronte | centro della giuntura orizzontale fra le due metà |
| 4 — Griglia | intersezione centrale delle quattro carte |
| 4 — Fronte a fronte | intersezione centrale delle quattro carte |
| 4 — Tavolo | centro della zona già libera del tavolo |

Per Griglia, Fronte a fronte e due giocatori, il layout riserva una **zona sicura minima di 64 × 64 px** nella giuntura. Le proporzioni e le celle approvate in D-034/D-035 restano invariate: ciascun pannello adiacente libera internamente il proprio quarto della zona, lasciando al rombo soltanto lo sfondo ornamentale degli angoli. Non creare intagli visibili né un vuoto di 64 px tra le carte. Il rombo non può coprire nome, vita, ±1, Dettagli o futuri contatori. La rimozione dell'intestazione restituisce l'altezza necessaria per questo spazio; sotto 844×330 è preferibile consentire lo scorrimento già previsto piuttosto che ridurre target o sovrapporre controlli.

Per tre giocatori, non richiesto come layout da tavolo ma ancora supportato, il rombo resta al centro del bounding box della griglia e la terza carta non può estendersi nella zona sicura.

### 5.3 Interazione e focus

- Tap/click: mostra o nasconde la barra.
- `Enter`/`Space`: stesso comportamento; quando apre da tastiera, il focus passa a `Partita` nella barra.
- `Esc`: nasconde la barra e restituisce il focus al rombo.
- Il rombo non ha long press, drag o gesture nascoste.
- R1 non mostra menu radiale, Dadi, Mana o Testa o croce; l'interno del rombo resta estensibile in R2 senza cambiarne geometria.

### 5.4 Motion

- Pressione: 1 px verso il basso e accensione hairline in **90 ms**.
- Apertura: il sigillo interno aumenta la propria luminosità in **140 ms**; il rombo non ruota e non pulsa.
- Reduced motion: stato immediato, conservando colore e `aria-expanded`.

## 6. Schermata Altro / Impostazioni

### 6.1 Struttura

La barra resta persistente. Contenuto in una colonna da massimo **46rem**, padding 16 px su telefono / 24–32 px da tablet. Titolo serif `Altro`, sottotitolo utility «Partita, schermo e informazioni».

Non usare una griglia di card uguali. Le impostazioni formano un elenco editoriale continuo con titoli di gruppo, hairline oro e righe da almeno 52 px.

Ordine:

#### A. Disposizione del tavolo

1. **Layout dei giocatori** — mostra le anteprime schematiche già approvate, direttamente nella pagina. Le opzioni dipendono dal numero di giocatori della **partita corrente**, non dal draft 2/3/4 della nuova partita. Con 2 giocatori: Stesso lato / Fronte a fronte. Con 4: Griglia / Fronte a fronte / Tavolo. Con 3: testo «Griglia» senza controllo inattivo ambiguo.
2. **Mantieni lo schermo acceso** — checkbox/switch nativo con descrizione «Evita che lo schermo si spenga durante la partita». Se Wake Lock non è supportato, la riga non viene renderizzata.

#### B. Nuova partita

1. **Giocatori per la nuova partita** — controllo segmentato 2 / 3 / 4, etichetta completa. Cambia solo la scelta preparatoria, non la partita corrente.
2. **Nuova partita** — pulsante primario teal/ink con hairline oro. Apre la conferma esistente, con focus iniziale su `Annulla`.

#### C. Partita attuale

1. **Azzera punteggi** — azione secondaria con testo chiaro e bordo oro, mai rossa sulla pagina. Il rosso pieno resta nel solo dialogo di conferma, come D-032.

Separare questa azione dal gruppo precedente con almeno 24 px e un divisore. Non affiancare Nuova partita e Azzera su telefono.

#### D. Informazioni

- `Commander Companion` e versione dell'app;
- «Dati e illustrazioni delle carte da Scryfall»;
- testo Fan Content già approvato, completo e leggibile;
- nessun logo Wizards e nessun link presentato come approvazione ufficiale.

### 6.2 Stato e feedback

- Layout selezionato: bordo oro, tinta teal 9%, check testuale «Selezionato»; non solo colore.
- Le modifiche a layout e Wake Lock sono immediate e persistenti. La preferenza Wake Lock resta salvata, ma il lock viene rilasciato uscendo da Partita e riacquisito tornando a Partita se la preferenza è ancora attiva.
- Il numero di giocatori resta un draft finché non viene confermata Nuova partita.
- Dialoghi di conferma restano top-layer e dritti anche se la partita sottostante usa pannelli ruotati.

## 7. Mazzi — placeholder R1

La vista ha barra persistente, fondo inchiostro con trama arcana a bassissimo contrasto e contenuto centrato ma non dentro una card.

- Titolo: **Mazzi**.
- Icona a tratto: tre carte sovrapposte con una singola linea teal.
- Heading serif: **Il tuo grimorio è in preparazione**.
- Testo: «Qui potrai importare le tue liste, aggiungere strategie e provare una mano iniziale.»
- Stato discreto: `In preparazione`, in testo e bordo oro; non è un pulsante.
- Nessuna CTA disabilitata, skeleton o promessa di data.

Il contenuto resta leggibile a 320 px e non supera 48ch.

## 8. Impara — placeholder R1 e ponte Regole

La vista usa la stessa struttura generale di Mazzi, ma non deve sembrare una copia: libro aperto grande a tratto, una linea verticale teal/oro e composizione più editoriale.

- Titolo: **Impara**.
- Heading serif: **Una guida che cresce con te**.
- Testo: «Le basi, le meccaniche e gli scenari interattivi arriveranno qui.»

### Ponte transitorio consigliato

R1 non dovrebbe eliminare per mesi il riferimento Regole già disponibile. Sotto il placeholder inserire **Riferimento rapido Commander**, riusando il contenuto e il side sheet attuali tramite un pulsante testuale con icona libro. In R4 il contenuto confluirà nella pagina e il pulsante verrà rimosso.

Se il product owner richiede una schermata letteralmente vuota, questa sezione può essere omessa, ma va registrata come regressione temporanea rispetto a D-021.

## 9. Avvisi di sistema e offline

- Fuori dalla partita: avvisi sotto la barra, nel flusso della pagina.
- In Partita: toast compatto dritto rispetto al viewport, sopra la safe area inferiore e lontano dal rombo; non cambia la geometria delle carte.
- Gli avvisi non possono occupare contemporaneamente la stessa zona del suggerimento iniziale del rombo.
- Stato offline non blocca Partita, Altro o i placeholder.

## 10. Responsive e accessibilità

Verifiche obbligatorie:

- 320×568 e 390×844;
- 768×1024;
- 844×390 e 844×330;
- 1440×900;
- zoom/reflow 200%;
- Griglia, Fronte a fronte e Tavolo; 2 e 4 giocatori, più controllo di regressione a 3.

Criteri:

- nessuna etichetta della barra viene troncata o rimossa;
- nessun target sotto 44 px;
- barra temporanea e rombo non causano layout shift, salvo il singolo assestamento iniziale del coach label approvato nel §13.2;
- nessun contenuto indispensabile sotto il rombo;
- barra nascosta = nessun discendente focalizzabile;
- contrasto AA: 4,5:1 per etichette, 3:1 per icone e bordi significativi;
- ordine di lettura: navigazione, titolo della vista, contenuto;
- sezioni identificate da `aria-current`, non solo oro;
- reduced motion equivalente e immediato;
- Altro resta utilizzabile offline e senza Wake Lock.

## 11. Conflitti e deroghe rispetto al sistema approvato

### C1 — Centro libero di D-034

D-034 lasciava il centro privo di comandi indispensabili. D-037 rende il rombo l'unico accesso alle sezioni durante la partita. È una deroga sostanziale: R1 deve modificare la geometria con una zona sicura, non sovrapporre semplicemente un bottone ai pannelli esistenti.

### C2 — Impara vuoto contro D-021

D-037 assorbe Regole in Impara, ma R4 arriva dopo R1. Una schermata Impara letteralmente vuota elimina una funzione già pubblicata. La soluzione di design è il ponte transitorio del §8; ometterlo richiede accettare e documentare la regressione.

### C3 — Navigazione nascosta

Nascondere la navigazione migliora l'immersione ma riduce la scoperta. Il rombo deve quindi essere un vero pulsante da 56 px con accessibilità completa e suggerimento al primo utilizzo; non può essere un puro ornamento senza etichetta.

### C4 — Somiglianza al mockup

Il mockup è più ornamentale e usa molta arte. R1 riprende gerarchia, icone, schede alte e linea attiva, ma non introduce vetro, glow forte, controlli icon-only senza nome o decorazione che sottrae spazio ai punteggi. La somiglianza è di linguaggio e composizione, non una copia letterale.

### C5 — Arte casuale futura

Non blocca R1, ma in R2 l'arte casuale «fra tutte le carte» può produrre soggetti o luminosità incoerenti. Deve attraversare lo stesso ritaglio, velo adattivo e fallback offline di D-026/D-031; nessuna immagine può ridurre il contrasto o cambiare la palette dei controlli.

## 12. Criteri di approvazione R1

R1 è pronta per il piano tecnico quando il product owner approva:

1. fascia superiore continua, non capsule o bottom navigation;
2. barra persistente fuori dalla partita e temporanea senza reflow in Partita;
3. rombo 56 px nella zona centrale riservata;
4. ordine dei gruppi in Altro;
5. copy dei placeholder Mazzi e Impara;
6. ponte transitorio alle Regole;
7. motion 180/140 ms e reduced motion immediato.

L'implementazione deve poi essere provata sul telefono prima di iniziare R2.

## 13. Addendum di revisione della PR #20

Questo addendum integra il design R1 dopo la verifica dell'implementazione e prevale sui punti incompatibili di D-035/D-038.

### 13.1 Rombo visibile nella colonna verticale

Quando le carte sono impilate in una sola colonna e il centro geometrico del tavolo cade fuori dal viewport iniziale, il rombo non resta al centro dell'intera griglia: usa la **prima giuntura interna completamente visibile**, normalmente quella fra Giocatore 1 e Giocatore 2.

- La zona sicura da 64 × 64 px deve essere interamente dentro il viewport a 320×568 e 390×844 senza scorrere.
- La posizione scelta resta ancorata alla giuntura nel documento: il rombo non è sticky, non segue lo scroll e non salta da una giuntura all'altra mentre si scorre.
- Se il centro geometrico è già visibile, resta valida la posizione centrale di R1.
- Orientamento, target, focus e comportamento della barra non cambiano.

### 13.2 Suggerimento iniziale

La pillola attuale sotto il rombo non è approvata: a 390×844 occupa `y=909,8–932,2`, mentre il nome della carta successiva occupa `y=912,8–956,8`, producendo una sovrapposizione visibile di circa 19 px.

Il suggerimento resta obbligatorio una sola volta, ma diventa un coach label compatto:

- testo visivo: **«Tocca ◇ per le sezioni»**;
- posizione sopra il rombo, centrata e sempre diritta rispetto al viewport;
- larghezza massima 9rem; può andare su due righe ma non troncare il testo;
- il lato inferiore centrale della carta sopra la giuntura riserva una piccola fascia priva di testo e controlli per ospitarlo; può restare visibile soltanto lo sfondo ornamentale;
- nessuna sovrapposizione con nome, comandante, vita, pulsanti o controlli;
- nessun timer: scompare alla prima attivazione del rombo e resta memorizzato come già previsto;
- `pointer-events: none`; il nome accessibile completo del pulsante resta «Mostra le sezioni».

È accettato un solo assestamento al primo utilizzo: in colonna la carta sopra la giuntura può essere più alta della fascia riservata mentre il coach label è visibile; alla prima attivazione la fascia scompare e il rombo risale una volta. Il cambiamento è immediato, non anima altezza o posizione e non si ripete nelle visite successive.

### 13.3 Due giocatori: stessa geometria, orientamento diverso

`Fronte a fronte` a due giocatori riusa esattamente la geometria di `Stesso lato` al breakpoint corrente. Non crea due metà a tutta altezza, non forza pannelli compatti e non allunga le carte.

- `Stesso lato`: entrambi i giocatori a 0°.
- `Fronte a fronte`: stessa posizione, dimensione, densità e ordine DOM; soltanto il contenuto del giocatore opposto ruota di 180°.
- Il passaggio fra le due opzioni non deve cambiare altezza del tavolo, scroll, proporzioni o posizione del rombo.
- Le anteprime del selettore devono condividere la stessa sagoma; la seconda differisce soltanto per il segno di orientamento del giocatore opposto.
