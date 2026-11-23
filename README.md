# Carnet Noskids

Application de suivi du bateau **Noskids** (Malibu Response LXR 2015), partagé entre la famille Yann et la famille Olivier : sessions chronométrées, essence et bidons, dépenses et balance, bilans de coût, documents.

Version actuelle : voir le fichier `VERSION` (1.0.0) et le journal `CHANGELOG.md`.

## Comment c'est construit

| Élément | Où | Rôle |
|---|---|---|
| L'app | dossier `docs/`, publié sur GitHub Pages | Les écrans. Fonctionne hors ligne, s'installe sur l'écran d'accueil du téléphone. |
| La base partagée | un Google Sheet du compte de Yann, avec le script `serveur/Code.gs` | Contient toutes les données. Chaque téléphone lui envoie ses saisies et récupère celles des autres. |
| Les documents | un dossier Google Drive « Carnet Noskids – documents » | Factures, titre de navigation, assurance, photos. |
| L'historique | `import/historique.json` (jamais publié) | Sessions 2024-2025, achats d'essence et dépenses 2023-2025 repris du fichier « Suvi Bateau Malibu ». |

GitHub Pages n'héberge **que le programme**, jamais les données. Le dépôt GitHub est public (obligatoire pour GitHub Pages gratuit) : il ne contient ni données, ni adresse du serveur, ni code famille. Ces deux derniers sont saisis une fois sur chaque téléphone.

Chaque téléphone garde une copie des données : l'app s'ouvre et enregistre sans réseau, puis envoie tout dès que le réseau revient. Un nouveau téléphone qui se connecte récupère tout l'historique.

## Mise en production (une seule fois)

### 1. La base partagée (compte Google de Yann)

1. Créer un Google Sheet nommé **Carnet Noskids – données**.
2. Menu **Extensions > Apps Script**. Remplacer le contenu de `Code.gs` par celui du fichier `serveur/Code.gs`.
3. Dans **Paramètres du projet** (roue dentée), cocher « Afficher le fichier manifeste appsscript.json », puis remplacer son contenu par `serveur/appsscript.json`.
4. Enregistrer, choisir la fonction **installer** et cliquer sur **Exécuter**. Google demande d'autoriser le script : accepter (c'est votre propre script). Une fenêtre demande un **code famille** : en choisir un d'au moins 6 caractères et le garder.
5. **Déployer > Nouveau déploiement > Application web**. Exécuter en tant que : *moi*. Qui a accès : *Tout le monde*. Copier l'**adresse de l'application web** (elle se termine par `/exec`).

### 2. L'app sur GitHub Pages

1. Créer un compte sur github.com (dans les paramètres e-mail, cocher « Keep my email addresses private » pour ne pas exposer l'adresse).
2. Créer un dépôt **public** nommé **carnet-noskids**, vide (sans README ni licence).
3. Envoyer le projet depuis ce dossier : `git push -u origin main --tags`. La première fois, une fenêtre GitHub demande de se connecter.
4. **Settings > Pages** : Source *GitHub Actions*. Le fichier `.github/workflows/pages.yml` publie alors le dossier `docs/` à chaque envoi (suivi dans l'onglet **Actions**). Après une à deux minutes, l'app est en ligne à l'adresse `https://noskids-lacanau.github.io/carnet-noskids/`.
5. **Releases > Draft a new release** : choisir le tag `v1.0.0`, titre « Version 1.0.0 », coller la partie 1.0.0 du `CHANGELOG.md`.

Sans Git, on peut aussi déposer les fichiers depuis le site (**Add file > Upload files**), en gardant le dossier `docs`.

### 3. Chaque téléphone

1. Ouvrir l'adresse de l'app, onglet **Bateau > Connexion et partage**.
2. Coller l'adresse du serveur, saisir le code famille, choisir son prénom, puis **Enregistrer et synchroniser**.
3. Ajouter l'app à l'écran d'accueil : sur iPhone, bouton Partager puis « Sur l'écran d'accueil » ; sur Android, menu ⋮ puis « Installer l'application ».

### 4. L'historique (Yann, une seule fois)

Sur le téléphone ou l'ordinateur de Yann, une fois connecté : onglet **Bateau > Importer l'historique**, choisir `import/historique.json`. Les autres téléphones le reçoivent à leur synchronisation.

Pour régénérer ce fichier depuis le tableur : `outils/Export-Historique.ps1 -Ods "chemin\Suvi Bateau Malibu.ods" -Out "import\historique.json"`.

## Mettre à jour (versions suivantes)

1. Modifier les fichiers du dossier `docs/`.
2. Tester en local : `outils/Serveur-Local.ps1`, puis ouvrir http://localhost:8765/. Une app non connectée sert aux essais : ne jamais la connecter ensuite sans avoir effacé ses données de test, sinon ses fiches par défaut écraseraient celles du serveur.
3. Publier en une commande, depuis un terminal :
   `.\outils\Publier.ps1 -Version 1.7.0 -Notes "Ce qui change", "Autre changement"`
   Le script vérifie qu'aucun fichier privé n'est concerné, met le numéro à jour (`app.js`, `sw.js`, `VERSION`, `CHANGELOG.md`), crée le commit et l'étiquette `v1.7.0`, puis envoie sur GitHub. GitHub Actions publie le site en une à deux minutes.
   Variante : `-SansEnvoi` prépare tout sans pousser (puis `git push origin main v1.7.0`).
4. Sur les téléphones, un bandeau « Nouvelle version disponible » apparaît : **Mettre à jour**. Les données ne bougent pas : elles sont dans le Google Sheet.

Règles pour que les données restent compatibles d'une version à l'autre :
- ne jamais renommer ni supprimer un champ existant ; en ajouter de nouveaux ;
- les nouvelles données sans table dédiée passent par une table existante (exemple : les notes du journal sont dans `etat` avec `kind: "note"`), pour ne pas toucher au serveur ;
- les photos sont stockées sous la forme `{ d: "data:…" }`, réduites pour rester sous 40 000 caractères (limite d'une cellule du Google Sheet) ;
- si le serveur change (`serveur/Code.gs`), coller le nouveau code puis **Déployer > Gérer les déploiements > Modifier > Nouvelle version** : l'adresse `/exec` reste la même.

## Imports ponctuels (fichiers privés du dossier `import/`)

Depuis un appareil connecté : **Bateau > Connexion et partage > Importer**, puis choisir le fichier. Un nouvel import remplace les mêmes lignes, sans doublon.

| Fichier | Contenu | État |
|---|---|---|
| `historique.json` | Ancien bateau (Response 1993) : sessions 2023-2025, essence, dépenses du Google Sheet | importé |
| `saison-2026.json` | Nouveau bateau (Noskids, LXR 2015) : saison 2026 en un bloc, compteur 1 950,0 → 1 991,6 h, 41,6 h famille Yann | à importer |

## Prochaines étapes

1. **Importer `saison-2026.json`** : la saison 2026 apparaît en un bloc marqué « à compléter », et la prochaine session démarre à 1 991,6 h.
2. **Synthèse Tricount** (dépenses 2026) : quand le fichier est disponible (export CSV ou Excel), écrire le convertisseur vers `import/depenses-2026.json` en le recoupant avec les 75 dépenses déjà importées du Google Sheet (éviter les doublons) ; au besoin, effacer d'abord les dépenses (Bateau > Effacer) puis tout réimporter.
3. **Détailler la saison 2026** : essence achetée et versée, temps par personne. Le bloc de 41,6 h sera remplacé par le détail reconstitué.
4. Mettre les photos (pilotes, familles) et les 15 pièces du dossier « factures et documentations » depuis un appareil connecté.

## Sécurité et confidentialité

- Le Google Sheet et le dossier Drive restent privés, dans le compte de Yann. Pour qu'Olivier puisse ouvrir le tableur ou les documents, les partager avec son compte Google.
- Le serveur refuse toute demande sans le bon code famille. Si le code circule trop, en changer (menu **Carnet Noskids > Définir le code famille** dans le Sheet) et le ressaisir sur les téléphones.
- Ne jamais publier le dossier `import/` ni le fichier `.ods` : ils contiennent les données de la famille (le fichier `.gitignore` les exclut).

## Limites connues

- Une session en cours n'est visible que sur le téléphone qui chronomètre ; les autres la reçoivent une fois clôturée.
- Les dépenses 2026 (Tricount) restent à importer, et la saison 2026 à détailler (essence, temps par personne).
- Coûts fixes du bilan rattachés à l'année du paiement (une assurance payée en décembre compte pour l'année en cours).
