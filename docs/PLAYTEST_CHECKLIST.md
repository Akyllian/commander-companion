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
| 9.4 | VoiceOver / TalkBack sulla tassa del comandante | legge «due mana generici» e «Non tracciata dall'app» | | |

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
