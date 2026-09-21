# TP ECSR Pilot — Angular 22

Migration fidèle du front React/Lovable vers Angular, écran par écran.

## Stack verrouillée

- Angular 22.1.x, standalone components
- SCSS
- Tailwind CSS 4 (seul framework de styles/UI)
- Phosphor Icons (webfont)
- i18n FR/EN intégré dès le socle via `TranslateService` + fichiers JSON
- Aucun Angular Material / PrimeNG / Bootstrap

## Écran livré dans cette étape

- Connexion `/connexion`
- Inscription `/inscription`
- Responsive desktop/mobile
- Formulaires réactifs
- Affichage/masquage des mots de passe
- Validation de base
- Session de démonstration temporaire en `localStorage`
- Placeholder `/accueil` uniquement pour garder la navigation testable jusqu'à la migration de l'écran suivant

## Démarrage

Angular 22 requiert une version Node compatible. Installer les dépendances puis :

```bash
npm install
npm start
```

## Traductions

Les textes visibles passent par des clés stables dans :

- `public/i18n/fr.json`
- `public/i18n/en.json`

Aucun texte fonctionnel principal des écrans d'authentification n'est codé en dur dans le template.
