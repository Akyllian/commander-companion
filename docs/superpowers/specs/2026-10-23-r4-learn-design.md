# Commander Companion — R4 Impara

**Stato:** proposta completa per approvazione del product owner  
**Ruolo:** art direction, interaction design, motion e struttura editoriale  
**Dipende da:** D-021, D-024, D-025, D-037, D-038 e D-040  
**Tavola:** [`../../art-direction/r4-learn-board.svg`](../../art-direction/r4-learn-board.svg)  
**Corpus editoriale:** [`2026-10-23-r4-learn-content.md`](2026-10-23-r4-learn-content.md)

## 1. Intento

R4 trasforma il placeholder **Impara** in un manuale italiano, offline e interattivo per due momenti diversi:

1. chi sta iniziando deve capire come arrivare dalla mano iniziale a un turno giocato correttamente;
2. chi gioca già deve poter chiarire rapidamente un'interazione senza attraversare un regolamento completo.

La sezione non deve sembrare una wiki, una piattaforma di e-learning o una raccolta di card promozionali. È un **manuale editoriale navigabile**: indice continuo, pagine di lettura calme, diagrammi a tratto e scenari brevi. Non usa punteggi, badge di completamento, streak, classifiche o percentuali di progresso.

Il riferimento rapido D-021 confluisce nella sezione come pagina permanente. Il ponte R1 e il relativo side sheet spariscono: non si mantengono due copie concorrenti delle stesse regole.

### Obiettivi R4

- offrire quattro percorsi chiari: **Le basi**, **Meccaniche**, **Interazioni**, **Al tavolo**;
- rendere il contenuto ricercabile interamente sul dispositivo;
- integrare il riferimento rapido Commander con soglie e numeri di regola;
- spiegare concetti complessi con esempi generici e diagrammi, senza carte intere o illustrazioni;
- proporre scenari con risposta, esito e spiegazione, senza gamificazione;
- mantenere tutti i testi disponibili offline e versionati con la build;
- conservare un percorso breve per tornare all'indice e usare Indietro/Avanti del browser.

### Fuori ambito R4

- regolamento completo, ricerca sul testo ufficiale o sostituzione delle Comprehensive Rules;
- database di keyword di ogni espansione, meccaniche specifiche dei set o aggiornamenti via rete;
- quiz a punti, profili, avanzamento sincronizzato, certificati o onboarding obbligatorio;
- consigli automatici, AI, tutor conversazionale o valutazione del livello del giocatore;
- immagini di carte, illustrazioni Wizards, video, audio o animazioni dimostrative complesse;
- deck building: la sezione Mazzi resta il luogo per liste, mano di prova e strategia personale.

## 2. Direzione visiva

### 2.1 Scena e registro

Una persona consulta un tomo aperto sul tavolo da gioco, in luce bassa, mentre il gruppo aspetta una spiegazione breve e affidabile. Il tema resta scuro perché il manuale appartiene allo stesso strumento da tavolo; la lettura, però, è più ariosa della Partita.

- strategia colore: **restrained**, inchiostro e avorio con oro per struttura e teal per orientamento;
- titoli: Cormorant Garamond; testo lungo e controlli: system UI;
- superfici: opache, senza vetro, pergamena o texture cartacea;
- decorazione: costellazioni e linee arcane a bassissimo contrasto, mai dietro il corpo del testo;
- icone: soltanto monolineari e monocromatiche;
- nessuna illustrazione. E32 prevale sulle vecchie strisce sceniche rimandate: in R4 quelle strisce sono **annullate**, non ancora aperte.

### 2.2 Diagrammi ammessi

I diagrammi sono informazione, non illustrazione:

- zone rappresentate da rettangoli e nomi;
- pila rappresentata da fogli sovrapposti numerati;
- turno rappresentato da una linea di sei tappe;
- combattimento rappresentato da creature schematiche, frecce e valori;
- mana e contatori usano i simboli locali già approvati.

Ogni diagramma ha un equivalente testuale adiacente. Nessun significato dipende dal colore o dalla direzione di una freccia soltanto.

## 3. Architettura e indirizzi

La sezione usa pagine reali nell'hash, così Indietro e Avanti funzionano come nella Libreria Mazzi:

- `#impara` — indice;
- `#impara/basi`, `#impara/meccaniche`, `#impara/interazioni`, `#impara/tavolo` — percorso filtrato;
- `#impara/<percorso>/<lezione>` — pagina di una lezione;
- `#impara/riferimento` — riferimento rapido Commander;
- `#impara/glossario` — glossario alfabetico.

La ricerca è stato locale dell'indice, non una route: chi chiude la ricerca torna esattamente all'indice. Aprire un risultato usa `pushState`; cambiare un filtro di percorso usa `replaceState`. Quattro cambi di filtro e un solo Indietro devono riportare alla sezione precedente dell'app, non attraversare quattro copie dell'indice.

Le quattro etichette definitive sostituiscono la bozza D-037:

1. **Le basi** — dal tavolo vuoto al primo turno completo;
2. **Meccaniche** — regole e oggetti che fanno funzionare il gioco;
3. **Interazioni** — cosa succede quando più effetti si incontrano;
4. **Al tavolo** — abitudini, comunicazione e decisioni per una partita Commander chiara.

`Al tavolo` sostituisce `Consigli`: è più concreto, meno paternalistico e include sia principianti sia giocatori esperti.

## 4. Indice Impara

### 4.1 Testata

Sotto la barra R1 persistente:

- `h1` serif **Impara**;
- sottotitolo «Dalle prime fasi del turno alle interazioni più sottili, con esempi da provare.»;
- simbolo grande del libro aperto, a tratto, attraversato da una singola verticale oro/teal;
- campo **Cerca in Impara**.

Il simbolo non occupa una hero separata. Titolo, testo e ricerca devono essere visibili entro il primo schermo a 320×568.

La ricerca compare sempre: con più di venti lezioni è uno strumento primario, non un lusso da desktop. Il campo usa i token `--field-*` approvati in R3.

### 4.2 Riferimento rapido

Subito dopo la ricerca appare una riga distinta ma non promozionale:

- icona libro;
- titolo **Riferimento rapido Commander**;
- testo «40 vita, veleno, danni Commander, Partner e tassa.»;
- chevron;
- stato quiet «Aggiornato al [data delle regole]».

La riga apre `#impara/riferimento`. Non è una card illustrata, non usa ombre proprie e non porta un badge «Nuovo».

### 4.3 Quattro percorsi

I percorsi formano un indice continuo, non una griglia di quattro card identiche. Ogni gruppo contiene:

- numero editoriale `I`–`IV`, attenuato;
- nome e introduzione di una riga;
- da cinque a sette lezioni;
- per ogni lezione: icona a tratto, titolo, sommario di massimo due righe, indicazione `Lettura · N min` oppure `Scenario · N min`;
- una hairline oro fra le lezioni.

Le durate sono orientative e arrotondate; non vengono memorizzate né trasformate in obiettivi. Le lezioni che contengono uno scenario mostrano `Include scenario`, come testo e non come colore.

Da tablet l'indice può usare due colonne **asimmetriche** per i gruppi, ma le lezioni restano registri verticali. A 320–390 px tutto è una colonna.

## 5. Ricerca locale

La ricerca interroga titolo, sommario, corpo, parole chiave, glossario e numeri di regola già inclusi nella build.

### 5.1 Comportamento

- parte dopo almeno due caratteri;
- è insensibile ad accenti e maiuscole;
- non effettua richieste di rete;
- restituisce al massimo venti risultati, ordinati per titolo esatto, parola chiave, poi corpo;
- evidenzia la corrispondenza con peso e sottolineatura, non con un colore isolato;
- ogni risultato mostra percorso, titolo e un estratto breve;
- il comando **Cancella ricerca** misura 44 px e riporta all'indice completo.

Non serve fuzzy search: errori di battitura non devono produrre risultati arbitrari. Sinonimi editoriali espliciti collegano termini comuni: `hexproof → anti-malocchio`, `board wipe → rimozione globale`, `commander tax → tassa del comandante`.

### 5.2 Stati

- caricamento: non esiste, perché l'indice è statico;
- nessun risultato: «Nessuna voce per “[termine]”. Prova un nome di fase, una zona o una parola della carta.»;
- termine troppo corto: nessun messaggio d'errore e indice ancora visibile;
- offline: nessuna variazione, tutta la ricerca continua a funzionare.

## 6. Pagina di lezione

### 6.1 Struttura

La pagina usa una sola colonna di lettura da **62–68ch**. Da 64rem compare una colonna laterale di 15–17rem con il percorso e le lezioni; la colonna laterale non è una card e rimane sticky soltanto se l'altezza del viewport lo permette.

Ordine del documento:

1. **Torna a Impara**;
2. percorso e numero della lezione;
3. `h1` serif;
4. sommario iniziale in due o tre frasi;
5. blocco **In breve** con due–quattro punti;
6. sezioni del corpo con `h2`;
7. diagramma, soltanto quando chiarisce una sequenza;
8. eventuale scenario;
9. **Da ricordare al tavolo**;
10. riferimenti ufficiali e data di verifica;
11. navigazione **Lezione precedente / successiva**.

`In breve` usa una hairline e spazio, non una card colorata. I riferimenti sono testo selezionabile e non tooltip.

### 6.2 Tipografia

- titolo lezione: `clamp(2rem, 7vw, 3.25rem)`, line-height 0,98;
- sommario: 1rem/1,55, massimo 58ch;
- corpo: 0,95–1rem/1,65;
- `h2`: Cormorant Garamond 1,55rem/1,15;
- riferimenti e metadati: 0,75rem/1,5, contrasto almeno 4,5:1;
- nessun paragrafo supera 75ch e nessun all-caps viene usato come intestazione ricorrente.

### 6.3 Link concettuali

La prima occorrenza di un termine del glossario può aprire una definizione inline con `<details>` o collegare al glossario. Non si mostrano tooltip al passaggio del mouse: il contenuto deve essere raggiungibile a tocco e tastiera.

I rimandi ad altre lezioni sono espliciti, per esempio «Continua con Priorità e pila», mai affidati a un'icona soltanto.

## 7. Riferimento rapido Commander

Il contenuto R1–R7 di D-021 viene riusato come pagina, non duplicato. Mantiene:

- introduzione;
- gruppi Soglie della partita, Danni Commander e Zona di comando;
- numerazione R1–R7;
- riferimenti ufficiali;
- token testuale `{2}`;
- data effettiva e disclaimer.

Cambiamenti di contenitore:

- nessun dialogo e nessun pulsante Chiudi;
- `h1` **Riferimento rapido Commander** e link **Torna a Impara**;
- massimo 65ch;
- un indice di tre anchor testuali all'inizio, utile anche agli screen reader;
- il precedente pulsante ponte e `RulesDialog` vengono rimossi quando nessun altro consumatore li usa.

Il riferimento resta volutamente corto. Gli approfondimenti rimandano alle lezioni R4; le lezioni non copiano i sette testi parola per parola.

## 8. Scenari interattivi

### 8.1 Forma

Uno scenario è inserito dentro una lezione dopo che il concetto è stato spiegato. Non esiste una modalità quiz separata.

Contiene:

1. titolo **Prova tu**;
2. situazione in massimo 90 parole;
3. eventuale diagramma schematico;
4. radiogroup di due–quattro risposte, ciascuna alta almeno 52 px;
5. pulsante **Verifica risposta**;
6. esito testuale `Esatto` oppure `Non ancora`, mai soltanto verde/rosso;
7. spiegazione e riferimento;
8. azione **Riprova** oppure link alla lezione collegata.

La scelta non produce punti e non viene salvata fra sessioni. Cambiare risposta prima della verifica non mostra anticipazioni. Dopo la verifica, il focus si sposta sul titolo dell'esito; una regione `polite` annuncia una sola frase assestata.

### 8.2 Cosa può essere valutato

Gli scenari hanno una risposta corretta soltanto per regole verificabili. I consigli strategici o sociali usano invece **Confronta le opzioni**: ogni scelta mostra conseguenze e domande utili, senza etichettare una strategia come universalmente corretta.

Non si usano nomi, testi o immagini di carte reali. Gli oggetti sono generici: «una creatura 3/3», «una magia che distrugge», «un'abilità innescata».

### 8.3 Scenari normativi

Il corpus allegato definisce dodici scenari iniziali:

- fasi e lancio di un istantaneo;
- dichiarazione di attaccanti e bloccanti;
- danni Commander separati;
- tassa con Partner;
- ordine della pila;
- bersaglio diventato illegale;
- indistruttibile e riduzione di costituzione;
- egida e pagamento del costo;
- protezione da una rimozione globale;
- abilità innescate simultanee;
- mulligan e comunicazione della mano tenuta;
- accordo al tavolo e informazioni verificabili.

Claude deve verificare risposta, spiegazione e riferimenti prima di trasformare uno scenario in dati applicativi.

## 9. Glossario

Il glossario è una pagina A–Z con termini brevi, non un quinto percorso. Ogni voce contiene:

- termine italiano;
- eventuale termine inglese comune fra parentesi;
- definizione di una–tre frasi;
- link a una lezione pertinente.

Un indice alfabetico sticky non è necessario; un campo **Filtra il glossario** riusa la ricerca locale. Le lettere senza termini non compaiono. Il corpus iniziale comprende almeno: abilità attivata, abilità innescata, anti-malocchio, bersaglio, costo, danno, egida, esiliare, indistruttibile, mana, permanente, pila, priorità, sacrificare, segnalino, stato, pedina, turno e zona di comando.

## 10. Contenuto e responsabilità

Il corpus allegato è la fonte editoriale di ChatGPT per titoli, sommari, homepage, lezioni, scenari e glossario. Prima dell'implementazione Claude deve:

1. confrontare ogni affermazione normativa con le Comprehensive Rules e la pagina ufficiale Commander correnti;
2. registrare la data effettiva delle fonti;
3. proporre correzioni puntuali senza riscrivere la voce editoriale;
4. garantire che soglie già presenti nell'app arrivino dalle costanti del dominio;
5. aggiungere un test che impedisca lezioni o scenari senza riferimenti quando contengono regole verificabili.

Questa verifica è il primo task del piano tecnico, dopo l'approvazione del product owner e prima dei componenti. Claude può correggere direttamente numeri di regola, data effettiva, terminologia ufficiale e imprecisioni fattuali, registrando ogni modifica. Se la correzione cambia la risposta di uno scenario, il significato della copy, l'architettura o lo scope, si ferma e la rimanda a ChatGPT e product owner prima del codice. Il builder non completa liberamente parti editoriali mancanti: il manifest e i blocchi `In breve` del corpus sono normativi.

Fonti ufficiali di partenza:

- [Magic: The Gathering Comprehensive Rules](https://magic.wizards.com/en/rules);
- [Commander — pagina ufficiale del formato](https://magic.wizards.com/en/formats/commander).

Il manuale riassume con parole proprie e non incorpora lunghi brani ufficiali. Il Fan Content Notice D-025 compare nel footer globale e in fondo al riferimento rapido; non viene ripetuto dopo ogni lezione.

## 11. Stati di sistema

### 11.1 Disponibilità offline

- indice, ricerca, lezioni, scenari, glossario e riferimento fanno parte della build;
- nessuno stato richiede rete, IndexedDB o skeleton;
- un aggiornamento dell'app sostituisce il corpus come qualunque asset PWA;
- se una versione nuova è pronta, si usa l'avviso globale già esistente: Impara non crea un secondo banner.

### 11.2 Contenuto non trovato

Una route di lezione inesistente mostra:

- heading **Questa pagina non è nel manuale**;
- testo «Il collegamento potrebbe appartenere a una versione precedente.»;
- azioni **Torna a Impara** e **Cerca nel manuale**.

Non si redirige silenziosamente all'indice.

## 12. Responsive

### 12.1 Telefono verticale — 320×568 e 390×844

- una colonna;
- barra R1 sticky;
- testata compatta senza hero illustrata;
- ricerca a tutta larghezza;
- percorsi uno sotto l'altro;
- pagina lezione senza sidebar;
- precedente/successiva impilati;
- diagrammi scorrono orizzontalmente soltanto se non possono rifluire, con descrizione testuale prima del grafico.

### 12.2 Telefono orizzontale — 640×400, 844×390 e 844×330

- testata ridotta a titolo, sottotitolo breve e ricerca;
- indice in due colonne solo se ogni colonna conserva almeno 17rem;
- corpo lezione a una colonna, massimo 68ch;
- nessuna sidebar sticky e nessun header interno sticky;
- scenario e spiegazione restano nello stesso scroll della pagina;
- nessuno scroll annidato verticale.

### 12.3 Tablet e desktop — 768×1024 e 1440×900

- indice massimo 76rem;
- gruppi in due colonne asimmetriche;
- lezione massimo 78rem con sidebar 15–17rem e lettura 62–68ch;
- il testo non si allarga per riempire il desktop;
- il riferimento rapido resta una sola colonna leggibile.

## 13. Motion

| Evento | Durata | Proprietà |
| --- | ---: | --- |
| Apertura lezione dall'indice | 180 ms | opacità + translateX massimo 6 px |
| Indietro verso l'indice | 140 ms | sola opacità |
| Cambio filtro percorso | 140 ms | crossfade locale, geometria immediata |
| Risultati ricerca | 140 ms | sola opacità, nessuno stagger |
| Disclosure glossario/approfondimento | 140 ms | opacità + assestamento 2 px |
| Verifica scenario | 140 ms | bordo + opacità dell'esito |
| Riprova scenario | 0–140 ms | reset immediato; breve crossfade opzionale |

Non animare diagrammi, frecce, mana o pila. Niente pagine sfogliate in 3D, glow che percorre il testo, particelle, coriandoli o suoni. Con `prefers-reduced-motion: reduce` navigazione, ricerca e scenari cambiano istantaneamente senza ritardare focus o annunci.

## 14. Accessibilità

- `nav` principale R1 invariata; la navigazione del manuale usa un secondo `nav` con nome **Percorsi di Impara**;
- ogni pagina ha un solo `h1` e gerarchia di heading senza salti;
- dopo una navigazione interna il focus va all'`h1`, ma non durante un semplice cambio filtro;
- le durate di lettura non sono l'unico modo per distinguere una lezione da uno scenario;
- la ricerca ha label visibile e risultati annunciati una volta;
- scenari: `fieldset`/`legend`, radio native o equivalenti completi, esito focalizzabile e non affidato al colore;
- diagrammi: `aria-describedby` oppure alternativa testuale; SVG decorativi `aria-hidden`;
- target almeno 44 × 44 px, righe di lezione almeno 64 px;
- 4,5:1 testo normale, 3:1 testo grande, icone e bordi significativi;
- reflow al 200% senza perdita, sovrapposizione o due scroll verticali;
- il contenuto resta comprensibile con CSS o motion disattivati.

## 15. Misure e token

Riutilizzare i token R1–R3; nuovi alias ammessi:

- `--learn-reading-width: 68ch`;
- `--learn-index-width: 76rem`;
- `--learn-rail-width: 16rem`;
- `--learn-row-min-height: 64px`;
- `--learn-diagram-stroke: 1.5px`;
- `--duration-learn-page: 180ms`.

Non creare colori per percorso o difficoltà. Oro indica struttura/selezione; teal orientamento/informazione; rosso solo errore reale. Nessuna difficoltà `facile/media/difficile`: il titolo e il sommario spiegano il contenuto senza giudicare il lettore.

## 16. Inventario schermata per schermata

1. Indice Impara al primo ingresso.
2. Indice filtrato su ciascuno dei quattro percorsi.
3. Ricerca con risultati misti.
4. Ricerca senza risultati.
5. Lezione testuale breve.
6. Lezione con diagramma delle fasi.
7. Lezione con diagramma della pila.
8. Lezione con scenario non ancora risposto.
9. Scenario corretto.
10. Scenario errato e Riprova.
11. Scenario strategico «Confronta le opzioni».
12. Riferimento rapido, primo e ultimo gruppo.
13. Glossario completo e filtrato.
14. Route di lezione non trovata.
15. Indice a 320×568.
16. Lezione a 844×330.
17. Lezione desktop con sidebar.
18. Tutti gli stati con reduced motion e zoom 200%.

La tavola mostra indice, lezione, scenario, riferimento e desktop. Questa specifica resta la fonte normativa per gli altri stati.

## 17. Conflitti e decisioni rispetto al sistema approvato

### C1 — Nessuna illustrazione contro le strisce sceniche rimandate

D-024 aveva rimandato strisce illustrate originali nelle Regole; D-037/E32 decide poi **nessuna illustrazione** per Impara. R4 chiude il conflitto in favore di E32. Restano linee arcane e diagrammi funzionali, non scene.

### C2 — Il riferimento non è più un overlay

D-021 nasceva per una consultazione durante la partita; D-037 lo assorbe in Impara e rimuove il pulsante Regole. R4 privilegia una pagina indirizzabile e ricercabile. La partita non cambia, perché il rombo permette di mostrare le sezioni e raggiungere Impara; tornando a Partita i pannelli restano invariati.

### C3 — Ricerca aggiunta

Il vecchio riferimento di sette voci non richiedeva ricerca. Un manuale con più di venti lezioni e un glossario sì. La ricerca è interamente locale, non introduce rete né un motore esterno.

### C4 — Niente progresso

Non viene aggiunto uno stato `completato`. Il progetto è per un gruppo locale, senza account; una percentuale suggerirebbe un corso lineare che il contenuto non è. Indietro, ricerca e percorsi sono sufficienti per ritrovare una pagina.

### C5 — Contenuto ampio, superficie calma

L'ampiezza richiesta non giustifica card grid, dashboard o tre sidebar. L'indice usa registri e la lettura resta a 68ch. Il contenuto cresce nei dati, non nella densità simultanea dello schermo.

## 18. Decisioni di design da approvare

Il product owner approva R4 se conferma:

1. quattro percorsi definitivi: Le basi, Meccaniche, Interazioni, Al tavolo;
2. indice editoriale continuo, non griglia di card;
3. ricerca locale sempre visibile;
4. lezioni indirizzabili con Indietro/Avanti del browser;
5. riferimento rapido D-021 trasformato in pagina e rimozione del ponte/side sheet;
6. glossario come pagina trasversale, non quinto percorso;
7. scenari dentro le lezioni, senza punteggi, streak o progresso salvato;
8. risposta corretta solo per regole verificabili; consigli strategici come confronto di conseguenze;
9. nessun nome, testo o immagine di carte reali negli scenari;
10. nessuna illustrazione e cancellazione delle vecchie strisce sceniche;
11. diagrammi statici a tratto con alternativa testuale;
12. corpus statico nella build e completamente offline;
13. verifica normativa di Claude prima dell'implementazione;
14. motion limitata a navigazione e feedback, massimo 180 ms e istantanea con reduced motion;
15. nessun tracciamento del progresso personale.

L'approvazione copre insieme questa specifica, il corpus editoriale e la tavola. Correzioni normative puntuali secondo il §10 non riaprono l'approvazione; cambiamenti di significato sì.

Solo dopo questa approvazione Claude prepara il piano tecnico R4.
