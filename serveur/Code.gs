/**
 * Carnet Noskids — serveur de la base partagée.
 * Script Apps Script lié au Google Sheet « Carnet Noskids – données ».
 * Il reçoit les enregistrements envoyés par les téléphones (push) et leur renvoie ceux des autres (pull).
 *
 * Installation (une seule fois) : voir README.md, partie « Mise en production ».
 */
var VERSION_SERVEUR = '1.2.0';
var TABLES = ['personnes', 'sessions', 'bidons', 'dettes', 'mouvements', 'depenses', 'documents', 'entretien', 'parametres', 'etat'];
var COLONNES_FIXES = ['id', 'modifie_le', 'recu_le', 'supprime', 'par', 'json'];
var DOSSIER_DOCUMENTS = 'Carnet Noskids – documents';

/* ---------- Menu dans le Google Sheet ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Carnet Noskids')
    .addItem('Installer les feuilles', 'installer')
    .addItem('Définir le code famille', 'definirCodeFamille')
    .addItem('Destinataires des notes (e-mail)', 'definirDestinatairesNotes')
    .addItem('Tester l’envoi d’une note par e-mail', 'testerEnvoiNote')
    .addToUi();
}

function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  TABLES.forEach(function (t) { feuille_(ss, t); });
  var defaut = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (defaut && ss.getSheets().length > 1) ss.deleteSheet(defaut);
  if (!PropertiesService.getScriptProperties().getProperty('CODE_FAMILLE')) definirCodeFamille();
  SpreadsheetApp.getActive().toast('Feuilles prêtes. Déployez ensuite le script en application web.', 'Carnet Noskids', 8);
}

function definirCodeFamille() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Code famille', 'Choisissez un code (au moins 6 caractères). Il sera demandé une fois sur chaque téléphone.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var code = r.getResponseText().trim();
  if (code.length < 6) { ui.alert('Le code doit faire au moins 6 caractères.'); return; }
  PropertiesService.getScriptProperties().setProperty('CODE_FAMILLE', code);
  ui.alert('Code famille enregistré.');
}

/* ---------- Application web ---------- */
function doGet(e) { return repondre_(traiter_((e && e.parameter) || {})); }

function doPost(e) {
  var p;
  try { p = JSON.parse(e.postData.contents); } catch (err) { return repondre_({ ok: false, error: 'Requête illisible.' }); }
  return repondre_(traiter_(p));
}

function repondre_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function traiter_(p) {
  var code = PropertiesService.getScriptProperties().getProperty('CODE_FAMILLE');
  if (!code) return { ok: false, error: 'Code famille non défini : menu Carnet Noskids > Définir le code famille.' };
  if (p.code !== code) return { ok: false, error: 'Code famille incorrect.' };
  try {
    if (p.action === 'ping') return { ok: true, version: VERSION_SERVEUR, serverTime: maintenant_() };
    if (p.action === 'pull') return pull_(p.since || '');
    if (p.action === 'push') return push_(p.records || []);
    if (p.action === 'upload') return upload_(p);
    if (p.action === 'backup') return sauvegarder_();
    return { ok: false, error: 'Action inconnue : ' + p.action };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function maintenant_() { return new Date().toISOString(); }

/* ---------- Feuilles : une par table ---------- */
function feuille_(ss, nom) {
  var sh = ss.getSheetByName(nom);
  if (!sh) {
    sh = ss.insertSheet(nom);
    sh.getRange(1, 1, 1, COLONNES_FIXES.length).setValues([COLONNES_FIXES]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.hideColumns(6); // colonne json : utilisée par l'app, masquée pour la lecture
  }
  // Horodatages et json gardés en texte (sinon Google Sheets les convertit en dates)
  sh.getRange(1, 1, sh.getMaxRows(), 6).setNumberFormat('@');
  return sh;
}

function entetes_(sh) {
  var n = Math.max(sh.getLastColumn(), COLONNES_FIXES.length);
  return sh.getRange(1, 1, 1, n).getValues()[0].map(String);
}

function lisible_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') { var s = JSON.stringify(v); return s.length > 400 ? s.slice(0, 400) + '…' : s; }
  return v;
}

/* Enregistre les modifications reçues. La version la plus récente (modifie_le) l'emporte. */
function push_(records) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), recu = maintenant_(), parTable = {}, acceptes = 0, nouvellesNotes = [];
    records.forEach(function (r) { if (TABLES.indexOf(r.table) >= 0 && r.id) (parTable[r.table] = parTable[r.table] || []).push(r); });
    Object.keys(parTable).forEach(function (t) {
      var sh = feuille_(ss, t), head = entetes_(sh);
      var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues() : [];
      var index = {};
      data.forEach(function (row, i) { index[String(row[0])] = i; });
      parTable[t].forEach(function (r) {
        var rec = {}; Object.keys(r).forEach(function (k) { if (k !== 'table') rec[k] = r[k]; });
        Object.keys(rec).forEach(function (k) {
          if (['id', 'updatedAt', 'serverAt', 'deleted', 'par'].indexOf(k) < 0 && head.indexOf(k) < 0) head.push(k);
        });
        var i = index[rec.id];
        if (i !== undefined && String(data[i][1]) > String(rec.updatedAt || '')) return; // le serveur a déjà plus récent
        rec.serverAt = recu;
        var row = head.map(function (h) {
          if (h === 'id') return rec.id;
          if (h === 'modifie_le') return rec.updatedAt || '';
          if (h === 'recu_le') return recu;
          if (h === 'supprime') return rec.deleted ? 'oui' : '';
          if (h === 'par') return rec.par || '';
          if (h === 'json') return JSON.stringify(rec);
          return lisible_(rec[h]);
        });
        if (t === 'etat' && rec.kind === 'note' && !rec.deleted && i === undefined) nouvellesNotes.push(rec); // nouvelle note du journal : e-mail après l'enregistrement
        if (i !== undefined) data[i] = row; else { index[rec.id] = data.length; data.push(row); }
        acceptes++;
      });
      data = data.map(function (row) { while (row.length < head.length) row.push(''); return row; });
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
      if (data.length) sh.getRange(2, 1, data.length, head.length).setValues(data);
    });
    if (nouvellesNotes.length) { try { envoyerNotes_(nouvellesNotes); } catch (err) { console.error('E-mail des notes : ' + err); } } // un échec d'envoi ne bloque jamais la synchronisation
    return { ok: true, accepted: acceptes, serverTime: recu };
  } finally {
    lock.releaseLock();
  }
}

/* Renvoie tout ce qui a été reçu après la date « since » (toute la base si since est vide). */
function pull_(since) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), out = [], now = maintenant_();
  TABLES.forEach(function (t) {
    var sh = ss.getSheetByName(t); if (!sh || sh.getLastRow() < 2) return;
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
    vals.forEach(function (row) {
      if (since && String(row[2]) <= since) return;
      try { var rec = JSON.parse(row[5]); rec.table = t; out.push(rec); } catch (e) { /* ligne modifiée à la main : ignorée */ }
    });
  });
  return { ok: true, records: out, serverTime: now };
}

/* Copie complète du Google Sheet dans le dossier « Carnet Noskids – sauvegardes » (avant un effacement). */
var DOSSIER_SAUVEGARDES = 'Carnet Noskids – sauvegardes';
function sauvegarder_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dossiers = DriveApp.getFoldersByName(DOSSIER_SAUVEGARDES);
  var dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(DOSSIER_SAUVEGARDES);
  var nom = ss.getName() + ' – sauvegarde ' + Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm');
  var copie = DriveApp.getFileById(ss.getId()).makeCopy(nom, dossier);
  return { ok: true, url: copie.getUrl(), name: nom };
}

/* Range un document (photo, PDF) dans le dossier Drive et renvoie son lien. */
function upload_(p) {
  if (!p.data || !p.name) return { ok: false, error: 'Fichier manquant.' };
  var dossiers = DriveApp.getFoldersByName(DOSSIER_DOCUMENTS);
  var dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(DOSSIER_DOCUMENTS);
  var blob = Utilities.newBlob(Utilities.base64Decode(p.data), p.mime || 'application/octet-stream', p.name);
  var f = dossier.createFile(blob);
  if (p.cat) f.setDescription(p.cat + (p.y ? ' · ' + p.y : ''));
  return { ok: true, url: f.getUrl(), fileId: f.getId() };
}

/* ---------- Journal : un e-mail aux destinataires à chaque nouvelle note ----------
   Les adresses sont gardées dans les propriétés du script (menu Carnet Noskids > Destinataires des notes),
   jamais dans ce code, qui est public sur GitHub. */
var ADRESSE_APP = 'https://noskids-lacanau.github.io/carnet-noskids/';
function definirDestinatairesNotes() {
  var ui = SpreadsheetApp.getUi(), actuel = PropertiesService.getScriptProperties().getProperty('NOTES_EMAILS') || '';
  var r = ui.prompt('Destinataires des notes', 'Adresses e-mail séparées par des virgules (actuellement : ' + (actuel || 'aucune') + ').', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var liste = r.getResponseText().split(/[,;\s]+/).filter(function (a) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a); });
  PropertiesService.getScriptProperties().setProperty('NOTES_EMAILS', liste.join(','));
  ui.alert(liste.length ? 'Les notes seront envoyées à : ' + liste.join(', ') : 'Aucune adresse valide : aucun e-mail ne sera envoyé.');
}
function envoyerNotes_(notes) {
  var dest = PropertiesService.getScriptProperties().getProperty('NOTES_EMAILS');
  if (!dest) return;
  notes.forEach(function (n) {
    var quand = n.date ? Utilities.formatDate(new Date(n.date), 'Europe/Paris', "dd/MM/yyyy 'à' HH:mm") : '';
    var sujet = 'Carnet Noskids – ' + (n.cat || 'Note') + (n.auteurNom ? ' (' + n.auteurNom + ')' : '');
    var corps = (n.cat || 'Note') + '\n' + 'Par ' + (n.auteurNom || '?') + (quand ? ', le ' + quand : '') + '\n\n' + (n.txt || '(sans texte)') + '\n\n' + 'Journal - Notes : ' + ADRESSE_APP;
    MailApp.sendEmail({ to: dest, subject: sujet, body: corps, name: 'Carnet Noskids' });
  });
}
/* À lancer une fois depuis l'éditeur ou le menu : autorise l'envoi d'e-mails et envoie une note d'essai. */
function testerEnvoiNote() {
  var dest = PropertiesService.getScriptProperties().getProperty('NOTES_EMAILS');
  if (!dest) { SpreadsheetApp.getUi().alert('Définissez d’abord les destinataires (menu Carnet Noskids > Destinataires des notes).'); return; }
  envoyerNotes_([{ cat: 'Essai', auteurNom: 'Carnet Noskids', date: maintenant_(), txt: 'Ceci est un e-mail d’essai : les nouvelles notes du journal arriveront ainsi.' }]);
  SpreadsheetApp.getUi().alert('E-mail d’essai envoyé à : ' + dest);
}