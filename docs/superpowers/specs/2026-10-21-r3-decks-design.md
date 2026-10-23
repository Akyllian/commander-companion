# Commander Companion — R3 Mazzi

**Stato:** proposta completa per approvazione del product owner\
**Ruolo:** art direction, interaction design e motion\
**Dipende da:** D-025, D-031, D-037, D-038 e D-039\
**Tavola:** [`../../art-direction/r3-decks-board.svg`](../../art-direction/r3-decks-board.svg)

## 1. Intento

R3 trasforma il placeholder Mazzi in un grimorio personale e locale: si incolla una lista testuale, l'app riconosce le carte con Scryfall, salva il mazzo per l'uso offline e lo rende utile sia prima della partita sia durante la configurazione di un giocatore.

La sezione non deve sembrare un deck builder competitivo né una galleria di carte. La forma principale è un **registro editoriale continuo**: titoli serif, righe compatte, divisori oro e poche finestre illustrate. Le immagini hanno due soli ruoli:

1. identificare il comandante;
2. rendere leggibile la mano di prova.

Non si mostrano mai carte intere, frame ufficiali ricostruiti, prezzi, punteggi, percentuali di qualità o suggerimenti automatici. L'atmosfera resta dark fantasy composta: inchiostro, profondità verde petrolio, oro antico, avorio, linee arcane sottili e icone monolineari.

### Obiettivi R3

- conservare più mazzi, propri o di amici;
- importare una lista `quantità + nome` da testo incollato;
- rendere chiaro cosa è stato riconosciuto, cosa richiede correzione e quando il mazzo è disponibile offline;
- mostrare comandante, categorie automatiche, lista e note di strategia senza trasformare la pagina in una dashboard;
- permettere la modifica della lista dentro l'app;
- offrire una mano di prova da sette carte con mulligan;
- collegare un mazzo a un giocatore senza bloccare le modifiche manuali del pannello Partita.

### Fuori ambito R3

- import da URL, account Moxfield/Archidekt o sincronizzazione cloud;
- prezzi, leghe, statistiche di vittoria, mana curve, deck score o consigli di costruzione;
- contatori rapidi del mazzo;
- scansione fotografica, export o condivisione pubblica;
- proxy, immagini di carte complete o riproduzione del frame;
- note di partita e cronologia delle mani.

## 2. Principi trasversali

1. La barra R1 resta persistente e `Mazzi` conserva `aria-current="page"`.
2. Ogni azione interattiva misura almeno **44 × 44 px**; righe apribili e risultati di ricerca misurano almeno 56 px.
3. Il contenuto principale resta utilizzabile offline dopo il primo caricamento completo. Lo stato offline non viene espresso con il solo colore.
4. I dati remoti non compaiono mentre arrivano in modo da spostare comandi già visibili: si riservano le geometrie e si aggiorna localmente la riga interessata.
5. Le categorie sono descrittive, non valutative. Una carta può contribuire a più categorie e non esiste un totale “100%”.
6. La lista è testo strutturato. L'arte non viene aggiunta a ogni riga: densità, riconoscimento dei nomi e uso offline hanno precedenza sulla spettacolarità.
7. Le superfici opache usano i materiali canonici. Niente glassmorphism, gradienti animati, caroselli automatici o card grid uniforme.
8. Tutte le stringhe di prodotto sono in italiano; i nomi propri delle carte restano quelli restituiti dalla fonte selezionata.

## 3. Architettura della sezione

La sezione ha quattro viste, raggiungibili senza route nascoste:

1. **Libreria Mazzi** — elenco e punto di ingresso per l'import.
2. **Importa mazzo** — testo, analisi, correzione e salvataggio offline.
3. **Dettaglio mazzo** — Panoramica, Lista, Strategia e Mano.
4. **Seleziona mazzo** — foglio usato dai Dettagli del giocatore in Partita.

La navigazione interna del dettaglio usa una fascia sotto l'hero del comandante con quattro elementi:

- `Panoramica`
- `Lista`
- `Strategia`
- `Mano`

È un vero `tablist` perché cambia una regione interna dello stesso mazzo. Il tab attivo è oro, ha una linea inferiore da 2 px e `aria-selected="true"`; non si usa una pill piena. A 320 px il binario può scorrere orizzontalmente mostrando una porzione del quarto elemento, ma ogni tab mantiene target alto 44 px e testo intero. Il focus segue il pattern roving tabindex e le frecce non cambiano il contenuto finché il tab non viene attivato.

Le **Carte chiave** richieste dalla D-037 non diventano un quinto tab: sono una sezione manuale della vista Strategia (§9.1). In questo modo restano associate alle note scritte dal proprietario e non comprimono la navigazione a 320 px.

## 4. Libreria Mazzi

### 4.1 Intestazione

Sotto la barra R1:

- `h1` serif **Mazzi**;
- sottotitolo «Liste, strategie e mani di prova, disponibili anche offline.»;
- azione primaria **Importa mazzo**, con icona di foglio e freccia verso il basso;
- ricerca locale **Cerca nei mazzi** quando sono presenti almeno sette mazzi. Sotto questa soglia non si mostra un campo vuoto non necessario.

Su telefono titolo e CTA stanno su due righe; da 48rem possono condividere la stessa riga. La CTA non è flottante e non copre l'ultima voce.

### 4.2 Lista come registro

I mazzi formano una lista continua, non una griglia di card. Ogni riga è interamente apribile e contiene:

1. ritaglio del comandante **64 × 64 px** (`art_crop`, `cover`, fuoco 50% / 32%); con Partner, divisione 50/50 e hairline diagonale D-031;
2. nome del mazzo in display serif;
3. comandante o coppia Partner in utility face;
4. proprietario: `Mio` oppure `Di [nome]`;
5. stato locale esplicito: icona download completato + «Disponibile offline», oppure icona avviso + testo specifico;
6. riepilogo quiet di massimo tre categorie con il conteggio, per esempio «Accelerazione 11 · Pescata 9 · Interazione 13»;
7. chevron a tratto.

Su 320–390 px le categorie passano sotto identità e proprietario; il ritaglio resta 56–64 px. Da tablet la riga è una griglia a colonne e il riepilogo resta sulla destra. Il bordo fra righe è una hairline oro al 35%; non ci sono ombre individuali.

Il proprietario non usa un avatar né un colore personale. È testo, perché i mazzi degli amici devono restare semplici record locali e non simulare account.

### 4.3 Stato vuoto

Lo stato vuoto sostituisce il placeholder R1:

- icona a tratto dei tre livelli;
- heading serif **Il tuo grimorio è vuoto**;
- testo «Incolla una lista di carte: la prepariamo una volta e resta con te anche offline.»;
- CTA **Importa il primo mazzo**;
- esempio quiet su due righe: `1 Sol Ring`, `12 Island`.

Non mostrare illustrazioni casuali, skeleton o mazzi dimostrativi finti.

### 4.4 Azioni secondarie

Ogni riga espone soltanto l'apertura. `Rinomina`, `Duplica` e `Elimina` stanno nel menu `⋮` dell'hero del dettaglio, non in gesture swipe. `Elimina mazzo` usa quiet-danger nel menu e rosso pieno solo nel dialogo di conferma D-032.

## 5. Importa mazzo

### 5.1 Contenitore

L'import è una pagina della sezione, non un piccolo dialogo. Su telefono occupa il flusso completo sotto la barra; da tablet usa un contenuto massimo di 58rem. In alto:

- link **Torna ai mazzi**;
- `h1` **Importa mazzo**;
- indicatore testuale `1 di 3 · Lista`, `2 di 3 · Verifica`, `3 di 3 · Dettagli`.

L'indicatore non è una progress bar decorativa e non permette di saltare avanti prima della validazione.

### 5.2 Passo 1 — Lista

Un'unica textarea opaca, alta almeno 18rem su telefono, etichettata **Incolla la lista**. Helper:

> Una carta per riga, nel formato «quantità nome». Sono accettate anche intestazioni come Commander, Mainboard o Sideboard; i nomi vengono verificati con Scryfall.

Trattamento delle sezioni importate:

- `Commander` identifica il candidato o i candidati comandante;
- righe senza sezione e `Mainboard` formano la lista pescabile;
- `Sideboard`, `Maybeboard`, `Considering` e sezioni equivalenti vengono mostrate in Verifica come **Sezioni non importate**, con conteggio e testo originale; non entrano nel mazzo salvato, nelle categorie o nella mano di prova;
- nessuna sezione viene scartata in silenzio: la conferma **Ignora N righe fuori lista** è necessaria prima di continuare.

Grammatica minima accettata, con spazi iniziali/finali ignorati:

- `1 Sol Ring`;
- `1x Sol Ring`;
- `1 Sol Ring (CMM) 396` quando set e numero collezionista sono presenti;
- heading `Commander`, `Mainboard`, `Sideboard`, `Maybeboard` o la stessa parola fra parentesi quadre, senza distinzione fra maiuscole e minuscole;
- righe vuote ignorate.

Qualunque riga non conforme resta visibile in Verifica: il parser non tenta di indovinarla e non la elimina. Claude è autorizzato a definire nel piano tecnico le sole varianti di punteggiatura e whitespace, con fixture per ciascun formato accettato; non può ampliare silenziosamente le sezioni salvate.

Azioni:

- **Analizza lista** — primaria;
- **Svuota** — quiet-danger solo se il campo contiene testo.

L'analisi parte soltanto dopo l'azione esplicita, mai a ogni tasto. Se manca la rete, il testo resta intatto e compare un avviso inline: «Serve una connessione per riconoscere nuove carte. La partita e i mazzi già salvati restano disponibili.» La CTA diventa **Riprova analisi**, non uno spinner infinito.

### 5.3 Passo 2 — Verifica

L'esito si legge dall'alto verso il basso:

1. riepilogo «94 carte riconosciute · 2 righe da correggere»;
2. gruppo **Da correggere**, sempre prima delle righe valide;
3. gruppo collassabile **Riconosciute**;
4. azioni **Torna al testo** e **Continua**.

Una riga non riconosciuta conserva quantità e testo originale, ha un campo di correzione e il comando **Cerca carta**. I risultati usano la lista continua D-027: ritaglio 48 × 48, nome, artista, riga alta almeno 64 px, massimo cinque risultati senza scroll annidato. Il rosso segnala solo errore reale; una carta ambigua usa bordo oro e testo «Scegli una corrispondenza».

Si può continuare con righe non riconosciute soltanto dopo una conferma esplicita: **Salva senza 2 righe**. Prima della conferma, **Continua** è disabilitato. Dopo la conferma, il controllo diventa il riepilogo con check **2 righe escluse** e **Continua** si abilita. Le righe restano nel testo sorgente e sono mostrate nel dettaglio come **Non riconosciute**, ma non partecipano a categorie o mano di prova.

### 5.4 Passo 3 — Dettagli

Campi in ordine:

1. **Nome del mazzo** — obbligatorio;
2. **Questo mazzo è di** — predefinito `Me`; scegliendo `Un amico` compare il campo **Nome dell'amico**;
3. **Comandante** — obbligatorio, selezione fra le carte leggendarie riconosciute o ricerca Scryfall; Partner aggiunge **Comandante 2**;
4. **Note di strategia** — facoltative, testo semplice;
5. riepilogo di spazio e stato «Le carte e i ritagli verranno salvati per l'uso offline».

Il comandante selezionato deve appartenere alla lista salvata:

- se è già presente in una copia, quella copia viene marcata come comandante ed esclusa dalla libreria pescabile;
- se arriva da ricerca e non è nella lista, l'app chiede **Aggiungi come comandante** prima di continuare;
- con Partner si applica la stessa regola a entrambi e si escludono entrambe le copie dalla libreria;
- R3 non certifica legalità, identità colore o validità della coppia Partner: segnala soltanto «Legalità non verificata dall'app».

Per una riga composta solo da quantità e nome, si usa la stampa predefinita restituita da Scryfall per quel nome. Se la riga include set e numero collezionista, questi vengono conservati e usati per scegliere stampa, arte e artista. Un nome localizzato viene accettato quando Scryfall restituisce una corrispondenza esatta; le ambiguità entrano nel passo Verifica invece di scegliere un'immagine arbitraria.

Il pronome visibile nella libreria resta `Mio`, non `Di me`. I nomi di amici sono dati locali e non implicano profili.

CTA primaria: **Salva e prepara offline**. Durante il caricamento resta nella stessa pagina con avanzamento testuale «Carte 42 di 94» e una linea determinata oro/teal. Non usare un overlay che nasconde i problemi.

### 5.5 Esiti del salvataggio

- **Completo:** check a tratto, «Mazzo disponibile offline», azioni **Apri il mazzo** e **Collega a un giocatore**.
- **Rete interrotta:** i metadati e il testo restano come bozza; «Preparazione offline incompleta», azione **Riprendi download**.
- **Spazio insufficiente:** non dichiarare il mazzo offline. Spiegare «Lo spazio del dispositivo non basta per tutti i ritagli» e offrire **Salva senza tutti i ritagli** oppure **Annulla**. Lista, categorie e note possono restare offline; le immagini mancanti usano la texture neutra.
- **Fonte non disponibile:** preservare la bozza e permettere il retry. Nessun dato inserito viene cancellato automaticamente.

## 6. Hero e navigazione del dettaglio

### 6.1 Hero del comandante

La pagina si apre con una fascia illustrata larga, non con una carta verticale:

- altezza 168 px su telefono, 220 px da tablet;
- `art_crop` a piena fascia, `cover`, fuoco 50% / 32%; Partner 50/50 come D-031;
- veli, maschere e aloni D-031; nessun nuovo trattamento del contrasto;
- in basso: nome del mazzo, comandante/i, proprietario e credito artista;
- in alto: **Torna ai mazzi** a sinistra e `⋮` **Azioni del mazzo** a destra.

Il nome del mazzo è il titolo dominante; il nome del comandante è secondario. Se manca un'immagine, resta la texture arcana locale, non un'illustrazione casuale: nel grimorio l'arte deve descrivere il mazzo, non decorarlo genericamente.

### 6.2 Azioni del mazzo

Il menu opaco contiene:

- Modifica dettagli;
- Modifica lista;
- Duplica mazzo;
- Prepara di nuovo offline, soltanto se incompleto;
- Elimina mazzo, separato da una hairline e in quiet-danger.

Non contiene contatori né azioni della partita.

## 7. Panoramica

### 7.1 Introduzione

La Panoramica apre con una riga quiet:

- `100 carte` o il totale effettivo riconosciuto;
- `Disponibile offline` / stato specifico;
- `Aggiornato [data locale]`.

Segue l'azione **Collega a un giocatore**. Se il mazzo è già collegato nella partita corrente, il testo diventa «Collegato a [nome giocatore]» con azione **Cambia giocatore**.

### 7.2 Categorie automatiche

Titolo **Categorie riconosciute** e nota:

> Calcolate dalle carte riconosciute. Una carta può comparire in più categorie.

Categorie, in ordine stabile:

1. Terre;
2. Accelerazione;
3. Pescata e selezione;
4. Interazione mirata;
5. Rimozioni globali;
6. Protezione;
7. Tutor;
8. Recupero dal cimitero;
9. Condizioni di vittoria;
10. Non classificate.

La UI è un elenco a due colonne da tablet e una colonna su telefono. Ogni riga usa icona a tratto monocromatica, nome e conteggio serif allineato a destra. Una sottile barra teal/oro può rappresentare il conteggio relativo al valore massimo **solo come aiuto di scansione**, senza percentuali, soglie “giuste” o semafori. L'informazione numerica resta sempre testuale.

Toccando una categoria si apre un disclosure inline con i nomi delle carte incluse; non cambia tab e non usa un grafico. `Non classificate` è neutra, non un errore.

Questa specifica rende normativa la tassonomia e il modo in cui viene presentata, non un particolare parser del testo delle carte. Il piano tecnico deve includere, prima dell'implementazione, una matrice deterministica `categoria → tipo/testo consultato`, la regola di esclusione e almeno cinque carte-fixture per categoria. Claude è autorizzato a proporre tali euristiche nel piano; il product owner le approva con il piano. Non sono ammesse categorie generate da un modello, valutazioni soggettive o risultati diversi a parità di dati Scryfall.

### 7.3 Strategia in breve

Se esistono note, la Panoramica mostra le prime quattro righe sotto **Piano di gioco**, con azione **Leggi e modifica** che porta a Strategia. Senza note, mostra «Nessuna nota di strategia» e **Aggiungi note**. Nessun testo è generato dall'app.

## 8. Lista

### 8.1 Lettura

La lista è un registro testuale raggruppato per tipo, in quest'ordine:

1. Comandante;
2. Creature;
3. Istantanei;
4. Stregonerie;
5. Artefatti;
6. Incantesimi;
7. Planeswalker;
8. Battaglie;
9. Terre;
10. Non riconosciute.

Ogni gruppo ha heading sticky soltanto quando il contenuto scorre dentro la pagina lunga; non esiste uno scroll annidato. La riga contiene quantità, nome e costo di mana testuale/simbolico se già disponibile. Nessun thumbnail, rarity color, prezzo o testo regole nella lista principale.

Una carta a doppia faccia mantiene un solo record con i nomi separati da `//`. Una riga può espandersi per mostrare tipo, artista e categorie attribuite; l'espansione usa testo e un ritaglio panoramico facoltativo, mai il frame completo.

### 8.2 Modifica lista

**Modifica lista** attiva una modalità esplicita:

- ogni riga mostra `−`, quantità e `+`, tutti da 44 px;
- **Aggiungi carta** apre la ricerca Scryfall a invio esplicito;
- **Incolla aggiornamento** permette di sostituire l'intera lista dopo un confronto testuale;
- barra azioni nel flusso: **Annulla modifiche** e **Salva modifiche**.

Nessuna eliminazione dipende dallo swipe. Portare una quantità a zero marca la riga come «Da rimuovere» finché non si salva. Se la riga è il comandante, il salvataggio resta bloccato finché non si sceglie un sostituto. Se è una Carta chiave, l'anteprima avvisa «Sarà rimossa anche da Carte chiave» e la conferma di salvataggio rimuove entrambi i riferimenti. Offline si possono cambiare quantità e note delle carte già note; cercare una nuova carta spiega che serve la rete.

Dopo il salvataggio, categorie e mano di prova si aggiornano insieme. Se mancano nuovi ritagli, lo stato offline diventa incompleto e propone **Completa download** senza bloccare la lettura.

**Incolla aggiornamento** conserva nome del mazzo, proprietario, note e Carte chiave; sostituisce soltanto la lista. Ripercorre sempre Verifica. Applica lo stesso invariant della modifica ordinaria: un comandante assente richiede una sostituzione prima del salvataggio; le Carte chiave assenti sono elencate nella conferma e rimosse insieme alla lista. Non esistono riferimenti obsoleti dopo il salvataggio.

## 9. Strategia

La vista è volutamente calma:

- heading **Note di strategia**;
- textarea di testo semplice, misura massima di lettura 65ch;
- helper «Scrivi il piano di gioco, le priorità e le sinergie da ricordare.»;
- salvataggio locale automatico con stato quiet `Salvato sul dispositivo`;
- azione esplicita **Fine modifica** su telefono per richiudere la tastiera e tornare alla lettura.

Il salvataggio automatico non produce toast a ogni battuta. Annuncia soltanto errore persistente o recupero di una bozza. Non ci sono formattazione ricca, AI, template obbligatori o note condivise.

### 9.1 Carte chiave

Sotto le note, **Carte chiave** permette al proprietario di scegliere da una a otto carte della lista. Non sono calcolate dall'app e non ricevono un punteggio. Ogni riga mostra ritaglio 56 × 56, nome e una breve nota facoltativa scritta dall'utente; l'ordine si modifica con controlli **Sposta prima / Sposta dopo**, non con il solo drag.

La sezione vuota dice «Nessuna carta chiave selezionata» e offre **Scegli dalla lista**. Durante una modifica non ancora salvata, una Carta chiave portata a quantità zero mostra «Sarà rimossa dal mazzo»; al salvataggio viene rimossa anche da questa sezione. Le Carte chiave sono un aiuto editoriale e non alterano categorie o mano di prova.

## 10. Mano di prova

### 10.1 Superficie

La mano usa **sette ritagli illustrati**, non sette riproduzioni di carta:

- elemento largo 112–136 px e alto 156–176 px su telefono, con finestra `art_crop` e fascia opaca inferiore per il nome;
- nessun bordo, mana cost, box regole, P/T o composizione che imiti il frame ufficiale;
- binario orizzontale con snap, 3,2 elementi visibili a 390 px per rendere evidente lo scorrimento;
- da 48rem, i sette elementi si dispongono in un ventaglio piatto o in una singola riga se entrano con nomi leggibili;
- quantità e lista reale determinano le copie; il comandante e l'eventuale Partner non entrano nel mazzo pescabile.

Ogni ritaglio è un pulsante **Dettagli di [nome carta]**. Apre un foglio compatto con nome, tipo, artista e categorie attribuite, più il solo `art_crop`; non mostra il frame o il testo completo della carta. Questo rende raggiungibile l'attribuzione dell'artista anche dalla Mano senza affollare i sette elementi.

In alto: **Mano iniziale · 7 carte** e una nota «Simulazione locale: nessuna carta intera viene mostrata». In basso: azioni **Tieni** e **Mulligan**.

### 10.2 London mulligan

Il flusso applica il London mulligan:

1. prima mano: sette carte;
2. **Mulligan** rimescola e presenta sette nuove carte;
3. dopo aver scelto **Tieni**, l'app chiede di selezionare un numero di carte pari ai mulligan effettuati;
4. le selezioni mostrano bordo oro, check e ordine `1`, `2`, …; il comando finale è **Metti N in fondo**;
5. lo stato conclusivo mostra la mano tenuta e **Nuova prova**, che azzera il conteggio mulligan.

Il flusso non valuta la mano, non consiglia se tenerla e non conserva una cronologia. Il settimo mulligan produce ancora sette carte ma richiede di metterle tutte in fondo: **Mulligan** viene quindi disabilitato e il testo spiega «Limite raggiunto: puoi tenere una mano da zero carte». Se il mazzo contiene meno carte pescabili del necessario, spiega il problema e disabilita l'avvio.

### 10.3 Arte mancante

Una carta senza ritaglio conserva nome e posizione usando la texture arcana neutra. Offline la mano resta utilizzabile: non si tenta una richiesta invisibile che ritardi la pescata.

## 11. Collegamento a un giocatore

### 11.1 Dal mazzo

**Collega a un giocatore** apre un side sheet dritto rispetto al viewport con la partita corrente:

- una riga per giocatore, in ordine 1 → 4;
- nome del giocatore, comandante attuale e stato `Nessun mazzo` / nome del mazzo collegato;
- selezione con bordo oro, check e testo `Selezionato`;
- CTA **Collega mazzo**.

Il collegamento imposta comandante, eventuale Partner e arte nel pannello. Non sovrascrive nome o punteggi.

### 11.2 Dai Dettagli del giocatore

La sezione **Comandante e mazzo** del side sheet R2 aggiunge **Mazzo collegato** sopra il selettore manuale del comandante. Il picker dei mazzi usa righe da almeno 64 px con ritaglio, nome, comandante e proprietario.

Il collegamento è persistente, ma la partita resta modificabile:

- cambiare manualmente il comandante nel pannello crea un override per quella partita;
- non modifica il mazzo salvato;
- il dettaglio mostra «Comandante modificato per questa partita» e l'azione **Riapplica dal mazzo**;
- modificare il mazzo in Libreria non cambia silenziosamente una partita in corso. Il nuovo dato viene proposto alla prossima nuova partita o tramite **Riapplica dal mazzo**.

Il collegamento appartiene al record del giocatore e sopravvive a ricarica, Azzera punteggi e Nuova partita finché quel giocatore resta presente. Rimuovere il giocatore rimuove il collegamento di quel posto; ridurre il numero di giocatori rimuove i collegamenti dei posti eliminati. Duplicare un mazzo non sposta alcun collegamento. Se un mazzo collegato viene eliminato, comandante e arte già applicati restano nella partita corrente, mentre il campo mostra «Mazzo non disponibile» e chiede di sceglierne un altro.

Scollegare il mazzo non rimuove automaticamente il comandante già applicato: compare una scelta esplicita fra **Mantieni comandante** e **Rimuovi comandante**.

## 12. Stati di sistema

### 12.1 Offline

- La libreria e i dettagli già preparati restano completi.
- L'import e la ricerca di nuove carte mostrano il requisito di connessione nel punto d'azione, non un banner globale rosso.
- Le righe con arte mancante usano texture locale e testo `Ritaglio non disponibile offline` nel dettaglio espanso.
- Lo stato `Disponibile offline` richiede lista, dati necessari e tutti i ritagli che la fonte dichiara disponibili. Se Scryfall non fornisce alcun `art_crop` per una carta, la texture locale è il fallback definitivo e conta come completo. Se il ritaglio esiste ma non è stato scaricato, lo stato resta `Offline senza tutti i ritagli` o `Preparazione incompleta`.

### 12.2 Caricamento e recupero

- La libreria locale non usa skeleton prolungati: mostra subito i metadati già salvati.
- I ritagli entrano con una dissolvenza da 140 ms dentro box già dimensionati.
- Un download ripreso continua dal conteggio disponibile e non duplica il mazzo.
- Una bozza recuperata viene annunciata una volta: «Bozza di importazione recuperata».

### 12.3 Errori e conferme

- Errori di riga: inline, vicini al testo originale.
- Errori di rete: avviso inline con retry.
- Eliminazione mazzo o sostituzione completa della lista: dialogo top-layer.
- Salvataggio riuscito: stato inline; niente snackbar da sei secondi sopra l'ultima riga.

## 13. Responsive

### 13.1 Telefono verticale — 320×568 e 390×844

- una colonna;
- barra R1 sticky;
- hero 168 px;
- tablist interno orizzontale scorrevole;
- lista continua senza scroll annidato;
- mano con 3,2 ritagli visibili;
- CTA di import nel flusso, mai fissa sopra la tastiera.

### 13.2 Telefono orizzontale — 640×400, 844×390 e 844×330

- hero compatto da 112–128 px con testo su una zona protetta;
- dettaglio a due colonne: navigazione/riassunto stretto e contenuto principale, solo se restano almeno 18rem alla colonna di lettura;
- import textarea e verifica possono stare affiancati, ma hanno un solo ordine DOM;
- nessun header interno sticky oltre la barra R1; si evita di consumare altezza;
- mano in un'unica riga scorrevole, nomi sempre visibili.

### 13.3 Tablet e desktop — 768×1024 e 1440×900

- libreria massimo 70rem; righe a colonne;
- dettaglio massimo 76rem;
- Panoramica può usare due colonne: categorie a sinistra, strategia/stato a destra;
- Lista mantiene 65–72ch per i nomi e non si espande per riempire tutto lo schermo;
- mano mostra sette ritagli senza sovrapposizioni che nascondano i nomi.

Non si introduce una master-detail permanente: Indietro deve continuare a riportare chiaramente alla Libreria anche su desktop.

## 14. Motion

| Evento | Durata | Proprietà |
| --- | ---: | --- |
| Cambio tab interno | 140 ms | crossfade + assestamento massimo 2 px |
| Comparsa ritaglio scaricato | 140 ms | sola opacità |
| Apertura riga/categoria | 140 ms | opacità; geometria immediata |
| Passo import | 180 ms | opacità + translateX massimo 6 px nella direzione di avanzamento |
| Mano iniziale | 160 ms | opacità + translateY 6 px; stagger 20 ms, totale ≤ 280 ms |
| Mulligan, uscita | 120 ms | opacità |
| Mulligan, nuova mano | 160 ms | stessa entrata della mano iniziale |
| Selezione carta da mettere in fondo | 140 ms | bordo/check; nessuna scala |
| Side sheet collegamento | D-024 | 220 ms ingresso / 140 ms uscita |

La mano non usa flip 3D, rimbalzi, carte lanciate, particelle o suoni. Il leggero stagger serve a rendere leggibile il nuovo insieme, non a simulare un'animazione da casinò. Con `prefers-reduced-motion: reduce` tutti i passaggi sono immediati e la nuova mano appare completa.

## 15. Accessibilità e focus

- La vista nuova riceve focus sul proprio `h1` solo dopo navigazione da tastiera o assistiva.
- Il tablist del dettaglio ha nome `Sezioni del mazzo`; il pannello attivo è associato con `aria-labelledby`.
- Lo stato dell'import usa una sola regione `polite`: avanzamento assestato, errore o completamento; non annuncia ogni carta scaricata.
- I risultati Scryfall hanno nome completo e artista; le immagini sono decorative quando il testo già identifica la carta.
- La mano è una lista ordinata di sette elementi. Ogni elemento annuncia posizione e nome, per esempio «Carta 3 di 7, Sol Ring».
- Durante la selezione del mulligan, `aria-pressed` e testo nascosto espongono l'ordine di selezione.
- Il side sheet di collegamento trattiene il focus e lo restituisce al trigger che lo ha aperto.
- Stato offline, errore, proprietario e selezione non dipendono mai dal colore.
- Contrasto: 4,5:1 per testo normale, 3:1 per testo grande, icone e bordi significativi.

## 16. Misure e responsabilità di componente

Riutilizzare primitive e token semantici esistenti. Questi valori sono normativi; i nomi degli alias possono essere adattati dal piano tecnico alla struttura esistente:

- `--deck-row-min-height: 88px`;
- `--deck-hero-height: 168px` e variante larga `220px`;
- `--deck-art-size: 64px`;
- `--hand-crop-width: clamp(7rem, 31vw, 8.5rem)`;
- `--duration-deck-step: 180ms`;
- `--duration-hand-deal: 160ms`;
- `--duration-hand-out: 120ms`.

Responsabilità da mantenere separate, senza imporre i nomi dei componenti React:

- riga della libreria;
- avanzamento e verifica dell'import;
- hero e navigazione interna;
- registro categorie e lista;
- editor Strategia / Carte chiave;
- mano di prova;
- selettore giocatore o mazzo;
- stato offline.

Non creare nuovi colori per categoria, rarità, proprietario o stato offline. Le categorie condividono la famiglia di icone a tratto e i materiali canonici.

## 17. Inventario schermata per schermata

1. Libreria con più mazzi, propri e di amici.
2. Libreria vuota.
3. Ricerca locale con nessun risultato.
4. Import passo 1, testo incollato.
5. Import offline prima dell'analisi.
6. Import passo 2, riconoscimento completo.
7. Import passo 2, righe ambigue/non riconosciute.
8. Import passo 3, comandante singolo.
9. Import passo 3, Partner e mazzo di un amico.
10. Download offline in corso.
11. Salvataggio completo.
12. Rete interrotta e ripresa.
13. Spazio insufficiente.
14. Dettaglio, hero con comandante singolo.
15. Dettaglio, hero Partner.
16. Panoramica con categorie e strategia.
17. Lista raggruppata.
18. Modifica lista.
19. Strategia vuota e compilata.
20. Carte chiave vuote e selezionate.
21. Mano iniziale da sette.
22. Nuova mano dopo mulligan.
23. Selezione delle carte da mettere in fondo.
24. Carta senza ritaglio offline.
25. Selettore giocatore dal mazzo.
26. Selettore mazzo dai Dettagli del giocatore.
27. Override del comandante nella partita.
28. Conferma eliminazione mazzo.

La tavola mostra le composizioni normative principali. Questa specifica resta la fonte per gli stati non rappresentati in scala.

## 18. Conflitti e deroghe rispetto al sistema approvato

### C1 — Arte presente ma non dominante ovunque

Il mockup iniziale usa molte immagini. R3 le limita a hero, thumbnail identificativi e mano di prova. È una scelta intenzionale: una galleria di cento ritagli ridurrebbe densità, velocità offline e riconoscibilità della lista, oltre ad avvicinarsi troppo a una collezione di proxy.

### C2 — Mano di prova e D-025

I ritagli della mano hanno proporzione propria, nome e nessun elemento del frame. La combinazione non deve ricostruire una carta. Il credito completo resta nel foglio **Dettagli di [carta]** raggiungibile da ogni ritaglio e nelle informazioni Scryfall; non viene duplicato su ogni piccolo elemento. Con Partner, l'hero presenta entrambi i crediti nello stesso blocco.

### C3 — Colore delle categorie

Il mockup suggerisce categorie colorate. Il sistema approvato riserva il colore a stato e gerarchia. R3 usa icone monocromatiche, conteggi e barre sottili condivise; nessuna palette arcobaleno.

### C4 — Aggiornamento del mazzo collegato

La promessa “mazzo collegato ma pannello modificabile” entra in conflitto con un aggiornamento live silenzioso. R3 sceglie un override esplicito per la partita e una riapplicazione manuale: nessun punteggio o comandante cambia mentre si gioca senza un'azione dell'utente.

### C5 — Stato offline granulare

“Disponibile offline” non può essere un unico badge ottimistico. R3 distingue completo, senza tutti i ritagli e incompleto; è più verboso ma impedisce una promessa falsa quando rete o spazio si interrompono.

Non emergono altri conflitti con palette, tipografia, geometrie R1/R2, trattamento dell'arte o motion language.

## 19. Decisioni di design da approvare

Il product owner approva R3 se conferma:

1. libreria come registro continuo, non card grid;
2. import in tre passi su pagina: Lista → Verifica → Dettagli;
3. possibilità di salvare con righe non riconosciute, escluse da categorie e mano;
4. Sideboard/Maybeboard visibili in Verifica ma esclusi dal mazzo salvato;
5. comandante obbligatoriamente presente nella lista ed escluso dalla libreria pescabile;
6. quattro tab interni: Panoramica, Lista, Strategia, Mano, con Carte chiave dentro Strategia;
7. dieci categorie descrittive, senza score, target o percentuali; euristiche deterministiche proposte nel piano tecnico;
8. lista testuale senza thumbnail permanenti;
9. London mulligan completo, limitato a sette, con selezione delle carte da mettere in fondo;
10. collegamento persistente nel record del giocatore con override esplicito per la partita;
11. nessun aggiornamento silenzioso della partita quando il mazzo viene modificato;
12. stampa Scryfall predefinita per il solo nome; set/numero rispettati quando presenti;
13. tre stati offline distinti: completo, senza tutti i ritagli, incompleto;
14. proprietario locale `Mio` / `Di [nome]`, senza profili;
15. motion della mano contenuta entro 280 ms e immediata con reduced motion.

Solo dopo questa approvazione si prepara il piano tecnico R3.
