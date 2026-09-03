# Fitness & Nutrition Tracker — Design

Data: 2026-09-03
Stato: in revisione

## Contesto e obiettivo

App personale (single-user, Giuseppe) per seguire il piano alimentare e di allenamento definito in `piano_alimentare.md` (cartella padre, non incluso in questo repo per motivi di privacy — il repo è pubblico su GitHub Pages, i dati personali restano solo sul telefono dell'utente).

Uso primario: sul telefono, spesso in home gym o in cucina, con connessione non affidabile → deve funzionare offline dopo il primo caricamento.

## Piattaforma e stack

- **PWA** (Progressive Web App): HTML/CSS/JS vanilla, nessun framework, nessun build step.
- Service worker per cache offline degli asset statici.
- **localStorage** per tutti i dati utente (nessun account, nessun backend).
- Hosting: **GitHub Pages** (repo pubblico, dati utente non inclusi nel repo).
- Installabile su home screen del telefono via manifest.json.

## Motivazione dello stack

App per un solo utente, poche schermate, nessuna necessità di sync multi-dispositivo o backend. Un framework (React/Vue) o un backend aggiungerebbero build step e complessità di deploy senza benefici concreti a questa scala. YAGNI: niente account/login, niente sync cloud, niente pagamenti — se in futuro servisse (uso multi-utente), richiederebbe comunque una riprogettazione dell'architettura dati, non un'estensione incrementale di questa.

## Schermate

### 1. Oggi

- Selettore giornata: **Sera / Mattina a digiuno / Riposo** — determina quale pasto è pre/post-workout e la sua ricetta (vedi `piano_alimentare.md`, sezione "Variante: allenamento al mattino a digiuno"). Con "Mattina a digiuno", il Pasto 1 usa la ricetta alternativa (crema di riso 50g + whey 60g, zero cottura, albume opzionale non default) invece di quella standard, e l'app mostra il promemoria "+12g olio EVO a pranzo/cena" per compensare i grassi.
- Checklist dei 4 pasti fissi (nome, grammature, orario indicativo in base al selettore) con checkbox "fatto".
- Pulsante "+ aggiungi" per loggare cibo/nota fuori piano (testo libero, es. "couscous 150g" o "sgarro pizza").
- Campo peso corporeo (opzionale, se pesato oggi).

### 2. Allenamento

- La sessione del giorno è determinata automaticamente da:
  - Data di inizio del mesociclo (impostata una volta dall'utente).
  - Settimana corrente calcolata da quella data → fase (Fase 1 full body / Fase 2 upper-lower / deload) secondo la struttura in `piano_alimentare.md`.
- Lista esercizi della sessione, ciascuno con:
  - Range reps target (letto dalla config esercizio).
  - Input peso usato.
  - Input reps fatte, per ogni serie.
  - Input RPE (1-10).
  - Nota libera.
- A fine sessione (o per esercizio), calcolo doppia progressione (vedi Logica di progressione).
- Sezione separata per **sessioni extra leggere** (facoltative, Extra A/Extra B da `piano_alimentare.md`), stessa meccanica di input e progressione, tracciate indipendentemente dal mesociclo principale.
- Un esercizio pianificato ma non svolto (skip) non conta come fallimento — nessun dato registrato, si ritenta allo stesso peso/target la prossima occorrenza.
- **Semplificazione deliberata**: in Fase 2 l'app mostra contemporaneamente sia la sessione Upper sia la Lower e lascia all'utente la scelta di quale registrare, invece di dedurre quale tocchi oggi. Non è un bug: evita di dover tracciare una rotazione delle sessioni e resta corretto anche se l'utente salta o inverte un allenamento.
- **Esercizi senza carico esterno**: un esercizio con `tracciaProgressione: false` in `dati-default.js` (es. plank, dove `rangeMin`/`rangeMax` sono secondi di tenuta) non passa dalla doppia progressione: si registrano solo reps/RPE/nota, senza peso né azione di aumento/diminuzione.

### 3. Storico

- Grafico peso corporeo nel tempo.
- Log aderenza pasti (giorni completati / con deviazioni).
- Storico carichi e progressione per ogni esercizio (principali + extra), incluse note e RPE.
- Pulsante "esporta backup" (scarica JSON con tutti i dati salvati).

## Logica di progressione (doppia progressione)

Per ogni esercizio, config: `{nome, rangeMin, rangeMax, tipoIncremento: 'bilanciere'|'manubri', tracciaProgressione: bool}`.

Dopo una sessione con dati validi (non skip) su un esercizio:

1. Se **tutte le serie ≥ rangeMax** → prossima occorrenza: peso **+2.5kg** (bilanciere) o **+1-2kg** (manubri); target torna a rangeMin.
2. Se **almeno una serie < rangeMin**:
   - Se è il primo fallimento consecutivo → nessun cambio, si ritenta stesso peso/target.
   - Se è il secondo fallimento consecutivo (stesso esercizio, sessione precedente anch'essa fallita) → peso **-2.5kg** / **-1-2kg**, stesso target.
3. Altrimenti (dentro il range, non tutte al massimo) → nessun cambio.

Stato necessario per esercizio: `ultimoPeso`, `fallimentiConsecutivi` (0/1), `storico[]` (vedi modello dati).

## Logica mesociclo e deload

- Data di inizio mesociclo impostata una volta dall'utente (default: oggi, alla prima apertura).
- Settimana corrente = `floor((oggi - dataInizio) / 7) + 1`.
- Mapping settimana → fase, secondo `piano_alimentare.md`:
  - Settimane 1-2: Fase 1 (full body 3x/sett)
  - Settimane 3-4: Fase 2 (upper/lower 4x/sett)
  - Settimana 5: Deload
  - Oltre: Mesociclo 2 (da definire quando raggiunto — placeholder, non blocca l'uso dell'app)
- Durante la settimana di deload, tutte le serie mostrate sono ridotte automaticamente del 30% (arrotondato per difetto, minimo 1 serie), carico invariato rispetto all'ultimo valore registrato per quell'esercizio.

## Modello dati (localStorage)

```
{
  "mesociclo": { "dataInizio": "2026-09-08" },
  "esercizi": {
    "squat": {
      "nome": "Squat (bilanciere)", "rangeMin": 8, "rangeMax": 10, "tipo": "bilanciere",
      "ultimoPeso": 40, "fallimentiConsecutivi": 0,
      "storico": [ { "data": "...", "peso": 40, "reps": [10,10,9], "rpe": 7, "nota": "..." } ]
    }
  },
  "pasti": {
    "2026-09-03": { "tipoGiorno": "sera", "fatti": ["pasto1","pasto2"], "extra": [{"testo":"couscous 150g"}], "peso": 78.3 }
  }
}
```

Un solo namespace localStorage, letto/scritto come oggetto JSON unico (semplice, nessuna necessità di IndexedDB alla scala di questo utente).

## Gestione errori e casi limite

- Nessun dato salvato ancora (primo avvio) → l'app inizializza la config esercizi da un file statico `esercizi-default.json` basato su `piano_alimentare.md`, e chiede la data di inizio mesociclo.
- localStorage pieno/non disponibile (raro, ma possibile in modalità privata) → messaggio di errore visibile, nessun crash silenzioso.
- Export backup fallito → messaggio di errore, nessuna perdita di dati (l'export è solo lettura).

## Testing

- Nessun framework di test automatico dato lo stack vanilla e la scala del progetto — verifica manuale su dispositivo reale (checklist: installazione PWA, funzionamento offline dopo primo caricamento, calcolo corretto progressione su casi noti, calcolo corretto settimana/fase mesociclo, deload automatico).
- Unit test minimi in puro JS (nessuna dipendenza) per la sola logica di progressione e calcolo mesociclo, dato che sono le parti con regole precise e più a rischio di bug silenziosi.

## Fuori scope (deliberatamente)

- Account/login, sync multi-dispositivo, backend/cloud.
- Ricerca alimenti (USDA) dentro l'app — le grammature sono già calcolate nel piano.
- Notifiche push dall'app.
- Mesociclo 2/3 dettagliato oltre la settimana 5 — verrà definito quando raggiunto.
