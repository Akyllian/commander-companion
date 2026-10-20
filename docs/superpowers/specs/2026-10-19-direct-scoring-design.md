# Commander Companion — Accesso diretto ai punteggi secondari

Data: 2026-10-19  
Stato: approvata dal product owner  
Decisione: D-033

## Obiettivo

Rendere danni Commander e segnalini frequenti modificabili dalla schermata principale, senza aprire `<details>`, menu, dialog o pannelli laterali. La vita resta il punteggio dominante; gli altri valori diventano strumenti rapidi dello stesso pannello giocatore.

## Ambito approvato

Ogni giocatore può raggiungere direttamente:

1. Vita;
2. Danni Commander ricevuti, separati per comandante avversario;
3. Veleno;
4. Energia;
5. Esperienza;
6. Radiazioni;
7. Tassa del comandante, separata per i due comandanti Partner.

Monarca e Iniziativa sono stati del tavolo assegnabili a un giocatore, non contatori numerici. Un giocatore può possederli entrambi; ciascuno dei due stati può appartenere a un solo giocatore alla volta.

Sono fuori ambito per questa fase: tesori, indizi, cibo, sangue, storm, mana, segnalini sulle permanenti, +1/+1, −1/−1 e contatori personalizzati. Un contatore personalizzato potrà essere valutato dopo il playtest del set curato.

## Modello d'interazione

### Dock dei punteggi

Ogni pannello contiene un unico `Dock punteggi`, sempre presente sulla superficie principale. Il dock ha:

- una striscia dei modi, ordinata `Vita`, `Commander`, `Veleno`, `Energia`, `Esperienza`, `Radiazioni`, `Tassa`;
- una barra di regolazione in-place per il modo attivo;
- Monarca e Iniziativa come due azioni di stato visivamente separate dai valori numerici.

Il modo iniziale è sempre `Vita`. Il modo attivo è stato di presentazione locale al pannello: non entra nella partita, nella cronologia o nella persistenza. Durante la sessione il pannello ricorda l'ultimo modo e, per Commander/Tassa, l'ultima sorgente scelta.

Toccare un modo non apre nulla sopra la partita: sostituisce il contenuto della barra di regolazione nello stesso punto. Non esistono gesture nascoste, pressione prolungata o doppio tocco.

### Vita

La vita mantiene la barra esistente `[−5] [−1] valore [+1] [+5]`, il numero più grande del pannello e l'attuale feedback del delta. Il cambio di modo non deve far sembrare un altro contatore importante quanto la vita.

### Contatori numerici

Veleno, Energia, Esperienza e Radiazioni usano `[−1] valore [+1]`. Il valore non scende sotto zero. Il raggruppamento dei tocchi, Annulla/Ripeti e l'annuncio accessibile seguono le stesse regole già applicate ai contatori esistenti.

### Danni Commander

Selezionando `Commander`, il dock mostra sulla superficie principale una striscia di sorgenti avversarie. Ogni sorgente usa:

- nome breve del giocatore;
- accento del giocatore;
- miniatura del comandante se già disponibile, altrimenti un sigillo neutro;
- suffisso accessibile `Comandante 1` o `Comandante 2` quando l'avversario usa Partner;
- danno corrente da quella singola sorgente.

La prima sorgente è selezionata in assenza di una scelta precedente. La regolazione usa `[−1] valore [+1]`. Ogni incremento continua a ridurre la vita dello stesso valore, in una sola azione annullabile. Il riepilogo `massimo N/21` rimane disponibile come informazione, mai come somma delle sorgenti.

### Tassa del comandante

La tassa è mostrata come mana generico aggiuntivo, non come numero di lanci: `+{0}`, `+{2}`, `+{4}` e così via. I comandi sono `−{2}` e `+{2}`. Con Partner compaiono due sorgenti separate; senza Partner esiste solo `Comandante 1`.

### Monarca e Iniziativa

Le due azioni stanno dopo un divisore nella striscia del dock. Lo stato attivo mostra icona, etichetta e possessore anche senza affidarsi al colore. Toccando uno stato su un altro giocatore, lo stato viene trasferito in un solo passo annullabile. Toccandolo sul possessore attuale, viene rimosso. Monarca e Iniziativa non causano sconfitta e non alterano automaticamente altri valori.

## Comportamento responsive

### Layout standard

La striscia dei modi è una fascia continua con separatori sottili, non una collezione di pillole. Mostra icona, etichetta e valore dove lo spazio lo consente. Se non entra, scorre orizzontalmente all'interno del pannello; il taglio parziale dell'ultimo elemento rende evidente la continuazione.

La barra di regolazione occupa sempre la stessa altezza: cambiare valore non sposta gli altri pannelli.

### Densità compatta

La striscia dei modi condivide la riga di identità del pannello e usa icone con nome accessibile. L'ordine mette `Commander` e `Veleno` subito dopo `Vita`, quindi restano i primi valori visibili. La striscia può scorrere orizzontalmente, mentre la barra inferiore mantiene i target da 44×44 px.

Il dock non riapre il vecchio sheet dei dettagli per segnare un valore. Il pulsante `Dettagli` resta per comandante/mazzo, credito dell'artista e rimozione del giocatore.

A 844×390 la partita a quattro giocatori deve restare utilizzabile senza sovrapposizioni. A 844×330 e con zoom/testo ingrandito è ammesso lo scorrimento verticale: è preferibile allo schiacciamento sotto 44 px o alla scomparsa dei punteggi.

## Art direction

- Continuare la direzione canonica dark-fantasy editoriale, oro antico e teal luminoso.
- Striscia dei modi: un'unica superficie scura traslucida con hairline oro; niente griglia di card e niente pillole ripetute.
- Modo attivo: hairline oro più accento teal e testo chiaro. Non usare il verde acceso del video di riferimento.
- Icone: set coerente a tratto, 1,5–1,75 px, terminali arrotondati; niente emoji o glifi Unicode come icone definitive.
- Numeri: cifre tabulari. La vita conserva la scala tipografica massima; gli altri valori non superano il 60% della sua dimensione.
- Le miniature Commander usano lo stesso ritaglio e lo stesso trattamento di contrasto della C2.1; non introducono nuove maschere rettangolari.
- Monarca e Iniziativa usano rispettivamente corona e fiaccola/portale come simboli, con testo sempre disponibile agli screen reader.

## Motion

- Cambio del modo: 120 ms, dissolvenza e `translateY(2px → 0)` solo sul valore e sull'etichetta che cambiano.
- Cambio della sorgente Commander/Tassa: 120 ms, sola dissolvenza del valore; i controlli non si muovono.
- Trasferimento Monarca/Iniziativa: 140 ms, l'indicatore scompare dal vecchio pannello e appare nel nuovo senza animarlo attraverso lo schermo.
- Nessun bounce, rotazione, conteggio animato o spostamento di layout.
- Con `prefers-reduced-motion: reduce` tutti i cambi sono immediati.

## Accessibilità e copy

- Ogni target interattivo misura almeno 44×44 px.
- La striscia dei modi usa un gruppo nominato `Punteggio di <nome>`; il modo selezionato espone `aria-pressed="true"`.
- I controlli annunciano sempre valore, giocatore e, quando serve, sorgente/slot Commander.
- Il focus segue l'ordine visivo e resta sul comando usato dopo ogni aggiornamento.
- Lo scorrimento orizzontale della striscia funziona con touch, tastiera e zoom al 200% senza scroll della pagina sull'asse orizzontale.
- Copy visibile: `Vita`, `Commander`, `Veleno`, `Energia`, `Esperienza`, `Radiazioni`, `Tassa`, `Monarca`, `Iniziativa`.
- Copy tassa accessibile: `Tassa del Comandante 1 di <nome>: più quattro mana`.

## Stati e regole

- `Azzera punteggi` ripristina vita, danni, contatori, tassa, Monarca e Iniziativa; non cambia nomi, Partner o comandanti scelti.
- Una nuova partita parte con tutti i valori a zero, senza Monarca o Iniziativa.
- Rimuovere un giocatore elimina i danni provenienti dai suoi comandanti, le relative tasse e l'eventuale possesso di Monarca/Iniziativa.
- Se Partner viene rimosso, la tassa del Comandante 2 deve essere zero, come già richiesto per i suoi danni.
- La soglia di sconfitta resta solo per vita, veleno e danni Commander.
- La voce R7 delle Regole va aggiornata quando la tassa sarà implementata: non potrà più dire `Non tracciata dall’app`.

## Criteri di accettazione

- Danni Commander e tutti i valori approvati sono modificabili senza aprire un overlay.
- Vita e danni Commander restano atomicamente collegati e annullabili in un passo.
- Partner produce sorgenti distinte per danni e tassa.
- Monarca e Iniziativa sono unici a livello di tavolo ma possono coesistere sullo stesso giocatore.
- Il dock è leggibile sopra arte chiara e scura alle soglie WCAG già approvate dalla D-031.
- Nessun target scende sotto 44 px; nessun testo o controllo viene tagliato a 320 px o al 200%.
- Reduced motion, tastiera, screen reader e persistenza sono coperti dai test.

