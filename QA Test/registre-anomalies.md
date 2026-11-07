# Registre — 13 anomalies ouvertes

Aucune correction ni retest de correction. Regroupements fonctionnels sans cause technique commune affirmée. Aucune fuite inter-organisations démontrée sur le dossier testé.

| ID | Gravité | Titre | Reproductibilité observée | Preuve |
|---|---|---|---|---|
| task-1 | MAJEUR | Invitation d’une identité existante : HTTP500 (auto-invitation et inter-organisations) | 3 variantes/3 en échec | Captures conversation22:53/22:56 UTC ; snapshots10/21 ; req71/72/261 |
| task-2 | MINEUR | Formulaires Invitations, Formations et Séances : validation silencieuse | 1/1 ; flakiness non évaluée | Captures conversation ; snapshots11/40/55/92 |
| task-3 | MAJEUR | Après invitation, le tiroir d’affectations annoncé ne s’ouvre pas | 1/1 ; flakiness non évaluée | Captures après invitation ; snapshots13/14/15 |
| task-4 | MINEUR | Traductions EN : clés brutes dans Stages, Établissements et Certification | 1/1 ; flakiness non évaluée | Captures conversation ; snapshots23/30/65 |
| task-5 | MAJEUR | Établissement : code déjà utilisé provoque HTTP500 sans explication de doublon | 1/1 ; flakiness non évaluée | [Capture](evidence/site-duplicate-500.jpg) ; req720 |
| task-6 | MAJEUR | Liste Stagiaires vide malgré deux inscrits visibles dans Promotion et dossiers | Plusieurs navigations et filtre | [Capture](evidence/learners-empty.jpg) ; snapshots51/52/53 |
| task-7 | MAJEUR | Dossier stagiaire : observations de signature en HTTP500 | 1/1 ; flakiness non évaluée | [Notification](evidence/learners-empty.jpg) ; req1084 |
| task-8 | MAJEUR | Certification sans session : statut Preparing et navigation vers un identifiant vide | 1/1 ; flakiness non évaluée | [Capture](evidence/certification-empty.jpg) ; req1359 réponse [] |
| task-9 | MINEUR | Référentiel : onglet Compétences entièrement vide sans état ni parcours | 1/1 ; flakiness non évaluée | Capture conversation23:07 UTC |
| task-10 | MAJEUR | Distanciel vide : 100% présentiel affiché sans aucune heure | 1/1 ; flakiness non évaluée | [Capture](evidence/distance-empty.jpg) |
| task-11 | MAJEUR | Statistiques : compétences C1–C4 affichées hors référentiel actif QA | 1/1 ; flakiness non évaluée | [Capture](evidence/statistics-qa.jpg) |
| task-12 | MINEUR | Exports actifs sans promotion : erreur générique sans prérequis explicite | 1/1 ; flakiness non évaluée | [Capture](evidence/export-excel.jpg) |
| task-13 | MAJEUR | Dossier hors organisation : HTTP500 et squelette vide au lieu d’un refus d’accès | 1/1 ; flakiness non évaluée | [Capture](evidence/isolation-a.jpg) ; req2168 |

## task-1 — Invitation d’une identité existante : HTTP500 (auto-invitation et inter-organisations)

AUTH-08-001 ; gravité MAJEUR (medium). Compte A samevariste@yahoo.fr ; rôle effectif Organization administrator ; ECF (24c04a2a-5f65-4a15-881d-420c9159de79). URL https://pedagora.staging.locaguest.com/acces. Reproduction : remplir prénom QA, nom Autoinvitation, email propre compte, rôle Trainer ; cliquer Invite and define assignments. Attendu : refus explicite sans doublon. Observé : POST https://pedagora.api.staging.locaguest.com/api/v1/access/invite HTTP 500, notification Unable to send this invitation ; aucun motif d’auto-invitation. Preuves : snapshot uid10_3, reqid71 et screenshot de conversation 22:53. Impact : validation métier invitations non expliquée. Aucun mot de passe modifié.

Preuve : Captures conversation22:53/22:56 UTC ; snapshots10/21 ; req71/72/261. Tests liés : test-2.

AUTH-08-002 : casse et espaces donnent aussi HTTP500 req72. AUTH-08-004 : B administrateur AFTRAL invite A existant ECF au rôle trainer ; HTTP500 req261, code COMMON_UNEXPECTED_ERROR, traceId 90d5e60d3bea4b639a480bf8116105e9. Aucun enregistrement AFTRAL. L’invitation d’un alias inédit fonctionne (HTTP200 req122). Regroupement provisoire : échec des identités existantes ; cause technique non confirmée. Impact MAJEUR : invitation inter-organisations bloquée. Capture conversation 22:56 ; snapshot21. Formulaire conservé après erreur. Le tiroir manuel des affectations fonctionne (task-3 = automatique seulement).

## task-2 — Formulaires Invitations, Formations et Séances : validation silencieuse

MET-003-002 ; gravité MINEUR (low). Compte A administrateur ECF, https://pedagora.staging.locaguest.com/acces. Reproduction : actualiser, laisser prénom nom email vides, cliquer Invite and define assignments. Attendu : champs manquants signalés. Observé : aucune réaction ni message, champs non marqués required dans le DOM, bouton actif ; aucun compte ajouté. Reproductibilité 1/1. Preuve snapshot11 et capture conversation 22:54. Impact : utilisateur ne sait pas pourquoi le formulaire ne se soumet pas. Cause différente de task-1 (aucune requête serveur).

Preuve : Captures conversation ; snapshots11/40/55/92. Tests liés : test-3.

MET-004-002 : B AFTRAL site QA0611, /formations > Create a program > Create program vide. Aucune erreur ni champ signalé (snapshot40 et capture 23:00 UTC). Pas de requête création. Même symptôme que /acces ; regroupement UX validation, implémentation à confirmer.

MET-009-002 : B AFTRAL Paris /seances, Trainer sans options, Topic vide, Create session sans réaction ni message requis. Snapshot55 et capture23:03UTC. Création séance valide bloquée faute formateur actif. test-14 lié.

MET-017-04 : /distanciel site QA0611 sans cohorte > Create remote activity > Save vide : aucune validation/message. Snapshot92 et screenshot23:09UTC. Test-21 lié ; aucune création.

## task-3 — Après invitation, le tiroir d’affectations annoncé ne s’ouvre pas

MET-003-003/006 ; MAJEUR (medium). Compte A administrateur ECF /acces. Inviter QA Formateur20261106a, alias autorisé sam.fokam+qa.formateur20261106a@gmail.com, rôle Trainer. POST invite HTTP200 req122 et invitation persistée au rafraîchissement. Attendu selon aide de l’écran : ouverture automatique du tiroir pour définir le périmètre. Observé : liste actualisée, utilisateur sélectionné, aucune boîte ni tiroir. Capture après invitation et snapshots13/14. 0 affectation. Impact : étape annoncée du parcours omise ; vérifier le bouton manuel séparément. Email non consulté.

Preuve : Captures après invitation ; snapshots13/14/15. Tests liés : test-3.

## task-4 — Traductions EN : clés brutes dans Stages, Établissements et Certification

QUAL-001-002 ; MINEUR (low). Compte B administrateur AFTRAL, /stages, interface EN. Ouvrir New internship period ; sous Tutor email, aide affichée sous forme de clé internships.s10.emailInvitation. Attendu : texte anglais explicite. Observé DOM snapshot23 uid23_21. Capture formulaire conversation 22:56 (aide sous le pli). Impact : compréhension du parcours invitation tuteur.

Preuve : Captures conversation ; snapshots23/30/65. Tests liés : test-6.

MET-002-002 : /etablissements > Add a site > soumettre vide : sites.validation.managerRequired affiché deux fois. Snapshot30 et screenshot 22:58 montrant la clé rouge. Compte B AFTRAL. Regroupé comme traductions manquantes ; test-8 lié.

QUAL-001-002 supplémentaire : /certification/sessions/ affiche certification.juryAccess.title / refresh / empty (snapshot65). Planning EN affiche dates françaises lun., mar., décembre, déc. (snapshots57/58). test-17 lié ; capture certification conservée dans conversation.

Consolidation : aide internships.s10.emailInvitation ; validation sites.validation.managerRequired/fieldsRequired/save.unavailable ; certification.juryAccess.*. Date du planning encore FR dans interface EN. Pas de retest de correction ; anomalies ouvertes.

## task-5 — Établissement : code déjà utilisé provoque HTTP500 sans explication de doublon

MET-002-005 ; MAJEUR (medium). B administrateur AFTRAL, /etablissements. Prérequis : QA0611 créé pendant campagne. Ajouter un site code QA0611, nom QA Recette 20261106 doublon, ville Cannes, CP06400, adresse1 rue de la Recette QA, email alias autorisé et responsable Sam FOKAM. Valider. Attendu : refus explicite code déjà utilisé. Observé : POST /organizations/ba257ef0-3ce4-4163-919b-653f9292f7ee/sites HTTP500 req720 et clé sites.validation.save.unavailable. Snapshot38, screenshot conversation 23:00 UTC. Impact : contrôle unicité non compréhensible. Ne pas modifier les sites préexistants.

Preuve : [Capture](evidence/site-duplicate-500.jpg) ; req720. Tests liés : test-8.

## task-6 — Liste Stagiaires vide malgré deux inscrits visibles dans Promotion et dossiers

MET-007-001 ; MAJEUR (high). B administrateur AFTRAL, ETB-001 Paris, formation ECSR, promotion TP ECSR2026-2027. URL /stagiaires. Étapes : ouvrir Promotions (2 stagiaires Sam paul, valerie rose), ouvrir Sam paul (dossier accessible), Back to students, filtrer TP ECSR2026-2027. Attendu : retrouver les deux inscrits. Observé : 0 student(s) shown out of0 et No students found ; même avant filtre et après navigation complète. Preuves snapshots51/52/53, capture 23:02 UTC. Impact : recherche/listes élèves et formulaires stage sans stagiaire malgré cohortes existantes. Aucune donnée préexistante modifiée.

Preuve : [Capture](evidence/learners-empty.jpg) ; snapshots51/52/53. Tests liés : test-12.

## task-7 — Dossier stagiaire : observations de signature en HTTP500

MET-016 (chargement transverse, pas scénario complet de signature) ; MAJEUR medium. B administrateur AFTRAL Paris. Ouvrir https://pedagora.staging.locaguest.com/stagiaires/1ea8ba5a-6704-4d52-b02d-df7588bac88c. Attendu : observations chargées ou état vide. Observé : GET signatures/observations/enrollment/b5d4e23a-1f78-4c60-8e78-5740c85b38ad HTTP500 req1084 et notification Unable to load signature request. Capture conversation liste stagiaires 23:02 où la notification issue du dossier reste visible. Impact : suivi signature du dossier indisponible ; données générales du dossier visibles.

Preuve : [Notification](evidence/learners-empty.jpg) ; req1084. Tests liés : test-13.

## task-8 — Certification sans session : statut Preparing et navigation vers un identifiant vide

MET-012-001 ; MAJEUR medium. B administrateur AFTRAL Paris ECSR. /certification affiche SESSION BEING PREPARED, Preparing, dates → · et liens Manage session / Open vers /certification/sessions/ sans ID. La réponse GET certification/sessions?cohortId=895b764c-ccff-4bb9-9a4c-5cfb50030a04 est [] (req1359 HTTP200). Cliquer Manage session ouvre un écran de progression sans session réelle. Attendu : état vide et création/prérequis explicites, aucun faux statut. Preuves snapshots64/65, screenshot23:05 et réseau1359. Impact : certification ne propose pas de parcours de création depuis cet état, informations ambiguës. Ne pas considérer une session créée.

Preuve : [Capture](evidence/certification-empty.jpg) ; req1359 réponse []. Tests liés : test-17.

Dans QA formation sans cohorte ni session : /resultats offre Publish results, puis Unable to publish the certification results sans expliquer absence session/décision. Snapshot102, capture23:11UTC. Test-24 lié. Publication refusée, pas d’exposition de décision finale démontrée. L’écart porte sur état vide et prérequis.

## task-9 — Référentiel : onglet Compétences entièrement vide sans état ni parcours

QUAL-001-009 (extension état vide référentiel), MET-005-006 bloqué ; MINEUR low. B admin AFTRAL site QA0611. Ouvrir /referentiels/72708904-5cd9-494d-a415-7a5b07bfd0f6 (brouillon QA créé campagne), cliquer Competencies. Attendu : message absence compétences et parcours configuration. Observé : seul en-tête et navigation restent, zone de contenu vide, aucun bouton. Capture23:07UTC. Onglets Training hours et Placements affichent du contenu/état vide. Ne prouve pas absence globale de configuration depuis Administration.

Preuve : Capture conversation23:07 UTC. Tests liés : test-19.

Complément : configuration des compétences accessible depuis /administration/competences après sélection d’un programme. Une compétence QA créée avec succès. L’anomalie porte seulement sur l’état vide et l’absence de lien d’orientation dans l’onglet du référentiel, pas sur impossibilité globale d’ajout.

## task-10 — Distanciel vide : 100% présentiel affiché sans aucune heure

MET-017-18/26 ; MAJEUR medium. B admin AFTRAL site QA0611, formation QA, aucune promotion ni activité. /distanciel affiche0 live sessions,0h synchronous/asynchronous,0inscrits mais donut et On site100%. Aucun état non calculable ; Remote sessions et Asynchronous modules vides sans explication. Attendu : N/A ou état sans données, pas un pourcentage présenté comme réel sur dénominateur0. Capture pleine page23:09UTC et snapshots91/92. Impact : interprétation erronée des indicateurs de modalité.

Preuve : [Capture](evidence/distance-empty.jpg). Tests liés : test-21.

## task-11 — Statistiques : compétences C1–C4 affichées hors référentiel actif QA

MET-013-002/012 ; MAJEUR medium. B admin AFTRAL QA0611, programme QA Formation20261106, version active QA2026.1 avec seule compétence QAC0611 créée/modifiée via Administration. /statistiques affiche C1 Build and prepare…, C2 Lead group…, C3 Lead vehicle…, C4 Assess learning… à0%, sans QAC0611. Attendu : référentiel réel du contexte sélectionné ou absence de résultats, pas compétences exemples. Preuves snapshot89 catalogue QAC0611, snapshot95 statistiques et screenshot pleine page23:10UTC. Impact : statistiques de compétences non contextualisées, trompeuses pour formations personnalisées.

Preuve : [Capture](evidence/statistics-qa.jpg). Tests liés : test-22.

## task-12 — Exports actifs sans promotion : erreur générique sans prérequis explicite

MET-020-15/QUAL-001-003 ; MINEUR low. B admin AFTRAL site QA0611 formation QA sans promotion. /rapports propose boutons Export Excel/PDF et select vide. Cliquer Excel : notification Could not export the report, aucun fichier ni explication sélectionner/créer promotion ; aucune requête export réseau. Attendu : boutons désactivés avec prérequis, message explicite ou export vide valide. Snapshot98 et capture23:10UTC. Impact : utilisateur bloqué sans démarche de récupération.

Preuve : [Capture](evidence/export-excel.jpg). Tests liés : test-23.

## task-13 — Dossier hors organisation : HTTP500 et squelette vide au lieu d’un refus d’accès

MET-001-006 ; MAJEUR medium (gestion fonctionnelle du refus, aucune fuite démontrée). Compte A administrateur ECF, pas membre AFTRAL. URL https://pedagora.staging.locaguest.com/stagiaires/1ea8ba5a-6704-4d52-b02d-df7588bac88c (dossier valide connu avec B). Attendu : accès refusé/404 adapté sans données privées. Observé : GET reporting/learners/{id}/detail HTTP500 req2168 ; notification Unable to load learner record ; écran dossier avec0h,0%, nom/dates vides. Aucune donnée du stagiaire dans DOM. Capture23:12UTC snapshot109. Impact : message d’autorisation absent, faux écran vide et erreur serveur.

Preuve : [Capture](evidence/isolation-a.jpg) ; req2168. Tests liés : test-26.
