# Redesign UI — Fitness Tracker

## Contesto e problema

L'app funziona (budget adattivo, progressione carichi, mesociclo, storico) ma la
UI è quasi senza stile: CSS minimo (`css/style.css`), nessuna gerarchia
visiva, form densi con input impilati senza raggruppamento, nessuna guida su
cosa fare in un dato momento. Feedback utente: "app a vista molto basica e
poco chiara, molto confusionaria".

Punti di confusione identificati (in ordine di priorità dall'utente):
1. Non è chiaro cosa fare adesso (l'app non guida attraverso la giornata)
2. Troppa roba tutta insieme nella schermata Oggi
3. L'allenamento è un muro di input (tutti gli esercizi aperti insieme)

## Vincoli

- **Zero build step**: il progetto è servito così com'è (`index.html` +
  `js/` + `css/`), deploy diretto su GitHub Pages, test locale con
  `python -m http.server`. Nessun bundler, nessuna dipendenza da CDN esterna
  a runtime — l'app è una PWA installabile e usata offline via service
  worker, quindi tutto ciò che serve deve essere cacheable localmente.
- Non toccare la logica esistente (`budget.js`, `progressione.js`,
  `mesociclo.js`, `storage.js`) — è solo un redesign visivo/di struttura,
  i moduli di rendering (`oggi.js`, `allenamento.js`, `storico.js`) vengono
  riscritti nel markup che producono, non nella logica dati.

## Approccio scelto

CSS custom scritto a mano (nessun framework), con un design system a
variabili CSS (colori, spaziatura, raggi, ombre) applicato in modo coerente
dai tre moduli di rendering. Alternative scartate: framework CSS via CDN
(rischio offline-first rotto), riscrittura a componenti con build step
(sproporzionato per un problema puramente visivo).

## Design tokens

Palette validata su riferimento "Fitness/Gym App" (energy orange + success
green), con varianti chiaro/scuro selezionate automaticamente via
`prefers-color-scheme` (nessun toggle manuale):

| Token | Chiaro | Scuro |
|---|---|---|
| `--color-primary` (allenamento/azione) | `#F97316` | `#F97316` |
| `--color-accent` (successo/ok) | `#22C55E` | `#22C55E` |
| `--color-destructive` (errore/rimuovi) | `#EF4444` | `#EF4444` |
| `--color-warning` (attenzione) | `#F59E0B` | `#F59E0B` |
| `--color-background` | `#F8FAFC` | `#1F2937` |
| `--color-foreground` (testo) | `#0F172A` | `#F8FAFC` |
| `--color-card` | `#FFFFFF` | `#313742` |
| `--color-muted` | `#F1F5F9` | `#37414F` |
| `--color-border` | `#E2E8F0` | `#374151` |

Testo su primario/accento: `#0F172A` (contrasto verificato ≥4.5:1 contro
entrambi). Regola vincolante: nessuno stato (sopra/sotto budget, serie
completata, errore) è indicato solo dal colore — sempre accoppiato a
un'icona o a un testo.

Tipografia: **Barlow Condensed** (titoli, numeri grandi — kcal, peso, kg)
+ **Barlow** (testo corpo), self-hosted (file `.woff2` nel repo, non
caricati da Google Fonts CDN a runtime) e cacheati dal service worker.

Spaziatura: scala 4/8px. Raggio card: 12px. Ombra leggera solo in tema
chiaro; in scuro si usa `--color-border` come contorno al posto
dell'ombra (più leggibile su sfondo scuro).

Icone: set minimale di 5 SVG inline disegnate a mano (bilancia, forchetta,
manubrio, grafico a linea, spunta) — stroke 1.5px coerente, nessuna
libreria esterna. Vivono in `js/icons.js` come funzioni che ritornano
markup SVG, riusate dai tre moduli di rendering e dalla nav.

## Schermata Oggi

Introduce una card "Adesso" in cima, con una singola azione in evidenza
calcolata dallo stato del giorno (nuova funzione `prossimaAzione(giorno)`
in `oggi.js`):

1. Peso non ancora salvato oggi → "Pesati stamattina" + input peso inline
2. Allenamento in corso (`eventiAllenamento` ha `inizio-allenamento` senza
   `post-workout-iniziato` successivo) → "Sei in allenamento" + bottone
   grande "Ho finito di allenarmi"
3. Post-workout appena iniziato → suggerimento pasto post-workout mostrato
   direttamente nella card Adesso (non serve scrollare per trovarlo)
4. Altrimenti → prossimo pasto suggerito (logica esistente in `budget.js`,
   invariata)

Sotto la card Adesso, il resto diventa sezioni `<details>` comprimibili
(chiuse di default se vuote, aperte se contengono dati rilevanti oggi):
Budget di oggi (sempre visibile, non comprimibile — è il riferimento
costante), Mangiato oggi, Aggiungi manualmente, Note fuori piano.

Il bottone "Mi sto allenando ora" si sposta dalla schermata Oggi alla
schermata Allenamento (ha più senso lì); "Ho finito di allenarmi" resta
raggiungibile sia dalla card Adesso (quando in corso) sia dalla schermata
Allenamento.

Il budget mostra una barra di progresso per le kcal (colore + valore
numerico accanto, mai solo colore) oltre ai grammi di P/F/C in testo.

## Schermata Allenamento

Ogni esercizio è un blocco apri/chiudi (`<details>`):

- Il primo esercizio non ancora salvato oggi si apre automaticamente
  (`open` impostato in JS al render, non nel markup statico); gli altri
  restano chiusi con un riepilogo compatto (nome + ultimo peso, o spunta
  verde se già salvato oggi)
- Al salvataggio (`btn-salva` esistente), l'esercizio si chiude e si apre
  automaticamente il successivo non ancora fatto — comportamento nuovo
  aggiunto in `renderSessione`, la logica di salvataggio/progressione
  resta quella di `progressione.js`, invariata
- Tap su un esercizio chiuso lo riapre in qualsiasi momento
- La sessione "alternativa" (es. Lower quando è consigliata Upper) e le
  sessioni extra restano in una sezione comprimibile separata, chiusa di
  default

I campi peso/reps per serie passano da impilati verticalmente a righe
affiancate (`grid` 2 colonne per serie) per ridurre lo scroll.

## Schermata Storico

Stessa struttura funzionale attuale (grafico peso, aderenza pasti, storico
carichi, backup), ristilizzata con gli stessi token. Unica modifica
funzionale: `disegnaGraficoPeso` legge il colore della linea da
`getComputedStyle(canvas).getPropertyValue('--color-primary')` invece del
valore fisso `#2563eb`, così il grafico segue il tema chiaro/scuro attivo.

## Navigazione

Da tab in alto a barra di navigazione fissa in basso, 3 voci (icona SVG +
etichetta): Oggi, Allenamento, Storico. Voce attiva evidenziata con
`--color-primary`. Il contenuto ha `padding-bottom` sufficiente a non
finire nascosto dietro la barra; la barra stessa rispetta
`env(safe-area-inset-bottom)` per i telefoni con gesture bar/tacca.

## Accessibilità e dettagli tecnici

- Contrasto testo ≥4.5:1 verificato per ogni coppia foreground/background
  della tabella token, in entrambi i temi
- Focus visibile (`:focus-visible`) su ogni elemento interattivo, colore
  `--color-primary`
- `prefers-reduced-motion: reduce` disattiva le transizioni di
  apertura/chiusura delle sezioni comprimibili e l'animazione della barra
  di progresso (si aggiorna istantaneamente invece che animata)
- Tutti gli input numerici (peso, grammi, reps, RPE) hanno l'attributo
  `inputmode` coerente col tipo di tastiera richiesta (esteso agli input
  che oggi ne sono privi, es. reps/peso serie in `allenamento.js`)
- Target di tap minimo 44×44px mantenuto (già presente su `button` in
  `style.css`, da verificare sui bottoni "mostra cotto/mostra crudo" più
  piccoli nella lista alimenti)

## Testing

Nessuna logica dati cambia, quindi la suite esistente (`npm test`) deve
continuare a passare invariata — copre budget/progressione/mesociclo/
storage, non il rendering. Verifica manuale nel browser (locale via
`python -m http.server`) per le tre schermate, in chiaro e scuro, su
viewport 375px, prima di considerare il redesign completo.
