# Fitness & Nutrition Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal PWA (installable, offline-capable) that tracks Giuseppe's meals, workouts, and body weight, calculates progressive overload automatically (double progression), and tracks mesocycle/deload phases — all data stored locally on his phone.

**Architecture:** Vanilla HTML/CSS/JS, ES modules, no framework, no build step, no backend. Pure-logic modules (`progressione.js`, `mesociclo.js`) are unit-tested with Node's built-in test runner; UI modules render into DOM containers and are verified manually in a browser. Single JSON blob in `localStorage` is the only persistence layer.

**Tech Stack:** HTML5, CSS3, JavaScript (ES modules), Node.js built-in test runner (`node --test`) for unit tests, Service Worker + Web App Manifest for PWA/offline, GitHub Pages for hosting.

**Spec:** `docs/superpowers/specs/2026-09-03-fitness-tracker-app-design.md`

## Global Constraints

- No external dependencies/libraries — vanilla JS only (spec: "nessun framework, nessun build step").
- No backend, no accounts, no cloud sync — single-user, `localStorage` only (spec: "Fuori scope").
- Must work offline after first load (spec: connessione non affidabile in home gym).
- All data in one `localStorage` key as a single JSON object (spec: modello dati).
- Repo is public on GitHub Pages — no personal data (weights, logs) committed to the repo; only app code and default/empty config.
- Increment amounts: **+2.5kg bilanciere / +1.5kg manubri** (spec gave a 1-2kg range for dumbbells; 1.5kg is the concrete implementation value — document this choice, it's a deliberate midpoint, not a placeholder).
- Deload: **-30% serie** (`Math.round(serie * 0.7)`, minimo 1), carico invariato.

**Semplificazione deliberata per l'MVP**: ogni esercizio ha un unico range di reps target (`rangeMin`/`rangeMax`) usato sia in Fase 1 che Fase 2, anche se il piano originale usa range leggermente diversi tra le due fasi per alcuni esercizi (es. squat 8-10 in Fase 1 vs 6-10 in Fase 2). Si usa il range di Fase 2 (la fase "a regime") per tutti gli esercizi condivisi, così la doppia progressione resta coerente lungo tutto il mesociclo invece di "resettarsi" al cambio fase. Il numero di **serie** mostrato segue comunque la tabella specifica di ogni fase (quello sì cambia tra Fase 1 e Fase 2).

---

## File Structure

```
app/
├── package.json                 # type: module, no deps, npm test script
├── index.html                   # app shell, tab nav, mounts js/app.js
├── manifest.json                # PWA manifest
├── sw.js                        # service worker, offline cache
├── icons/
│   └── icon.svg                 # single scalable icon, used for all manifest sizes
├── css/
│   └── style.css                # mobile-first styles
├── js/
│   ├── progressione.js          # pure: doppia progressione (unit tested)
│   ├── progressione.test.js
│   ├── mesociclo.js             # pure: settimana/fase/deload (unit tested)
│   ├── mesociclo.test.js
│   ├── storage.js                # localStorage load/save/default (unit tested)
│   ├── storage.test.js
│   ├── dati-default.js          # config esercizi/sessioni/pasti da piano_alimentare.md
│   ├── app.js                   # bootstrap, tab nav, wiring
│   ├── oggi.js                  # schermata Oggi
│   ├── allenamento.js           # schermata Allenamento
│   └── storico.js               # schermata Storico
└── README.md                    # come testare in locale, come pubblicare
```

---

### Task 1: Progetto scaffold, dati di default, storage layer

**Files:**
- Create: `package.json`
- Create: `js/dati-default.js`
- Create: `js/storage.js`
- Test: `js/storage.test.js`

**Interfaces:**
- Produces: `datiDefault` object (`{ esercizi, sessioniPerFase, sessioniExtra, pasti }`) from `js/dati-default.js`, consumed by every later task.
- Produces: `getDefaultData(datiDefault)`, `loadData(datiDefault, storageBackend?)`, `saveData(data, storageBackend?)` from `js/storage.js`, consumed by `app.js` and all screen modules.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "fitness-tracker",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test js/"
  }
}
```

- [ ] **Step 2: Create `js/dati-default.js` with the full exercise/session/meal config**

```javascript
export const datiDefault = {
  esercizi: {
    squat: { nome: 'Squat (bilanciere)', rangeMin: 6, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, storico: [] },
    panca: { nome: 'Panca piana (bilanciere)', rangeMin: 6, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, storico: [] },
    rematore: { nome: 'Rematore bilanciere', rangeMin: 8, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, storico: [] },
    militarypress: { nome: 'Military Press (manubri)', rangeMin: 8, rangeMax: 10, tipo: 'manubri', ultimoPeso: 8, fallimentiConsecutivi: 0, storico: [] },
    affondi: { nome: 'Affondi camminati (manubri)', rangeMin: 10, rangeMax: 12, tipo: 'manubri', ultimoPeso: 8, fallimentiConsecutivi: 0, storico: [] },
    latmachine: { nome: 'Lat machine / Trazioni al cavo', rangeMin: 10, rangeMax: 12, tipo: 'manubri', ultimoPeso: 20, fallimentiConsecutivi: 0, storico: [] },
    staccorumeno: { nome: 'Stacco rumeno (bilanciere)', rangeMin: 8, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, storico: [] },
    goodmorning: { nome: 'Good morning (bilanciere)', rangeMin: 10, rangeMax: 12, tipo: 'bilanciere', ultimoPeso: 10, fallimentiConsecutivi: 0, storico: [] },
    calfraise: { nome: 'Calf raise', rangeMin: 15, rangeMax: 20, tipo: 'manubri', ultimoPeso: 10, fallimentiConsecutivi: 0, storico: [] },
    plank: { nome: 'Plank', rangeMin: 30, rangeMax: 45, tipo: 'manubri', ultimoPeso: 0, fallimentiConsecutivi: 0, storico: [] },
    curlbicipiti: { nome: 'Curl bicipiti (manubri)', rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 6, fallimentiConsecutivi: 0, storico: [] },
    pushdown: { nome: 'Push down tricipiti (cavo)', rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 6, fallimentiConsecutivi: 0, storico: [] },
    alzatelaterali: { nome: 'Alzate laterali (manubri)', rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 4, fallimentiConsecutivi: 0, storico: [] },
    shrug: { nome: 'Shrug (bilanciere)', rangeMin: 12, rangeMax: 15, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, storico: [] }
  },
  sessioniPerFase: {
    fase1: [
      { nome: 'Full Body', esercizi: [
        { id: 'squat', serie: 3 }, { id: 'panca', serie: 3 }, { id: 'rematore', serie: 3 },
        { id: 'militarypress', serie: 3 }, { id: 'affondi', serie: 3 }, { id: 'plank', serie: 3 }
      ] }
    ],
    fase2: [
      { nome: 'Upper', esercizi: [
        { id: 'panca', serie: 4 }, { id: 'rematore', serie: 4 }, { id: 'militarypress', serie: 3 },
        { id: 'latmachine', serie: 3 }, { id: 'curlbicipiti', serie: 2 }, { id: 'pushdown', serie: 2 }
      ] },
      { nome: 'Lower', esercizi: [
        { id: 'squat', serie: 4 }, { id: 'staccorumeno', serie: 3 }, { id: 'affondi', serie: 3 },
        { id: 'goodmorning', serie: 3 }, { id: 'calfraise', serie: 3 }, { id: 'plank', serie: 3 }
      ] }
    ]
  },
  sessioniExtra: {
    extraA: { nome: 'Extra A — Braccia/Core', esercizi: [
      { id: 'curlbicipiti', serie: 3 }, { id: 'pushdown', serie: 3 }, { id: 'calfraise', serie: 3 }, { id: 'plank', serie: 3 }
    ] },
    extraB: { nome: 'Extra B — Spalle/Core', esercizi: [
      { id: 'alzatelaterali', serie: 3 }, { id: 'shrug', serie: 3 }, { id: 'calfraise', serie: 3 }
    ] }
  },
  pasti: {
    sera: [
      { id: 'pasto1', nome: 'Pasto 1 (06:00)', desc: '2 uova intere + 250g albume + 35g fiocchi d\'avena' },
      { id: 'pasto2', nome: 'Pasto 2 (11:00)', desc: '260g pollo crudo + 60g riso crudo + 15g olio EVO' },
      { id: 'pasto3', nome: 'Pasto 3 pre-workout (15:30)', desc: '165g pollo crudo + 42g pasta cruda + 10g olio EVO' },
      { id: 'pasto4', nome: 'Pasto 4 post-workout (19:00)', desc: '273g carne rossa magra cruda + 61g couscous crudo + 8g olio EVO' }
    ],
    riposo: [
      { id: 'pasto1', nome: 'Pasto 1 (06:00)', desc: '2 uova intere + 250g albume + 35g fiocchi d\'avena' },
      { id: 'pasto2', nome: 'Pasto 2 (11:00)', desc: '260g pollo crudo + 60g riso crudo + 15g olio EVO' },
      { id: 'pasto3', nome: 'Pasto 3 (15:30)', desc: '165g pollo crudo + 42g pasta cruda + 10g olio EVO' },
      { id: 'pasto4', nome: 'Pasto 4 (19:00)', desc: '273g carne rossa magra cruda + 61g couscous crudo + 8g olio EVO' }
    ],
    mattina: [
      { id: 'pasto1', nome: 'Pasto 1 post-workout (subito dopo l\'allenamento)', desc: '50g crema di riso + 60g whey — zero cottura' },
      { id: 'pasto2', nome: 'Pasto 2 (11:00)', desc: '260g pollo crudo + 60g riso crudo + 15g olio EVO' },
      { id: 'pasto3', nome: 'Pasto 3 (15:30)', desc: '165g pollo crudo + 42g pasta cruda + 10g olio EVO' },
      { id: 'pasto4', nome: 'Pasto 4 (19:00, cena)', desc: '273g carne rossa magra cruda + 61g couscous crudo + 20g olio EVO (8g + 12g compensazione grassi)' }
    ]
  }
};
```

- [ ] **Step 3: Write the failing tests for `js/storage.js`**

```javascript
// js/storage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultData, loadData, saveData } from './storage.js';
import { datiDefault } from './dati-default.js';

function fakeBackend() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v)
  };
}

test('getDefaultData restituisce la struttura base', () => {
  const data = getDefaultData(datiDefault);
  assert.equal(data.mesociclo.dataInizio, null);
  assert.deepEqual(data.pasti, {});
  assert.ok(data.esercizi.squat);
  assert.equal(data.esercizi.squat.rangeMin, 6);
});

test('loadData su backend vuoto restituisce i default', () => {
  const backend = fakeBackend();
  const data = loadData(datiDefault, backend);
  assert.equal(data.mesociclo.dataInizio, null);
});

test('saveData poi loadData fa un round-trip corretto', () => {
  const backend = fakeBackend();
  const data = getDefaultData(datiDefault);
  data.mesociclo.dataInizio = '2026-09-08';
  saveData(data, backend);
  const ricaricato = loadData(datiDefault, backend);
  assert.equal(ricaricato.mesociclo.dataInizio, '2026-09-08');
});

test('loadData con JSON corrotto lancia un errore leggibile', () => {
  const backend = fakeBackend();
  backend.setItem('fitnessTrackerData', '{ non valido');
  assert.throws(() => loadData(datiDefault, backend), /corrotti/);
});

test('loadData senza storage disponibile lancia un errore leggibile', () => {
  assert.throws(() => loadData(datiDefault, null), /non disponibile/);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `js/storage.js` non esiste ancora.

- [ ] **Step 5: Implement `js/storage.js`**

```javascript
const STORAGE_KEY = 'fitnessTrackerData';

export function getDefaultData(datiDefault) {
  return {
    mesociclo: { dataInizio: null },
    esercizi: structuredClone(datiDefault.esercizi),
    pasti: {}
  };
}

function resolveBackend(storageBackend) {
  if (storageBackend !== undefined) return storageBackend;
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function loadData(datiDefault, storageBackend) {
  const backend = resolveBackend(storageBackend);
  if (!backend) {
    throw new Error('Storage non disponibile su questo dispositivo/browser.');
  }
  const raw = backend.getItem(STORAGE_KEY);
  if (!raw) return getDefaultData(datiDefault);
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('Dati salvati corrotti, impossibile leggerli.');
  }
}

export function saveData(data, storageBackend) {
  const backend = resolveBackend(storageBackend);
  if (!backend) {
    throw new Error('Storage non disponibile su questo dispositivo/browser.');
  }
  backend.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — tutti i 5 test verdi.

- [ ] **Step 7: Commit**

```bash
git add package.json js/dati-default.js js/storage.js js/storage.test.js
git commit -m "feat: scaffold progetto, dati default, storage layer"
```

---

### Task 2: Algoritmo di doppia progressione

**Files:**
- Create: `js/progressione.js`
- Test: `js/progressione.test.js`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task (funzione pura).
- Produces: `calcolaProgressione(esercizio, sessione)` da `js/progressione.js`, con firma `{ rangeMin, rangeMax, tipo, ultimoPeso, fallimentiConsecutivi } → { nuovoPeso, nuoviFallimentiConsecutivi, azione }` dove `azione` è `'aumenta' | 'diminuisci' | 'invariato'`. Consumato da `allenamento.js` (Task 6).

- [ ] **Step 1: Write the failing tests**

```javascript
// js/progressione.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaProgressione } from './progressione.js';

const esercizioBilanciere = { rangeMin: 8, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 40, fallimentiConsecutivi: 0 };
const esercizioManubri = { rangeMin: 8, rangeMax: 10, tipo: 'manubri', ultimoPeso: 10, fallimentiConsecutivi: 0 };

test('tutte le serie al massimo del range aumenta il peso (bilanciere +2.5kg)', () => {
  const r = calcolaProgressione(esercizioBilanciere, { reps: [10, 10, 10] });
  assert.equal(r.azione, 'aumenta');
  assert.equal(r.nuovoPeso, 42.5);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});

test('tutte le serie al massimo del range aumenta il peso (manubri +1.5kg)', () => {
  const r = calcolaProgressione(esercizioManubri, { reps: [10, 10, 10] });
  assert.equal(r.azione, 'aumenta');
  assert.equal(r.nuovoPeso, 11.5);
});

test('una serie sotto il minimo, primo fallimento: peso invariato, contatore a 1', () => {
  const r = calcolaProgressione(esercizioBilanciere, { reps: [7, 9, 9] });
  assert.equal(r.azione, 'invariato');
  assert.equal(r.nuovoPeso, 40);
  assert.equal(r.nuoviFallimentiConsecutivi, 1);
});

test('una serie sotto il minimo, secondo fallimento consecutivo: peso diminuisce e contatore torna a 0', () => {
  const esercizioConUnFallimento = { ...esercizioBilanciere, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(esercizioConUnFallimento, { reps: [7, 9, 9] });
  assert.equal(r.azione, 'diminuisci');
  assert.equal(r.nuovoPeso, 37.5);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});

test('nel mezzo del range (non tutte al massimo, nessuna sotto il minimo): invariato, contatore azzerato', () => {
  const esercizioConUnFallimento = { ...esercizioBilanciere, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(esercizioConUnFallimento, { reps: [10, 9, 8] });
  assert.equal(r.azione, 'invariato');
  assert.equal(r.nuovoPeso, 40);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `js/progressione.js` non esiste ancora.

- [ ] **Step 3: Implement `js/progressione.js`**

```javascript
const INCREMENTO = { bilanciere: 2.5, manubri: 1.5 };

export function calcolaProgressione(esercizio, sessione) {
  const { rangeMin, rangeMax, tipo, ultimoPeso, fallimentiConsecutivi } = esercizio;
  const incremento = INCREMENTO[tipo];
  const tutteAlMassimo = sessione.reps.every((r) => r >= rangeMax);
  const almenoUnaSottoMinimo = sessione.reps.some((r) => r < rangeMin);

  if (tutteAlMassimo) {
    return { nuovoPeso: ultimoPeso + incremento, nuoviFallimentiConsecutivi: 0, azione: 'aumenta' };
  }

  if (almenoUnaSottoMinimo) {
    const nuoviFallimenti = fallimentiConsecutivi + 1;
    if (nuoviFallimenti >= 2) {
      return { nuovoPeso: ultimoPeso - incremento, nuoviFallimentiConsecutivi: 0, azione: 'diminuisci' };
    }
    return { nuovoPeso: ultimoPeso, nuoviFallimentiConsecutivi: nuoviFallimenti, azione: 'invariato' };
  }

  return { nuovoPeso: ultimoPeso, nuoviFallimentiConsecutivi: 0, azione: 'invariato' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — tutti i test verdi (compresi quelli di Task 1).

- [ ] **Step 5: Commit**

```bash
git add js/progressione.js js/progressione.test.js
git commit -m "feat: algoritmo doppia progressione con test"
```

---

### Task 3: Logica mesociclo e deload

**Files:**
- Create: `js/mesociclo.js`
- Test: `js/mesociclo.test.js`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task (funzioni pure).
- Produces: `calcolaSettimana(dataInizio, oggi)`, `calcolaFase(settimana)`, `applicaDeload(serie)` da `js/mesociclo.js`. Consumato da `allenamento.js` (Task 6).

- [ ] **Step 1: Write the failing tests**

```javascript
// js/mesociclo.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaSettimana, calcolaFase, applicaDeload } from './mesociclo.js';

test('calcolaSettimana: lo stesso giorno di inizio è settimana 1', () => {
  assert.equal(calcolaSettimana('2026-09-08', '2026-09-08'), 1);
});

test('calcolaSettimana: 7 giorni dopo è settimana 2', () => {
  assert.equal(calcolaSettimana('2026-09-08', '2026-09-15'), 2);
});

test('calcolaSettimana: 30 giorni dopo è settimana 5', () => {
  assert.equal(calcolaSettimana('2026-09-08', '2026-10-08'), 5);
});

test('calcolaFase: settimane 1-2 sono fase1', () => {
  assert.equal(calcolaFase(1), 'fase1');
  assert.equal(calcolaFase(2), 'fase1');
});

test('calcolaFase: settimane 3-4 sono fase2', () => {
  assert.equal(calcolaFase(3), 'fase2');
  assert.equal(calcolaFase(4), 'fase2');
});

test('calcolaFase: settimana 5 è deload', () => {
  assert.equal(calcolaFase(5), 'deload');
});

test('calcolaFase: oltre settimana 5 è mesociclo2 (placeholder)', () => {
  assert.equal(calcolaFase(6), 'mesociclo2');
});

test('applicaDeload riduce le serie di circa il 30%, minimo 1', () => {
  assert.equal(applicaDeload(4), 3);
  assert.equal(applicaDeload(3), 2);
  assert.equal(applicaDeload(2), 1);
  assert.equal(applicaDeload(1), 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `js/mesociclo.js` non esiste ancora.

- [ ] **Step 3: Implement `js/mesociclo.js`**

```javascript
const MS_PER_GIORNO = 24 * 60 * 60 * 1000;

export function calcolaSettimana(dataInizio, oggi) {
  const diffGiorni = Math.floor((new Date(oggi) - new Date(dataInizio)) / MS_PER_GIORNO);
  return Math.floor(diffGiorni / 7) + 1;
}

export function calcolaFase(settimana) {
  if (settimana <= 2) return 'fase1';
  if (settimana <= 4) return 'fase2';
  if (settimana === 5) return 'deload';
  return 'mesociclo2';
}

export function applicaDeload(serie) {
  return Math.max(1, Math.round(serie * 0.7));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — tutti i test verdi (Task 1, 2 e 3).

- [ ] **Step 5: Commit**

```bash
git add js/mesociclo.js js/mesociclo.test.js
git commit -m "feat: logica mesociclo, fase e deload con test"
```

---

### Task 4: Shell dell'app — HTML, CSS, navigazione a tab

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `loadData`, `saveData` da `js/storage.js` (Task 1); `datiDefault` da `js/dati-default.js` (Task 1).
- Produces: espone `window` con tab attivo, tre contenitori DOM (`#tab-oggi`, `#tab-allenamento`, `#tab-storico`) e una funzione `persist()` passata alle schermate (Task 5, 6, 7).

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fitness Tracker</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <h1>Fitness Tracker</h1>
  </header>
  <nav id="tab-nav">
    <button data-tab="oggi" class="tab-btn active">Oggi</button>
    <button data-tab="allenamento" class="tab-btn">Allenamento</button>
    <button data-tab="storico" class="tab-btn">Storico</button>
  </nav>
  <main>
    <section id="tab-oggi" class="tab-panel active"></section>
    <section id="tab-allenamento" class="tab-panel"></section>
    <section id="tab-storico" class="tab-panel"></section>
  </main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/style.css`**

```css
:root {
  color-scheme: light dark;
  --colore-primario: #2563eb;
  --colore-sfondo: #ffffff;
  --colore-testo: #111827;
  --colore-bordo: #d1d5db;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--colore-sfondo);
  color: var(--colore-testo);
}

header {
  padding: 1rem;
  text-align: center;
}

#tab-nav {
  display: flex;
  border-bottom: 1px solid var(--colore-bordo);
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: none;
  font-size: 1rem;
  color: var(--colore-testo);
}

.tab-btn.active {
  border-bottom: 3px solid var(--colore-primario);
  font-weight: bold;
}

.tab-panel {
  display: none;
  padding: 1rem;
}

.tab-panel.active {
  display: block;
}

ul { list-style: none; padding: 0; }

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--colore-bordo);
}

input, select, button {
  font-size: 1rem;
  padding: 0.5rem;
  margin: 0.25rem 0;
}

button {
  background: var(--colore-primario);
  color: white;
  border: none;
  border-radius: 4px;
  min-height: 44px;
}

.errore {
  color: #b91c1c;
  padding: 1rem;
}
```

- [ ] **Step 3: Create `js/app.js`**

```javascript
import { loadData, saveData } from './storage.js';
import { datiDefault } from './dati-default.js';

const state = { data: null };

function persist() {
  saveData(state.data);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

async function renderAll() {
  const { renderOggi } = await import('./oggi.js');
  const { renderAllenamento } = await import('./allenamento.js');
  const { renderStorico } = await import('./storico.js');
  renderOggi(document.getElementById('tab-oggi'), state.data, persist);
  renderAllenamento(document.getElementById('tab-allenamento'), state.data, persist);
  renderStorico(document.getElementById('tab-storico'), state.data);
}

function init() {
  try {
    state.data = loadData(datiDefault);
  } catch (e) {
    document.body.innerHTML = `<p class="errore">Errore: ${e.message}</p>`;
    return;
  }
  if (!state.data.mesociclo.dataInizio) {
    state.data.mesociclo.dataInizio = new Date().toISOString().slice(0, 10);
    saveData(state.data);
  }
  setupTabs();
  renderAll();
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
```

- [ ] **Step 4: Verifica manuale**

Apri `index.html` in un browser (es. `python -m http.server` dentro `app/` e vai su `http://localhost:8000`). Verifica: la pagina carica senza errori in console, i 3 tab sono cliccabili e cambiano pannello attivo (anche se vuoti per ora).

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: shell app con navigazione a tab"
```

---

### Task 5: Schermata Oggi

**Files:**
- Create: `js/oggi.js`

**Interfaces:**
- Consumes: `datiDefault.pasti` (Task 1); `data.pasti` (oggetto per data, Task 1 storage); `persist()` (Task 4).
- Produces: `renderOggi(container, data, persist)`, chiamata da `app.js`.

- [ ] **Step 1: Create `js/oggi.js`**

```javascript
import { datiDefault } from './dati-default.js';

function oggiISO() {
  return new Date().toISOString().slice(0, 10);
}

export function renderOggi(container, data, persist) {
  const chiaveOggi = oggiISO();
  if (!data.pasti[chiaveOggi]) {
    data.pasti[chiaveOggi] = { tipoGiorno: 'sera', fatti: [], extra: [], peso: null };
  }
  const giorno = data.pasti[chiaveOggi];

  container.innerHTML = `
    <label>Giornata:
      <select id="tipo-giorno">
        <option value="sera">Sera</option>
        <option value="mattina">Mattina a digiuno</option>
        <option value="riposo">Riposo</option>
      </select>
    </label>
    <ul id="lista-pasti"></ul>
    <div>
      <input id="extra-testo" placeholder="Aggiungi cibo/nota fuori piano">
      <button id="btn-extra" type="button">+ Aggiungi</button>
    </div>
    <ul id="lista-extra"></ul>
    <label>Peso di oggi (kg): <input id="peso-oggi" type="number" step="0.1"></label>
  `;

  container.querySelector('#tipo-giorno').value = giorno.tipoGiorno;
  container.querySelector('#peso-oggi').value = giorno.peso ?? '';

  function renderPasti() {
    const pasti = datiDefault.pasti[giorno.tipoGiorno];
    const lista = container.querySelector('#lista-pasti');
    lista.innerHTML = pasti
      .map(
        (p) => `
      <li>
        <label>
          <input type="checkbox" data-pasto="${p.id}" ${giorno.fatti.includes(p.id) ? 'checked' : ''}>
          <strong>${p.nome}</strong> — ${p.desc}
        </label>
      </li>
    `
      )
      .join('');
    lista.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.pasto;
        if (cb.checked) {
          if (!giorno.fatti.includes(id)) giorno.fatti.push(id);
        } else {
          giorno.fatti = giorno.fatti.filter((x) => x !== id);
        }
        persist();
      });
    });
  }

  function renderExtra() {
    const lista = container.querySelector('#lista-extra');
    lista.innerHTML = giorno.extra
      .map((e, i) => `<li>${e.testo} <button type="button" data-i="${i}" class="rimuovi-extra">rimuovi</button></li>`)
      .join('');
    lista.querySelectorAll('.rimuovi-extra').forEach((btn) => {
      btn.addEventListener('click', () => {
        giorno.extra.splice(Number(btn.dataset.i), 1);
        persist();
        renderExtra();
      });
    });
  }

  container.querySelector('#tipo-giorno').addEventListener('change', (e) => {
    giorno.tipoGiorno = e.target.value;
    giorno.fatti = [];
    persist();
    renderPasti();
  });

  container.querySelector('#btn-extra').addEventListener('click', () => {
    const input = container.querySelector('#extra-testo');
    if (!input.value.trim()) return;
    giorno.extra.push({ testo: input.value.trim() });
    input.value = '';
    persist();
    renderExtra();
  });

  container.querySelector('#peso-oggi').addEventListener('change', (e) => {
    giorno.peso = e.target.value ? Number(e.target.value) : null;
    persist();
  });

  renderPasti();
  renderExtra();
}
```

- [ ] **Step 2: Verifica manuale**

Ricarica `index.html` nel browser, vai sul tab Oggi. Verifica: i 4 pasti del giorno "Sera" sono elencati con grammature corrette, spuntare una checkbox e ricaricare la pagina mantiene lo stato (persistenza in localStorage), cambiare il selettore a "Mattina a digiuno" mostra la ricetta post-workout (crema di riso + whey), aggiungere un elemento extra lo mostra in lista e "rimuovi" lo toglie.

- [ ] **Step 3: Commit**

```bash
git add js/oggi.js
git commit -m "feat: schermata Oggi con checklist pasti e log extra"
```

---

### Task 6: Schermata Allenamento

**Files:**
- Create: `js/allenamento.js`

**Interfaces:**
- Consumes: `calcolaSettimana`, `calcolaFase`, `applicaDeload` (Task 3); `calcolaProgressione` (Task 2); `datiDefault.esercizi`, `datiDefault.sessioniPerFase`, `datiDefault.sessioniExtra` (Task 1); `data.esercizi`, `data.mesociclo.dataInizio` (Task 1 storage); `persist()` (Task 4).
- Produces: `renderAllenamento(container, data, persist)`, chiamata da `app.js`.

- [ ] **Step 1: Create `js/allenamento.js`**

```javascript
import { datiDefault } from './dati-default.js';
import { calcolaSettimana, calcolaFase, applicaDeload } from './mesociclo.js';
import { calcolaProgressione } from './progressione.js';

function oggiISO() {
  return new Date().toISOString().slice(0, 10);
}

function sessioniDisponibili(fase) {
  if (fase === 'fase1') return datiDefault.sessioniPerFase.fase1;
  if (fase === 'fase2') return datiDefault.sessioniPerFase.fase2;
  if (fase === 'deload') return datiDefault.sessioniPerFase.fase2;
  return [];
}

function renderEsercizio(esercizioConfig, esercizioStato, serieProgrammate, onSalva) {
  const li = document.createElement('li');
  const inputsReps = Array.from({ length: serieProgrammate }, (_, i) => `
    <input type="number" class="rep-input" data-serie="${i}" placeholder="Serie ${i + 1} (target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax})" min="0">
  `).join('');

  li.innerHTML = `
    <strong>${esercizioConfig.nome}</strong> — ultimo peso: ${esercizioStato.ultimoPeso}kg, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} reps, ${serieProgrammate} serie
    <div>${inputsReps}</div>
    <input type="number" class="rpe-input" placeholder="RPE (1-10)" min="1" max="10">
    <input type="text" class="nota-input" placeholder="Nota (facoltativa)">
    <button type="button" class="btn-salva">Salva sessione</button>
    <div class="esito"></div>
  `;

  li.querySelector('.btn-salva').addEventListener('click', () => {
    const reps = Array.from(li.querySelectorAll('.rep-input')).map((inp) => Number(inp.value) || 0);
    if (reps.some((r) => r === 0)) {
      li.querySelector('.esito').textContent = 'Inserisci le reps per tutte le serie prima di salvare.';
      return;
    }
    const rpe = Number(li.querySelector('.rpe-input').value) || null;
    const nota = li.querySelector('.nota-input').value.trim();
    const risultato = calcolaProgressione(esercizioStato, { reps });

    esercizioStato.storico.push({ data: oggiISO(), peso: esercizioStato.ultimoPeso, reps, rpe, nota });
    esercizioStato.ultimoPeso = risultato.nuovoPeso;
    esercizioStato.fallimentiConsecutivi = risultato.nuoviFallimentiConsecutivi;

    const messaggi = {
      aumenta: `Sessione salvata. La prossima volta: +peso → ${risultato.nuovoPeso}kg.`,
      diminuisci: `Sessione salvata. La prossima volta: -peso → ${risultato.nuovoPeso}kg.`,
      invariato: `Sessione salvata. La prossima volta: stesso peso (${risultato.nuovoPeso}kg).`
    };
    li.querySelector('.esito').textContent = messaggi[risultato.azione];
    onSalva();
  });

  return li;
}

function renderSessione(container, titolo, sessione, data, persist, riduciSerie) {
  const div = document.createElement('div');
  div.innerHTML = `<h3>${titolo}</h3>`;
  const lista = document.createElement('ul');
  sessione.esercizi.forEach(({ id, serie }) => {
    const esercizioConfig = datiDefault.esercizi[id];
    const esercizioStato = data.esercizi[id];
    const serieEffettive = riduciSerie ? applicaDeload(serie) : serie;
    lista.appendChild(renderEsercizio(esercizioConfig, esercizioStato, serieEffettive, () => persist()));
  });
  div.appendChild(lista);
  container.appendChild(div);
}

export function renderAllenamento(container, data, persist) {
  container.innerHTML = '';
  const settimana = calcolaSettimana(data.mesociclo.dataInizio, oggiISO());
  const fase = calcolaFase(settimana);
  const isDeload = fase === 'deload';

  const intestazione = document.createElement('p');
  intestazione.textContent = `Mesociclo 1 — Settimana ${settimana} (${fase})`;
  container.appendChild(intestazione);

  sessioniDisponibili(fase).forEach((sessione) => {
    renderSessione(container, sessione.nome, sessione, data, persist, isDeload);
  });

  const titoloExtra = document.createElement('h2');
  titoloExtra.textContent = 'Sessioni extra leggere (facoltative)';
  container.appendChild(titoloExtra);

  Object.values(datiDefault.sessioniExtra).forEach((sessione) => {
    renderSessione(container, sessione.nome, sessione, data, persist, false);
  });
}
```

- [ ] **Step 2: Verifica manuale**

Ricarica `index.html`, vai sul tab Allenamento. Verifica: mostra "Settimana 1 (fase1)" e la sessione Full Body con i suoi esercizi; inserire reps su tutte le serie di uno squat pari al rangeMax e premere "Salva sessione" mostra il messaggio di aumento peso e aggiorna "ultimo peso" al ricaricare la schermata; le sessioni Extra A/B sono visibili sotto, sempre disponibili indipendentemente dalla fase.

- [ ] **Step 3: Commit**

```bash
git add js/allenamento.js
git commit -m "feat: schermata Allenamento con doppia progressione e sessioni extra"
```

---

### Task 7: Schermata Storico

**Files:**
- Create: `js/storico.js`

**Interfaces:**
- Consumes: `data.pasti`, `data.esercizi` (Task 1 storage).
- Produces: `renderStorico(container, data)`, chiamata da `app.js`.

- [ ] **Step 1: Create `js/storico.js`**

```javascript
function disegnaGraficoPeso(canvas, punti) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (punti.length < 2) {
    ctx.fillText('Dati insufficienti per il grafico (minimo 2 pesate)', 10, h / 2);
    return;
  }
  const pesi = punti.map((p) => p.peso);
  const min = Math.min(...pesi) - 0.5;
  const max = Math.max(...pesi) + 0.5;
  const passoX = w / (punti.length - 1);

  ctx.beginPath();
  punti.forEach((p, i) => {
    const x = i * passoX;
    const y = h - ((p.peso - min) / (max - min)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function esportaBackup(data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(`Errore durante l'esportazione: ${e.message}`);
  }
}

export function renderStorico(container, data) {
  const giorniConPeso = Object.entries(data.pasti)
    .filter(([, g]) => g.peso != null)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data_, g]) => ({ data: data_, peso: g.peso }));

  const giorniTotali = Object.keys(data.pasti).length;
  const giorniAderenti = Object.values(data.pasti).filter((g) => g.fatti.length === 4).length;

  container.innerHTML = `
    <h2>Peso corporeo</h2>
    <canvas id="grafico-peso" width="320" height="150"></canvas>
    <h2>Aderenza pasti</h2>
    <p>${giorniAderenti} / ${giorniTotali} giorni con tutti e 4 i pasti completati</p>
    <h2>Storico carichi</h2>
    <ul id="lista-carichi"></ul>
    <button id="btn-backup" type="button">Esporta backup</button>
  `;

  disegnaGraficoPeso(container.querySelector('#grafico-peso'), giorniConPeso);

  const listaCarichi = container.querySelector('#lista-carichi');
  listaCarichi.innerHTML = Object.entries(data.esercizi)
    .filter(([, e]) => e.storico.length > 0)
    .map(([, e]) => {
      const ultima = e.storico[e.storico.length - 1];
      return `<li><strong>${e.nome}</strong>: ${e.ultimoPeso}kg (ultima sessione ${ultima.data}: reps ${ultima.reps.join('/')})</li>`;
    })
    .join('') || '<li>Nessun allenamento registrato ancora.</li>';

  container.querySelector('#btn-backup').addEventListener('click', () => esportaBackup(data));
}
```

- [ ] **Step 2: Verifica manuale**

Ricarica `index.html`, vai sul tab Storico. Verifica: senza pesate registrate mostra il messaggio "dati insufficienti"; dopo aver inserito il peso in 2+ giorni diversi (nella tab Oggi, cambiando la data di sistema o testando con dati manuali in localStorage) il grafico disegna una linea; dopo aver salvato una sessione di allenamento (Task 6) compare nello storico carichi; il pulsante "Esporta backup" scarica un file JSON.

- [ ] **Step 3: Commit**

```bash
git add js/storico.js
git commit -m "feat: schermata Storico con grafico peso ed export backup"
```

---

### Task 8: PWA — manifest, icona, service worker offline

**Files:**
- Create: `manifest.json`
- Create: `icons/icon.svg`
- Create: `sw.js`
- Modify: `index.html:8` (link manifest già presente da Task 4, verificare icona collegata)

**Interfaces:**
- Consumes: nessuna.
- Produces: cache offline per tutti gli asset statici; nessuna interfaccia JS consumata da altri task.

- [ ] **Step 1: Create `icons/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="24" fill="#2563eb"/>
  <text x="96" y="120" font-size="96" text-anchor="middle" fill="white" font-family="system-ui, sans-serif">F</text>
</svg>
```

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "name": "Fitness Tracker",
  "short_name": "Fitness",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

- [ ] **Step 3: Create `sw.js`**

```javascript
const CACHE_NAME = 'fitness-tracker-v1';
const ASSET_DA_CACHARE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/oggi.js',
  './js/allenamento.js',
  './js/storico.js',
  './js/storage.js',
  './js/progressione.js',
  './js/mesociclo.js',
  './js/dati-default.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_DA_CACHARE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chiavi) =>
      Promise.all(chiavi.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((risposta) => risposta || fetch(event.request))
  );
});
```

- [ ] **Step 4: Verifica manuale**

Servi `app/` con `python -m http.server` (i service worker richiedono http/https, non `file://`), apri `http://localhost:8000` nel browser, apri DevTools → Application → Service Workers e verifica che sia registrato e attivo. Ricarica la pagina, poi disattiva la rete (DevTools → Network → Offline) e ricarica di nuovo: la pagina deve continuare a funzionare. Su telefono: apri l'URL pubblicato (dopo Task 9), usa "Aggiungi a schermata Home" dal menu del browser, verifica che l'icona compaia e l'app si apra a schermo intero.

- [ ] **Step 5: Commit**

```bash
git add manifest.json icons/icon.svg sw.js
git commit -m "feat: PWA — manifest, icona, service worker offline"
```

---

### Task 9: README e istruzioni di pubblicazione

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nessuna.
- Produces: nessuna (documentazione).

- [ ] **Step 1: Create `README.md`**

```markdown
# Fitness Tracker

App personale per tracciare pasti, allenamenti e progressione dei carichi, basata su `piano_alimentare.md`.

## Testare in locale

Serve un piccolo server locale (i service worker non funzionano su `file://`):

```bash
cd app
python -m http.server 8000
```

Apri `http://localhost:8000` nel browser.

## Eseguire i test

```bash
npm test
```

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub (es. `fitness-tracker`), pubblico.
2. `git remote add origin <url-del-repo>`
3. `git push -u origin master`
4. Nelle impostazioni del repo su GitHub: Settings → Pages → Source: `master` branch, cartella `/ (root)`.
5. Dopo qualche minuto l'app è raggiungibile su `https://<utente>.github.io/<repo>/`.
6. Sul telefono: apri quel link nel browser, poi "Aggiungi a schermata Home" per installarla come app.

## Note sulla privacy

Questo repository contiene solo il codice dell'app. Nessun dato personale (peso, pasti, allenamenti) è incluso — tutto resta salvato localmente nel browser di chi usa l'app (`localStorage`), dispositivo per dispositivo.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: istruzioni per testare in locale e pubblicare"
```

---

## Dopo l'implementazione

Non ancora coperto da questo piano (da fare insieme quando si arriva a questo punto, fuori dallo scope del codice):
- Creare l'account GitHub (guidato, interattivo).
- Creare il repository remoto e fare il primo push.
- Attivare GitHub Pages nelle impostazioni del repo.
- Test reale su telefono (installazione PWA, funzionamento offline).
