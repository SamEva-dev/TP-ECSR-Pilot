# PedagoraPilot — recette fonctionnelle, passe partielle

**NO-GO sur la base des tests effectués.** Anomalies fonctionnelles significatives ouvertes et couverture P0 incomplète. Ce rapport ne valide ni sécurité technique, ni performance, ni exploitation.

## A. Synthèse

| Indicateur | Nombre |
|---|---:|
| Source | 547 |
| Applicables dans ce périmètre | 536 |
| Exécutés avec verdict | 70 |
| CONFORME | 48 |
| NON CONFORME | 22 |
| BLOQUÉ | 293 |
| NON APPLICABLE | 11 |
| NON EXÉCUTÉ | 173 |

Exécutés = conformes + non conformes. Les BLOQUÉS sont évalués sur leurs prérequis mais les actions dépendantes ne sont pas exécutées. Les NON EXÉCUTÉS restent à parcourir. Les verdicts source sont distincts des 28 tests CC réutilisables : 59 étapes, 26 pass, 21 fail, 12 skip ; certains tests couvrent plusieurs scénarios ou des contrôles supplémentaires.

CC Tests affiche automatiquement passing pour certains runs entièrement skip : tests 27/28 sont BLOQUÉS, jamais conformes dans ce rapport. PDF final non vérifié. Contrôle du dossier étranger : aucune donnée privée exposée ; HTTP500 est une anomalie de traitement du refus, pas une fuite démontrée.

## Découverte et précautions

- Staging : https://pedagora.staging.locaguest.com ; onglet 1 existant exclusivement. Application déjà disponible, aucun démarrage local.
- API métier : https://pedagora.api.staging.locaguest.com ; AuthGate : https://auth.staging.locaguest.com. Front local Angular 22 ; npm start documenté, non exécuté.
- Source : [PedagoraPilotCahierRecette.docx](PedagoraPilotCahierRecette.docx), contenu V2 enrichi du 6 novembre 2026,547 identifiants uniques. Le nom diffère du titre long fourni, contenu et nombre correspondent.
- A samevariste@yahoo.fr = SAMY FOKAMY, administrateur ECF ; B sam.fokam@gmail.com = Sam FOKAM, administrateur AFTRAL. Une organisation active constatée par compte.
- Aucun compte public ni organisation par inscription créés. Aucun mot de passe/MFA modifié ; aucune boîte Gmail consultée ; invitations selon les alias autorisés seulement.
- Aucune suppression, suspension ou modification de données préexistantes. Modifications limitées aux données QA créées pendant la passe. Aucun test de charge, infrastructure ou audit technique indépendant.

## B. Suivi complet

Une ligne par scénario : [CSV filtrable](suivi-complet-547.csv), [tableau Markdown](suivi-complet-547.md), [JSON avec GIVEN/WHEN/THEN](campagne-20261106.json). Adaptations ECF/AFTRAL/QA précisées, aucune réussite des parcours non parcourus.

## C. Anomalies

13 tickets ouverts : 9 MAJEURS, 4 MINEURS. [Registre détaillé](registre-anomalies.md), [export CC Tasks](anomalies-detaillees.json), [tests et preuves textuelles](tests-durables.json). Aucun bug déclaré corrigé.

| ID | Gravité | Anomalie |
|---|---|---|
| task-1 | MAJEUR | Invitation d’une identité existante : HTTP500 (auto-invitation et inter-organisations) |
| task-2 | MINEUR | Formulaires Invitations, Formations et Séances : validation silencieuse |
| task-3 | MAJEUR | Après invitation, le tiroir d’affectations annoncé ne s’ouvre pas |
| task-4 | MINEUR | Traductions EN : clés brutes dans Stages, Établissements et Certification |
| task-5 | MAJEUR | Établissement : code déjà utilisé provoque HTTP500 sans explication de doublon |
| task-6 | MAJEUR | Liste Stagiaires vide malgré deux inscrits visibles dans Promotion et dossiers |
| task-7 | MAJEUR | Dossier stagiaire : observations de signature en HTTP500 |
| task-8 | MAJEUR | Certification sans session : statut Preparing et navigation vers un identifiant vide |
| task-9 | MINEUR | Référentiel : onglet Compétences entièrement vide sans état ni parcours |
| task-10 | MAJEUR | Distanciel vide : 100 % présentiel affiché sans aucune heure |
| task-11 | MAJEUR | Statistiques : compétences C1–C4 affichées hors référentiel actif QA |
| task-12 | MINEUR | Exports actifs sans promotion : erreur générique sans prérequis explicite |
| task-13 | MAJEUR | Dossier hors organisation : HTTP500 et squelette vide au lieu d’un refus d’accès |

## D. Bilan par module

| Module | Bilan observé et limites |
|---|---|
| Authentification | A/B valides, refus identifiants erronés, correction, persistance et déconnexion locale vérifiés. Récupération/MFA non couverts. |
| Organisations et sites | ECF/AFTRAL identifiés ; site QA créé/modifié/persisté ; contexte Paris/QA Cannes changé. Multi-organisations bloqué. Dossier étranger sans données exposées maisHTTP500. |
| Accès et invitations | Invitations inédites persistées ; identités existantes/auto-invitations enHTTP500 ; validation silencieuse ; tiroir automatique absent, manuel accessible. Rôles limités indisponibles. |
| Formations/référentiels/compétences | Formation QA brouillon, 140 h et 5 modules persistée ; source conservée après duplication draft ; compétence QA ajoutée/modifiée/persistée via Administration. Activation responsable bloquée. |
| Promotions/stagiaires | PromotionParis2 inscrits et dossiers accessibles ; liste Stagiaires vide. Validation promotion et invitation stagiaire vérifiées ; inscription initiale exclue. |
| Planning/séances/présences | Vues/périodes Planning et sélection promotion fonctionnent ; validation Planning explicite, Séances silencieuse. Créations/présences bloquées faute formateur. |
| Évaluations | Configuration compétence QA vérifiée ; évaluation pédagogique bloquée par rôles et inscriptionsQA absents. |
| Stages/tuteurs/retraits | Supervision Direction affichée ; périodeQA et invitation tuteur bloquées par inscrit absent. Aucun retrait/suspension préexistant tenté ; MET-022 bloqué. |
| Certification/jury | API sessions vide mais écranPreparing/lien sansID ; clés brutes ; publication sans session refusée génériquement. Examens/jury/décisions finales non exécutés. |
| Documents/signatures | Bibliothèque vide ; import bloqué par restriction chemins Chrome MCP, pas de bug import affirmé. Chargement observations signature enHTTP500 ; émargements non exécutés. |
| Distanciel/télétravail | Distanciel100 % présentiel sans heures et validation silencieuse ; télétravail/politique consultés, demandes/profils employés non exécutés. |
| Statistiques/tableaux de bord | Accueil vide consulté ; statistiquesQA avecC1-C4 hors référentiel réel. Calculs non nuls et profils multiples non validés. |
| Notifications/exports/historique | Notifications erreurs observées ; destinataires emails non vérifiés. Excel sans promotion générique ; PDF final non vérifiable. ActionsQA visibles dans journal, archivage non exécuté. |
| FR/EN/interface | Clés EN brutes Stages/Sites/Jury ; dates Planning FR. Onglet compétences vide sans orientation. FR complet, mobile et clavier approfondi restent non exécutés. |

## Données QA et limites de reprise

- ECF : QA Formateur20261106a, sam.fokam+qa.formateur20261106a@gmail.com, Trainer Invitation sent, non acceptée.
- AFTRAL : QA Stagiaire20261106b, sam.fokam+qa.stagiaire20261106b@gmail.com, Student Invitation sent, non acceptée.
- Site QA0611 QA Recette20261106,42bea239-3cd0-4ab2-b6be-a9e25e81d9e1, responsableB ; Nice puis Cannes/06400.
- Formation QAF0611 QA Formation20261106 brouillon, 140 h et 5 modules, siteQA0611, sans responsable pédagogique.
- Source QA2026.1 active b72b7431-b152-4f36-9598-531c35e39349 ; nouvelle versionQA Référentiel20261106 draft72708904-5cd9-494d-a415-7a5b07bfd0f6. CompétenceQAC0611 sur source, intitulé terminé par modifiée.
- Aucun stagiaireQA activé ni séance/stage/session examQA créé. Aucun accès email autorisé. Téléchargement PDF et import fichier restent non vérifiables avec les outils actuels.
- Chrome MCP refuse les chemins locaux absolus/relatifs (workspace roots serveur). Captures inline sauvegardées via detached-command. Ne pas confondre cette limite avec un bug de l'import applicatif.

Preuves : [site persisté](evidence/sites-persisted.jpg), [doublon site](evidence/site-duplicate-500.jpg), [liste stagiaires](evidence/learners-empty.jpg), [certification](evidence/certification-empty.jpg), [distanciel](evidence/distance-empty.jpg), [statistiques](evidence/statistics-qa.jpg), [export](evidence/export-excel.jpg), [auth négative](evidence/auth-invalid.jpg), [dossier étranger](evidence/isolation-a.jpg). Autres snapshots/captures référencés dans conversation et tickets.

## E. Recommandation et continuité

**NO-GO.** Corriger en priorité les invitations existantes, la liste stagiaires, les états certification et statistiques personnalisées. Fournir des profils actifs de recette/prérequis sans inscription publique ; corriger les chemins Chrome ; reprendre les P0 BLOQUÉS/NON EXÉCUTÉS et retester chaque anomalie. Réutiliser tests 1–28 et tickets 1–13. Cette passe partielle ne constitue pas une recette complète des 547 scénarios.
