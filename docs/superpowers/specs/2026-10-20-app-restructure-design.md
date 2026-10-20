# Commander Companion — Ristrutturazione verso il progetto iniziale

Data: 2026-10-20
Stato: **approvata dal product owner** (2026-10-20); prossimo passo: design di ChatGPT per la fase R1, poi piano tecnico
Decisione: D-037 (sostituisce in parte D-003, D-014, D-016, D-021, D-033; conferma D-019, D-025, D-034, D-035, D-036)

## 1. Intento

Il product owner ha condiviso il mockup originale dell'app: tre telefoni con le sezioni Play, Deck e Learn. Ha chiesto di renderla così: «non al pixel, ma molto simile». Oggi l'app è un segnapunti molto curato. La ristrutturazione la trasforma in un'app con **tre usi** per lo stesso gruppo di gioco:

1. **Partita:** il segnapunti al tavolo, pensato soprattutto per il telefono o tablet ruotato e appoggiato fra i giocatori.
2. **Mazzi:** dove ognuno tiene la propria lista e le proprie note, e la collega al suo posto in partita.
3. **Impara:** un manuale interattivo che serve sia a chi inizia sia a chi gioca da anni.

Il perché: l'app deve sembrare un'app vera, non una pagina web, e accompagnare il gruppo prima, durante e fuori dalla partita. Resta gratuita, per il gruppo del product owner, sotto la Fan Content Policy.

## 2. Obiettivi, non-obiettivi, anti-obiettivi

**Obiettivi**
- Struttura e atmosfera molto vicine al mockup, nel linguaggio canonico già approvato (dark-fantasy, oro e teal, Cormorant per i titoli).
- Una partita leggibile e veloce con lo schermo ruotato: ogni giocatore vede e tocca il proprio pannello dal proprio lato.
- Mazzi importati una volta con internet e poi consultabili offline.
- Un manuale ampio e interattivo, tutto in italiano.
- Sviluppo a fasi pubblicate una alla volta, ciascuna disegnata da ChatGPT prima del codice e provata dal product owner sul telefono.

**Non-obiettivi (per ora)**
- Cronologia delle partite: **eliminata** (la Fase 2b esce dalla roadmap).
- Cronometro, numero di partita, conteggio dei turni, giocatore di turno.
- Spindown, token, note di partita, contatori rapidi del mazzo, statistiche dei mazzi oltre alle categorie.
- Store, account, sincronizzazione fra telefoni, AI, pagamenti.
- Lingue diverse dall'italiano.

**Anti-obiettivi** (fallimento anche se funziona)
- Testi in inglese nell'interfaccia.
- Carte intere stampabili come proxy (Fan Content Policy, D-025).
- Icone colorate o «emoji» al posto delle icone a tratto; azioni raggiungibili solo con gesti; pulsanti sotto i 44 px.
- Overlay e pannelli che coprono la partita quando non serve.
- Un'app che senza rete smette di funzionare per partite o mazzi già caricati.

## 3. Decisioni del product owner (2026-10-20)

Riportate come date, con il numero della domanda del questionario.

**Generali**
- Molto simile al mockup, non al pixel (A1). Ordine: Partita → Mazzi → Impara (A2). Tutto in italiano (A3). Per il proprio gruppo (A4). PWA, ma con un uso il più possibile da app vera (A5).

**Navigazione**
- Schede: Partita, Mazzi, Impara, Altro.
- Annulla e Ripeti eliminati (B6), compresa la barra «Annulla» dopo la rimozione di un giocatore.
- In partita le schede si nascondono; i pannelli sono ottimizzati soprattutto per lo schermo ruotato (B7).
- Il **rombo centrale** fa riapparire le schede.
- «Altro» contiene le **Impostazioni** (B8, poi cronologia eliminata). L'ingranaggio sparisce e tutto il suo contenuto passa in Impostazioni (B9).
- In Impostazioni vanno anche Nuova partita, numero di giocatori, Azzera punteggi e Layout.

**Partita**
- Nessuna intestazione di partita: niente «GAME 1», cronometro, «+» o «⋯» (C10, C11).
- Vita: solo −/+ da ±1, a tocco singolo (C12).
- Sotto il nome c'è il comandante (C16).
- La corona indica il Monarca. Nessun bordo del giocatore di turno e nessun conteggio dei turni (C15).
- Un pulsante nell'angolo in basso di ogni carta giocatore apre una **tendina dentro la carta**. La tendina contiene **tutti** i contatori, ciascuno con il suo simbolo, + sopra e − sotto (C13). Non c'è una riga di contatori sempre visibile: vivono solo nella tendina (risposta 5).
- Danni Commander: toccarli aggiunge danni e toglie vita (C14). Un selettore a tendina sceglie l'avversario che li infligge (risposta 6).
- Il badge «+N/−N» della D-036 resta (risposta 7).
- Senza comandante scelto, il pannello mostra un'arte Wizards **casuale fra tutte le carte**, nuova a ogni partita (C18, risposta 11).
- I layout Griglia, Fronte a fronte e Tavolo (D-034, D-035) restano (risposta 12).

**Rombo centrale** (C17, C19)
- Apre **Dadi** (d6 e d20, un dado alla volta; il risultato lo vedono tutti), **Mana** e **Testa o croce**. Fa anche riapparire le schede.
- **Mana:** un contatore unico per il tavolo, usato a turno da chi gioca, con i cinque colori più l'incolore, ciascuno con −/+, e un pulsante di azzeramento (risposta 8).
- Deve funzionare anche a due giocatori; ChatGPT propone la posizione, per esempio sulla giuntura fra le due metà (risposta 10).

**Mazzi**
- Un mazzo è la lista delle carte, il comandante e le note di strategia scritte dal product owner (D20, D23).
- Fonti: l'**export di testo** di Moxfield e Archidekt (o qualunque lista «quantità nome»), incollato nell'app, e la ricerca Scryfall carta per carta. Niente import da link (decisione del product owner dopo la verifica in §7.1). I dati delle carte arrivano da Scryfall; dopo il caricamento con internet il mazzo resta consultabile offline (D21).
- Le categorie le calcola l'app dalle carte del mazzo, con un insieme riconosciuto dalle carte (D22, risposta 14).
- Mano di prova: 7 carte con mulligan, mostrando nomi e ritagli d'arte, mai carte intere (D25).
- Il mazzo si collega al pannello di un giocatore e ne imposta comandante e arte, ma il pannello resta modificabile (D28).
- Si possono salvare anche i mazzi degli amici (D29).
- Si modifica la lista dentro l'app (D27). Nessun'altra statistica per ora (D26). I contatori rapidi del mazzo sono eliminati (D24).

**Impara**
- Per principianti ed esperti (E30). Testi scritti da ChatGPT, il più ampi possibile (E31).
- Nessuna illustrazione (E32). Scenari interattivi (E33).
- Il riferimento Regole attuale confluisce qui (risposta 13).

**Stile**
- Restano le icone a tratto; niente icone colorate (F34). Gli accenti dei giocatori restano quelli attuali (F35). Le scritte promozionali del mockup non entrano nell'app (F36).

**Tecnica e metodo**
- Rete necessaria solo per caricare mazzi e arte; il resto è offline (G37). Niente sincronizzazione per ora (G38).
- A fasi, ciascuna provata sul telefono (G40). Ruoli: product owner per il prodotto, ChatGPT per il design e i testi (con ogni schermata disegnata prima del codice), Claude per la tecnica (G41).

## 4. Effetto sulle decisioni esistenti

| Decisione | Effetto |
| --- | --- |
| D-003 (Annulla/Ripeti), D-014 (barra Annulla dopo rimozione) | **Superate:** niente Annulla, Ripeti né barra. Il raggruppamento dei tocchi resta solo per il badge D-036 e per gli annunci. |
| D-016, D-022, D-034 (header e pulsante Layout) | **Superate:** l'intestazione sparisce. Layout, Nuova partita, giocatori e Azzera vanno in Impostazioni. Restano le geometrie dei layout. |
| D-021 (Regole) | **Assorbita** da Impara. Il pulsante Regole sparisce. |
| D-033 (dock dei punteggi) | **Superata nell'interazione:** al posto della striscia dei modi c'è la tendina nella carta con tutti i contatori, + sopra e − sotto. Restano schema v5, regole, Monarca e Iniziativa unici, tassa per Partner. |
| D-036 (delta e annunci) | **Confermata.** |
| D-019 (italiano, gruppo), D-025 (Fan Content Policy) | **Confermate.** L'arte casuale Wizards e i ritagli nella mano di prova restano nei limiti. |
| Fase 2b (cronologia) | **Eliminata.** |

## 5. Fasi proposte

Ogni fase si apre con il design di ChatGPT e si chiude con una PR revisionata e la prova sul telefono.

| Fase | Contenuto | Dipende da |
| --- | --- | --- |
| R1 — Guscio app | Schede Partita/Mazzi/Impara/Altro; Impostazioni in Altro, con Wake Lock, layout, nuova partita, giocatori, azzera e crediti; via intestazione, ingranaggio, Annulla/Ripeti; Mazzi e Impara come schermate vuote | — |
| R2 — Partita | Carta giocatore come nel mockup (±1, corona, comandante), tendina contatori nella carta, selettore dell'avversario per i danni Commander, arte casuale, rombo centrale (schede, Dadi, Mana, Testa o croce) in tutti i layout | R1 |
| R3 — Mazzi | Elenco mazzi (anche degli amici), import (testo incollato e Scryfall; vedi §7.1), cache offline, categorie automatiche, note, modifica della lista, mano di prova, collegamento a un giocatore | R1, R2 per il collegamento |
| R4 — Impara | Assorbe Regole; sezioni Le basi, Meccaniche, Interazioni, Consigli (nomi da confermare con ChatGPT); scenari interattivi | R1 |

## 6. Comportamenti da definire nel design (lasciati a ChatGPT)

- Aspetto delle schede (in alto come nel mockup) e animazione di comparsa e scomparsa in partita.
- Carta giocatore: posizione di −/+, nome, comandante, corona; il pulsante d'angolo e la forma della tendina (altezza, scorrimento interno se i contatori non entrano; in Tavolo il pannello è stretto).
- Il selettore dell'avversario per i danni Commander dentro la tendina.
- Rombo centrale: forma, posizione in ogni layout (anche a due giocatori), menu delle quattro azioni (schede, Dadi, Mana, Testa o croce), verso di lettura dei risultati «visti da tutti».
- Mana: disposizione dei sei simboli (bianco, blu, nero, rosso, verde, incolore, come icone a tratto) e del pulsante di azzeramento.
- Mazzi: lista dei mazzi, schermata del mazzo con le sezioni del mockup (panoramica con categorie, note di strategia, carte chiave), mano di prova.
- Impara: struttura delle sezioni, formato degli scenari interattivi e i testi.
- Impostazioni: ordine e raggruppamento.

## 7. Vincoli tecnici e rischi

### 7.1 Import da link Moxfield e Archidekt (verificato il 2026-10-20)
- **Moxfield:** l'API risponde 403 (protezione Cloudflare).
- **Archidekt:** l'API consente richieste solo da `http://localhost:3000`, quindi il browser blocca la nostra app.
- **Scryfall:** consente richieste da qualunque sito.

Senza un server proprio (escluso: niente cloud) **non si può importare da un link** Moxfield o Archidekt. **Deciso (2026-10-20):** si importa solo l'**export di testo** che entrambi offrono («1 Sol Ring», ecc.), incollandolo; i dati di ogni carta arrivano poi da Scryfall.

### 7.2 Altri vincoli
- **Dati delle carte:** nome, costo, tipo, testo, colori e ritaglio d'arte arrivano da Scryfall (`/cards/collection`, 75 carte per richiesta) e si salvano in IndexedDB, come l'arte dei comandanti (D-026).
- **Spazio:** cento ritagli per mazzo, per più mazzi. Va stimato, va chiesto `storage.persist()` (già fatto) e va prevista la gestione dello spazio esaurito.
- **Arte casuale:** `/cards/random` serve rete. Senza rete il pannello usa l'ultima arte salvata o il fondo neutro.
- **Categorie automatiche:** riconoscimento da tipo e testo della carta (per esempio rampa, pescata, rimozione, rimozione di massa, protezione, tutor, terre). Sono euristiche e alcune carte saranno classificate male. L'insieme preciso va concordato con ChatGPT.
- **Schema dati:** i mazzi sono un archivio nuovo, separato dalla partita. Il collegamento mazzo→giocatore va nella partita (nuova versione dello schema, con migrazione pura).
- **Mana e dadi:** stato di tavolo, non punteggi. Non entrano nella partita salvata (vedi §8).
- **Prestazioni:** le liste di 100 carte con ritagli restano fluide su telefono.

## 8. Scelte di Claude (correggibili)

- Il **contatore del mana** e l'**ultimo tiro di dado** sono stato temporaneo del tavolo: non vengono salvati con la partita e si perdono ricaricando l'app.
- Annulla e Ripeti spariscono dall'interfaccia. Il raggruppamento dei tocchi resta solo dove serve (badge D-036 e annunci).
- I mazzi sono salvati in un archivio IndexedDB proprio, con validazione e versione come la partita.
- Le Impostazioni sono una schermata di «Altro», non un foglio sovrapposto.
- In assenza di rete, l'arte casuale non blocca mai l'avvio della partita.
- **Dettagli del giocatore:** il «⋮» nell'angolo alto della carta, come nel mockup, apre i Dettagli: nome, comandante e mazzo collegato, Partner, rimozione del giocatore (zona separata, D-032). È distinto dal pulsante in basso che apre la tendina dei contatori.
- **Schede in partita:** sulla scheda Partita le schede sono sempre nascoste; il rombo le fa comparire e scegliere un'altra scheda le lascia visibili. Tornando a Partita si nascondono di nuovo.
- **Nuova partita** (da Impostazioni) chiede conferma come oggi, azzera il mana e assegna nuove arti casuali ai giocatori senza comandante.

## 9. Domande ancora aperte per il product owner

Nessuna: l'import da link è stato sostituito dall'import di testo (2026-10-20).
