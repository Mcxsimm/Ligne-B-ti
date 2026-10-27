# ChargéPro — site de vente

Site statique (HTML, CSS, JavaScript natif) qui présente ChargéPro, l'outil de pilotage du chargé d'affaires du bâtiment, et recueille les demandes de démo.

- Aucun framework ni outil de compilation : les fichiers du dépôt **sont** le site (GitHub Pages).
- Formulaire de demande de démo via Web3Forms (offre gratuite).
- Aucun cookie, aucun traceur ; police Inter hébergée sur le site.

> **Avant la mise en ligne, traitez [`LANCEMENT.md`](LANCEMENT.md).**

## Structure

```
├── index.html              Accueil : hero, fonctionnalités, parcours, écrans (onglets), mobile, bénéfices, tarifs, données, FAQ
├── contact.html            Demande de démo (formulaire)
├── mentions-legales.html   Mentions légales (champs À COMPLÉTER)
├── confidentialite.html    Données personnelles et cookies
├── 404.html
├── favicon.svg, robots.txt, sitemap.xml
├── .ux-profile.md          Profil UX (référence Stripe, WCAG AA, ton direct) — lu par les skills UI/UX
├── CLAUDE.md               Consignes pour Claude Code
└── assets/
    ├── css/site.css        Feuille de style du site de vente (jetons, thème sombre)
    ├── js/site.js          Menu mobile, onglets, apparitions, formulaire
    ├── fonts/              Inter (licence SIL OFL)
    └── images/produit/     Captures réelles de ChargéPro (mode démonstration)
```

Les dossiers `espace/`, `gestion/`, `supabase/` et les fichiers `assets/css/style.css`, `assets/css/espace.css`, `assets/js/main.js`, `assets/images/logo/`, `ESPACE.md` sont les anciens outils de Ligne&Bati. Ils ne sont plus liés depuis le site public.

## Direction artistique

| Élément | Choix |
|---|---|
| Référence | SaaS B2B sobre : typographie nette, beaucoup d'air, grands visuels produit |
| Marque | Bleu nuit `#142A3A`, vert `#C6F36B` (CTA, états positifs, repères), fonds `#FFFFFF` / `#F5F7F8` |
| Logo | Pictogramme bâtiment en SVG inline (en-tête, pied de page, `favicon.svg`) |
| Texte | Inter, chiffres tabulaires |
| Visuels | Captures réelles de l'application, aucun visuel fictif |
| Accessibilité | WCAG 2.1 AA : contrastes ≥ 4,5:1, cibles ≥ 44 px, focus visible |

## Mettre à jour les captures

Les captures viennent de l'application ChargéPro (dépôt `Charg`) avec un profil créé en cochant « Découvrir avec des données de démonstration ». Format : WebP 1600 × 1000 (ordinateur) et 780 × 1688 (mobile), dans `assets/images/produit/`.

## Modifier le contenu

- Les textes se modifient directement dans les fichiers `.html`.
- L'en-tête et le pied de page sont répétés dans chaque page : reportez toute modification dans les 5 fichiers.
