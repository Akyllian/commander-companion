# Commander Companion — Selettore manuale del layout a quattro giocatori

Data: 2026-10-19  
Stato: approvata dal product owner  
Decisione: D-034

## Obiettivo

Permettere di scegliere la disposizione dei quattro segnapunti in base a come il dispositivo è appoggiato al tavolo. La scelta è intenzionale e persistente: ruotare lo schermo non seleziona un altro layout.

Il video fornito dal product owner è un riferimento di comportamento per il selettore, non un riferimento visivo. L'interfaccia resta nel mondo dark-fantasy editoriale canonico di Commander Companion.

## Ambito

Il selettore è disponibile solo quando la partita ha quattro giocatori. Con due o tre giocatori il comando non viene mostrato; la preferenza salvata resta intatta e torna attiva alla successiva partita a quattro.

Sono approvati tre layout:

1. `Griglia` — 2×2, tutti i pannelli leggibili dallo stesso lato;
2. `Fronte a fronte` — 2×2, riga superiore orientata verso il lato opposto, riga inferiore verso il lato principale;
3. `Tavolo` — un giocatore per bordo: alto, destra, basso, sinistra, con un centro libero e ciascun pannello rivolto verso il proprio posto.

`Griglia` è il valore predefinito e il fallback per preferenze assenti o non valide.

## Accesso e contenitore

`Layout` è un controllo di primo livello perché viene usato quando il gruppo si siede o sposta il dispositivo:

- header standard: dopo `Regole` e prima di `Preferenze`;
- densità compatta: pulsante icona+nome accessibile accanto a `Regole`, prima di `Partita`;
- se lo spazio non permette il testo, resta l'icona con nome accessibile completo `Layout dei quattro giocatori`.

Il controllo apre un `ModalSideSheet` intitolato `Layout dei giocatori`. Il foglio contiene tre grandi opzioni schematiche, una per riga su telefono e fino a due colonne quando lo spazio lo consente. Non contiene impostazioni non correlate.

Selezionare un'opzione:

- applica subito la disposizione;
- salva la preferenza;
- chiude il foglio;
- restituisce il focus al pulsante `Layout`;
- non crea un passo di Annulla/Ripeti e non modifica la partita.

## Anteprime

Ogni opzione è un vero pulsante/radio con:

- miniatura del tavolo a quattro pannelli;
- nome visibile;
- breve descrizione: `Tutti verso di te`, `Due per lato`, `Uno per bordo`;
- indicatore testuale `Selezionato` e `aria-checked="true"` per la scelta corrente.

Le miniature sono diagrammi astratti: fondo quasi nero, piano tavolo teal profondo, pannelli con hairline oro e piccoli segni d'orientamento. La scelta corrente usa un bordo oro più luminoso e un sottile riempimento teal; mai il bordo verde acceso del video.

## Separazione fra layout e responsive density

La preferenza sceglie topologia e orientamento dei pannelli. Il viewport sceglie soltanto densità, spaziature e possibilità di reflow.

- Ruotare il dispositivo non cambia `Griglia`, `Fronte a fronte` o `Tavolo`.
- Una viewport bassa può attivare controlli compatti senza cambiare la disposizione scelta.
- Se il layout scelto non entra con target da 44 px, la pagina può scorrere; non deve sostituirlo silenziosamente con `Griglia`.
- Il nome tecnico `compact landscape` non deve più rappresentare la scelta del layout; la densità compatta va trattata come una capacità responsive distinta.

## Geometria

### Griglia

- Ordine visivo e DOM: giocatori 1, 2, 3, 4.
- Due colonne e due righe quando entrano; reflow a una colonna solo per zoom o larghezza insufficiente.
- Rotazione contenuto: `0deg` per tutti.

### Fronte a fronte

- Stessa griglia e stesso ordine DOM.
- Giocatori 1 e 2: contenuto orientato `180deg`.
- Giocatori 3 e 4: contenuto orientato `0deg`.
- Lo sheet `Dettagli`, menu, dialog, tooltip e focus ring sono sempre dritti rispetto al viewport.

### Tavolo

- Griglia logica 3×3 con centro libero.
- Giocatore 1: bordo basso, `0deg`.
- Giocatore 2: bordo sinistro, `90deg`.
- Giocatore 3: bordo alto, `180deg`.
- Giocatore 4: bordo destro, `−90deg`.
- Il DOM resta 1→4; il posizionamento è solo CSS/presentazione.
- Il centro libero non ospita comandi indispensabili. Può mostrare soltanto il sigillo decorativo o restare vuoto.

Il pannello ruota attraverso un wrapper interno dimensionato per la cella; non si usa una trasformazione che faccia debordare il contenuto senza riservargli spazio.

## Comportamenti collegati

- Tutte le azioni sono riferite al giocatore nominato, indipendentemente dalla sua posizione.
- Il dock dei punteggi della D-033 ruota insieme al pannello.
- Il pulsante che apre un overlay ruota con il pannello; l'overlay portaled resta dritto.
- La barra di annullamento di un giocatore rimosso occupa la sua posizione e usa lo stesso orientamento del pannello rimosso.
- Cambiare numero di giocatori non cancella la preferenza.
- Cambiare layout non chiude né azzera la partita. Se un overlay è aperto, il cambio non è disponibile finché l'overlay viene chiuso.

## Art direction

- Il selettore sembra una tavola di disposizione incisa, non una schermata di impostazioni generica.
- Superficie quasi nera, linee oro molto sottili, teal riservato al piano del tavolo e alla selezione.
- Titoli in Cormorant Garamond secondo il sistema; etichette e descrizioni nell'attuale font UI.
- Nessuna card fotografica, nessuna ombra chiara, nessun verde neon e nessuna imitazione letterale del video.
- Le anteprime usano le quattro tinte giocatore solo come piccoli marker, non come grandi riempimenti.

## Motion

- Apertura/chiusura del foglio: comportamento esistente di `ModalSideSheet`.
- Cambio layout: 140 ms, crossfade dell'intera griglia con assestamento `translateY(2px → 0)`; la geometria non viene interpolata.
- I pannelli non ruotano animandosi attraverso 90°/180° e non attraversano lo schermo.
- Con `prefers-reduced-motion: reduce` il cambio è immediato.

## Accessibilità

- Il foglio segue il focus trap, Escape e ritorno del focus già usati dagli altri sheet.
- Ogni opzione misura almeno 88 px in altezza e ha un nome accessibile completo.
- Orientare visivamente un pannello non altera l'ordine di tabulazione 1→4.
- Focus ring, testo selezionato e stato corrente non dipendono solo dal colore.
- Tutti i controlli ruotati mantengono un'area tattile effettiva di almeno 44×44 px.
- Zoom al 200% può produrre scorrimento verticale, mai sovrapposizione o scroll orizzontale della pagina.

## Criteri di accettazione

- La scelta resta invariata ruotando lo schermo e dopo un reload.
- La scelta non entra nello stato partita, nel file di salvataggio o nella cronologia.
- Tutti e tre i layout funzionano con quattro giocatori e arte Commander singola/Partner.
- Dialog, sheet e menu sono sempre leggibili dallo stesso verso del viewport.
- Se si passa temporaneamente a due o tre giocatori il comando scompare senza perdere la scelta.
- A 320 px e al 200% i contenuti possono refluire/scorrere ma non vengono tagliati.
- Il cambio rispetta la motion approvata e reduced motion.

