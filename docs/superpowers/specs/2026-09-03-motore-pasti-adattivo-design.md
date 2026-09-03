# Motore pasti adattivo + peso per serie — Design

Data: 2026-09-03
Stato: in revisione
Supersede: sostituisce il modello "checklist 4 pasti fissi" descritto in `2026-09-03-fitness-tracker-app-design.md` (che resta valido per Allenamento/Storico/PWA, non toccati se non specificato qui).

## Contesto e obiettivo

L'app è in uso reale da qualche giorno. Feedback raccolto: il modello a 4 pasti fissi con selettore "Sera/Mattina a digiuno/Riposo" è rigido e poco intuitivo — non copre bene "mi alleno a un orario qualsiasi, non prestabilito". L'utente vuole invece: registrare cosa mangia davvero, sapere quanto gli manca rispetto al target giornaliero, e ricevere un consiglio su cosa mangiare — con la composizione che si adatta a quando/se si allena, non a un'etichetta di giornata scelta in anticipo.

In più: bug UX nel campo peso (corretto separatamente, non in questa spec) e mancanza di un campo peso per serie in Allenamento (in questa spec).

## Principio nutrizionale (confermato con l'utente)

- **Proteine**: distribuite in modo relativamente uniforme su tutti i pasti loggati.
- **Carboidrati**: "a domanda" — budget giornaliero unico (161g), non diviso in quote fisse uguali. Si concentrano nel pasto più vicino all'allenamento (prima/dopo), si riducono negli altri.
- **Grassi**: quasi a zero nel pasto immediatamente prima/dopo l'allenamento (assorbimento più lento, si vuole digestione rapida vicino alla palestra); il grasso "risparmiato" si sposta sugli altri pasti della giornata.
- **Giorno senza allenamento**: nessuna concentrazione — distribuzione normale/uniforme su tutti i pasti (comportamento equivalente a quello già validato nel piano originale).

## Modello dati alimenti (lista chiusa, valori USDA reali per 100g, a crudo/secco)

```javascript
export const databaseAlimenti = {
  pollo:       { nome: 'Petto di pollo',           kcal: 120, p: 22.5, f: 2.6,  c: 0,    tipo: 'proteina' },
  carneRossa:  { nome: 'Carne rossa macinata 95%',  kcal: 137, p: 21.4, f: 5.0,  c: 0,    tipo: 'proteina' },
  uovaIntere:  { nome: 'Uova intere',               kcal: 143, p: 12.6, f: 9.51, c: 0.72, tipo: 'proteina' },
  albume:      { nome: 'Albume liquido',            kcal: 52,  p: 10.9, f: 0.17, c: 0.73, tipo: 'proteina' },
  whey:        { nome: 'Whey (proteina in polvere)',kcal: 352, p: 78.1, f: 1.56, c: 6.25, tipo: 'proteina' },
  riso:        { nome: 'Riso bianco',               kcal: 360, p: 6.61, f: 0.58, c: 79.3, tipo: 'carbo' },
  pasta:       { nome: 'Pasta',                     kcal: 371, p: 13.0, f: 1.51, c: 74.7, tipo: 'carbo' },
  couscous:    { nome: 'Couscous',                  kcal: 376, p: 12.8, f: 0.64, c: 77.4, tipo: 'carbo' },
  cremaDiRiso: { nome: 'Crema di riso',              kcal: 359, p: 6.94, f: 1.3,  c: 79.8, tipo: 'carbo' },
  avena:       { nome: 'Fiocchi d\'avena',           kcal: 389, p: 16.9, f: 6.9,  c: 66.3, tipo: 'carbo' },
  olioEvo:     { nome: 'Olio EVO',                  kcal: 884, p: 0,    f: 100,  c: 0,    tipo: 'grasso' }
};
```

Ogni valore è **per 100g a crudo/secco** — stesso standard già usato nel piano (pesare sempre a crudo, dato fisso indipendente dalla cottura).

## Switch crudo/cotto

Rapporti di conversione (già usati nel piano originale, cotto = crudo × rapporto):

```javascript
export const rapportiCotturaCrudo = {
  pollo: 1.375, riso: 2.83, pasta: 2.36, carneRossa: 1.27, couscous: 3.36
};
// Alimenti senza voce qui (uova, albume, whey, avena, cremaDiRiso, olioEvo):
// peso invariato tra crudo e cotto, nessuno switch mostrato per quelli.
```

Nella UI di ogni alimento loggato: un toggle "crudo/cotto" che ricalcola solo il **peso mostrato** (`pesoCotto = pesoCrudo * rapporto`) — i macro restano sempre quelli calcolati sul peso a crudo (il valore nutrizionale non cambia con la cottura, cambia solo il peso in acqua).

## Arrotondamento

Tutte le grammature suggerite dal motore di raccomandazione si arrotondano **per difetto al multiplo di 5g più vicino** (`Math.floor(g / 5) * 5`). Le grammature che l'utente digita a mano per un alimento loggato NON vengono forzate/arrotondate — l'arrotondamento si applica solo ai suggerimenti generati dall'app.

## Modello dati (localStorage) — sostituisce `pasti[data]`

```javascript
{
  "pasti": {
    "2026-09-03": {
      "peso": 78.3,
      "pastiLoggati": 1,
      "alimenti": [
        { "ora": "12:30", "alimentoId": "pollo", "grammiCrudi": 200, "modalitaInserita": "crudo" },
        { "ora": "12:30", "alimentoId": "riso", "grammiCrudi": 90, "modalitaInserita": "crudo" }
      ],
      "eventiAllenamento": [
        { "ora": "18:05", "tipo": "post-workout-iniziato" }
      ]
    }
  }
}
```

- `alimenti[]`: log libero di tutto ciò che è stato mangiato, in ordine cronologico — non più raggruppato in "pasto1/2/3/4" fissi.
- `pastiLoggati`: contatore, sale di 1 ogni volta che si conferma un'aggiunta al log (da suggerimento o manuale) — usato per stimare quanti pasti restano oggi (vedi Motore di raccomandazione).
- `eventiAllenamento[]`: registra quando l'utente ha premuto "Mi alleno ora / Mi sono allenato" — usato per capire se il prossimo consiglio deve essere post-workout.
- Nessun campo `tipoGiorno`/`fatti` — rimossi, sostituiti da questo modello.
- `extra` (note libere fuori piano) resta come funzione separata e viene mantenuto: si può comunque aggiungere una nota testuale libera indipendente dal log strutturato, per cose che non rientrano nel database chiuso (es. "sgarro pizza").

## Calcolo del budget

```javascript
export function calcolaConsumato(alimentiOggi, databaseAlimenti) {
  return alimentiOggi.reduce((tot, voce) => {
    const alimento = databaseAlimenti[voce.alimentoId];
    const fattore = voce.grammiCrudi / 100;
    return {
      kcal: tot.kcal + alimento.kcal * fattore,
      p: tot.p + alimento.p * fattore,
      f: tot.f + alimento.f * fattore,
      c: tot.c + alimento.c * fattore
    };
  }, { kcal: 0, p: 0, f: 0, c: 0 });
}

export function calcolaRimasto(target, consumato) {
  return {
    kcal: target.kcal - consumato.kcal,
    p: target.p - consumato.p,
    f: target.f - consumato.f,
    c: target.c - consumato.c
  };
}
```

Target fisso giornaliero (dal piano): `{ kcal: 2145, p: 214, f: 72, c: 161 }`.

## Motore di raccomandazione (a regole, con numeri presi dal piano già validato — non inventati ora)

**Principio**: l'app deve **sempre** proporre un pasto concreto (alimento + grammi), non solo mostrare il budget e aspettare che l'utente capisca da solo. Il log libero resta disponibile come alternativa, ma il consiglio è la funzione primaria, non opzionale.

**Da dove vengono i numeri**: non un'euristica nuova — sono gli stessi rapporti già usati (e validati con l'utente) nel piano fisso originale, resi dinamici:
- **Proteine**: spalmate in dose costante su ogni pasto — nel piano originale ~50-65g a pasto su 4 pasti/2145kcal. Si generalizza come: `proteine rimaste ÷ pasti rimanenti stimati oggi`.
- **Carboidrati**: nel piano originale il pasto post-workout (Pasto 4) aveva 48g di carbo contro i 31g degli altri pasti — un rapporto reale di **1,5:1**, non un numero a caso. Si applica lo stesso peso: il pasto immediatamente dopo l'allenamento riceve una quota di carbo 1,5 volte maggiore rispetto a un pasto normale, il resto del budget si spalma sugli altri pasti stimati.
- **Grassi**: quasi zero nel pasto post-workout (come già stabilito), il resto si spalma sui pasti non a ridosso dell'allenamento.

**Pasti rimanenti stimati**: si assume una routine di **4 pasti/giorno** (base già validata con l'utente per il target calorico), meno quelli già loggati oggi (`data.pasti[oggi].pastiLoggati`, un contatore che sale di 1 ogni volta che si preme "Aggiungi al log", sia da suggerimento che da log libero). Non si chiede mai esplicitamente all'utente "quanti pasti farai oggi".

```javascript
// Rapporto reale derivato dal piano originale: Pasto post-workout 48g carbo
// vs Pasto normale 31g carbo, su 4 pasti — non un valore inventato ora.
const PESO_CARBO_POST_WORKOUT = 1.5;
const PESO_CARBO_NORMALE = 1;
const PASTI_AL_GIORNO = 4;

// combo = { proteina: alimentoId, carbo: alimentoId | null, grassoZero: bool }
export function suggerisciPasto({ rimasto, pastiLoggatiOggi, isPostWorkout, combo, databaseAlimenti }) {
  const pastiRimanenti = Math.max(1, PASTI_AL_GIORNO - pastiLoggatiOggi);

  // Proteine: dose costante, spalmata sui pasti rimanenti stimati.
  const pTarget = Math.max(0, rimasto.p / pastiRimanenti);

  // Carbo: quota pesata (1,5x se post-workout) sul budget rimasto, non semplice divisione.
  const pesoQuestoPasto = isPostWorkout ? PESO_CARBO_POST_WORKOUT : PESO_CARBO_NORMALE;
  const pesoTotaleStimato = isPostWorkout
    ? PESO_CARBO_POST_WORKOUT + PESO_CARBO_NORMALE * (pastiRimanenti - 1)
    : PESO_CARBO_NORMALE * pastiRimanenti;
  const cTarget = Math.max(0, rimasto.c * (pesoQuestoPasto / Math.max(1, pesoTotaleStimato)));

  const proteina = databaseAlimenti[combo.proteina];
  const carbo = combo.carbo ? databaseAlimenti[combo.carbo] : null;
  const grammiProteina = proteina.p > 0 ? (pTarget / proteina.p) * 100 : 0;
  const grammiCarbo = carbo && carbo.c > 0 ? (cTarget / carbo.c) * 100 : 0;

  const arrotonda = (g) => Math.floor(g / 5) * 5;
  return {
    proteina: { alimentoId: combo.proteina, grammiCrudi: arrotonda(grammiProteina) },
    carbo: carbo ? { alimentoId: combo.carbo, grammiCrudi: arrotonda(grammiCarbo) } : null,
    nota: combo.grassoZero ? 'Pasto post-workout: niente olio/grassi aggiunti.' : null
  };
}
```

**Combo predefinite** (rotazione per varietà, stesso ordine di preferenza del piano originale):

```javascript
export const combosPasto = {
  normale: [
    { proteina: 'pollo', carbo: 'riso', grassoZero: false },
    { proteina: 'pollo', carbo: 'pasta', grassoZero: false },
    { proteina: 'carneRossa', carbo: 'couscous', grassoZero: false }
  ],
  postWorkout: [
    { proteina: 'whey', carbo: 'cremaDiRiso', grassoZero: true },
    { proteina: 'pollo', carbo: 'riso', grassoZero: true } // stessa coppia ma senza olio
  ],
  colazioneDefault: { proteina: 'uovaIntere', carbo: 'avena', grassoZero: false }
};
```

La UI mostra il suggerimento (alimento + grammi arrotondati) **sempre**, con un pulsante "Aggiungi al log" che lo registra così com'è, "Cambia proposta" per ruotare alla combo successiva, e la possibilità di modificare i grammi proposti prima di confermare. Il log libero manuale resta disponibile in aggiunta, non al posto del consiglio.

## Trigger allenamento

- Pulsante in Allenamento (o in Oggi): **"Mi sto allenando ora"** e **"Ho finito di allenarmi"**.
- Alla pressione di "Ho finito di allenarmi": si registra un evento in `eventiAllenamento`, e il prossimo suggerimento pasto (`suggerisciPasto` con `isPostWorkout: true`) usa `combosPasto.postWorkout` con il peso carbo 1,5x, finché non viene loggato almeno un pasto dopo quell'evento (poi torna a `normale` per i pasti successivi della giornata).
- **Allenamento a digiuno** (nessun alimento loggato prima dell'evento allenamento): gestito naturalmente — `consumato` è ancora zero, `rimasto` è l'intero target, `pastiLoggatiOggi` è 0 → il primo suggerimento post-workout usa l'intero budget rimanente con la quota 1,5x. Nessuna logica speciale aggiuntiva necessaria.
- **Giorno senza allenamento**: nessun evento registrato → tutti i suggerimenti usano `combosPasto.normale` e peso carbo 1 (uniforme), stesso comportamento del piano originale nei giorni di riposo.

## Schermata Oggi — nuova struttura

Sostituisce interamente la vecchia checklist a 4 pasti fissi:

1. **Peso di oggi** — invariato (già corretto separatamente).
2. **Cosa mangiare adesso** (in cima, la cosa più prominente della schermata): il suggerimento di `suggerisciPasto` — alimento+grammi, con pulsante "Aggiungi al log" e "Cambia proposta" (ruota alla combo successiva). Sempre presente, mai vuoto.
3. **Riepilogo budget**: "Consumato oggi: X kcal / Yg P / Zg F / Wg C — Ti restano: ..." — subito sotto il consiglio, per contesto.
4. **Pulsanti allenamento**: "Mi sto allenando ora" / "Ho finito di allenarmi".
5. **Log libero**: form con select alimento (dal `databaseAlimenti`) + campo grammi + toggle crudo/cotto + pulsante "Aggiungi" — per loggare manualmente qualsiasi cosa, coerente o no col suggerimento. Disponibile ma secondario rispetto al consiglio.
6. **Lista alimenti loggati oggi**, con possibilità di rimuovere una voce (stesso pattern sicuro già usato per il campo "extra": `textContent`, mai `innerHTML` su testo libero).
7. **Nota libera fuori piano** (invariata, per cose fuori dal database chiuso).

## Allenamento — peso per serie

- Aggiunto un campo **peso (kg)** per ogni serie (oltre a reps), **precompilato uguale al valore della prima serie** appena la si modifica, ma sempre editabile singolarmente per serie (per drop set: prima serie 10kg, poi si corregge la seconda/terza a mano).
- **Doppia progressione**: valuta **solo la prima serie** (peso e reps) rispetto a `rangeMin`/`rangeMax` — le serie successive (eventuali drop set) si registrano nello storico per completezza ma non influenzano la decisione di aumentare/diminuire il carico. Questo evita che un drop set a peso ridotto con tante reps venga letto come "hai polverizzato il target, aumenta il peso".
- `calcolaProgressione` non cambia firma (riceve ancora `{ reps }` sull'array delle reps) — cambia solo COSA gli viene passato dal chiamante: `{ reps: [primaSerieReps] }` invece che tutte le serie. Le serie 2+ vengono salvate in `storico` con il loro peso specifico ma non transitano più per `calcolaProgressione`.
- Idea futura (non in questa spec): l'app potrebbe un giorno suggerire lei stessa quando fare un drop set. Annotata qui come nota per dopo, fuori scope ora.

## Fuori scope (deliberatamente, per questa spec)

- Ricerca alimenti aperta (resta lista chiusa, coerente con la spec originale).
- Ottimizzazione matematica del pasto rispetto ai pasti rimanenti della giornata (nessun conteggio "quanti pasti mancano oggi").
- Suggerimento automatico di quando fare un drop set.
- Modifica dello Storico (già mostra RPE/nota/peso, resta compatibile: lo storico di ogni esercizio continua a includere tutte le serie salvate, comprese quelle non usate per la progressione).

## Migrazione dati esistenti

Le installazioni con dati salvati nel vecchio formato (`pasti[data] = {tipoGiorno, fatti, extra, peso}`) vanno gestite in `storage.js`: se una voce `pasti[data]` esiste nel vecchio formato (ha `tipoGiorno` invece di `alimenti`), si converte al volo in `{ peso: valoreEsistente, alimenti: [], eventiAllenamento: [] }` — si perde lo storico dei vecchi "pasti fatti" (erano solo checkbox, nessun dato nutrizionale recuperabile), ma si preserva il peso storico già loggato. Necessario perché l'app è già in uso reale (non è più un progetto solo locale).
