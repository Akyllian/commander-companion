# Checklist di prova al tavolo (Fase 1.5)

Obiettivo: confermare su dispositivi reali che contatori, regole, offline e accessibilità reggono una partita vera. Ogni problema trovato va registrato in fondo con il formato indicato.

**Prerequisito:** l'app deve essere pubblicata in **HTTPS**. Su `http://` (tranne `localhost`) il telefono non installa la PWA, non attiva il service worker e non tiene lo schermo acceso.

---

## 1. Dispositivi

Compila una colonna per dispositivo. Servono almeno un iPhone e un Android; il tablet è fortemente consigliato.

| | iPhone (Safari) | Android (Chrome) | Tablet | Desktop |
| --- | --- | --- | --- | --- |
| Modello / sistema | | | | |
| Versione browser | | | | |
| App installata (sì/no) | | | | |
| Tester | | | | |

Note di piattaforma da tenere a mente:
- **iOS**: installazione solo da Safari → Condividi → «Aggiungi alla schermata Home». Il Wake Lock richiede iOS 16.4+ (se manca, il pulsante Preferenze non compare: è voluto). Lo storage dei siti *non installati* può essere cancellato dopo 7 giorni di inattività.
- **Android**: Chrome propone l'installazione dal menu o con un banner.

## 2. Prima apertura e installazione

| # | Passi | Risultato atteso | iPhone | Android | Tablet |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Apri l'URL in HTTPS | 4 giocatori a 40, nessun avviso | | | |
| 2.2 | Installa l'app | icona Commander Companion (segnaposto teal/oro) sulla home | | | |
| 2.3 | Apri dall'icona | si apre a schermo intero, senza barra del browser | | | |

## 3. Partita completa (almeno 20 minuti, 4 giocatori)

| # | Passi | Risultato atteso | iPhone | Android | Tablet |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Rinomina tutti i giocatori (Invio per confermare) | nomi salvati; Esc annulla la modifica | | | |
| 3.2 | Tocca +1 rapidamente 7 volte | vita +7, badge «+7» accanto al valore, nessuno zoom della pagina | | | |
| 3.3 | Annulla una volta | torna al valore di prima dei 7 tocchi (un solo passo) | | | |
| 3.4 | Apri «Danni Commander», dai 3 danni da un avversario | danni 3, **vita −3**, riepilogo «massimo 3/21» | | | |
| 3.5 | Correggi i danni a 2 | vita +1 | | | |
| 3.6 | Attiva Partner per un giocatore («Configurazione mazzo») | etichetta «Partner»; gli altri vedono due righe di danni per lui | | | |
| 3.7 | Dai danni dal comandante 2, poi prova a togliere Partner | casella disattivata, testo «Azzera prima i danni del Comandante 2.» | | | |
| 3.8 | Porta un giocatore a 10 veleno | «Sconfitto · 10 veleno» sotto il nome | | | |
| 3.9 | Rimuovi un giocatore | barra «X rimosso — Annulla» al suo posto, sparisce dopo ~6 s | | | |
| 3.10 | Rimuovi di nuovo e tocca Annulla nella barra | il giocatore torna con tutti i valori | | | |
| 3.11 | Lascia il telefono fermo 5 minuti | lo schermo **non** si spegne (se Preferenze è visibile) | | | |
| 3.12 | Preferenze → disattiva «Mantieni lo schermo acceso» | lo schermo torna a spegnersi normalmente; la scelta resta dopo il riavvio | | | |
| 3.13 | Passa il telefono a giro tra 4 persone | nessun tocco accidentale distruttivo; tutti trovano vita e danni senza spiegazioni | | | |

## 4. Affidabilità

| # | Passi | Risultato atteso | iPhone | Android | Tablet |
| --- | --- | --- | --- | --- | --- |
| 4.1 | A metà partita chiudi l'app dal multitasking e riaprila | punteggi identici | | | |
| 4.2 | Attiva la modalità aereo, chiudi e riapri l'app | si apre con la partita; tutto funziona | | | |
| 4.3 | Spegni e riaccendi lo schermo durante la partita | punteggi identici; lo schermo acceso riprende | | | |
| 4.4 | Ruota il dispositivo più volte | nessuna perdita di dati, layout leggibile | | | |
| 4.5 | Ricevi una chiamata o apri un'altra app, poi torna | punteggi identici | | | |
| 4.6 | Pubblica una nuova versione con la partita aperta | compare «È disponibile una nuova versione»; **nessun** ricaricamento finché non tocchi «Aggiorna»; dopo l'aggiornamento i punteggi sono intatti | | | |
| 4.7 | Nuova partita → «Annulla» nel dialog | nulla cambia | | | |
| 4.8 | Azzera punteggi → conferma | vita 40, segnalini e danni a 0, nomi e Partner invariati | | | |

## 5. Accessibilità

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 5.1 | VoiceOver / TalkBack: scorri un pannello | ogni pulsante ha un nome chiaro («Aumenta di 1 la vita di …») | | |
| 5.2 | Con lo screen reader tocca +1 tre volte | un solo annuncio «Nome: 43 punti vita» | | |
| 5.3 | Ingrandimento testo del sistema al massimo | nessun testo tagliato o sovrapposto | | |
| 5.4 | «Riduci movimento» attivo | nessuna animazione (sigillo fermo, badge senza dissolvenza) | | |
| 5.5 | Luce forte / sole: leggibilità di vita e pulsanti | leggibile a un braccio di distanza | | |

## 6. Come registrare un problema

Una riga per problema. **Tipo**: *T* = tecnico (lo correggo io), *UX* = esperienza d'uso (va a ChatGPT), *R* = regola di gioco.

| ID | Dispositivo | Passo | Cosa è successo | Cosa ti aspettavi | Tipo | Gravità (alta/media/bassa) |
| --- | --- | --- | --- | --- | --- | --- |
| *T* | iPhone | 4.4 | Quando giro lo schermo devo scorrere per trovare gli altri due giocatori | Che tutti e 4 le tabelle dei giocatori fossero visibili senza dover scorrere lo schermo | Affidabilità | *media* |

Gravità **alta** = punteggio sbagliato o perso, app che non si apre, regola applicata male. Questi bloccano la Fase 2.

## 7. Esito della prova (2026-10-18)

Tutti i passi superati tranne uno. Nessun problema di gravità alta, quindi la Fase 2 non è bloccata.

- **Problema 1 (iPhone, passo 4.4, gravità media):** in orizzontale con 4 giocatori bisogna scorrere. Misurato a 844×390: header 138 px, pannello 472 px, 0 pannelli su 4 interamente visibili. Classificato come **UX/layout**, non tecnico: i dati restano corretti alla rotazione, ma per farli stare in una schermata va deciso cosa togliere dal pannello. Brief per il design: `docs/UX_BRIEF_ORIZZONTALE.md`.

## 8. Layout compatto in orizzontale (Fase 1.6)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 8.1 | 4 giocatori, telefono in orizzontale (app installata e in Safari) | i 4 pannelli e tutti i pulsanti vita visibili senza scorrere | | |
| 8.2 | Tocca ⋯ su un pannello | si apre «Dettagli di …» a destra; Danni Commander, Altri segnalini, Configurazione mazzo, Rimuovi giocatore | | |
| 8.3 | Rimuovi un giocatore dallo sheet | lo sheet si chiude; «X rimosso — Annulla» nella sua cella | | |
| 8.4 | Menu «Partita» | Giocatori, Nuova partita, Azzera punteggi, Mantieni lo schermo acceso | | |
| 8.5 | Torna in verticale | layout standard, punteggi identici | | |
| 8.6 | Ingrandimento testo / zoom al massimo | i pannelli vanno su una colonna e si scorre in verticale; nessun pulsante tagliato | | |

## 9. Riferimento alle regole (Fase 2a)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 9.1 | Tocca «Regole» (in verticale e in orizzontale) | si apre «Regole Commander» con 3 gruppi e 7 regole, numeri di regola e data | | |
| 9.2 | Chiudi con ✕ (o Esc su tastiera) | la partita è identica, Annulla funziona come prima | | |
| 9.3 | Modalità aereo, riapri l'app, apri «Regole» | tutto il contenuto disponibile | | |
| 9.4 | VoiceOver / TalkBack sulla tassa del comandante | legge «due mana generici»; nessuna etichetta «Non tracciata» (D-033) | | |

## 10. Arte del comandante (Fase 2c)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 10.1 | Configurazione mazzo → cerca il tuo comandante → sceglilo | l'illustrazione riempie il pannello; sotto il nome compaiono il comandante e «Illustrazione di …» | | |
| 10.2 | Leggi nome e vita su un'illustrazione chiara, con luce forte | leggibili a colpo d'occhio; la vita vince sull'immagine | | |
| 10.3 | Modalità aereo, riapri l'app | le illustrazioni compaiono comunque | | |
| 10.4 | Cerca senza connessione | messaggio «Serve una connessione a internet…» | | |
| 10.5 | Annulla dopo aver scelto un comandante | l'illustrazione sparisce, punteggi invariati | | |
| 10.6 | In orizzontale | arte nei 4 pannelli, nessuno scroll, credito dell'artista nei «Dettagli» | | |
| 10.7 | Illustrazione molto chiara | nome e vita ≥4,5:1; il rinforzo scurisce soltanto le zone protette e il resto dell’arte rimane riconoscibile | | |
| 10.8 | Apri «Comandante e mazzo», cerca almeno 2 caratteri | fino a 5 risultati senza scroll annidato; ogni riga mostra thumbnail, nome e artista ed è alta almeno 64px | | |
| 10.9 | In orizzontale, apri Dettagli → Comandante e mazzo | campo e Cerca restano sulla stessa riga; risultati scorrono con lo sheet, nessun secondo modal | | |
| 10.10 | Attiva Partner e assegna due comandanti | arte 1 a sinistra e arte 2 a destra, split statico; entrambi i crediti nello sheet; nessuna alternanza | | |
| 10.11 | Su telefono, prova Zimone, Giada e una coppia Partner chiara; osserva vita e testi alla normale distanza d’uso | composito finale ≥4,5:1; nessuna toppa, capsula, bordo di maschera o alone tipografico riconoscibile; vita dominante e arte ancora leggibile | | |

## 11. Dock dei punteggi (Fase 2e, D-033)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 11.1 | Su ogni pannello guarda la striscia sotto la vita | Vita, Commander, Veleno, Energia, Esperienza, Radiazioni, Tassa, poi Monarca e Iniziativa; Vita selezionata all'avvio | | |
| 11.2 | Tocca Veleno, poi +1 tre volte e −1 una volta | il valore resta sul pannello (2), nessun pannello si apre; Annulla toglie il gruppo di tocchi in un passo | | |
| 11.3 | Ripeti con Energia, Esperienza e Radiazioni | ognuno conta da 0, mai sotto zero | | |
| 11.4 | Tocca Commander, scegli un avversario, +1 cinque volte | i danni da quel comandante salgono a 5, la vita scende di 5; un solo Annulla ripristina entrambi | | |
| 11.5 | Con un avversario Partner, scegli «Comandante 2» e segna danni | il Comandante 1 resta a 0; la striscia mostra «massimo N/21», mai la somma | | |
| 11.6 | Tocca Tassa e premi +{2} due volte | mostra +{4}; la vita non cambia; con Partner le due tasse sono separate | | |
| 11.7 | Rimuovi Partner con tassa del Comandante 2 > 0 | non è possibile finché la tassa non torna a 0 (lo dice il testo sotto l'interruttore) | | |
| 11.8 | Tocca Monarca su un giocatore, poi su un altro | la corona passa al secondo, il primo la perde; toccarla di nuovo sul possessore la toglie | | |
| 11.9 | Dai Monarca e Iniziativa allo stesso giocatore | li tiene entrambi | | |
| 11.10 | Partita → Azzera punteggi | tornano a zero vita/danni/segnalini/tassa; Monarca e Iniziativa tolti; nomi, Partner e comandanti invariati | | |
| 11.11 | In orizzontale (4 giocatori) | icone dei modi nella riga del nome, nome leggibile; i controlli restano ≥44 px; nessuna sovrapposizione | | |
| 11.12 | Ruota il telefono e torna indietro | ogni pannello ricorda il modo e l'avversario scelti | | |
| 11.13 | Riduci movimento attivo | i cambi di modo sono immediati | | |

## 12. Layout a quattro giocatori (Fase 2d, D-034)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 12.1 | Con 4 giocatori tocca «Layout» | si apre «Layout dei giocatori» con Griglia, Fronte a fronte, Tavolo; quella attuale dice «Selezionato» | | |
| 12.2 | Scegli «Fronte a fronte» | il foglio si chiude; i giocatori 1 e 2 sono capovolti verso il lato opposto; punteggi invariati; Annulla non tocca il layout | | |
| 12.3 | Scegli «Tavolo», appoggia il telefono al centro, 4 persone ai 4 lati | ognuno legge il proprio pannello dal proprio lato (1 in basso, 2 a sinistra, 3 in alto, 4 a destra) | | |
| 12.4 | Ruota il telefono più volte | il layout scelto non cambia; cambia solo la densità | | |
| 12.5 | Chiudi e riapri l'app | il layout resta quello scelto | | |
| 12.6 | Da un pannello ruotato apri «Dettagli» | il foglio è dritto; chiudendolo il focus torna al pannello | | |
| 12.7 | Rimuovi un giocatore in Tavolo | la barra «Annulla» occupa il suo posto con lo stesso verso; il comando «Layout» sparisce; Annulla lo riporta con la scelta salvata | | |
| 12.8 | Riduci movimento attivo, cambia layout | il cambio è immediato | | |

## 13. Layout a due giocatori (D-035)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 13.1 | Nuova partita a 2, tocca «Layout» | due opzioni: Stesso lato (selezionata) e Fronte a fronte | | |
| 13.2 | Scegli Fronte a fronte, telefono al centro del tavolo | Giocatore 1 leggibile dal tuo lato, Giocatore 2 dal lato opposto; nessuno deve scorrere | | |
| 13.3 | Passa a 4 giocatori e torna a 2 | ognuno ritrova il proprio layout | | |

## 14. Delta cumulativo (D-036)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 14.1 | Tocca −1 sulla vita 5 volte in fretta | un solo badge che passa da −1 a −5 senza lampeggiare; sparisce in dissolvenza poco dopo l'ultimo tocco | | |
| 14.2 | Commander, +1 tre volte | +3 sul valore Commander e −3 sulla vita, insieme | | |
| 14.3 | Veleno +1, poi subito Energia +1 | il badge del veleno si dissolve, quello dell'energia compare | | |
| 14.4 | VoiceOver, 4 tocchi rapidi su Veleno | un solo annuncio finale («veleno 4»), non quattro | | |
| 14.5 | Riduci movimento attivo | il badge compare e scompare senza movimento | | |

## 15. Guscio a quattro sezioni (R1, D-038)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 15.1 | Apri l'app la prima volta, in orizzontale | solo le carte; al centro il sigillo con «Tocca il sigillo per le sezioni» | | |
| 15.2 | Tocca il sigillo | in alto compaiono Partita, Mazzi, Impara, Altro; le carte non si muovono | | |
| 15.3 | Tocca di nuovo il sigillo (o Partita) | la barra sparisce; il suggerimento non torna più | | |
| 15.4 | Vai in Altro, poi usa il tasto Indietro | torni alla partita con gli stessi punteggi | | |
| 15.5 | In Altro: cambia layout, poi Nuova partita con 2 giocatori | il layout si applica subito; la nuova partita chiede conferma | | |
| 15.6 | In Altro: Azzera punteggi | chiede conferma, poi tutto torna a 40 | | |
| 15.7 | Schermo acceso attivo, resta in Altro qualche minuto | lo schermo può spegnersi; tornando in Partita resta acceso | | |
| 15.8 | Impara → Riferimento rapido Commander | si aprono le Regole come prima | | |
| 15.9 | Telefono in verticale | annota se il sigillo è facile da trovare (oggi è a metà pagina) | | |

## 16. Partita R2 (D-039)

| # | Passi | Risultato atteso | iPhone | Android |
| --- | --- | --- | --- | --- |
| 16.1 | Nuova partita senza comandanti, con rete | ogni carta mostra un'illustrazione diversa con «Comandante non scelto» e «Illustrazione di …» | | |
| 16.2 | Ricarica la pagina, poi riprova in modalità aereo | le stesse illustrazioni restano sugli stessi posti | | |
| 16.3 | Modalità aereo: Nuova partita | la partita parte subito; le carte usano illustrazioni già viste o la texture neutra | | |
| 16.4 | Tocca la corona di un giocatore, poi di un altro | il Monarca passa con un tocco; la corona piena è del possessore | | |
| 16.5 | Tocca −/+ della vita più volte | ±1 per tocco, delta cumulativo accanto alla vita | | |
| 16.6 | Contatori: aggiungi veleno, energia, tassa (con Partner: C1 e C2) | la tendina resta dentro la carta; la tassa va di 2 | | |
| 16.7 | Rombo Commander: scegli la sorgente, tocca + | danno +1, vita −1; con Partner le due sorgenti sono separate | | |
| 16.8 | Tavolo: apri Contatori sul giocatore a sinistra | la tendina è ruotata verso di lui e non esce dalla carta | | |
| 16.9 | Orizzontale su telefono: apri Contatori | modalità compatta: colonne + / valore / −, nome e vita a lato, «Chiudi contatori» sempre visibile | | |
| 16.10 | Tocca il rombo centrale | Sezioni sopra, Dadi a sinistra, Mana a destra, Moneta sotto; le carte non rispondono finché è aperto | | |
| 16.11 | Tocca fuori dal menu, sopra il + di una carta | il menu si chiude e la vita non cambia | | |
| 16.12 | Dadi: d20 due volte; Moneta; nel Tavolo | il risultato si legge da ogni lato | | |
| 16.13 | Mana: aggiungi Rosso, chiudi, vai in Altro e torna | il mana è ancora lì; «Azzera mana» lo azzera | | |
| 16.14 | Porta un giocatore a 0 vita, poi + | compare «Fuori dalla partita» e l'arte si spegne; con + sparisce | | |

