# ChargéPro — site de vente

Site statique (HTML, CSS, JavaScript natif) qui présente et vend ChargéPro. Aucun outil de compilation : les fichiers du dépôt sont le site (GitHub Pages).

- Pages publiques : `index.html`, `contact.html`, `mentions-legales.html`, `confidentialite.html`, `404.html`.
- Styles : `assets/css/site.css` ; scripts : `assets/js/site.js` ; captures produit : `assets/images/produit/`.
- `espace/`, `gestion/`, `supabase/`, `assets/css/style.css`, `assets/css/espace.css` et `assets/js/main.js` appartiennent aux anciens outils Ligne&Bati : ne pas les modifier sans demande.
- Les informations à fournir sont repérées par `À COMPLÉTER`.

## UI/UX skills

Taste, a11y, bans, voice, and icon library for this project live in `.ux-profile.md`.
Run `setup-ui-ux-skills` again only to change those defaults.
Before UI or microcopy work, read `.ux-profile.md`, then the matching domain skill (page-patterns, viewports, forms, surfaces, loaders, empty-states, copy, motion).
Before creating a new page, read `page-patterns` and name the pattern. Do not write page markup until the pattern is named.
Layouts must pass `viewports` at 375px and 1280px.
Before finishing UI, run `ux-audit`.
