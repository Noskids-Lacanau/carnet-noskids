# Journal des versions

## 1.8.7 — 2026-11-23

- Grand affichage de la session couché à l'horizontale (à lire téléphone tourné), sans case à cocher
- Préparation de la session : encart 2 réorganisé (familles en retrait, + alignés, totaux, boutons Skieur / Passager compacts, nouvelle personne seulement pour les extérieurs), alerte au-delà de 8 personnes
- Accueil : jauge estimée à côté d'un stock de bidons compact, lignes de boutons espacées, logo Malibu en léger relief

## 1.8.6 — 2026-11-23

- Session : option « Rotation automatique » ; en paysage, grand affichage (skieur, chrono du tour, temps moteur, pilote, heure), aussi ouvrable en portrait
- Hors session : l'app reste en portrait
- Zoom désactivé dans l'app

## 1.8.5 — 2026-11-23

- Accueil : couleurs par nature (essence en orange, finances en violet léger, journal en post-it jaune), lisibles en mode jour et nuit
- « Plein bateau » remplace « Remplissage bateau »

## 1.8.4 — 2026-11-23

- Fiches pilotes : temps de tours 2024-2025 réparti entre wake et ski (Elsa 95 % wake, Baptiste 80 % wake, Yann 90 % slalom), réglable dans Pratique

## 1.8.3 — 2026-11-23

- Contacts : plus de doublon Propriétaire, la section saisie dans l'annuaire passe en tête

## 1.8.2 — 2026-11-23

- Détail du coût : toucher un poste affiche les dépenses qu'il contient (ou le calcul : essence estimée, usure, amortissement, achat moins revente)
- Effacer des données, importer ou restaurer, valider la balance et noter un virement : réservés à Yann et Olivier
- Accueil : bouton Achat essence sans la ligne du stock

## 1.8.1 — 2026-11-23

- Accueil : « GO pour session » avec l'icône centrée en turquoise ; achat essence et remplissage de même hauteur
- Synthèse : coût fixe et coût variable par minute côte à côte, avec « / min »
- Photo du bateau : nom en haut à droite, sans la puissance en kW

## 1.8.0 — 2026-11-23

- Activité : synthèse par bateau (Noskids / Response 1993), coût total, litres, minutes, coût par minute, coût fixe annuel
- Ancien bateau : dépenses jusqu'à fin 2025, achat moins revente (25 000 €) ; nouveau : essence estimée à 13 L/h tant qu'elle n'est pas saisie
- Dépenses affectables à un bateau (champ bateau, achat du bateau marqué)
- Temps de ski par personne : tous bateaux confondus
- Lien vers le Google Sheet en bas des dépenses (envoyé par le serveur 1.3.0)
- Accueil : boutons achat essence et remplissage moins hauts

## 1.7.0 — 2026-11-23

- Triangles a la place des + pour deplier
- Notes : photo ou video, compteur et bandeau des notes a lire
- Annuaire : Proprietaires en tete, ordre des sections reglable
- Fiche pilote : etoiles a droite du prenom, modifiable par la personne, Yann ou Olivier
- Essence : formulaire achat revu, bidons de plus de 20 L, payeur obligatoire
- Balance essence de plein a plein, boutons Depense et Balance
- Retour arriere par le geste du telephone
- Serveur 1.3.0 : photo jointe et lien video dans l e-mail des notes

## 1.6.4 — 2026-11-23

- Journal - Notes : effacer une note, après confirmation (l'effacement se propage aux autres téléphones)
- Serveur 1.2.0 (à recoller et redéployer dans Apps Script) : un e-mail aux destinataires à chaque nouvelle note ; adresses réglées par le menu Carnet Noskids > Destinataires des notes

## 1.6.3 — 2026-11-23

- Saison 2026 saisie en un bloc (import saison-2026.json) : rappel sur l'accueil, mention « à compléter » dans la liste des sessions et note dans le détail
- Nouveau script outils/Publier.ps1 : une commande pour publier une version (garde-fous sur les fichiers privés)
- README : procédure de mise à jour, imports ponctuels et prochaines étapes (Tricount, détail de la saison 2026)

## 1.6.2 — 2026-11-23

- Nouvelle icône de l'app : la photo du skieur avec le logo Malibu doré (version adaptable pour Android avec le logo dans la zone visible).

## 1.6.1 — 2026-11-23

- Mode nuit du téléphone : boutons colorés sur fonds profonds de leur couleur avec texte clair ; boutons turquoise et sélecteurs de famille assombris pour garder le texte blanc lisible. Contraste vérifié sur tous les écrans, en mode nuit et en clair.

## 1.6.0 — 2026-11-23

- Accueil : boutons d'accès direct en relief (session, achat essence, remplissage, statistiques, historique, journal, contact urgence) ; bandeau redessiné et logo Malibu doré.
- Journal - Notes : date et auteur automatiques, nature au choix, historique, pastille rouge pour les nouvelles notes.
- Urgence - Dépannage (sous Bateau) : 112, SAMU, pompiers, police, Sport Service Pitrot, police du lac, association SNLG, VLG ; appel direct, ajout de numéros par section.
- Session : étapes 1 à 4 (compteur et jauge, personnes à bord, vérifications huile / pompe de cale / aération, démarrage) ; photo du compteur demandée en terminant, consultable dans le détail de la session.
- Compteur moteur : la liste des sessions s'ouvre ligne par ligne (compteur, jauge, pilote, à bord, photo).
- Activité : s'ouvre sur la dernière année avec des sessions ; indicateurs financiers et détail du coût repliables ; bouton Saisir une dépense en haut.
- Essence : gros boutons en relief, total des achats par famille et par année, mouvements repliables ; les achats enregistrent leurs litres.
- Fiche pilote : téléphone avec appel direct ; correction de la saisie des dates.
- Bateau : Pilotes et Urgence côte à côte, Documents repliable ; bandeaux Session, Essence et Activité en rubans de lumière.

## 1.5.0 — 2026-11-23

- Barre de menu : Session et Essence à gauche, Accueil au centre en bouton rond plus gros, Activité et Bateau à droite ; nouvelles icônes (bidon, inboard avec tour de wake).
- Pilotes devient un sous-menu de Bateau, ouvert par un bandeau jaune.
- Fiche pilote : prénom, date de naissance (âge calculé), étoiles et permis côtier / fluvial avec date d'obtention, photo à droite.
- Fiche pilote : paramètres de pratique (ski : vitesse de démarrage, niveau actuel et meilleure performance avec vitesse, corde et bouées ; wake : vitesse et nœud), statistiques, figures de wake avec leur état, diplômes (dont Premiers secours et Radio CRR).
- Photos des pilotes et des familles, réduites dans l'app et gardées dans la base partagée ; photo de la famille devant son nom dans Session.
- Textes d'aide allégés (Session, Documents).

## 1.4.0 — 2026-11-22

- Activité : carte repliable « Temps et sessions par personne » et liste repliable des sessions par année (numéro, mois, Yann / Olivier / les deux, temps moteur).
- Compteur moteur : un écart de 10 min ou moins entre deux sessions est ignoré (le temps chronométré fait foi) ; au-delà, alerte pendant la saisie du compteur de départ et ligne « Trou de compteur » dans la liste des sessions.
- Le compteur de départ proposé se met à jour quand d'autres téléphones ont synchronisé de nouvelles sessions.
- Photo de slalom à l'accueil et en vignette du bandeau Session ; jauge d'essence de l'accueil réduite.

## 1.3.0 — 2026-11-22

- Documents : envoi de plusieurs fichiers d'un coup ; l'app propose la catégorie, l'année et la personne d'après le nom du fichier, à vérifier avant l'envoi dans Google Drive.
- Nouvelles catégories : Diplômes et formations, Réglementation.
- Fiche pilote : pièces rattachées (permis, code, diplômes, formations, secourisme), avec ajout direct depuis la fiche.

## 1.2.0 — 2026-11-22

- Menu Activité (bilan de l'année : coût par minute, temps par famille et par personne) en premier ; les dépenses et la balance s'ouvrent par un lien en bas de page.
- Pilotes : prérogatives de chaque grade (1 à 4 étoiles) affichées en bas de page, textes validés par Yann.
- Fiche pilote : diplômes et qualifications fédérales (initiateur baby-ski, wake, slalom, bi-ski, barefoot, monitorat fédéral, CQP, BPJEPS) et autres qualifications.

## 1.1.0 — 2026-11-22

- Menu Pilotes : fiche (présentation, activité préférée, permis), heures de ski, wake, passager et pilotage calculées à partir des sessions, grades de 1 à 4 étoiles validés par Yann ou Olivier.
- Menu Finances : regroupe Dépenses et Bilan.
- Annuler une session en cours sans l'enregistrer, après confirmation.
- Sauvegarde : téléchargement d'un fichier de sauvegarde, restauration par import.
- Effacer des données (dépenses ou tout l'historique) : confirmation par le mot EFFACER, sauvegarde automatique sur l'appareil et copie du Google Sheet dans Drive avant effacement.
- Serveur 1.1.0 : action de sauvegarde du Google Sheet (à redéployer dans Apps Script).

## 1.0.0 — 2026-11-22

Première version en production, reprise de la maquette validée (version 8).

- Six écrans avec leur bandeau : Accueil, Session, Essence, Dépenses, Bilan, Bateau.
- Session chronométrée : arrêt moteur, tours par personne, pilote, détails d'activité, correction du temps, passages de moins de 5 s, jauge à aiguille au 1/16, clôture avec plein.
- Personnes en trois groupes (famille Yann, famille Olivier, extérieurs) ; invités rattachés à une famille et facturés 1 €/min (recette pour cette famille).
- Essence : 5 bidons en image, contrôle d'oubli de versement à l'achat, dette de bidons, correction du stock (vol, perte, autre usage).
- Dépenses : parts Yann et Olivier, balance entre familles, catégorie « Règlement entre familles », export Excel de la synthèse.
- Bilan par année : coût complet par minute moteur (coûts fixes, essence, usure moteur, amortissement), courbe sur la saison, détail par personne.
- Bateau : fiche technique de Noskids, entretien des pièces, documents par catégorie et par année (envoi dans Google Drive).
- Base partagée : Google Sheet via Apps Script ; copie locale sur chaque téléphone, fonctionnement hors ligne, synchronisation dans les deux sens.
- Import de l'historique 2023-2025 depuis « Suvi Bateau Malibu.ods ».
- App installable sur l'écran d'accueil, avec mise à jour proposée à chaque nouvelle version.
