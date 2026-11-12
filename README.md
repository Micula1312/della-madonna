# della madonna ✳

Griglia partecipativa di affermazioni: il pubblico sceglie una casella dal telefono e la frase si rivela sulla proiezione. Prima versione con 24 testi provvisori.

## Avvio

Richiede Node.js 22 o superiore. Nessuna dipendenza da installare.

```sh
npm start
```

Il terminale stampa indirizzo locale, indirizzo di rete e chiave privata della regia. Aprire:

- `/` sui telefoni: selezione e conferma dello scarto.
- `/proiezione` sul computer collegato al proiettore, in schermo intero.
- `/regia` per pausa, ripresa e reset; inserire la chiave stampata nel terminale.

Il computer e i telefoni devono essere sulla stessa rete Wi-Fi. Usare sui telefoni l'indirizzo di rete stampato, non localhost. Consentire la porta TCP 3000 nel firewall del computer sulla rete privata; disattivare l'isolamento client del router se impedisce ai telefoni di raggiungerlo.

Per una chiave regia stabile, impostare ADMIN_TOKEN nell'ambiente prima dell'avvio. PORT cambia la porta (default 3000). La pausa blocca nuove scelte e la coda; una rivelazione già avviata termina normalmente.

## Contenuti e funzionamento

Modificare `phrases.json` e riavviare. Il numero di caselle segue la lunghezza dell'elenco. Fare reset prima di cambiare numero o ordine dei testi. Le frasi si inseriscono come testo, senza interpretare HTML.

Il server prenota ogni casella una volta sola, serializza gli scarti e aggiorna tutti i dispositivi tramite Server-Sent Events. Una frase resta in evidenza per 6,5 secondi. Stato e coda vengono salvati in `data/state.json` e ripresi al riavvio. Il reset li cancella. Un solo processo server deve usare la cartella dati.

## QR e rete

Questa versione comprende il sito e la sincronizzazione. Configurazione dell'access point, QR Wi-Fi, QR dell'indirizzo e captive portal sono passaggi successivi, da adattare all'hardware e all'indirizzo definitivo. La pagina non collega automaticamente il telefono al Wi-Fi.

## Limiti del prototipo

Pensato per un'installazione su rete locale fidata. L'accesso pubblico non richiede un account; non limita gli scarti per persona. Prima di esporlo su internet servono HTTPS, limitazione delle richieste e una scelta sul modello di partecipazione. La versione online autonoma con rivelazione sul telefono resta da aggiungere: qui la rivelazione principale è sulla pagina di proiezione. GitHub conserva il codice: GitHub Pages non esegue questo server Node.
