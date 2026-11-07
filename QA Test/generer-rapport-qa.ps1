
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$base='E:\PedagoraPilot\TP-ECSR-Pilot\QA Test'
$lines=[IO.File]::ReadAllLines("$base\cahier-extracted.txt",[Text.Encoding]::UTF8)
$rows=@()
for($i=0;$i -lt $lines.Length;$i++){
 if($lines[$i] -match '^((?:AUTH|MET|QUAL)-\d+-\d+)\s*•\s*(.*?)\s*\[(P\d)\]'){
  $rows += [pscustomobject]@{id=$Matches[1];title=$Matches[2];priority=$Matches[3];given=[string]$lines[$i+1];when=[string]$lines[$i+2];then=[string]$lines[$i+3];status='NON EXÉCUTÉ';observations='Non parcouru dans cette passe partielle';evidence='';test='';bugs=''}
 }
}
$observed=Get-Content -Raw -Encoding utf8 "$base\resultats-observes.json" | ConvertFrom-Json
$bugs=(Get-Content -Raw -Encoding utf8 "$base\anomalies-detaillees.json" | ConvertFrom-Json)
foreach($r in $rows){
 $o=$observed.PSObject.Properties[$r.id]
 if($o){foreach($k in @('status','observations','test','bugs','evidence')){$r.$k=$o.Value.$k};continue}
 if($r.id -match '^AUTH-01-' -or $r.id -in @('AUTH-02-003','AUTH-04-005','AUTH-06-003','AUTH-06-005')){
  $r.status='NON APPLICABLE';$r.observations=if($r.id -match '^AUTH-01-' -or $r.id -eq 'AUTH-02-003'){'Création de compte exclue de la campagne. Aucun parcours public ouvert.'}else{'Modification mot de passe/réinitialisation globale explicitement exclue.'};continue
 }
 $reason='';$test='';$evidence='';$bug=''
 if($r.id -match '^MET-022-'){$reason='Aucun utilisateur QA actif avec responsabilités. Invitations non acceptées ; seuls administrateurs préexistants protégés par consigne. Aucun retrait/suspension effectué.';$test='test-27'}
 elseif($r.id -match '^MET-021-'){$reason='Période et inscrit QA/tuteur actif indisponibles ; aucune lecture email ni activation initiale.';$evidence='snapshot23';$bug='task-6 (prérequis)'}
 elseif($r.id -match '^MET-016-'){$reason='Aucune séance QA avec participants créée : formateur actif et inscriptions QA absents. Aucune signature simulée. Erreur chargement dossier distincte task-7.'}
 elseif($r.id -match '^MET-010-'){$reason='ECSR sans compétences ; QA avec compétence mais sans promotion/stagiaire inscrit. Rôles formateur/stagiaire indisponibles.'}
 elseif($r.id -match '^MET-012-'){$reason='Aucune session/candidat QA ni jury actif éligible. État vide défectueux task-8 ; aucune décision finale produite.';$bug='task-8'}
 elseif($r.id -match '^MET-009-' -or $r.id -match '^MET-008-'){$reason='Aucun formateur actif éligible ; aucune séance QA créée. Parcours dépendant non exécuté.';$evidence='snapshots55/59'}
 elseif($r.id -match '^MET-011-'){$reason='Séance QA et inscriptions QA absentes ; aucun enregistrement de présence sur personnes préexistantes.'}
 elseif($r.id -match '^MET-015-'){$reason='Aucun document QA importé : chemin refusé par Chrome MCP. Dossiers QA/rôles dépendants absents. Aucun bug import affirmé.';$test='test-16'}
 elseif($r.id -match '^MET-017-'){$reason='Activité/cohorte QA et profils formateur/stagiaire nécessaires indisponibles ; aucune activité externe réelle.'}
 elseif($r.id -in @('MET-023-003','MET-023-005','MET-023-006','MET-023-010','MET-023-012','MET-018-02')){$reason='Précondition spécifique absente : promotion/stage/session QA, rôle jury ou boîte destinataire autorisée.'}
 if($reason){$r.status='BLOQUÉ';$r.observations=$reason;$r.test=$test;$r.evidence=$evidence;$r.bugs=$bug}
}
if($rows.Count -ne 547 -or @($rows.id | Sort-Object -Unique).Count -ne 547){throw 'Le registre doit contenir547 identifiants uniques'}
$rows | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 "$base\campagne-20261106.json"
$rows | Select-Object id,title,priority,status,observations,evidence,test,bugs | Export-Csv -NoTypeInformation -Delimiter ';' -Encoding utf8 "$base\suivi-complet-547.csv"
function esc([object]$s){return ([string]$s).Replace('|','/').Replace([string][char]13,' ').Replace([string][char]10,' ')}
$t=[Collections.Generic.List[string]]::new()
$t.Add('# Suivi individuel — 547 scénarios');$t.Add('')
$t.Add('Source : PedagoraPilotCahierRecette.docx, V2 enrichie du6 novembre2026. Passe du6–7 novembre2026 Europe/Paris. Les adaptations de données sont indiquées ; les scénarios non parcourus ne sont pas présentés comme exécutés.');$t.Add('')
$t.Add('| Scénario | Priorité | Statut | Observations | Preuves | Tests / bugs |');$t.Add('|---|---|---|---|---|---|')
foreach($r in $rows){$t.Add("| $($r.id) — $(esc $r.title) | $($r.priority) | $($r.status) | $(esc $r.observations) | $(esc $r.evidence) | $(esc ($r.test+' / '+$r.bugs)) |")}
$t | Set-Content -Encoding utf8 "$base\suivi-complet-547.md"
$c=@{};foreach($s in @('CONFORME','NON CONFORME','BLOQUÉ','NON APPLICABLE','NON EXÉCUTÉ')){$c[$s]=@($rows | Where-Object status -eq $s).Count}
$summary=[ordered]@{total=547;applicables=(547-$c['NON APPLICABLE']);executes=($c['CONFORME']+$c['NON CONFORME']);conformes=$c['CONFORME'];non_conformes=$c['NON CONFORME'];bloques=$c['BLOQUÉ'];non_applicables=$c['NON APPLICABLE'];non_executes=$c['NON EXÉCUTÉ'];tests=28;etapes_conformes=26;etapes_echec=21;etapes_ignorees=12;anomalies=13;recommandation='NO-GO';portee='Passe partielle'}
$summary | ConvertTo-Json | Set-Content -Encoding utf8 "$base\synthese.json"
$ev=@{'task-1'='Captures conversation22:53/22:56 UTC ; snapshots10/21 ; req71/72/261';'task-2'='Captures conversation ; snapshots11/40/55/92';'task-3'='Captures après invitation ; snapshots13/14/15';'task-4'='Captures conversation ; snapshots23/30/65';'task-5'='[Capture](evidence/site-duplicate-500.jpg) ; req720';'task-6'='[Capture](evidence/learners-empty.jpg) ; snapshots51/52/53';'task-7'='[Notification](evidence/learners-empty.jpg) ; req1084';'task-8'='[Capture](evidence/certification-empty.jpg) ; req1359 réponse []';'task-9'='Capture conversation23:07 UTC';'task-10'='[Capture](evidence/distance-empty.jpg)';'task-11'='[Capture](evidence/statistics-qa.jpg)';'task-12'='[Capture](evidence/export-excel.jpg)';'task-13'='[Capture](evidence/isolation-a.jpg) ; req2168'}
$minor=@('task-2','task-4','task-9','task-12')
$btxt=[Collections.Generic.List[string]]::new();$btxt.Add('# Registre — 13 anomalies ouvertes');$btxt.Add('')
$btxt.Add('Aucune correction ni retest de correction. Regroupements fonctionnels sans cause technique commune affirmée. Aucune fuite inter-organisations démontrée sur le dossier testé.');$btxt.Add('')
$btxt.Add('| ID | Gravité | Titre | Reproductibilité observée | Preuve |');$btxt.Add('|---|---|---|---|---|')
foreach($b in $bugs){$sev=if($b.id -in $minor){'MINEUR'}else{'MAJEUR'};$rep=if($b.id -eq 'task-1'){'3 variantes/3 en échec'}elseif($b.id -eq 'task-6'){'Plusieurs navigations et filtre'}else{'1/1 ; flakiness non évaluée'};$btxt.Add("| $($b.id) | $sev | $(esc $b.title) | $rep | $($ev[$b.id]) |")}
foreach($b in $bugs){$btxt.Add('');$btxt.Add("## $($b.id) — $($b.title)");$btxt.Add('');$btxt.Add([string]$b.description);$btxt.Add('');$btxt.Add("Preuve : $($ev[$b.id]). Tests liés : $($b.linkedTestIds -join ', ').");foreach($cm in $b.comments){$btxt.Add('');$btxt.Add([string]$cm.text)}}
$btxt | Set-Content -Encoding utf8 "$base\registre-anomalies.md"
$p=[Collections.Generic.List[string]]::new()
$p.Add('# PedagoraPilot — recette fonctionnelle, passe partielle');$p.Add('')
$p.Add('**NO-GO sur la base des tests effectués.** Anomalies fonctionnelles significatives ouvertes et couverture P0 incomplète. Ce rapport ne valide ni sécurité technique, ni performance, ni exploitation.');$p.Add('')
$p.Add('## A. Synthèse');$p.Add('');$p.Add('| Indicateur | Nombre |');$p.Add('|---|---:|')
$p.Add("| Source | 547 |");$p.Add("| Applicables dans ce périmètre | $($summary.applicables) |");$p.Add("| Exécutés avec verdict | $($summary.executes) |")
foreach($s in @('CONFORME','NON CONFORME','BLOQUÉ','NON APPLICABLE','NON EXÉCUTÉ')){$p.Add("| $s | $($c[$s]) |")}
$p.Add('');$p.Add('Exécutés = conformes + non conformes. Les BLOQUÉS sont évalués sur leurs prérequis mais les actions dépendantes ne sont pas exécutées. Les NON EXÉCUTÉS restent à parcourir. Les verdicts source sont distincts des28 tests CC réutilisables :59 étapes,26 pass,21 fail,12 skip ; certains tests couvrent plusieurs scénarios ou des contrôles supplémentaires.')
$p.Add('');$p.Add('CC Tests affiche automatiquement passing pour certains runs entièrement skip : tests27/28 sont BLOQUÉS, jamais conformes dans ce rapport. PDF final non vérifié. Contrôle du dossier étranger : aucune donnée privée exposée ; HTTP500 est une anomalie de traitement du refus, pas une fuite démontrée.')
$p.Add('');$p.Add('## Découverte et précautions');$p.Add('')
$p.Add('- Staging : https://pedagora.staging.locaguest.com ; onglet1 existant exclusivement. Application déjà disponible, aucun démarrage local.')
$p.Add('- API métier : https://pedagora.api.staging.locaguest.com ; AuthGate : https://auth.staging.locaguest.com. Front local Angular22 ; npm start documenté, non exécuté.')
$p.Add('- Source : [PedagoraPilotCahierRecette.docx](PedagoraPilotCahierRecette.docx), contenu V2 enrichi du6 novembre2026,547 identifiants uniques. Le nom diffère du titre long fourni, contenu et nombre correspondent.')
$p.Add('- A samevariste@yahoo.fr = SAMY FOKAMY, administrateur ECF ; B sam.fokam@gmail.com = Sam FOKAM, administrateur AFTRAL. Une organisation active constatée par compte.')
$p.Add('- Aucun compte public ni organisation par inscription créés. Aucun mot de passe/MFA modifié ; aucune boîte Gmail consultée ; invitations selon les alias autorisés seulement.')
$p.Add('- Aucune suppression, suspension ou modification de données préexistantes. Modifications limitées aux données QA créées pendant la passe. Aucun test de charge, infrastructure ou audit technique indépendant.')
$p.Add('');$p.Add('## B. Suivi complet');$p.Add('')
$p.Add('Une ligne par scénario : [CSV filtrable](suivi-complet-547.csv), [tableau Markdown](suivi-complet-547.md), [JSON avec GIVEN/WHEN/THEN](campagne-20261106.json). Adaptations ECF/AFTRAL/QA précisées, aucune réussite des parcours non parcourus.')
$p.Add('');$p.Add('## C. Anomalies');$p.Add('')
$p.Add('13 tickets ouverts :9 MAJEURS,4 MINEURS. [Registre détaillé](registre-anomalies.md), [export CC Tasks](anomalies-detaillees.json), [tests et preuves textuelles](tests-durables.json). Aucun bug déclaré corrigé.')
$p.Add('');$p.Add('| ID | Gravité | Anomalie |');$p.Add('|---|---|---|')
foreach($b in $bugs){$sev=if($b.id -in $minor){'MINEUR'}else{'MAJEUR'};$p.Add("| $($b.id) | $sev | $(esc $b.title) |")}
$p.Add('');$p.Add('## D. Bilan par module');$p.Add('')
$p.Add('| Module | Bilan observé et limites |');$p.Add('|---|---|')
$modules=@(
'Authentification | A/B valides, refus identifiants erronés, correction, persistance et déconnexion locale vérifiés. Récupération/MFA non couverts.',
'Organisations et sites | ECF/AFTRAL identifiés ; site QA créé/modifié/persisté ; contexte Paris/QA Cannes changé. Multi-organisations bloqué. Dossier étranger sans données exposées maisHTTP500.',
'Accès et invitations | Invitations inédites persistées ; identités existantes/auto-invitations enHTTP500 ; validation silencieuse ; tiroir automatique absent, manuel accessible. Rôles limités indisponibles.',
'Formations/référentiels/compétences | FormationQA draft140h5modules persistée ; source conservée après duplication draft ; compétenceQA ajoutée/modifiée/persistée via Administration. Activation responsable bloquée.',
'Promotions/stagiaires | PromotionParis2 inscrits et dossiers accessibles ; liste Stagiaires vide. Validation promotion et invitation stagiaire vérifiées ; inscription initiale exclue.',
'Planning/séances/présences | Vues/périodes Planning et sélection promotion fonctionnent ; validation Planning explicite, Séances silencieuse. Créations/présences bloquées faute formateur.',
'Évaluations | Configuration compétenceQA vérifiée ; évaluation pédagogique bloquée par rôles et inscriptionsQA absents.',
'Stages/tuteurs/retraits | Supervision Direction affichée ; périodeQA et invitation tuteur bloquées par inscrit absent. Aucun retrait/suspension préexistant tenté ; MET-022 bloqué.',
'Certification/jury | API sessions vide mais écranPreparing/lien sansID ; clés brutes ; publication sans session refusée génériquement. Examens/jury/décisions finales non exécutés.',
'Documents/signatures | Bibliothèque vide ; import bloqué par restriction chemins Chrome MCP, pas de bug import affirmé. Chargement observations signature enHTTP500 ; émargements non exécutés.',
'Distanciel/télétravail | Distanciel100% présentiel sans heures et validation silencieuse ; télétravail/politique consultés, demandes/profils employés non exécutés.',
'Statistiques/tableaux de bord | Accueil vide consulté ; statistiquesQA avecC1-C4 hors référentiel réel. Calculs non nuls et profils multiples non validés.',
'Notifications/exports/historique | Notifications erreurs observées ; destinataires emails non vérifiés. Excel sans promotion générique ; PDF final non vérifiable. ActionsQA visibles dans journal, archivage non exécuté.',
'FR/EN/interface | Clés EN brutes Stages/Sites/Jury ; dates Planning FR. Onglet compétences vide sans orientation. FR complet, mobile et clavier approfondi restent non exécutés.'
)
foreach($m in $modules){$p.Add("| $m |")}
$p.Add('');$p.Add('## Données QA et limites de reprise');$p.Add('')
$p.Add('- ECF : QA Formateur20261106a, sam.fokam+qa.formateur20261106a@gmail.com, Trainer Invitation sent, non acceptée.')
$p.Add('- AFTRAL : QA Stagiaire20261106b, sam.fokam+qa.stagiaire20261106b@gmail.com, Student Invitation sent, non acceptée.')
$p.Add('- Site QA0611 QA Recette20261106,42bea239-3cd0-4ab2-b6be-a9e25e81d9e1, responsableB ; Nice puis Cannes/06400.')
$p.Add('- Formation QAF0611 QA Formation20261106 draft140h5modules, siteQA0611, sans responsable pédagogique.')
$p.Add('- Source QA2026.1 active b72b7431-b152-4f36-9598-531c35e39349 ; nouvelle versionQA Référentiel20261106 draft72708904-5cd9-494d-a415-7a5b07bfd0f6. CompétenceQAC0611 sur source, intitulé terminé par modifiée.')
$p.Add('- Aucun stagiaireQA activé ni séance/stage/session examQA créé. Aucun accès email autorisé. Téléchargement PDF et import fichier restent non vérifiables avec les outils actuels.')
$p.Add('- Chrome MCP refuse les chemins locaux absolus/relatifs (workspace roots serveur). Captures inline sauvegardées via detached-command. Ne pas confondre cette limite avec un bug de l''import applicatif.')
$p.Add('');$p.Add('Preuves : [site persisté](evidence/sites-persisted.jpg), [doublon site](evidence/site-duplicate-500.jpg), [liste stagiaires](evidence/learners-empty.jpg), [certification](evidence/certification-empty.jpg), [distanciel](evidence/distance-empty.jpg), [statistiques](evidence/statistics-qa.jpg), [export](evidence/export-excel.jpg), [auth négative](evidence/auth-invalid.jpg), [dossier étranger](evidence/isolation-a.jpg). Autres snapshots/captures référencés dans conversation et tickets.')
$p.Add('');$p.Add('## E. Recommandation et continuité');$p.Add('')
$p.Add('**NO-GO.** Corriger en priorité les invitations existantes, la liste stagiaires, les états certification et statistiques personnalisées. Fournir des profils actifs de recette/prérequis sans inscription publique ; corriger les chemins Chrome ; reprendre lesP0 BLOQUÉS/NON EXÉCUTÉS et retester chaque anomalie. Réutiliser tests1–28 et tickets1–13. Cette passe partielle ne constitue pas une recette complète des547 scénarios.')
$p | Set-Content -Encoding utf8 "$base\rapport-recette-20261106.md"
$summary | ConvertTo-Json

