# Journal des versions

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
