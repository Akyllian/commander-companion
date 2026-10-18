# Brief UX — Telefono in orizzontale con 4 giocatori

Data: 2026-10-18 · Origine: prova al tavolo, `PLAYTEST_CHECKLIST.md` passo 4.4 (iPhone) · Destinatario: ChatGPT (layout e UX)

## Problema

In orizzontale su iPhone bisogna scorrere per vedere il terzo e il quarto giocatore. Atteso: i 4 pannelli visibili insieme, senza scorrere.

## Misure (viewport 844×390, come un iPhone 14 in orizzontale con l'app installata)

| Elemento | Altezza oggi |
| --- | --- |
| Header (brand + controlli partita, su due righe) | 138 px |
| Un pannello giocatore | 472 px |
| Pagina intera | 1198 px |
| Pannelli interamente visibili | **0 su 4** |

In Safari non installato l'altezza utile è ancora minore (~330 px) per via delle barre del browser.

## Perché non è una correzione solo tecnica

Per far stare una griglia 2×2 in ~390 px, ogni pannello deve stare in **circa 120–150 px** e l'header in **≤ 56 px**. Con i vincoli concordati (target ≥ 44 px, vita sempre il segnale più forte, nessun gesto come unica via d'accesso), un pannello così piccolo contiene al massimo:

- una riga con il nome (44 px);
- una riga con vita e i 4 pulsanti affiancati, per esempio `[−5] [−1] 40 [+1] [+5]` (~52 px).

Quindi **non restano spazio** per «Configurazione mazzo», l'etichetta «Punti vita», le sezioni «Danni Commander» e «Altri segnalini», la riga «Sconfitto · motivo» e la barra «Annulla» dopo una rimozione. Decidere dove vanno è una scelta di architettura dell'informazione e di layout, che spetta al design.

## Decisioni richieste

1. **Quando** attivare il layout compatto: solo con il telefono in orizzontale e altezza ridotta (per esempio `orientation: landscape` e `max-height` intorno a 30rem) oppure anche in altri casi?
2. **Header compatto:** una riga sola, solo icone (Annulla, Ripeti, Nuova partita, Azzera, Preferenze) o un menu? E «Giocatori», che oggi resta sempre visibile (D-016)?
3. **Contenuto del pannello compatto:** confermare solo nome + vita + 4 pulsanti?
4. **Accesso a Danni Commander, Altri segnalini e Configurazione mazzo:** un pannello sovrapposto (dialog o sheet) aperto da un pulsante nel pannello? Da quale controllo?
5. **Sconfitta:** come mostrarla nel pannello compatto senza affidarsi solo al colore (oggi è una riga di testo dedicata)?
6. **Barra «Annulla» dopo una rimozione** (D-015): resta nella cella del pannello rimosso?
7. **Con 2 o 3 giocatori:** stessa griglia o pannelli più grandi?

## Vincoli tecnici (da Claude)

- Si può fare solo con CSS e un componente per il pannello sovrapposto. Il dominio, lo stato e i test delle regole non cambiano.
- Rotazione: i dati sono già al sicuro (verificato al passo 4.4); il cambio di layout è istantaneo.
- Ogni controllo resta ≥ 44 px, con focus visibile e nome accessibile; resta valido con «Riduci movimento».
- Le sezioni oggi aperte («Danni Commander» aperta durante la sessione, D-014) vanno ripensate se si spostano in un pannello sovrapposto.
