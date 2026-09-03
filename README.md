# Fitness Tracker

App personale per tracciare pasti, allenamenti e progressione dei carichi, basata su `piano_alimentare.md`.

## Testare in locale

Serve un piccolo server locale (i service worker non funzionano su `file://`). Dalla radice del repository (dove si trovano `index.html`, `package.json` e la cartella `js/`):

```bash
python -m http.server 8000
```

Apri `http://localhost:8000` nel browser.

## Eseguire i test

Serve **Node.js >= 22** (il test runner integrato con il supporto ai glob e `structuredClone` usato in `js/storage.js`).

```bash
npm test
```

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub (es. `fitness-tracker`), pubblico.
2. `git remote add origin <url-del-repo>`
3. `git push -u origin master` — sostituisci `master` con il nome del tuo branch se diverso.
4. Nelle impostazioni del repo su GitHub: Settings → Pages → Source: il branch appena pubblicato, cartella `/ (root)`.
5. Dopo qualche minuto l'app è raggiungibile su `https://<utente>.github.io/<repo>/`.
6. Sul telefono: apri quel link nel browser, poi "Aggiungi a schermata Home" per installarla come app.

### Prima di ogni deploy: aggiorna la cache del service worker

`sw.js` usa una strategia cache-first: **incrementa `CACHE_NAME`** (es. da `fitness-tracker-v1` a `fitness-tracker-v2`) a ogni deploy. Senza quel cambio, chi ha già installato la PWA continuerà a vedere per sempre la versione vecchia in cache e non riceverà mai le correzioni.

## Note sulla privacy

Questo repository contiene solo il codice dell'app. Nessun dato personale (peso, pasti, allenamenti) è incluso — tutto resta salvato localmente nel browser di chi usa l'app (`localStorage`), dispositivo per dispositivo.
