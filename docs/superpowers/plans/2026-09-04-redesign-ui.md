# Redesign UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Fitness Tracker PWA's visual layer (colors, typography, layout, navigation, per-screen structure) so the app guides the user through the day instead of showing everything at once, without touching any data/calculation logic.

**Architecture:** Two new small pure-logic modules (`giorno-oggi.js`, `prossima-azione.js`) factor out day-record access and the "what to do now" decision so it's unit-testable; a new `icons.js` provides hand-authored inline SVG icons; `css/style.css` is rewritten around CSS custom-property design tokens (light/dark via `prefers-color-scheme`); `index.html`, `app.js`, `oggi.js`, `allenamento.js`, `storico.js` are restructured to use the new tokens/components (card, progress bar, collapsible `<details>` sections, bottom nav). No changes to `budget.js`, `progressione.js`, `mesociclo.js`, `storage.js`, `database-alimenti.js`, `dati-default.js`.

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), no build step, no external runtime dependencies. Node's built-in test runner (`node --test`) for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-04-redesign-ui-design.md`

## Global Constraints

- Zero build step: everything must run by opening `index.html` via `python -m http.server`, no bundler, no npm dependencies added.
- Zero external runtime dependencies: no CDN fonts/icons/CSS frameworks loaded at runtime (offline-first PWA). Fonts are self-hosted `.woff2` files already downloaded into `app/fonts/` (Barlow 400/600/700, Barlow Condensed 500/600/700 — latin subset, ~22KB each).
- No changes to data/calculation logic: `budget.js`, `progressione.js`, `mesociclo.js`, `storage.js`, `database-alimenti.js`, `dati-default.js` stay untouched.
- Existing test suite (`npm test`) must keep passing unmodified throughout.
- Every state indicated by color must also carry an icon or text (never color-only).
- Touch targets stay ≥44×44px; all interactive elements need a visible `:focus-visible` outline; transitions must respect `prefers-reduced-motion`.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
  ```

---

### Task 1: Shared day-record helpers (`giorno-oggi.js`)

**Files:**
- Create: `app/js/giorno-oggi.js`
- Create: `app/js/giorno-oggi.test.js`
- Modify: `app/js/oggi.js:1-19` (remove local `oggiISO`/`oraAttuale`/day-init/`isPostWorkoutOra`, import from new module)

**Interfaces:**
- Consumes: nothing new (plain `data.pasti` shape already used across the app).
- Produces: `oggiISO(): string`, `oraAttuale(): string`, `getGiornoOggi(data): Giorno` (creates+returns today's record on `data.pasti`, ensuring `extra` is an array), `isPostWorkoutOra(giorno): boolean` — all consumed by Task 2, Task 7 (`oggi.js`), Task 8 (`allenamento.js`).

- [ ] **Step 1: Write the failing tests**

```js
// app/js/giorno-oggi.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { oggiISO, getGiornoOggi, isPostWorkoutOra } from './giorno-oggi.js';

test('oggiISO restituisce una data in formato YYYY-MM-DD', () => {
  assert.match(oggiISO(), /^\d{4}-\d{2}-\d{2}$/);
});

test('getGiornoOggi crea un record di default se assente', () => {
  const data = { pasti: {} };
  const giorno = getGiornoOggi(data);
  assert.deepEqual(giorno, { peso: null, pastiLoggati: 0, alimenti: [], eventiAllenamento: [], extra: [] });
});

test('getGiornoOggi è idempotente: seconda chiamata restituisce lo stesso oggetto', () => {
  const data = { pasti: {} };
  const primo = getGiornoOggi(data);
  primo.peso = 80;
  const secondo = getGiornoOggi(data);
  assert.equal(secondo, primo);
  assert.equal(secondo.peso, 80);
});

test('getGiornoOggi aggiunge extra=[] a un record esistente che non lo ha', () => {
  const chiave = oggiISO();
  const data = { pasti: { [chiave]: { peso: 80, pastiLoggati: 0, alimenti: [], eventiAllenamento: [] } } };
  const giorno = getGiornoOggi(data);
  assert.deepEqual(giorno.extra, []);
});

test('isPostWorkoutOra: false se nessun evento allenamento', () => {
  const giorno = { eventiAllenamento: [], alimenti: [] };
  assert.equal(isPostWorkoutOra(giorno), false);
});

test('isPostWorkoutOra: false se l\'ultimo evento è "inizio-allenamento"', () => {
  const giorno = { eventiAllenamento: [{ ora: '10:00', tipo: 'inizio-allenamento' }], alimenti: [] };
  assert.equal(isPostWorkoutOra(giorno), false);
});

test('isPostWorkoutOra: true se post-workout iniziato e nessun alimento ancora loggato', () => {
  const giorno = { eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }], alimenti: [] };
  assert.equal(isPostWorkoutOra(giorno), true);
});

test('isPostWorkoutOra: true se il post-workout è più recente dell\'ultimo alimento loggato', () => {
  const giorno = {
    eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }],
    alimenti: [{ ora: '10:30', alimentoId: 'pollo', grammiCrudi: 100 }]
  };
  assert.equal(isPostWorkoutOra(giorno), true);
});

test('isPostWorkoutOra: false se è già stato loggato un alimento dopo il post-workout', () => {
  const giorno = {
    eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }],
    alimenti: [{ ora: '11:30', alimentoId: 'pollo', grammiCrudi: 100 }]
  };
  assert.equal(isPostWorkoutOra(giorno), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && node --test js/giorno-oggi.test.js`
Expected: FAIL — `Cannot find module './giorno-oggi.js'`

- [ ] **Step 3: Implement the module**

```js
// app/js/giorno-oggi.js
export function oggiISO() {
  return new Date().toISOString().slice(0, 10);
}

export function oraAttuale() {
  return new Date().toTimeString().slice(0, 5);
}

export function getGiornoOggi(data) {
  const chiave = oggiISO();
  if (!data.pasti[chiave]) {
    data.pasti[chiave] = { peso: null, pastiLoggati: 0, alimenti: [], eventiAllenamento: [] };
  }
  const giorno = data.pasti[chiave];
  if (!Array.isArray(giorno.extra)) giorno.extra = [];
  return giorno;
}

export function isPostWorkoutOra(giorno) {
  if (giorno.eventiAllenamento.length === 0) return false;
  const ultimoEvento = giorno.eventiAllenamento[giorno.eventiAllenamento.length - 1];
  if (ultimoEvento.tipo !== 'post-workout-iniziato') return false;
  if (giorno.alimenti.length === 0) return true;
  const ultimoAlimento = giorno.alimenti[giorno.alimenti.length - 1];
  return ultimoEvento.ora > ultimoAlimento.ora;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test js/giorno-oggi.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Wire `oggi.js` to the new module**

In `app/js/oggi.js`, replace the top-of-file local `oggiISO`, `oraAttuale`, `isPostWorkoutOra` function declarations (current lines 4-19) and the inline day-init block (current lines 26-31) with:

```js
import { oraAttuale, getGiornoOggi, isPostWorkoutOra } from './giorno-oggi.js';
```

and inside `renderOggi`, replace:

```js
  const chiaveOggi = oggiISO();
  if (!data.pasti[chiaveOggi]) {
    data.pasti[chiaveOggi] = { peso: null, pastiLoggati: 0, alimenti: [], eventiAllenamento: [] };
  }
  const giorno = data.pasti[chiaveOggi];
  if (!Array.isArray(giorno.extra)) giorno.extra = [];
```

with:

```js
  const giorno = getGiornoOggi(data);
```

Leave every other line of `oggi.js` unchanged for this task (the rest of the file is rewritten in Task 7).

- [ ] **Step 6: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS, all existing suites unaffected (`budget.test.js`, `mesociclo.test.js`, `progressione.test.js`, `storage.test.js`, `giorno-oggi.test.js`)

- [ ] **Step 7: Commit**

```bash
cd app
git add js/giorno-oggi.js js/giorno-oggi.test.js js/oggi.js
git commit -m "$(cat <<'EOF'
refactor: estrai giorno-oggi.js (accesso al record del giorno + stato post-workout)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 2: "What to do now" logic (`prossima-azione.js`)

**Files:**
- Create: `app/js/prossima-azione.js`
- Create: `app/js/prossima-azione.test.js`

**Interfaces:**
- Consumes: `isPostWorkoutOra(giorno)` from `./giorno-oggi.js` (Task 1).
- Produces: `prossimaAzione(giorno): { tipo: 'pesati' | 'allenamento-in-corso' | 'post-workout' | 'prossimo-pasto' }` — consumed by Task 7 (`oggi.js`).

- [ ] **Step 1: Write the failing tests**

```js
// app/js/prossima-azione.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { prossimaAzione } from './prossima-azione.js';

function giornoBase(overrides = {}) {
  return { peso: 80, pastiLoggati: 0, alimenti: [], eventiAllenamento: [], extra: [], ...overrides };
}

test('peso non salvato → "pesati", priorità massima', () => {
  const giorno = giornoBase({ peso: null, eventiAllenamento: [{ ora: '10:00', tipo: 'inizio-allenamento' }] });
  assert.equal(prossimaAzione(giorno).tipo, 'pesati');
});

test('allenamento in corso (ultimo evento è inizio-allenamento) → "allenamento-in-corso"', () => {
  const giorno = giornoBase({ eventiAllenamento: [{ ora: '10:00', tipo: 'inizio-allenamento' }] });
  assert.equal(prossimaAzione(giorno).tipo, 'allenamento-in-corso');
});

test('post-workout appena iniziato, nessun pasto ancora loggato dopo → "post-workout"', () => {
  const giorno = giornoBase({ eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }] });
  assert.equal(prossimaAzione(giorno).tipo, 'post-workout');
});

test('nessun evento allenamento, peso già salvato → "prossimo-pasto"', () => {
  const giorno = giornoBase();
  assert.equal(prossimaAzione(giorno).tipo, 'prossimo-pasto');
});

test('post-workout già "consumato" (pasto loggato dopo l\'evento) → torna a "prossimo-pasto"', () => {
  const giorno = giornoBase({
    eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }],
    alimenti: [{ ora: '11:30', alimentoId: 'whey', grammiCrudi: 40 }]
  });
  assert.equal(prossimaAzione(giorno).tipo, 'prossimo-pasto');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && node --test js/prossima-azione.test.js`
Expected: FAIL — `Cannot find module './prossima-azione.js'`

- [ ] **Step 3: Implement the module**

```js
// app/js/prossima-azione.js
import { isPostWorkoutOra } from './giorno-oggi.js';

export function prossimaAzione(giorno) {
  if (giorno.peso == null) return { tipo: 'pesati' };

  const eventi = giorno.eventiAllenamento;
  const ultimo = eventi[eventi.length - 1];
  if (ultimo && ultimo.tipo === 'inizio-allenamento') return { tipo: 'allenamento-in-corso' };

  if (isPostWorkoutOra(giorno)) return { tipo: 'post-workout' };

  return { tipo: 'prossimo-pasto' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test js/prossima-azione.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd app
git add js/prossima-azione.js js/prossima-azione.test.js
git commit -m "$(cat <<'EOF'
feat: aggiungi prossimaAzione (logica "cosa fare adesso" per la card Adesso)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 3: Inline SVG icons (`icons.js`)

**Files:**
- Create: `app/js/icons.js`
- Create: `app/js/icons.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `iconCasa(): string`, `iconBilancia(): string`, `iconForchetta(): string`, `iconManubrio(): string`, `iconGrafico(): string`, `iconSpunta(): string` — each returns an inline `<svg>` markup string, 24×24, `currentColor` stroke. Consumed by Task 5 (`app.js` nav), Task 7 (`oggi.js`), Task 8 (`allenamento.js`).

- [ ] **Step 1: Write the failing tests**

```js
// app/js/icons.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { iconCasa, iconBilancia, iconForchetta, iconManubrio, iconGrafico, iconSpunta } from './icons.js';

const tutteLeIcone = { iconCasa, iconBilancia, iconForchetta, iconManubrio, iconGrafico, iconSpunta };

for (const [nome, fn] of Object.entries(tutteLeIcone)) {
  test(`${nome} restituisce un <svg> valido con viewBox e senza colori hardcoded`, () => {
    const markup = fn();
    assert.match(markup, /^<svg /);
    assert.match(markup, /viewBox="0 0 24 24"/);
    assert.match(markup, /stroke="currentColor"/);
    assert.doesNotMatch(markup, /#[0-9a-fA-F]{3,6}/);
  });
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && node --test js/icons.test.js`
Expected: FAIL — `Cannot find module './icons.js'`

- [ ] **Step 3: Implement the module**

```js
// app/js/icons.js
function svg(paths) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

export function iconCasa() {
  return svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>');
}

export function iconBilancia() {
  return svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="12" cy="12" r="3.5"/><path d="M12 9.5v2.5l1.6 1.6"/>');
}

export function iconForchetta() {
  return svg('<path d="M7 3v7a2 2 0 0 0 2 2v9"/><path d="M7 3v4M9 3v4M11 3v7"/><path d="M17 3c-1.5 0-2.5 1.8-2.5 4.5S15.5 12 17 12v9"/>');
}

export function iconManubrio() {
  return svg('<path d="M4 10v4"/><path d="M2.5 9.5v5"/><rect x="6" y="8" width="3" height="8" rx="1"/><path d="M9 12h6"/><rect x="15" y="8" width="3" height="8" rx="1"/><path d="M20 10v4"/><path d="M21.5 9.5v5"/>');
}

export function iconGrafico() {
  return svg('<path d="M3 20h18"/><path d="M3 20V4"/><path d="M6 15l4-4 3 3 6-7"/><path d="M15 7h4v4"/>');
}

export function iconSpunta() {
  return svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test js/icons.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd app
git add js/icons.js js/icons.test.js
git commit -m "$(cat <<'EOF'
feat: aggiungi set di icone SVG inline (casa, bilancia, forchetta, manubrio, grafico, spunta)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 4: Design tokens and component CSS (`style.css`)

**Files:**
- Modify: `app/css/style.css` (full rewrite)
- The 6 self-hosted font files already exist at `app/fonts/barlow-400.woff2`, `barlow-600.woff2`, `barlow-700.woff2`, `barlow-condensed-500.woff2`, `barlow-condensed-600.woff2`, `barlow-condensed-700.woff2` (downloaded from `fonts.gstatic.com`, latin subset, ~22KB each) — not yet committed.

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties (`--color-primary`, `--color-accent`, `--color-destructive`, `--color-warning`, `--color-background`, `--color-foreground`, `--color-card`, `--color-card-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--space-1`..`--space-6`, `--radius-card`, `--radius-control`, `--font-body`, `--font-display`, `--nav-height`) and component classes (`.card`, `.card-adesso`, `button.primario/.accento/.distruttivo`, `.progress-bar` (+ `.oltre-budget`), `.progress-numero`, `.badge` (+ `.ok`), `details.sezione` / `details.esercizio`, `.serie-riga`, `.peso-input-riga`, `#tab-nav` / `.tab-btn`) — consumed by every task from here on.

This task has no unit tests (pure CSS). Verification is visual, done at the end of Task 5 and finalized in Task 10.

- [ ] **Step 1: Replace `app/css/style.css` entirely with:**

```css
/* ===== Font (self-hosted, cache dal service worker) ===== */
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../fonts/barlow-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('../fonts/barlow-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('../fonts/barlow-700.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('../fonts/barlow-condensed-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('../fonts/barlow-condensed-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('../fonts/barlow-condensed-700.woff2') format('woff2');
}

/* ===== Design tokens ===== */
:root {
  color-scheme: light dark;

  --color-primary: #F97316;
  --color-on-primary: #0F172A;
  --color-accent: #22C55E;
  --color-on-accent: #0F172A;
  --color-destructive: #EF4444;
  --color-on-destructive: #000000;
  --color-warning: #F59E0B;

  --color-background: #F8FAFC;
  --color-foreground: #0F172A;
  --color-card: #FFFFFF;
  --color-card-foreground: #0F172A;
  --color-muted: #F1F5F9;
  --color-muted-foreground: #475569;
  --color-border: #E2E8F0;

  --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  --radius-card: 12px;
  --radius-control: 8px;

  --font-body: 'Barlow', system-ui, sans-serif;
  --font-display: 'Barlow Condensed', system-ui, sans-serif;

  --nav-height: 64px;
  --transition-base: 180ms ease;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1F2937;
    --color-foreground: #F8FAFC;
    --color-card: #313742;
    --color-card-foreground: #F8FAFC;
    --color-muted: #37414F;
    --color-muted-foreground: #CBD5E1;
    --color-border: #374151;
    --shadow-card: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root { --transition-base: 0ms; }
}

/* ===== Reset & base ===== */
* { box-sizing: border-box; }

svg { vertical-align: middle; flex-shrink: 0; }

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.5;
  background: var(--color-background);
  color: var(--color-foreground);
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 var(--space-3);
}

h1 { font-size: 1.75rem; }
h2 { font-size: 1.25rem; margin-top: var(--space-5); }
h3 { font-size: 1.1rem; }

header {
  padding: var(--space-4);
  text-align: center;
}

main {
  padding: 0 var(--space-4) var(--space-4);
  max-width: 480px;
  margin: 0 auto;
}

ul { list-style: none; padding: 0; margin: 0; }

.nota {
  font-style: italic;
  opacity: 0.8;
  font-size: 0.9rem;
  color: var(--color-muted-foreground);
}

.errore {
  color: var(--color-destructive);
  padding: var(--space-4);
}

#errore-globale {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--color-destructive);
  color: #fff;
  border-bottom: 2px solid var(--color-destructive);
}

/* ===== Focus & motion ===== */
:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

button, .progress-bar > span, details.sezione > summary::after {
  transition-duration: var(--transition-base);
}

/* ===== Card ===== */
.card {
  background: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.card-adesso {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
}

.card-adesso .etichetta {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.85;
  margin: 0 0 var(--space-1);
}

.card-adesso p {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 var(--space-3);
}

/* ===== Bottoni ===== */
button {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  padding: var(--space-3) var(--space-4);
  margin: var(--space-1) 0;
  border: none;
  border-radius: var(--radius-control);
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  background: var(--color-muted);
  color: var(--color-foreground);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  justify-content: center;
}

button.primario {
  background: var(--color-on-primary);
  color: var(--color-primary);
}

button.accento {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

button.distruttivo {
  background: transparent;
  color: var(--color-destructive);
  border: 1px solid var(--color-destructive);
}

button:disabled {
  background: var(--color-muted);
  color: var(--color-muted-foreground);
  cursor: not-allowed;
}

/* ===== Input ===== */
input, select {
  font-family: var(--font-body);
  font-size: 1rem;
  padding: var(--space-2) var(--space-3);
  margin: var(--space-1) 0;
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-card);
  color: var(--color-foreground);
  width: 100%;
}

label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-muted-foreground);
  margin-top: var(--space-2);
}
label svg { margin-right: var(--space-1); }

details.sezione > summary svg { margin-right: var(--space-2); }

.peso-input-riga { display: flex; gap: var(--space-2); align-items: center; }
.peso-input-riga input { flex: 1; margin: 0; }
.peso-input-riga button { margin: 0; }

.serie-riga {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  align-items: end;
  margin-bottom: var(--space-2);
}
.serie-riga label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.75rem;
  margin: 0;
}
.serie-riga input { margin: 0; }

/* ===== Barra di progresso ===== */
.progress-bar {
  height: 10px;
  border-radius: 999px;
  background: var(--color-muted);
  overflow: hidden;
  margin: var(--space-2) 0;
}

.progress-bar > span {
  display: block;
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
  transition-property: width;
}

.progress-bar.oltre-budget > span { background: var(--color-destructive); }

.progress-numero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
}

/* ===== Badge / stato ===== */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px var(--space-2);
  border-radius: 999px;
  background: var(--color-muted);
  color: var(--color-muted-foreground);
}

.badge.ok {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.badge svg { width: 14px; height: 14px; }

/* ===== Sezioni comprimibili ===== */
details.sezione {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  margin-bottom: var(--space-3);
  background: var(--color-card);
  overflow: hidden;
}

details.sezione > summary {
  list-style: none;
  cursor: pointer;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

details.sezione > summary::-webkit-details-marker { display: none; }

details.sezione > summary::after {
  content: '';
  width: 10px;
  height: 10px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition-property: transform;
  flex-shrink: 0;
}

details.sezione[open] > summary::after { transform: rotate(-135deg); }

details.sezione > .contenuto {
  padding: 0 var(--space-4) var(--space-4);
}

details.esercizio { margin-bottom: var(--space-2); }
details.esercizio.salvato > summary { color: var(--color-accent); }
details.esercizio[open] { border-color: var(--color-primary); }

/* ===== Liste ===== */
li {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

li.salvato { opacity: 0.7; }

/* ===== Navigazione in basso ===== */
#tab-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 10;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--space-2);
  min-height: var(--nav-height);
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted-foreground);
  border-radius: 0;
  margin: 0;
}

.tab-btn svg { width: 22px; height: 22px; }

.tab-btn.active { color: var(--color-primary); }

/* ===== Grafico storico ===== */
#grafico-peso { width: 100%; height: auto; max-width: 100%; }

@media (min-width: 640px) {
  main { padding: 0 var(--space-6) var(--space-6); }
}
```

- [ ] **Step 2: Verify fonts load and no console errors**

Run: `cd app && python -m http.server 8000` (background), open `http://localhost:8000` in a browser.
Expected: page renders (unstyled-looking is fine — `index.html`/`js/*.js` are restructured in later tasks), no 404s in the network tab for the 6 `fonts/*.woff2` files, no console errors from `style.css`.

- [ ] **Step 3: Run the full test suite (sanity check — CSS doesn't affect it)**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd app
git add css/style.css fonts/
git commit -m "$(cat <<'EOF'
feat: nuovo design system CSS (token colore chiaro/scuro, tipografia Barlow self-hosted, componenti card/progress-bar/badge/dettagli)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 5: Bottom navigation (`index.html`, `app.js`, `manifest.json`, `sw.js`)

**Files:**
- Modify: `app/index.html`
- Modify: `app/js/app.js`
- Modify: `app/manifest.json`
- Modify: `app/sw.js`

**Interfaces:**
- Consumes: `iconCasa`, `iconManubrio`, `iconGrafico` from `./icons.js` (Task 3); CSS classes `#tab-nav`/`.tab-btn` (Task 4).
- Produces: nothing new consumed by later tasks (this is the outermost shell).

- [ ] **Step 1: Replace `app/index.html` with:**

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#F97316">
  <title>Fitness Tracker</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <h1>Fitness Tracker</h1>
  </header>
  <main>
    <section id="tab-oggi" class="tab-panel active"></section>
    <section id="tab-allenamento" class="tab-panel"></section>
    <section id="tab-storico" class="tab-panel"></section>
  </main>
  <nav id="tab-nav" aria-label="Navigazione principale"></nav>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

(Note: `.tab-panel` show/hide CSS rules — `display:none` / `.active{display:block}` — must stay available. Add them to `app/css/style.css` now, right after the `main { ... }` rule from Task 4:)

```css
.tab-panel { display: none; }
.tab-panel.active { display: block; }
```

- [ ] **Step 2: Modify `app/js/app.js`** — replace the `setupTabs` function (current lines 48-61) and add an icon import:

At the top of the file, add:

```js
import { iconCasa, iconManubrio, iconGrafico } from './icons.js';
```

Replace `setupTabs`:

```js
const TAB_CONFIG = [
  { id: 'oggi', label: 'Oggi', icon: iconCasa },
  { id: 'allenamento', label: 'Allenamento', icon: iconManubrio },
  { id: 'storico', label: 'Storico', icon: iconGrafico }
];

function setupTabs() {
  const nav = document.getElementById('tab-nav');
  nav.innerHTML = TAB_CONFIG.map(({ id, label, icon }) => `
    <button data-tab="${id}" class="tab-btn${id === 'oggi' ? ' active' : ''}" type="button">
      ${icon()}
      <span>${label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      const render = renderPerTab[btn.dataset.tab];
      if (render) render();
    });
  });
}
```

- [ ] **Step 3: Update `app/manifest.json`**

```json
{
  "name": "Fitness Tracker",
  "short_name": "Fitness",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#F8FAFC",
  "theme_color": "#F97316",
  "icons": [
    { "src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

- [ ] **Step 4: Update `app/sw.js`** — bump the cache name and add the new files to the cache list:

```js
const CACHE_NAME = 'fitness-tracker-v4';
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
  './js/database-alimenti.js',
  './js/budget.js',
  './js/giorno-oggi.js',
  './js/prossima-azione.js',
  './js/icons.js',
  './icons/icon.svg',
  './fonts/barlow-400.woff2',
  './fonts/barlow-600.woff2',
  './fonts/barlow-700.woff2',
  './fonts/barlow-condensed-500.woff2',
  './fonts/barlow-condensed-600.woff2',
  './fonts/barlow-condensed-700.woff2'
];
```

(Leave the `install`/`activate`/`fetch` handlers below this list untouched.)

- [ ] **Step 5: Manual check in the browser**

Run: `cd app && python -m http.server 8000` (background), open `http://localhost:8000`.
Expected: a bottom bar with 3 labeled icon buttons (Oggi/Allenamento/Storico) is fixed at the bottom, switching tabs works exactly as before, the active tab is highlighted in orange (`--color-primary`).

- [ ] **Step 6: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd app
git add index.html js/app.js manifest.json sw.js css/style.css
git commit -m "$(cat <<'EOF'
feat: sposta la navigazione in una barra fissa in basso con icone

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 6: Restructure "Oggi" — card "Adesso" + collapsible sections

**Files:**
- Modify: `app/js/oggi.js` (full rewrite of the render logic, building on Task 1's Step 5 wiring)

**Interfaces:**
- Consumes: `oraAttuale`, `getGiornoOggi` from `./giorno-oggi.js` (Task 1); `prossimaAzione` from `./prossima-azione.js` (Task 2); `iconBilancia`, `iconForchetta` from `./icons.js` (Task 3); `.card`/`.card-adesso`/`.progress-bar`/`.badge`/`details.sezione` CSS (Task 4).
- Produces: nothing new consumed elsewhere (leaf screen).

- [ ] **Step 1: Replace `app/js/oggi.js` entirely with:**

```js
import { databaseAlimenti, rapportiCotturaCrudo, combosPasto, targetGiornaliero } from './database-alimenti.js';
import { calcolaConsumato, calcolaRimasto, suggerisciPasto } from './budget.js';
import { oraAttuale, getGiornoOggi } from './giorno-oggi.js';
import { prossimaAzione } from './prossima-azione.js';
import { iconBilancia, iconForchetta } from './icons.js';

function formatoNumero(n) {
  return Math.round(n * 10) / 10;
}

export function renderOggi(container, data, persist) {
  const giorno = getGiornoOggi(data);

  let indiceComboNormale = 0;
  let indiceComboPostWorkout = 0;
  const cottiVisualizzati = new Set(); // indici di `alimenti` mostrati come "cotto" (solo UI, non persistito)

  container.innerHTML = `
    <div id="card-adesso" class="card card-adesso"></div>

    <section class="card">
      <label for="peso-oggi">${iconBilancia()} Peso di oggi (kg)</label>
      <div class="peso-input-riga">
        <input id="peso-oggi" type="number" step="0.1" inputmode="decimal">
        <button id="btn-peso" type="button">Salva</button>
      </div>
      <span id="esito-peso" class="nota"></span>
      <h2>Budget di oggi</h2>
      <div id="riepilogo-budget"></div>
    </section>

    <details class="sezione" id="dettaglio-mangiato">
      <summary>${iconForchetta()} Mangiato oggi</summary>
      <div class="contenuto">
        <ul id="lista-alimenti"></ul>
      </div>
    </details>

    <details class="sezione" id="dettaglio-manuale">
      <summary>Aggiungi manualmente</summary>
      <div class="contenuto">
        <label for="log-alimento">Alimento</label>
        <select id="log-alimento"></select>
        <label for="log-grammi">Grammi</label>
        <input id="log-grammi" type="number" placeholder="grammi" min="0" inputmode="numeric">
        <label for="log-modalita">Modalità</label>
        <select id="log-modalita">
          <option value="crudo">Crudo</option>
          <option value="cotto">Cotto</option>
        </select>
        <button id="btn-log-manuale" type="button">Aggiungi</button>
      </div>
    </details>

    <details class="sezione" id="dettaglio-extra">
      <summary>Note fuori piano</summary>
      <div class="contenuto">
        <input id="extra-testo" placeholder="Aggiungi cibo/nota fuori piano">
        <button id="btn-extra" type="button">+ Aggiungi</button>
        <ul id="lista-extra"></ul>
      </div>
    </details>
  `;

  container.querySelector('#peso-oggi').value = giorno.peso ?? '';

  const selectAlimento = container.querySelector('#log-alimento');
  selectAlimento.innerHTML = Object.entries(databaseAlimenti)
    .map(([id, a]) => `<option value="${id}">${a.nome}</option>`)
    .join('');

  function statoAttuale() {
    const consumato = calcolaConsumato(giorno.alimenti, databaseAlimenti);
    const rimasto = calcolaRimasto(targetGiornaliero, consumato);
    return { consumato, rimasto };
  }

  function renderSuggerimentoIn(card, postWorkout) {
    const { rimasto } = statoAttuale();
    const lista = postWorkout ? combosPasto.postWorkout : combosPasto.normale;
    const indice = postWorkout ? indiceComboPostWorkout % lista.length : indiceComboNormale % lista.length;
    const combo = lista[indice];

    const suggerimento = suggerisciPasto({
      rimasto,
      pastiLoggatiOggi: giorno.pastiLoggati,
      isPostWorkout: postWorkout,
      combo,
      databaseAlimenti
    });

    const parti = [`${suggerimento.proteina.grammiCrudi}g ${databaseAlimenti[suggerimento.proteina.alimentoId].nome} (crudo)`];
    if (suggerimento.carbo) {
      parti.push(`${suggerimento.carbo.grammiCrudi}g ${databaseAlimenti[suggerimento.carbo.alimentoId].nome} (crudo)`);
    }

    card.innerHTML = `
      <p class="etichetta">${postWorkout ? 'Post-workout' : 'Adesso'}</p>
      <p>${parti.join(' + ')}</p>
      ${suggerimento.nota ? `<p class="nota">${suggerimento.nota}</p>` : ''}
      <button id="btn-aggiungi-suggerimento" type="button" class="primario">Aggiungi al log</button>
      <button id="btn-cambia-proposta" type="button">Cambia proposta</button>
    `;

    card.querySelector('#btn-aggiungi-suggerimento').addEventListener('click', () => {
      const ora = oraAttuale();
      giorno.alimenti.push({ ora, alimentoId: suggerimento.proteina.alimentoId, grammiCrudi: suggerimento.proteina.grammiCrudi, modalitaInserita: 'crudo' });
      if (suggerimento.carbo) {
        giorno.alimenti.push({ ora, alimentoId: suggerimento.carbo.alimentoId, grammiCrudi: suggerimento.carbo.grammiCrudi, modalitaInserita: 'crudo' });
      }
      giorno.pastiLoggati += 1;
      persist();
      renderTutto();
    });

    card.querySelector('#btn-cambia-proposta').addEventListener('click', () => {
      if (postWorkout) indiceComboPostWorkout += 1;
      else indiceComboNormale += 1;
      renderSuggerimentoIn(card, postWorkout);
    });
  }

  function renderCardAdesso() {
    const card = container.querySelector('#card-adesso');
    const azione = prossimaAzione(giorno);

    if (azione.tipo === 'pesati') {
      card.innerHTML = `
        <p class="etichetta">Adesso</p>
        <p>Pesati stamattina</p>
        <div class="peso-input-riga">
          <input id="peso-adesso-input" type="number" step="0.1" inputmode="decimal" aria-label="Peso di oggi in kg" placeholder="kg">
          <button id="btn-peso-adesso" type="button" class="primario">Ho fatto</button>
        </div>
      `;
      card.querySelector('#btn-peso-adesso').addEventListener('click', () => {
        const valore = Number(card.querySelector('#peso-adesso-input').value);
        if (!valore) return;
        giorno.peso = valore;
        persist();
        renderTutto();
      });
      return;
    }

    if (azione.tipo === 'allenamento-in-corso') {
      card.innerHTML = `
        <p class="etichetta">Adesso</p>
        <p>Sei in allenamento</p>
        <button id="btn-fine-allenamento-adesso" type="button" class="primario">Ho finito di allenarmi</button>
      `;
      card.querySelector('#btn-fine-allenamento-adesso').addEventListener('click', () => {
        giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'post-workout-iniziato' });
        persist();
        renderTutto();
      });
      return;
    }

    renderSuggerimentoIn(card, azione.tipo === 'post-workout');
  }

  function renderBudget() {
    const { consumato, rimasto } = statoAttuale();
    const percentualeKcal = Math.min(100, Math.max(0, (consumato.kcal / targetGiornaliero.kcal) * 100));
    const oltre = consumato.kcal > targetGiornaliero.kcal;
    container.querySelector('#riepilogo-budget').innerHTML = `
      <div class="progress-numero">
        <span>${formatoNumero(consumato.kcal)} / ${targetGiornaliero.kcal} kcal</span>
        <span class="badge ${oltre ? '' : 'ok'}">${oltre ? 'Oltre budget' : 'In linea'}</span>
      </div>
      <div class="progress-bar${oltre ? ' oltre-budget' : ''}"><span style="width:${percentualeKcal}%"></span></div>
      <p>P ${formatoNumero(consumato.p)}g · F ${formatoNumero(consumato.f)}g · C ${formatoNumero(consumato.c)}g</p>
      <p class="nota">Restano: ${formatoNumero(rimasto.kcal)} kcal · ${formatoNumero(rimasto.p)}g P · ${formatoNumero(rimasto.f)}g F · ${formatoNumero(rimasto.c)}g C</p>
    `;
  }

  function renderListaAlimenti() {
    const lista = container.querySelector('#lista-alimenti');
    lista.innerHTML = '';
    giorno.alimenti.forEach((voce, i) => {
      const alimento = databaseAlimenti[voce.alimentoId];
      const rapporto = rapportiCotturaCrudo[voce.alimentoId];
      const mostraCotto = cottiVisualizzati.has(i) && rapporto;
      const pesoMostrato = mostraCotto ? Math.round(voce.grammiCrudi * rapporto) : voce.grammiCrudi;

      const li = document.createElement('li');
      const testo = document.createTextNode(`${voce.ora} — ${pesoMostrato}g ${alimento.nome} (${mostraCotto ? 'cotto' : 'crudo'}) `);
      li.appendChild(testo);

      const azioni = document.createElement('div');
      if (rapporto) {
        const btnToggle = document.createElement('button');
        btnToggle.type = 'button';
        btnToggle.textContent = mostraCotto ? 'mostra crudo' : 'mostra cotto';
        btnToggle.addEventListener('click', () => {
          if (cottiVisualizzati.has(i)) cottiVisualizzati.delete(i);
          else cottiVisualizzati.add(i);
          renderListaAlimenti();
        });
        azioni.appendChild(btnToggle);
      }

      const btnRimuovi = document.createElement('button');
      btnRimuovi.type = 'button';
      btnRimuovi.className = 'distruttivo';
      btnRimuovi.textContent = 'rimuovi';
      btnRimuovi.addEventListener('click', () => {
        giorno.alimenti.splice(i, 1);
        persist();
        renderTutto();
      });
      azioni.appendChild(btnRimuovi);

      li.appendChild(azioni);
      lista.appendChild(li);
    });
  }

  function renderExtra() {
    const lista = container.querySelector('#lista-extra');
    lista.innerHTML = '';
    giorno.extra.forEach((e, i) => {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(e.testo + ' '));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'distruttivo';
      btn.textContent = 'rimuovi';
      btn.addEventListener('click', () => {
        giorno.extra.splice(i, 1);
        persist();
        renderExtra();
      });
      li.appendChild(btn);
      lista.appendChild(li);
    });
  }

  function renderTutto() {
    renderCardAdesso();
    renderBudget();
    renderListaAlimenti();
  }

  function salvaPeso() {
    const input = container.querySelector('#peso-oggi');
    giorno.peso = input.value ? Number(input.value) : null;
    persist();
    container.querySelector('#esito-peso').textContent = giorno.peso != null ? `Salvato: ${giorno.peso}kg` : '';
    renderCardAdesso();
  }
  container.querySelector('#peso-oggi').addEventListener('change', salvaPeso);
  container.querySelector('#btn-peso').addEventListener('click', salvaPeso);

  container.querySelector('#btn-log-manuale').addEventListener('click', () => {
    const alimentoId = selectAlimento.value;
    const grammiInseriti = Number(container.querySelector('#log-grammi').value) || 0;
    if (grammiInseriti <= 0) return;
    const modalita = container.querySelector('#log-modalita').value;
    const rapporto = rapportiCotturaCrudo[alimentoId];
    const grammiCrudi = modalita === 'cotto' && rapporto ? Math.round(grammiInseriti / rapporto) : grammiInseriti;

    giorno.alimenti.push({ ora: oraAttuale(), alimentoId, grammiCrudi, modalitaInserita: modalita });
    giorno.pastiLoggati += 1;
    container.querySelector('#log-grammi').value = '';
    persist();
    renderTutto();
  });

  container.querySelector('#btn-extra').addEventListener('click', () => {
    const input = container.querySelector('#extra-testo');
    if (!input.value.trim()) return;
    giorno.extra.push({ testo: input.value.trim() });
    input.value = '';
    persist();
    renderExtra();
  });

  renderTutto();
  renderExtra();
}
```

Note: the standalone "Mi sto allenando ora" button and the old always-open "Cosa mangiare adesso" block are intentionally gone from this file — the button moves to Task 7 (`allenamento.js`), the suggestion now lives inside `#card-adesso`.

- [ ] **Step 2: Manual check in the browser**

Run: `cd app && python -m http.server 8000` (background), open `http://localhost:8000`, go to "Oggi".
Expected:
- If today has no weight saved yet: the orange "Adesso" card shows "Pesati stamattina" with an inline input + "Ho fatto" button; saving it updates the card to show the next suggestion.
- With weight saved and no training event today: the card shows the next meal suggestion (protein + carb + buttons), same numbers as before the redesign.
- "Budget di oggi" shows a progress bar + kcal fraction + a badge ("In linea" / "Oltre budget").
- "Mangiato oggi" / "Aggiungi manualmente" / "Note fuori piano" are collapsible sections that expand/collapse on tap.
- No "Mi sto allenando ora" button appears on this screen (moved to Allenamento in Task 7).

- [ ] **Step 3: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd app
git add js/oggi.js
git commit -m "$(cat <<'EOF'
feat: ristruttura la schermata Oggi con card Adesso e sezioni comprimibili

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 7: Restructure "Allenamento" — one exercise at a time + relocated buttons

**Files:**
- Modify: `app/js/allenamento.js` (full rewrite)

**Interfaces:**
- Consumes: `oraAttuale`, `getGiornoOggi`, `oggiISO` from `./giorno-oggi.js` (Task 1); `iconManubrio`, `iconSpunta` from `./icons.js` (Task 3); `details.esercizio`/`.serie-riga`/`.badge` CSS (Task 4).
- Produces: nothing new consumed elsewhere (leaf screen).

- [ ] **Step 1: Replace `app/js/allenamento.js` entirely with:**

```js
import { datiDefault } from './dati-default.js';
import { calcolaSettimana, calcolaFase, applicaDeload } from './mesociclo.js';
import { calcolaProgressione } from './progressione.js';
import { oraAttuale, getGiornoOggi, oggiISO } from './giorno-oggi.js';
import { iconManubrio, iconSpunta } from './icons.js';

function sessioniDisponibili(fase) {
  if (fase === 'fase1') return datiDefault.sessioniPerFase.fase1;
  if (fase === 'fase2') return datiDefault.sessioniPerFase.fase2;
  if (fase === 'deload') return datiDefault.sessioniPerFase.fase2;
  return [];
}

function tracciaProgressione(esercizioConfig) {
  return esercizioConfig.tracciaProgressione !== false;
}

function salvatoOggi(esercizioStato) {
  return esercizioStato.storico.some((s) => s.data === oggiISO());
}

function renderEsercizio(esercizioConfig, esercizioStato, serieProgrammate, isDeload, giaFatto, onSalva) {
  const conPeso = tracciaProgressione(esercizioConfig);
  const unita = conPeso ? 'reps' : 'sec/reps';
  const dettaglio = document.createElement('details');
  dettaglio.className = 'sezione esercizio';

  const righeSerie = Array.from({ length: serieProgrammate }, (_, i) => `
    <div class="serie-riga">
      ${conPeso ? `<label>Peso S${i + 1} (kg)<input type="number" class="peso-input" data-serie="${i}" min="0" step="0.5" value="${esercizioStato.ultimoPeso}" inputmode="decimal"></label>` : ''}
      <label>${conPeso ? `Reps S${i + 1}` : `Serie ${i + 1}`} (target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax})<input type="number" class="rep-input" data-serie="${i}" min="0" inputmode="numeric"></label>
    </div>
  `).join('');

  const riepilogo = conPeso
    ? `ultimo peso: ${esercizioStato.ultimoPeso}kg${isDeload ? ' (scarico: carico invariato)' : ''}, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`
    : `a corpo libero, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`;

  dettaglio.innerHTML = `
    <summary>
      <span class="esercizio-titolo">
        ${esercizioConfig.nome}
        ${conPeso ? `<span class="nota">${esercizioStato.ultimoPeso}kg</span>` : ''}
        ${giaFatto ? `<span class="badge ok">${iconSpunta()} fatto</span>` : ''}
      </span>
    </summary>
    <div class="contenuto">
      <p class="nota">${riepilogo}</p>
      ${righeSerie}
      <label>RPE (1-10)<input type="number" class="rpe-input" min="1" max="10" inputmode="numeric"></label>
      <label>Nota (facoltativa)<input type="text" class="nota-input"></label>
      <button type="button" class="btn-salva primario">Salva sessione</button>
      <div class="esito nota"></div>
    </div>
  `;

  // Il peso della prima serie si copia sulle altre finché non vengono modificate
  // a mano (drop set): si parte tutte uguali, si corregge solo quello che cambia.
  if (conPeso) {
    const inputsPesoEl = Array.from(dettaglio.querySelectorAll('.peso-input'));
    inputsPesoEl.slice(1).forEach((input) => {
      input.addEventListener('input', () => {
        input.dataset.modificato = 'true';
      });
    });
    if (inputsPesoEl.length > 1) {
      inputsPesoEl[0].addEventListener('input', () => {
        const valore = inputsPesoEl[0].value;
        inputsPesoEl.slice(1).forEach((input) => {
          if (!input.dataset.modificato) input.value = valore;
        });
      });
    }
  }

  const btnSalva = dettaglio.querySelector('.btn-salva');
  // Protezione dal doppio tap su mobile: due click ravvicinati inserirebbero
  // due voci nello storico e applicherebbero la progressione due volte.
  let giaSalvato = false;

  btnSalva.addEventListener('click', () => {
    if (giaSalvato) return;
    const reps = Array.from(dettaglio.querySelectorAll('.rep-input')).map((inp) => Number(inp.value) || 0);
    if (reps.some((r) => r === 0)) {
      dettaglio.querySelector('.esito').textContent = 'Inserisci le reps per tutte le serie prima di salvare.';
      return;
    }
    const pesi = conPeso ? Array.from(dettaglio.querySelectorAll('.peso-input')).map((inp) => Number(inp.value) || 0) : [];
    if (conPeso && pesi.some((p) => p === 0)) {
      dettaglio.querySelector('.esito').textContent = 'Inserisci il peso per tutte le serie prima di salvare.';
      return;
    }
    const rpe = Number(dettaglio.querySelector('.rpe-input').value) || null;
    const nota = dettaglio.querySelector('.nota-input').value.trim();

    let messaggio;
    if (!conPeso) {
      // Esercizio senza carico: si registra solo la prestazione, nessun peso da aggiornare.
      esercizioStato.storico.push({ data: oggiISO(), peso: null, reps, rpe, nota });
      messaggio = 'Sessione salvata (esercizio a corpo libero, nessun carico da aggiornare).';
    } else {
      // Il peso della prima serie diventa la nuova base (es. si riparte più
      // leggeri dopo una pausa) — la progressione parte sempre da lì, non dal
      // vecchio valore memorizzato se l'utente lo ha corretto.
      esercizioStato.ultimoPeso = pesi[0];

      if (isDeload) {
        // Settimana di scarico: la sessione si registra, ma il carico resta
        // invariato (quello appena impostato) e i fallimenti non si toccano.
        esercizioStato.storico.push({ data: oggiISO(), peso: pesi[0], pesiSerie: pesi, reps, rpe, nota });
        messaggio = `Sessione di scarico salvata, peso invariato (${pesi[0]}kg).`;
      } else {
        // La doppia progressione valuta solo la prima serie (il "vero" carico di
        // lavoro): le serie successive possono essere un drop set a peso ridotto
        // e non devono essere lette come "hai polverizzato il target".
        const risultato = calcolaProgressione(esercizioStato, { reps: [reps[0]] });
        esercizioStato.storico.push({ data: oggiISO(), peso: pesi[0], pesiSerie: pesi, reps, rpe, nota });
        esercizioStato.ultimoPeso = risultato.nuovoPeso;
        esercizioStato.fallimentiConsecutivi = risultato.nuoviFallimentiConsecutivi;

        const messaggi = {
          aumenta: `Sessione salvata. La prossima volta: +peso → ${risultato.nuovoPeso}kg.`,
          diminuisci: `Sessione salvata. La prossima volta: -peso → ${risultato.nuovoPeso}kg.`,
          invariato: `Sessione salvata. La prossima volta: stesso peso (${risultato.nuovoPeso}kg).`
        };
        messaggio = messaggi[risultato.azione];
      }
    }

    giaSalvato = true;
    btnSalva.disabled = true;
    btnSalva.textContent = 'Sessione salvata';

    dettaglio.querySelector('.esito').textContent = messaggio;
    onSalva();
  });

  return dettaglio;
}

function renderSessione(container, titolo, sessione, data, persist, riduciSerie, aggiornaAlternanza) {
  const div = document.createElement('div');
  div.innerHTML = `<h3>${titolo}</h3>`;
  const lista = document.createElement('div');
  lista.className = 'lista-esercizi';
  const dettagli = [];

  sessione.esercizi.forEach(({ id, serie }) => {
    const esercizioConfig = datiDefault.esercizi[id];
    const esercizioStato = data.esercizi[id];
    const serieEffettive = riduciSerie ? applicaDeload(serie) : serie;
    const giaFatto = salvatoOggi(esercizioStato);

    const dettaglio = renderEsercizio(esercizioConfig, esercizioStato, serieEffettive, riduciSerie, giaFatto, () => {
      if (aggiornaAlternanza) {
        // Ricorda quale sessione Upper/Lower è stata fatta per ultima, così la
        // volta dopo l'app propone l'altra invece di lasciare all'utente la scelta a caso.
        data.mesociclo.ultimaSessioneFase2 = sessione.nome;
      }
      persist();
      dettaglio.open = false;
      dettaglio.classList.add('salvato');
      const prossimo = dettagli.find((d) => d !== dettaglio && !d.classList.contains('salvato') && !d.open);
      if (prossimo) prossimo.open = true;
    });

    if (giaFatto) dettaglio.classList.add('salvato');
    dettagli.push(dettaglio);
    lista.appendChild(dettaglio);
  });

  const primoApribile = dettagli.find((d) => !d.classList.contains('salvato'));
  if (primoApribile) primoApribile.open = true;

  div.appendChild(lista);
  container.appendChild(div);
}

export function renderAllenamento(container, data, persist) {
  container.innerHTML = '';
  const giorno = getGiornoOggi(data);

  const azioni = document.createElement('div');
  azioni.className = 'card';
  azioni.innerHTML = `
    <button id="btn-inizio-allenamento" type="button" class="primario">${iconManubrio()} Mi sto allenando ora</button>
    <button id="btn-fine-allenamento" type="button">Ho finito di allenarmi</button>
  `;
  container.appendChild(azioni);
  azioni.querySelector('#btn-inizio-allenamento').addEventListener('click', () => {
    giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'inizio-allenamento' });
    persist();
  });
  azioni.querySelector('#btn-fine-allenamento').addEventListener('click', () => {
    giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'post-workout-iniziato' });
    persist();
  });

  const settimana = calcolaSettimana(data.mesociclo.dataInizio, oggiISO());
  const fase = calcolaFase(settimana);
  const isDeload = fase === 'deload';
  const isFase2 = fase === 'fase2' || fase === 'deload';

  const intestazione = document.createElement('p');
  intestazione.textContent = `Mesociclo 1 — Settimana ${settimana} (${fase})`;
  container.appendChild(intestazione);

  const sessioni = sessioniDisponibili(fase);
  if (sessioni.length === 0) {
    // Oltre la settimana 5 (mesociclo2) non ci sono ancora sessioni definite:
    // meglio dirlo che mostrare una sezione vuota senza spiegazione.
    const avviso = document.createElement('p');
    avviso.textContent = 'Mesociclo 1 completato — Mesociclo 2 da definire. Nel frattempo puoi usare le sessioni extra qui sotto.';
    container.appendChild(avviso);
  } else if (isFase2 && sessioni.length > 1) {
    // Alterna Upper/Lower in base all'ultima sessione fase2 salvata (non alla
    // fase, che dura settimane): se ieri hai fatto Upper, oggi propone Lower.
    const ultima = data.mesociclo.ultimaSessioneFase2;
    const suggerita = sessioni.find((s) => s.nome !== ultima) || sessioni[0];
    const altre = sessioni.filter((s) => s !== suggerita);
    renderSessione(container, `${suggerita.nome} (consigliata oggi)`, suggerita, data, persist, isDeload, true);
    altre.forEach((sessione) => {
      renderSessione(container, `${sessione.nome} (alternativa)`, sessione, data, persist, isDeload, true);
    });
  } else {
    sessioni.forEach((sessione) => {
      renderSessione(container, sessione.nome, sessione, data, persist, isDeload, false);
    });
  }

  const titoloExtra = document.createElement('h2');
  titoloExtra.textContent = 'Sessioni extra leggere (facoltative)';
  container.appendChild(titoloExtra);

  Object.values(datiDefault.sessioniExtra).forEach((sessione) => {
    renderSessione(container, sessione.nome, sessione, data, persist, false, false);
  });
}
```

Add the small remaining layout rule this file needs to `app/css/style.css` (append after `.tab-btn.active { ... }`):

```css
.esercizio-titolo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Manual check in the browser**

Run: `cd app && python -m http.server 8000` (background), open `http://localhost:8000`, go to "Allenamento".
Expected:
- "Mi sto allenando ora" / "Ho finito di allenarmi" buttons appear at the top of this screen (no longer on Oggi).
- Exercises appear as collapsible rows; the first not-yet-saved-today exercise is open by default, the rest are collapsed showing name + last weight.
- Peso/reps inputs for each set are side by side (grid), not stacked.
- Saving an exercise closes it (green checkmark badge, accent-colored label) and automatically opens the next unsaved one.
- Re-tapping a closed (already saved or not) exercise still opens it.

- [ ] **Step 3: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd app
git add js/allenamento.js css/style.css
git commit -m "$(cat <<'EOF'
feat: ristruttura la schermata Allenamento con un esercizio alla volta

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 8: Restyle "Storico" + theme-aware chart color

**Files:**
- Modify: `app/js/storico.js`

**Interfaces:**
- Consumes: `.card` CSS (Task 4); the `--color-primary`/`--color-muted-foreground` custom properties (Task 4) read at runtime via `getComputedStyle`.
- Produces: nothing new consumed elsewhere (leaf screen).

**Pre-existing bug fixed in passing:** `js/storico.js:50` currently reads `g.fatti.length` — `fatti` was removed from the day-record shape when the adaptive meal engine replaced the fixed 4-meal checklist (see `js/storage.js:46-49` and `storage.test.js:125`, which asserts `fatti` is stripped). Every populated day now throws `TypeError: Cannot read properties of undefined (reading 'length')` on this line, crashing the Storico screen. Since this task already rewrites this exact function, Step 1 below fixes it by counting `pastiLoggati >= 4` instead (the adaptive engine's equivalent counter — same "tutti e 4 i pasti" semantics, using the field that actually exists). This is a one-line data-access fix, not a change to any calculation.

- [ ] **Step 1: Replace `app/js/storico.js` entirely with:**

```js
import { datiDefault } from './dati-default.js';

function coloreToken(nome, fallback) {
  const valore = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return valore || fallback;
}

function disegnaGraficoPeso(canvas, punti) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (punti.length < 2) {
    ctx.fillStyle = coloreToken('--color-muted-foreground', '#666');
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
  ctx.strokeStyle = coloreToken('--color-primary', '#F97316');
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
  const giorniAderenti = Object.values(data.pasti).filter((g) => g.pastiLoggati >= 4).length;

  container.innerHTML = `
    <section class="card">
      <h2>Peso corporeo</h2>
      <canvas id="grafico-peso" width="320" height="150"></canvas>
    </section>
    <section class="card">
      <h2>Aderenza pasti</h2>
      <p>${giorniAderenti} / ${giorniTotali} giorni con tutti e 4 i pasti completati</p>
    </section>
    <section class="card">
      <h2>Storico carichi</h2>
      <ul id="lista-carichi"></ul>
    </section>
    <button id="btn-backup" type="button">Esporta backup</button>
  `;

  disegnaGraficoPeso(container.querySelector('#grafico-peso'), giorniConPeso);

  // Costruzione via DOM + textContent: `nota` è testo libero digitato
  // dall'utente e non deve MAI finire in una template string assegnata a
  // innerHTML (stesso accorgimento già adottato in js/oggi.js per gli extra).
  const listaCarichi = container.querySelector('#lista-carichi');
  const vociCarichi = Object.entries(data.esercizi).filter(([, e]) => e.storico.length > 0);

  if (vociCarichi.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nessun allenamento registrato ancora.';
    listaCarichi.appendChild(li);
  } else {
    vociCarichi.forEach(([id, e]) => {
      const ultima = e.storico[e.storico.length - 1];
      const conPeso = datiDefault.esercizi[id]?.tracciaProgressione !== false;

      const li = document.createElement('li');
      const nome = document.createElement('strong');
      nome.textContent = e.nome;
      li.appendChild(nome);

      const dettagli = [];
      if (conPeso) dettagli.push(`${e.ultimoPeso}kg`);
      dettagli.push(`ultima sessione ${ultima.data}`);
      dettagli.push(`reps ${ultima.reps.join('/')}`);
      if (ultima.rpe != null) dettagli.push(`RPE ${ultima.rpe}`);
      li.appendChild(document.createTextNode(`: ${dettagli.join(' — ')}`));

      if (ultima.nota) {
        const nota = document.createElement('div');
        nota.className = 'nota';
        nota.textContent = `Nota: ${ultima.nota}`;
        li.appendChild(nota);
      }

      listaCarichi.appendChild(li);
    });
  }

  container.querySelector('#btn-backup').addEventListener('click', () => esportaBackup(data));
}
```

- [ ] **Step 2: Manual check in the browser**

Run: `cd app && python -m http.server 8000` (background), open `http://localhost:8000`, go to "Storico".
Expected: weight chart, adherence line, load history and backup button now sit inside styled cards; the chart line renders in orange in light mode. To check dark mode: switch the OS/browser to dark and reload — the chart line stays legible (still orange, still readable against the dark card background) and the "insufficient data" fallback text (if fewer than 2 weigh-ins exist) is legible too.

- [ ] **Step 3: Run the full test suite**

Run: `cd app && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd app
git add js/storico.js
git commit -m "$(cat <<'EOF'
style: applica le card al design system e rende il grafico peso theme-aware

Corregge anche un crash preesistente in renderStorico: `g.fatti` non esiste
più nel formato dati del motore pasti adattivo, ora si usa `pastiLoggati`.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```

---

### Task 9: Final verification pass

**Files:** none (verification only — fix-forward if issues are found, re-run the affected task's steps).

**Interfaces:** none.

- [ ] **Step 1: Run the full automated test suite one more time**

Run: `cd app && npm test`
Expected: PASS (all suites: `budget`, `mesociclo`, `progressione`, `storage`, `giorno-oggi`, `prossima-azione`, `icons`)

- [ ] **Step 2: Manual pre-delivery checklist in the browser**

Run: `cd app && python -m http.server 8000` (background), open `http://localhost:8000` with the browser dev tools open.

Check, in both light and dark OS theme, and at a 375px-wide viewport:
- [ ] Every screen (Oggi/Allenamento/Storico) is reachable from the bottom nav, active tab highlighted.
- [ ] Card "Adesso" on Oggi shows the correct one of the 4 states depending on today's data (test by: logging a weight, starting a workout, finishing a workout, logging a meal — using the actual UI, not devtools).
- [ ] Budget progress bar switches to the destructive color + "Oltre budget" badge once kcal consumed exceeds the daily target (log enough food to cross it).
- [ ] Collapsible sections on Oggi and each exercise on Allenamento open/close on tap, with a visible focus ring when tabbing to them via keyboard.
- [ ] Text contrast looks solid in both themes (no gray-on-gray, no orange text directly on the orange card).
- [ ] No horizontal scroll at 375px width on any of the 3 screens.
- [ ] With OS "reduce motion" enabled, the collapsible-section arrow and progress bar update instantly (no animation).
- [ ] Weight/grams/reps/RPE inputs bring up the numeric keyboard on a real mobile device or Chrome device toolbar emulation (`inputmode` check).

- [ ] **Step 3: Fix any issues found**

If something fails, fix it in the relevant file from Tasks 4-8 and re-commit as a small `fix:` commit referencing what broke — do not silently amend earlier commits.

- [ ] **Step 4: Final commit (only if Step 3 produced fixes; otherwise skip)**

```bash
cd app
git add -A
git commit -m "$(cat <<'EOF'
fix: correzioni dalla verifica finale del redesign UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KaDK9NDyJxQqnbms7TH8g4
EOF
)"
```
