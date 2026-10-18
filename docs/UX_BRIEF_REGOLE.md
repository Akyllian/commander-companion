# Brief UX — Fase 2a: riferimento rapido alle regole

Data: 2026-10-18 · Destinatario: ChatGPT (UX, layout, copy) · Contenuti e correttezza: Claude

## Obiettivo

Permettere di controllare al tavolo, anche offline e senza uscire dall'app, le regole che l'app stessa applica, così chi gioca si fida dei numeri che vede. **Non** è un regolamento completo né un motore di regole.

## Bozza dei contenuti (verificata da Claude)

Fonte: *Magic: The Gathering Comprehensive Rules*, in vigore dal **25 settembre 2026**. I testi sono riassunti con parole nostre, senza citare il regolamento ufficiale. Nel codice, ogni numero verrà letto dalle costanti delle regole (`STARTING_LIFE`, `POISON_LIMIT`, `COMMANDER_DAMAGE_LIMIT` in `src/game/game.ts`) e un test ne controllerà la coerenza.

| # | Titolo | Testo proposto | Regola | Cosa fa l'app |
| --- | --- | --- | --- | --- |
| R1 | Vita iniziale | Ogni giocatore parte da **40** punti vita. | 903.7 | applicata |
| R2 | Vita a zero | Chi arriva a **0 o meno** punti vita perde. La vita può scendere sotto zero. | 704.5a | applicata |
| R3 | Veleno | Chi ha **10 o più** segnalini veleno perde. | 704.5c | applicata |
| R4 | Danni Commander | Chi ha subito **21 o più danni da combattimento dallo stesso comandante** nel corso della partita perde. Si contano separatamente per ogni comandante e non si sommano tra avversari diversi. | 903.10a, 704.6c | applicata |
| R5 | Sono anche danni normali | I danni Commander fanno perdere anche punti vita: l'app li toglie in automatico. | 903.10a | applicata (D-006) |
| R6 | Partner | Un mazzo può avere **due comandanti**; il conteggio dei 21 vale per ciascuno separatamente. | 702.124, 903.10a | applicata (D-007) |
| R7 | Tassa del comandante | Lanciare il comandante dalla zona di comando costa **{2} in più** per ogni volta in cui è già stato lanciato da lì. | 903.8 | **non tracciata** |

### Punto da segnalare al design (correttezza)

Per R4 contano **solo i danni da combattimento** del comandante. L'app non distingue il tipo di danno: tutto ciò che si registra in «Danni Commander» conta verso i 21. Il testo d'aiuto attuale («Ogni danno Commander riduce anche i punti vita.») non lo dice. **Proposta di copy da valutare:** «Registra qui solo i danni da combattimento del comandante: riducono anche i punti vita.»

### Esclusi di proposito

L'identità di colore (903.4) e la composizione del mazzo, che non servono durante la partita; le regole non applicate dall'app, a parte R7, che è comune al tavolo. Da valutare: R7 potrebbe diventare in futuro un contatore della tassa (non pianificato).

## Decisioni richieste

1. **Accesso:** da dove si apre? Per esempio un pulsante nei Controlli partita, accanto a Preferenze, o un link per ogni sezione del pannello (accanto a «Danni Commander»).
2. **Contenitore:** pannello sovrapposto (dialog o sheet), pagina a sé o espandibile? Deve funzionare anche nel layout compatto in orizzontale (Fase 1.6).
3. **Struttura:** elenco unico o raggruppato (*Come si perde* / *Comandanti*)? Si mostrano i numeri di regola (utili in caso di discussione al tavolo)?
4. **Copy:** confermare o riscrivere i testi R1–R7 e il testo d'aiuto dei danni Commander.
5. **R7:** includerla anche se l'app non la traccia?
6. **Data delle regole:** mostrarla («Regole aggiornate al 25 settembre 2026»)?

## Vincoli tecnici (da Claude)

- I contenuti stanno in un modulo statico tipizzato, `src/content/rules.ts`, incluso nella build e quindi disponibile offline, senza rete.
- Le soglie sono generate dalle costanti del dominio: il riferimento non può contraddire le regole applicate.
- Il contenitore deve avere focus trap, chiusura con Esc e ritorno del focus. Si riusano i pattern di `ConfirmDialog` e `PreferencesMenu`.
- Testo leggibile a 200% di zoom; target ≥ 44 px; nessuna animazione obbligatoria.
