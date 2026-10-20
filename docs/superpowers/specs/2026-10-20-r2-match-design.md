# Commander Companion — R2 Partita

**Stato:** proposta completa per approvazione del product owner  
**Ruolo:** art direction, interaction design e motion  
**Dipende da:** D-031, D-034, D-036, D-037 e D-038  
**Tavola:** `docs/art-direction/r2-match-board.svg`

## 1. Intento

R2 porta la schermata Partita vicino al mockup iniziale senza imitazioni al pixel: l'arte occupa la carta, la vita resta il gesto dominante e le funzioni frequenti sono raggiungibili senza aprire un foglio esterno. La carta non diventa una dashboard: quando è chiusa mostra soltanto identità, vita e tre ingressi chiari — Dettagli, Contatori e Danni Commander.

La direzione visiva resta quella approvata: dark fantasy composta, fondo inchiostro e verde petrolio, oro antico, tipografia editoriale avorio, illustrazioni cinematografiche e sole icone a tratto. Sono esclusi vetro, neon, colori semantici per i contatori, emoji, carte trapezoidali e decorazioni da interfaccia fantasy prive di funzione.

## 2. Regole trasversali

1. Vita, nome e azioni rispettano le soglie di contrasto D-031. L'arte usa gli stessi veli, maschere radiali e aloni già approvati.
2. Ogni area interattiva misura almeno 44 × 44 px, compresi i −/+ nei pannelli compatti e ruotati.
3. Tutte le icone sono monolineari e monocromatiche. Selezione e stato si distinguono anche tramite forma, riempimento, bordo, testo o segno di spunta; mai con il solo colore.
4. Le superfici transitorie non cambiano dimensione o posizione delle carte. Si sovrappongono all'interno della carta o nello strato del rombo.
5. È aperta una sola superficie transitoria per volta nell'app: menu del rombo, strumento, Contatori o Danni Commander. Aprirne una chiude quella precedente. Lo stato visivo è una sola unione: `chiuso | hub | strumento(tipo) | contatori(giocatore) | commander(giocatore)`.
6. `Escape` chiude la superficie attiva. Quando la superficie viene sostituita da un'altra non si tenta di rifocalizzare un controllo appena smontato: vale il passaggio di focus descritto nei paragrafi specifici.
7. Con `prefers-reduced-motion` ogni passaggio è immediato; restano soltanto i cambi di stato necessari alla comprensione.

## 3. Anatomia della carta giocatore chiusa

### 3.1 Intestazione

- In alto a sinistra: pulsante Monarca da 44 px, con corona a tratto. Il possessore usa corona piena e la dicitura accessibile «Rilascia Monarca»; gli altri «Prendi Monarca». Il passaggio trasferisce il ruolo in una sola azione.
- Al centro: nome del giocatore in maiuscoletto serif. Non si modifica direttamente sulla carta.
- Subito sotto: nome del comandante. Con Partner si mostrano due righe corte oppure «Nome A + Nome B» quando lo spazio lo richiede. Senza comandante compare l'italiano «Comandante non scelto»; il nome dell'illustrazione casuale non viene mai presentato come comandante.
- In alto a destra: pulsante `⋮` da 44 px, etichetta accessibile «Apri dettagli di [nome]».

### 3.2 Vita

La zona centrale contiene soltanto:

- `−` da 44 px;
- il totale vita, elemento più grande della carta;
- `+` da 44 px.

Ogni tocco vale uno. Il delta cumulativo D-036 resta accanto alla vita. Non si reintroducono ±5 né una riga permanente di altri punteggi.

### 3.3 Piede

- `Contatori`: controllo separato, rettangolare, icona a tratto più etichetta. Nella densità compatta può restare la sola icona, con nome accessibile completo.
- Danni Commander: pulsante a rombo nell'angolo inferiore. Usa un simbolo a tratto di due spade/uno scudo, non mostra mai «0» e non tenta di riassumere più sorgenti con un solo numero.
- Le due azioni hanno gerarchia equivalente ma forme diverse: il rettangolo indica una collezione; il rombo richiama la relazione fra comandanti.

Il credito dell'artista compare sulla carta standard se non collide con i controlli; nelle carte compatte rimane in Dettagli, come già approvato.

## 4. Schermate della carta

### 4.1 Carta con comandante

L'`art_crop` del comandante riempie la carta con `cover` e fuoco 50% / 32%. Con Partner, le due opere sono divise 50/50 dalla hairline diagonale approvata. Il nome o i nomi sotto il giocatore descrivono esattamente le opere mostrate.

### 4.2 Carta senza comandante

La carta usa un'illustrazione Wizards/Scryfall casuale, diversa per quanto possibile dalle altre della stessa partita. La riga identitaria resta «Comandante non scelto». Il credito recita solo «Illustrazione di …»; il nome della carta sorgente può apparire in Dettagli sotto «Arte casuale».

Ordine di fallback offline:

1. arte casuale già assegnata a quel posto e presente in cache;
2. un'altra arte casuale in cache non ancora usata, se disponibile;
3. texture arcana neutra locale.

La rete non blocca mai la partita. Durante il caricamento resta la texture neutra; l'arte entra con dissolvenza di 140 ms, senza spostare testo o controlli. Una Nuova partita confermata assegna nuove opere; scegliere un comandante sostituisce subito l'arte casuale, rimuoverlo ripristina l'arte casuale del posto.

L'assegnazione casuale richiede un piccolo envelope di presentazione separato dalla cronologia dei punteggi: `matchId` e `randomArtBySeat`. Gli ID dell'arte assegnata fanno parte del keep-set della cache; `matchId` cambia soltanto dopo la conferma di Nuova partita. In questo modo refresh, offline e potatura della cache non cambiano l'opera durante una partita.

### 4.3 Dettagli

`⋮` apre il side sheet verticale e non ruotato già usato dall'app. Qui restano nome giocatore, comandante/Partner, scelta mazzo, crediti completi e rimozione giocatore. Il side sheet è l'unica superficie R2 che può uscire dalla carta; Contatori e Danni Commander non usano portal o sheet globale.

## 5. Tendina Contatori dentro la carta

### 5.1 Apertura e geometria standard

Il controllo «Contatori» apre dal bordo inferiore una superficie opaca inchiostro, contenuta da `inset: 0` nella carta e separata dall'arte da una hairline oro. La carta non cresce. L'ingresso dura 180 ms: opacità e traslazione verticale di 10 px; nessuna animazione dell'altezza.

In alto la tendina ha titolo «Contatori» e un controllo di chiusura da 44 px. Sotto c'è un binario orizzontale con snap dolce. Ogni colonna contiene, in quest'ordine verticale:

1. `+` da almeno 44 px;
2. simbolo a tratto, valore e nome;
3. `−` da almeno 44 px.

Non esiste alcuna riga di contatori sempre visibile quando la tendina è chiusa.

### 5.2 Contenuto completo

L'ordine è stabile:

1. Veleno, variazione ±1;
2. Energia, ±1;
3. Esperienza, ±1;
4. Radiazioni, ±1;
5. Tassa C1, ±2;
6. Tassa C2, ±2, presente soltanto con Partner;
7. Monarca;
8. Iniziativa.

Monarca e Iniziativa usano lo stesso schema visivo ma non fingono di essere numeri: il centro mostra «Sì» oppure «—». `+` prende o trasferisce il ruolo; `−` lo rilascia soltanto se appartiene al giocatore e negli altri casi è disabilitato. Il pulsante corona della carta e la colonna Monarca aggiornano lo stesso stato.

Le icone non hanno i colori di mana o altre tinte tematiche. Il nome accessibile di ogni comando include giocatore, contatore e variazione, per esempio «Aggiungi 2 alla tassa del Comandante 2 di Giulia».

### 5.3 Carta compatta orizzontale

Sotto l'altezza utile di 132 px la tendina diventa una modalità interna compatta:

- occupa l'intera area della carta senza superarne i bordi;
- conserva un binario laterale da 56 px con nome abbreviato del giocatore e vita, solo informativi;
- il resto è un binario orizzontale di colonne da almeno 52 px;
- ogni colonna misura esattamente `44 + 35 + 44 = 123 px`: `+` da 44 px, riga centrale da 35 px con simbolo, valore e abbreviazione, `−` da 44 px; l'etichetta accessibile resta completa;
- il controllo che prima diceva «Contatori» diventa «Chiudi contatori» e rimane sempre raggiungibile.

La vita non è modificabile mentre questa modalità è aperta: si chiude la tendina e si torna alla carta. In questo modo i controlli non scendono sotto 44 px e non compare scroll di pagina.

### 5.4 Layout Tavolo e posti ruotati

La tendina appartiene al contenuto trasformato della carta, quindi ruota con il suo giocatore e si legge dal relativo lato del tavolo. Non è un overlay orientato allo schermo.

- Giocatore 1: in basso, 0°;
- Giocatore 2: a sinistra, 90°;
- Giocatore 3: in alto, 180°;
- Giocatore 4: a destra, −90°.

Il binario scorre nella direzione naturale del giocatore che lo guarda. La carta usa `overflow: clip`; tendina, ombre e focus ring non oltrepassano il bordo. La sagoma resta rettangolare con gli stessi angoli approvati: niente trapezi e nessuna variazione delle proporzioni.

## 6. Danni Commander dal rombo della carta

### 6.1 Apertura

Il rombo inferiore apre una seconda modalità interna, esclusiva rispetto a Contatori. Il titolo è «Danni Commander». Il rombo chiuso non mostra valori né il numero zero.

### 6.2 Selettore della sorgente

In alto compare un radiogroup orizzontale di sorgenti. Ogni opzione è un avversario e, se necessario, uno specifico comandante:

- «Giulia · Comandante»;
- «Marco · Comandante 1»;
- «Marco · Comandante 2».

Con due giocatori e un solo comandante la sola sorgente è preselezionata, ma resta nominata. Con Partner i due comandanti sono sempre due opzioni distinte. Il selettore non usa ritratti colorati: bordo, segno di spunta e testo «Selezionato» rendono lo stato inequivocabile.

### 6.3 Regolazione

Sotto la sorgente selezionata compare un unico stepper orizzontale: `− / simbolo e valore / +`. Ogni controllo misura almeno 44 px. Questa disposizione è distinta dalle colonne verticali dei Contatori e lascia spazio al radiogroup Partner anche nella carta compatta.

- `+` aggiunge un danno Commander e sottrae una vita nella stessa transazione;
- `−` rimuove un danno Commander e restituisce una vita nella stessa transazione;
- il valore non scende sotto zero;
- il delta D-036 mostra `+N` sul valore Commander e `−N` speculare sulla vita;
- l'annuncio assestato resta unico: «[Giocatore]: N danni Commander da [Avversario], Comandante 2; vita X».

La versione compatta usa la stessa modalità a piena carta della tendina Contatori: selettore scorrevole, stepper centrale e chiusura sempre visibile. Nei posti Tavolo ruota con la carta secondo §5.4.

## 7. Rombo centrale: un solo significato

### 7.1 Stato chiuso

Il rombo centrale non apre più direttamente le sezioni. Il suo unico significato è «Apri strumenti e sezioni». Il suggerimento al primo uso diventa «Tocca ◇ per strumenti e sezioni» ed è versionato, così può essere mostrato una volta anche a chi ha già visto il suggerimento R1.

Posizione, area riservata e regola della prima giuntura visibile restano quelle di D-038.

### 7.2 Menu radiale A

Il tocco apre quattro azioni intorno al rombo, secondo una mappa stabile:

- sopra: **Sezioni**;
- sinistra: **Dadi**;
- destra: **Mana**;
- sotto: **Moneta**.

Ogni azione misura 56 px, ha icona a tratto e testo visibile. Il rombo centrale aperto assume un solo nuovo significato: «Chiudi strumenti». Non è una quinta azione.

Il radiale è uno strato non modale, senza scrim, di circa 228 × 228 px. Non muove le carte e resta orientato allo schermo anche nel layout Tavolo. L'ingresso dura 180 ms con dissolvenza e spostamento radiale massimo di 8 px; niente rotazioni, molle o stagger decorativi.

Finché hub o strumento sono aperti, il contenitore delle carte è `inert` e non riceve pointer event: nessun controllo coperto dal radiale può essere raggiunto col Tab o attivato per errore. Il layer resta non-dialog e non usa focus trap; la barra delle sezioni e gli altri elementi nascosti sono anch'essi esclusi dalla tabulazione.

### 7.3 Fallback 2×2 B

La matrice 2×2 non è una variante selezionabile. Viene usata soltanto quando il rettangolo del radiale, inclusi 12 px di margine e safe area, non entra interamente nel viewport.

La matrice usa le stesse quattro azioni, nello stesso ordine logico di tabulazione: Sezioni, Dadi, Mana, Moneta. Si apre nel quadrante libero più grande e un breve raccordo indica il rombo di origine. Le celle sono almeno 64 × 56 px. Non compare alcuna riga permanente di contatori nella tavola o nelle carte.

### 7.4 Sezioni e focus

«Sezioni» chiude il menu, rivela la barra R1 e porta il focus alla voce Partita corrente; barra e menu non sono mai aperti insieme. All'apertura il focus va a Sezioni, poi segue l'ordine sopra. `Escape` o il rombo dal menu chiudono e riportano il focus al rombo. Il menu non intrappola il focus come un dialogo, ma gli elementi nascosti non sono tabulabili.

## 8. Strumenti del rombo

Scegliere Dadi, Mana o Moneta sostituisce le quattro azioni con il relativo pannello, ancorato al rombo. Ogni pannello mostra «Torna agli strumenti» e lascia il rombo come chiusura globale. Il cambio dura 140 ms in dissolvenza; non avviene alcun reflow.

Al mount di ogni strumento il focus passa deterministicamente a «Torna agli strumenti»; non può restare sul trigger radiale appena smontato né cadere sul `body`.

Ogni pannello viene misurato prima del posizionamento. Il suo rettangolo deve entrare nel viewport con margine di 12 px più safe area: se collide viene traslato verso il quadrante libero e collegato al rombo con una hairline, senza spostare il rombo. Sotto 360 px Mana usa obbligatoriamente 3 × 2; Dadi e Moneta usano una colonna. Se neppure la variante stretta entra, il pannello occupa il rettangolo massimo disponibile fra i margini e abilita soltanto lo scroll interno, mai quello della pagina.

«Torna agli strumenti» rimonta il radiale e rifocalizza l'azione che aveva aperto lo strumento. `Escape` o il rombo da uno strumento chiudono l'intero layer e rifocalizzano il rombo; non cercano di riportare il focus sul pulsante smontato.

### 8.1 Dadi

- Due pulsanti: `d6` e `d20`, entrambi almeno 56 × 56 px.
- Il risultato più recente è unico, temporaneo e non entra nella cronologia della partita.
- Un nuovo tocco sullo stesso dado rilancia.
- L'esito entra in 160 ms con dissolvenza e accensione della hairline oro; nessun dado 3D, rimbalzo o effetto casinò.
- Una regione `aria-live="polite"` annuncia una sola volta «d20: 17».

Per essere leggibile a tutti, il gettone del risultato adatta l'orientamento:

- Stesso lato e Griglia: un valore a 0°;
- Fronte a fronte: due valori equivalenti a 0° e 180°;
- Tavolo: quattro ripetizioni a 0°, 90°, 180° e −90°, con Giocatore 1 in basso e Giocatore 3 in alto.

Le ripetizioni sono la stessa informazione, quindi quelle decorative sono `aria-hidden`.

### 8.2 Mana condiviso

Il pannello mostra Bianco, Blu, Nero, Rosso, Verde e Incolore, ma le icone restano monocromatiche. Ogni tipo usa uno stepper verticale `+ / valore / −`, con controlli da 44 px.

- Su schermo stretto: griglia 3 × 2.
- Su schermo largo: una riga da 6, solo se ogni controllo conserva la misura minima.
- «Azzera mana» è un'azione secondaria con bordo oro tenue, disabilitata quando tutti i valori sono zero.
- L'azzeramento è immediato, senza dialogo, e annuncia «Mana azzerato».
- Il mana è comune al tavolo, non persiste al riavvio e torna a zero con Nuova partita.

### 8.3 Moneta

Il comando principale è «Lancia moneta». L'esito è «Testa» o «Croce», accompagnato da un simbolo a tratto. Usa la stessa duplicazione orientata del risultato dei dadi. L'animazione dura 220 ms ed è una dissolvenza tra due facce piane; niente rotazione 3D. L'annuncio è unico e in italiano.

## 9. Stati particolari

- **Vita a zero:** la carta conserva arte e controlli ma aggiunge la dicitura «Fuori dalla partita» e riduce la saturazione dell'arte; non blocca correzioni con `+` o `−`.
- **Errore arte:** nessun toast ripetitivo; resta la texture locale e in Dettagli compare «Illustrazione non disponibile offline».
- **Nessun avversario valido:** il pannello Danni Commander spiega «Nessun avversario disponibile» e disabilita lo stepper.
- **Partner rimosso mentre il pannello è aperto:** la sorgente torna alla prima valida senza annunciare un danno.
- **Cambio layout con una superficie aperta:** la superficie si chiude prima del nuovo layout per evitare focus e geometrie orfane.

## 10. Motion

| Evento | Durata | Proprietà |
| --- | ---: | --- |
| Apertura/chiusura radiale | 180 / 140 ms | opacità + traslazione max 8 px |
| Radiale → strumento | 140 ms | dissolvenza incrociata |
| Tendina standard | 180 / 140 ms | opacità + translateY 10 px |
| Modalità compatta | 140 ms | sola opacità |
| Cambio arte manuale | 140 ms | dissolvenza |
| Risultato dado | 160 ms | opacità + hairline |
| Risultato moneta | 220 ms | dissolvenza piana |
| Badge cumulativo | D-036 | invariato |

Nessun elemento usa rotazioni animate, overshoot, blur animato o variazioni di layout. Con reduced motion tutte le durate sono 0 ms.

## 11. Ordine DOM e accessibilità

- L'ordine dei giocatori resta 1 → 2 → 3 → 4 anche quando Tavolo li ruota visivamente.
- Il pannello interno è adiacente al proprio trigger nel DOM; quando è chiuso è `inert`/non montato.
- All'apertura il focus va al titolo/chiusura della tendina o alla prima sorgente Commander. Alla chiusura torna al trigger.
- Ogni radiogroup usa frecce e roving tabindex. Le opzioni Partner includono sempre «Comandante 1» o «Comandante 2».
- I risultati Dadi/Moneta e l'azzeramento Mana hanno una sola regione live. I duplicati orientati sono nascosti alle tecnologie assistive.
- I pulsanti disabilitati mantengono contrasto leggibile e spiegano lo stato nel nome accessibile; nessun controllo comunica stato solo tramite colore.

## 12. Inventario schermata per schermata

1. Carta standard con comandante singolo.
2. Carta standard con Partner e arte divisa.
3. Carta senza comandante con arte casuale e credito.
4. Carta chiusa compatta orizzontale.
5. Side sheet Dettagli, verticale e non ruotato.
6. Tendina Contatori standard dentro la carta.
7. Tendina Contatori compatta a piena carta.
8. Danni Commander con avversario singolo.
9. Danni Commander con due sorgenti Partner.
10. Tendina ruotata in Tavolo ai quattro orientamenti D-034.
11. Rombo chiuso con nuovo suggerimento.
12. Menu radiale A.
13. Matrice 2×2 B solo per mancato fit.
14. Dadi e risultato multi-orientato.
15. Mana condiviso a 3×2 e 6×1.
16. Moneta e risultato multi-orientato.
17. Fallback arte offline e carta a vita zero.

La tavola riunisce gli stati principali e una fascia di verifica per Partner, fallback 2×2, side sheet, offline/vita zero e risultati orientati. La specifica resta la fonte normativa per tutti i 17 stati, comprese le varianti che nella tavola sono rappresentate in scala ridotta.

## 13. Criteri di accettazione di design

1. Nessun layout mostra contatori in modo permanente a carta chiusa.
2. Contatori e Danni Commander restano interamente dentro la carta a ogni orientamento e densità.
3. Tavolo conserva le posizioni D-034 e carte rettangolari immutate.
4. Tutti i −/+ e tutti i trigger misurano almeno 44 px reali.
5. Il pulsante Commander non mostra «0» e distingue ogni comandante Partner come sorgente autonoma.
6. La tendina contiene esattamente Veleno, Energia, Esperienza, Radiazioni, Tassa C1/C2, Monarca e Iniziativa, senza duplicati accidentali.
7. Il rombo chiuso ha un solo significato; Sezioni è un'azione esplicita del menu.
8. Il radiale è la soluzione primaria; la matrice appare solo dopo un test geometrico di mancato fit.
9. Arte casuale e arte del comandante rispettano D-031 e i crediti Scryfall/Wizards già approvati.
10. Nessuna animazione sposta le carte, blocca il punteggio o sopravvive a reduced motion.

## 14. Conflitti con il sistema visivo approvato

Non emergono conflitti irrisolvibili. R2 introduce tre deroghe controllate:

- il rombo centrale non è più un accesso diretto alle sezioni, ma un hub; la separazione semantica è preservata rendendo Sezioni una voce esplicita;
- nelle carte compatte la tendina nasconde temporaneamente la vita interattiva per garantire controlli da 44 px e contenimento nella carta;
- l'arte casuale può non rappresentare il comandante, quindi la UI deve dichiarare sempre «Comandante non scelto» e non usare il nome della carta casuale come identità.

Queste deroghe sostituiscono le parti incompatibili di D-033 e del comportamento del rombo in D-038, senza cambiare palette, tipografia, trattamento dell'arte, layout selezionabili o motion language.
