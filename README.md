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
