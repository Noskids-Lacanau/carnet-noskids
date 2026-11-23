(function () {
  "use strict";
  /* ---------- Référentiel ---------- */
  var FAM = { YC: { n: "Famille Yann", l: "famille Yann", s: "Yann", t: "Y" }, OC: { n: "Famille Olivier", l: "famille Olivier", s: "Olivier", t: "O" } };
  var CAT = { YF: "Famille Yann", OF: "Famille Olivier", EXT: "Extérieurs" };
  var CATF = { YF: "YC", OF: "OC" };
  var PEOPLE = [
    { id: "yann", name: "Yann", c: "YF" }, { id: "pascale", name: "Pascale", c: "YF" }, { id: "elsa", name: "Elsa", c: "YF" },
    { id: "baptiste", name: "Baptiste", c: "YF" }, { id: "eve", name: "Eve", c: "YF" },
    { id: "olivier", name: "Olivier", c: "OF" }, { id: "fiorella", name: "Fiorella", c: "OF" }, { id: "thao", name: "Thao", c: "OF" },
    { id: "malou", name: "Malou", c: "OF" }, { id: "calie", name: "Calie", c: "OF" },
    { id: "julien", name: "Julien", c: "EXT" }, { id: "jessica", name: "Jessica", c: "EXT" }, { id: "louca", name: "Louca", c: "EXT" },
    { id: "invy", name: "Invités Yann", c: "EXT", host: "YC", hidden: true }, { id: "invo", name: "Invités Olivier", c: "EXT", host: "OC", hidden: true }
  ];
  var ACTS = { slalom: "Slalom", wake: "Wake", ski: "Ski libre", formation: "Formation", balade: "Balade", meca: "Mécanique" };
  var PERSO_ACTS = ["slalom", "wake", "ski", "formation"];
  var SLALOM_SPEEDS = [31, 34, 37, 40, 43, 46, 49, 52, 55, 58];
  /* Fiche technique : titre de navigation (27/05/2024), facture R01349 du 10/07/2026, configuration usine 2015 Response LXR. */
  var SPEC = { devise: "Noskids", ancienNom: "MANON 33 sur le titre de navigation actuel (changement de titulaire demandé)", modele: "Malibu Response LXR", annee: 2015, hin: "USMB2Z6344F515", immat: "TO G18390 F",
    moteur: "PCM 5.7 L 350 ch (246 kW), essence", nMoteur: "750683", dims: "6,09 × 2,28 m · tirant d’eau 0,69 m", categorie: "D · 8 personnes maximum",
    equip: "Tour Monster Tower + bimini, Zero Off, extinction automatique, crépine, kit de rinçage", achat: "35 000 € TTC · facture R01349 du 10/07/2026 · Sports Service (Lacanau)",
    gardiennage: "Offert les hivers 2026-2027 et 2027-2028 (facture)",
    reservoir: 125, conso: 13, hAchat: 1950, hVie: 4000, valMoteur: 13000, prix: 22000, ans: 15, bidon: 20, tarif: 1,
    /* Annuaire urgence - dépannage : numéros publics (société, police du lac, association), modifiables dans l'app */
    annuaire: [
      { id: "ann-ss-roland", g: "Sport Service Pitrot", n: "Roland Jamin", r: "", t: "06 41 76 79 43" },
      { id: "ann-ss-hugo", g: "Sport Service Pitrot", n: "Hugo", r: "", t: "06 27 11 53 40" },
      { id: "ann-police-lac", g: "Police du lac", n: "Police du lac", r: "", t: "06 85 92 05 58" },
      { id: "ann-snlg-president", g: "Association SNLG", n: "Marc Sourty", r: "président", t: "06 87 61 62 55" },
      { id: "ann-snlg-moniteur", g: "Association SNLG", n: "Yvan", r: "moniteur", t: "06 44 31 68 28" },
      { id: "ann-snlg-secretariat", g: "Association SNLG", n: "Véronique", r: "secrétariat", t: "06 60 46 14 23" },
      { id: "ann-vlg", g: "VLG", n: "VLG", r: "", t: "" }
    ] };
  function person(id) { for (var i = 0; i < PEOPLE.length; i++) if (PEOPLE[i].id === id) return PEOPLE[i]; return null; }

  /* ---------- Bilans par année : recalculés à partir des sessions, des dépenses et des achats ---------- */
  var YEARS = {};
  var FIXED_CATS = { "Assurance": "assurance", "Adhésion": "adhesions", "Taxes": "taxes", "Taxe / corps mort lac": "taxes" };
  function computeYears() {
    YEARS = {};
    function Y(y) { return YEARS[y] || (YEARS[y] = { min: 0, fam: { YC: 0, OC: 0 }, fixes: 0, fx: { assurance: 0, adhesions: 0, taxes: 0 }, essence: 0, litres: 0, lnote: "achetés dans l’année", commun: 0, meca: 0, pmap: {}, curve: [], cum: 0 }); }
    sessionsArr.slice().sort(function (a, b) { return dkey(a) < dkey(b) ? -1 : 1; }).forEach(function (s) {
      var yk = yearOf(s); if (!yk) return; var y = Y(yk), m = Number(s.engineMin) || 0;
      y.min += m; y.fam.YC += (s.famMin && Number(s.famMin.YC)) || 0; y.fam.OC += (s.famMin && Number(s.famMin.OC)) || 0;
      y.commun += Number(s.commun) || 0; y.meca += Number(s.meca) || 0;
      Object.keys(s.minutes || {}).forEach(function (pid) {
        var p = person(pid), nm = p ? p.name : pid, f = p ? (p.c === "EXT" ? (p.host || "YC") : CATF[p.c]) : "YC";
        if (!y.pmap[nm]) y.pmap[nm] = [nm, f, 0, 0]; y.pmap[nm][2] += Number(s.minutes[pid]) || 0; y.pmap[nm][3] += 1;
      });
      y.cum += m;
      if (m > 0) { var dd = isoToFr(dkey(s)).slice(0, 5), last = y.curve[y.curve.length - 1]; if (last && last[1] === dd) last[0] = y.cum; else y.curve.push([y.cum, dd]); }
    });
    depenses.forEach(function (d) { var yk = yearOf(d); if (!yk) return; var y = Y(yk), fx = FIXED_CATS[d.cat]; if (d.cat === "Essence") y.essence += Number(d.m) || 0; if (fx) { y.fixes += Number(d.m) || 0; y.fx[fx] += Number(d.m) || 0; } });
    moves.forEach(function (mv) { if (mv.type === "achat" && mv.litres && yearOf(mv)) Y(yearOf(mv)).litres += Number(mv.litres) || 0; });
    Object.keys(YEARS).forEach(function (k) {
      var y = YEARS[k]; y.min = Math.round(y.min);
      y.people = Object.keys(y.pmap).map(function (n) { var p = y.pmap[n]; return [p[0], p[1], Math.round(p[2]), p[3]]; }).sort(function (a, b) { return b[2] - a[2]; });
    });
  }
  function latestYear() { var ks = Object.keys(YEARS).filter(function (k) { return YEARS[k].min > 0; }).sort(); return ks.length ? ks[ks.length - 1] : ""; }

  /* ---------- Outils ---------- */
  var eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  var eur0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var dec1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var dec2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var int0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function parseNum(v) { var n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? 0 : n; }
  function fmtClock(ms) { var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; var mm = (h ? String(m).padStart(2, "0") : String(m)) + ":" + String(r).padStart(2, "0"); return h ? h + ":" + mm : mm; }
  function half(n) { return String(n).replace(".", ","); }
  function segHtml(cls, attr, opts, cur) { return '<div class="seg ' + cls + '">' + opts.map(function (o) { return "<button " + attr + '="' + o[0] + '" data-v="' + o[0] + '" aria-pressed="' + (o[0] === cur) + '">' + esc(o[1]) + "</button>"; }).join("") + "</div>"; }
  function famDot(f) { return '<span class="dot f-' + f + '"></span>'; }
  /* Photos (familles, pilotes) : petites images JPEG gardées dans la base partagée, sous la forme { d: "data:…" } */
  /* Photo du compteur : côté le plus long à 560 px, qualité réduite jusqu'à tenir dans une cellule du Google Sheet (< 40 000 caractères) */
  function shrinkMeter(file) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 560 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        var q = 0.62, d = cv.toDataURL("image/jpeg", q);
        while (d.length > 38000 && q > 0.3) { q -= 0.06; d = cv.toDataURL("image/jpeg", q); }
        ok({ d: d });
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Photo illisible.")); };
      img.src = url;
    });
  }
  function photoSrc(ph) { return ph && ph.d ? ph.d : ""; }
  function famAvatar(f) { var s = photoSrc((SPEC.famPhotos || {})[f]); return s ? '<img class="fam-av f-' + f + '" src="' + s + '" alt="">' : famDot(f); }
  /* Téléphones : lien d'appel direct (tel:) */
  function telHref(t) { return String(t || "").replace(/[^\d+]/g, ""); }
  var PHONE_ICON = '<svg class="ph-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5l2.6.4 1.3 4-2 1.6a12 12 0 0 0 6 6l1.6-2 4 1.3.4 2.6a2 2 0 0 1-2 2.1A17 17 0 0 1 4.5 5.5a2 2 0 0 1 2.1-2z"/></svg>';
  var URG_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5l2.6.4 1.3 4-2 1.6a12 12 0 0 0 6 6l1.6-2 4 1.3.4 2.6a2 2 0 0 1-2 2.1A17 17 0 0 1 4.5 5.5a2 2 0 0 1 2.1-2z"/></svg>';
  var WHEEL_ICON = '<svg class="wheel" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.6"/><path d="M3.4 10.6h6M14.6 10.6h6M12 14.6v6.3M12 3v2.2"/></svg>';
  var EXT_ICON = '<svg class="ext-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.6-4 3.4-6.5 7-6.5s6.4 2.5 7 6.5"/></svg>';
  /* Réduit une photo choisie en carré (recadrage au centre) pour qu'elle tienne dans la base partagée. */
  function shrinkPhoto(file, size, q) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement("canvas"); cv.width = cv.height = size;
        cv.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url); ok({ d: cv.toDataURL("image/jpeg", q) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Photo illisible (formats acceptés : JPEG, PNG).")); };
      img.src = url;
    });
  }

  /* ---------- État ---------- */
  var APP_VERSION = "1.6.1", SCHEMA = 1;
  var tab = "accueil", nextId = Date.now() % 100000, picker = null, startList = [], startJauge = 16, startPilote = "yann";
  var sortie = { active: false, compteurDeb: 0, tours: [], participants: [] };
  var gap = { open: false, rat: "YC", key: "" };
  var sessionsArr = [], bidons = [], dettes = [], moves = [], depenses = [];
  var notes = []; // journal : rangé dans la table « etat » (kind = "note"), sans changement côté serveur
  var lastPlein = "", lastLevel = 16, lastLevelDate = "";
  var ETAT = { id: "etat", gapsRecherche: [] };
  var docYear = "Toutes", ui = { spec: false, maint: false, conn: false, perso: false, indic: true, coutDet: false, mvts: false, docs: false };
  /* Pièces à renouveler sur un inboard Malibu (moteur Indmar) : intervalles indicatifs, à confirmer dans le manuel du bateau. */
  var ENTR = [
    ["Pompe à eau (turbine / impeller)", 100, 2, "inspection à chaque hivernage"],
    ["Pompe à essence", null, null, "pas d’intervalle fixe : noter la date de changement"],
    ["Bougies", 100, 2, ""],
    ["Durites et colliers", null, 1, "inspection annuelle, remplacer si fissures"],
    ["Pompe de cale", null, 1, "tester à chaque mise à l’eau"],
    ["Huile moteur et filtre", 50, 1, ""],
    ["Filtre à essence / séparateur d’eau", 100, 1, ""],
    ["Courroie", null, 1, "inspection annuelle (tension, usure)"],
    ["Huile de transmission (V-drive)", 100, 1, ""],
    ["Anodes", null, 1, ""],
    ["Pare-flammes (filtre à air)", null, 1, "nettoyage"],
    ["Thermostat", null, null, "selon le manuel PCM"],
    ["Batterie", null, 5, ""],
    ["Hivernage (vidange de l’eau, antigel)", null, 1, "chaque fin de saison"]
  ];
  var maint = ENTR.map(function (e, i) { return { id: "m" + i, i: i, date: "", h: "" }; });
  var DOC_CATS = ["Titre de navigation / carte grise", "Assurance", "Permis bateau", "Diplômes et formations", "Factures", "Adhésions et licences", "Taxe / corps mort lac", "Réglementation", "Notice et fiche technique", "Photos du bateau", "Autres"];
  var docPending = [];
  var docs = {}; DOC_CATS.forEach(function (c) { docs[c] = []; });
  var view = { essence: null, dep: false, cancelAsk: false, purge: null };
  var finView = "bilan", pilotSel = "";
  var achatForm = { verse: true, plein: true, f: "YC", b: 2, step: null, L: 0, P: 0, tfOpen: false, tf: "YC", tn: 1 }, miseForm = { plein: true, f: "YC", n: 1 };
  var bilanYear = "", bilanWho = "", bilanYearUser = false;

  /* ---------- Dates ---------- */
  function todayFr() { var d = new Date(); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function todayIso() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function frToIso(d) { return d && d.indexOf("/") === 2 ? d.slice(6, 10) + "-" + d.slice(3, 5) + "-" + d.slice(0, 2) : (d || ""); }
  function isoToFr(d) { return d && d.indexOf("-") === 4 ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : (d || ""); }
  function dkey(r) { return (r && (r.date || frToIso(r.d))) || ""; }
  function yearOf(r) { return dkey(r).slice(0, 4); }

  function newTour(pid, act) { return { id: nextId++, pid: pid, act: act, state: "wait", acc: 0, since: null, pauses: 0, laps: 0, lapStart: 0, speed: "", passes: "", pilote: sortie && sortie.active ? sortie.pilote : startPilote, open: false, edit: false, orig: null, tiny: false }; }

  /* ---------- Copie locale (téléphone) et synchronisation avec la base partagée ---------- */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("carnet." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("carnet." + k, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ } }
  };
  var COLS = ["personnes", "sessions", "bidons", "dettes", "mouvements", "depenses", "documents", "entretien", "parametres", "etat"];
  var DB = LS.get("db", {}); COLS.forEach(function (c) { if (!DB[c]) DB[c] = {}; });
  var CONF = LS.get("conf", { url: "", code: "", moi: "", lastSync: "" });
  var QUEUE = LS.get("queue", []);
  var SNAP = {};
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function nowIso() { return new Date().toISOString(); }
  function strip(r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== "updatedAt" && k !== "serverAt" && k !== "par" && k !== "table") o[k] = r[k]; }); return JSON.stringify(o); }
  function dbSave() { LS.set("db", DB); LS.set("queue", QUEUE); LS.set("conf", CONF); }
  function upsertLocal(table, rec) { rec.updatedAt = nowIso(); rec.par = CONF.moi || ""; DB[table][rec.id] = rec; QUEUE = QUEUE.filter(function (q) { return !(q.table === table && q.rec.id === rec.id); }); QUEUE.push({ table: table, rec: rec }); }
  function vals(c) { return Object.keys(DB[c]).map(function (k) { return DB[c][k]; }).filter(function (r) { return r && !r.deleted; }); }
  function flatDocs() { var out = []; DOC_CATS.forEach(function (c) { (docs[c] || []).forEach(function (d) { d.cat = c; out.push(d); }); }); return out; }
  function currentCollections() {
    SPEC.id = "spec";
    ETAT.lastPlein = lastPlein; ETAT.lastLevel = lastLevel; ETAT.lastLevelDate = lastLevelDate;
    return { personnes: PEOPLE, sessions: sessionsArr, bidons: bidons, dettes: dettes, mouvements: moves, depenses: depenses, documents: flatDocs(), entretien: maint, parametres: [SPEC], etat: [ETAT].concat(notes) };
  }
  function snapshotAll() { SNAP = {}; var cur = currentCollections(); COLS.forEach(function (c) { cur[c].forEach(function (r) { if (!r.id) r.id = uid(); SNAP[c + ":" + r.id] = strip(r); }); }); }
  /* Compare l'état affiché à la dernière version connue : ce qui a changé part dans la file d'envoi. */
  function persistAll() {
    var cur = currentCollections(), changed = false;
    COLS.forEach(function (c) {
      var seen = {};
      cur[c].forEach(function (r) {
        if (!r.id) r.id = uid();
        seen[r.id] = true;
        var s = strip(r);
        if (SNAP[c + ":" + r.id] !== s) { SNAP[c + ":" + r.id] = s; var copy = JSON.parse(s); upsertLocal(c, copy); r.updatedAt = copy.updatedAt; changed = true; }
      });
      Object.keys(DB[c]).forEach(function (id) { if (!seen[id] && DB[c][id] && !DB[c][id].deleted) { delete SNAP[c + ":" + id]; upsertLocal(c, { id: id, deleted: true }); changed = true; } });
    });
    LS.set("enCours", sortie && sortie.active ? sortie : null);
    if (changed) { dbSave(); Sync.soon(); }
  }
  function byDateDesc(a, b) { var x = dkey(a), y = dkey(b); return x < y ? 1 : x > y ? -1 : ((b.updatedAt || "") < (a.updatedAt || "") ? -1 : 1); }
  /* Reconstruit l'affichage à partir de la copie locale. */
  function loadArrays() {
    vals("personnes").forEach(function (p) { var e = person(p.id); if (e) { Object.keys(p).forEach(function (k) { e[k] = p[k]; }); } else PEOPLE.push(p); });
    sessionsArr = vals("sessions").sort(function (a, b) { return dkey(a) < dkey(b) ? -1 : 1; });
    bidons = vals("bidons").sort(function (a, b) { var x = dkey(a), y = dkey(b); return x < y ? -1 : x > y ? 1 : ((a.updatedAt || "") < (b.updatedAt || "") ? -1 : 1); });
    dettes = vals("dettes"); moves = vals("mouvements").sort(byDateDesc); depenses = vals("depenses").sort(byDateDesc);
    notes = vals("etat").filter(function (r) { return r.kind === "note"; }).sort(function (a, b) { return (a.date || "") < (b.date || "") ? 1 : -1; });
    DOC_CATS.forEach(function (c) { docs[c] = []; });
    vals("documents").forEach(function (d) { (docs[d.cat] || docs["Autres"]).push(d); });
    vals("entretien").forEach(function (m) { if (maint[m.i]) maint[m.i] = m; });
    var sp = DB.parametres.spec; if (sp && !sp.deleted) Object.keys(sp).forEach(function (k) { SPEC[k] = sp[k]; });
    var et = DB.etat.etat; if (et && !et.deleted) { ETAT = et; lastPlein = et.lastPlein || ""; lastLevel = et.lastLevel != null ? et.lastLevel : 16; lastLevelDate = et.lastLevelDate || ""; if (!ETAT.gapsRecherche) ETAT.gapsRecherche = []; }
    snapshotAll();
  }
  function mergeRemote(list) {
    var n = 0;
    list.forEach(function (r) {
      var t = r.table; if (!DB[t] || !r.id) return; delete r.table;
      if (QUEUE.some(function (q) { return q.table === t && q.rec.id === r.id; })) return; // modification locale pas encore envoyée : elle passe d'abord
      var loc = DB[t][r.id];
      if (!loc || (r.updatedAt || "") >= (loc.updatedAt || "")) { DB[t][r.id] = r; n++; }
    });
    return n;
  }
  var Sync = {
    busy: false, timer: null, status: "", lastError: "",
    soon: function () { clearTimeout(Sync.timer); Sync.timer = setTimeout(Sync.run, 1500); updateNet(); },
    call: function (body) {
      body.code = CONF.code;
      return fetch(CONF.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error("Serveur indisponible (" + r.status + ")"); return r.json(); });
    },
    run: function () {
      if (!CONF.url || !CONF.code || Sync.busy || !navigator.onLine) { updateNet(); return Promise.resolve(); }
      Sync.busy = true; updateNet();
      var batch = QUEUE.slice(0, 150);
      var step = batch.length ? Sync.call({ action: "push", records: batch.map(function (q) { var r = JSON.parse(JSON.stringify(q.rec)); r.table = q.table; return r; }) }) : Promise.resolve({ ok: true });
      return step.then(function (res) {
        if (!res.ok) throw new Error(res.error || "Erreur du serveur");
        var sent = batch.map(function (q) { return q.table + ":" + q.rec.id + ":" + q.rec.updatedAt; });
        QUEUE = QUEUE.filter(function (q) { return sent.indexOf(q.table + ":" + q.rec.id + ":" + q.rec.updatedAt) < 0; }); dbSave();
        return Sync.call({ action: "pull", since: CONF.lastSync || "" });
      }).then(function (res) {
        if (!res.ok) throw new Error(res.error || "Erreur du serveur");
        var n = mergeRemote(res.records || []); CONF.lastSync = res.serverTime || CONF.lastSync; dbSave();
        Sync.busy = false; Sync.status = "ok"; Sync.lastError = "";
        if (n) { loadArrays(); render(); } else updateNet();
        if (QUEUE.length) Sync.soon();
      }).catch(function (e) { Sync.busy = false; Sync.status = "err"; Sync.lastError = String((e && e.message) || e); updateNet(); });
    }
  };

  function save() { /* l'enregistrement se fait à chaque affichage (persistAll) */ }
  function netState() { if (!CONF.url || !CONF.code) return "local"; if (!navigator.onLine) return "off"; if (Sync.status === "err") return "err"; if (QUEUE.length || Sync.busy) return "send"; return "ok"; }
  function updateNet() {
    var el = document.getElementById("net"); if (!el) return; var s = netState();
    el.className = "net" + (s === "off" || s === "err" ? " off" : "");
    el.textContent = { ok: "● Synchro", local: "● Local", off: "● Hors ligne", err: "● Hors ligne", send: "● Envoi…" }[s];
    el.title = s === "err" ? Sync.lastError : QUEUE.length ? QUEUE.length + " modification(s) en attente" : CONF.lastSync ? "Dernière synchro : " + new Date(CONF.lastSync).toLocaleString("fr-FR") : "Base partagée non configurée (onglet Bateau)";
  }
  function savedMsg(msg) { var s = netState(); return s === "off" || s === "err" ? msg.replace(/\.$/, "") + " sur le téléphone, envoi au retour du réseau." : msg; }
  /* Compteur moteur : la fin d'une session = compteur relevé à la clôture (pré-rempli avec départ + temps chronométré).
     Un écart de GAP_TOL ou moins avec le départ de la session suivante est ignoré (le compteur est peu précis, on suit le chrono). */
  var GAP_TOL = 10 / 60;
  function hasNum(v) { return v != null && v !== "" && !isNaN(Number(v)); }
  function sessionEnd(s) { return hasNum(s.compteurFin) ? Number(s.compteurFin) : Number(s.compteurDeb) + (Number(s.engineMin) || 0) / 60; }
  function lastCompteur() { var v = SPEC.hAchat || 0; sessionsArr.forEach(function (s) { if ((s.bateau || SPEC.devise) === SPEC.devise && hasNum(s.compteurDeb) && sessionEnd(s) > v) v = sessionEnd(s); }); return Math.round(v * 10) / 10; }
  function startWarnHtml(val) {
    var last = lastCompteur(), d = (val - last) * 60;
    if (!sessionsArr.some(function (s) { return (s.bateau || SPEC.devise) === SPEC.devise && hasNum(s.compteurDeb); }) || Math.abs(d) <= GAP_TOL * 60 + 0.01) return "";
    return d > 0 ? '<div class="alert"><b>Écart de ' + hm(d) + " avec la fin de la dernière session (" + dec1.format(last) + " h).</b>Une session a-t-elle été oubliée ? Vous pouvez démarrer quand même : le trou sera signalé sur l’accueil et dans la liste des sessions, et pourra être rattrapé.</div>"
      : '<div class="alert"><b>Compteur plus bas de ' + hm(-d) + " que la fin de la dernière session (" + dec1.format(last) + " h).</b>Vérifiez la saisie.</div>";
  }

  /* ---------- Jauge ronde, de E (sous l'horizontale à gauche) à F (sous l'horizontale à droite) ---------- */
  var GC = { x: 120, y: 118 }, G0 = 210, GSWEEP = 240;
  function fracLabel(v) { if (v <= 0) return "Vide"; if (v >= 16) return "Plein"; var n = v, d = 16; while (n % 2 === 0) { n /= 2; d /= 2; } return n + "/" + d; }
  function gPt(v, r) { var a = (G0 - v / 16 * GSWEEP) * Math.PI / 180; return [GC.x + r * Math.cos(a), GC.y - r * Math.sin(a)]; }
  function gaugeRead(v) { return "<b>" + fracLabel(v) + "</b> · ≈ " + Math.round(v / 16 * SPEC.reservoir) + " L sur " + SPEC.reservoir; }
  function gHead(label, key, v) { return '<div class="g-head"><span class="flabel">' + label + '</span><span class="g-read" data-gread="' + key + '">' + gaugeRead(v) + '</span></div>'; }
  function gaugeHtml(key, v, ro) {
    var s = '<div class="gauge"><svg viewBox="0 0 240 236" data-gauge="' + key + '"' + (ro ? ' data-ro="1" role="img" aria-label="Niveau théorique : ' + fracLabel(v) + '"' : ' role="slider" tabindex="0" aria-label="Jauge d’essence"') + ' aria-valuemin="0" aria-valuemax="16" aria-valuenow="' + v + '" aria-valuetext="' + fracLabel(v) + '">';
    s += '<circle class="g-bezel" cx="120" cy="118" r="116"/><circle class="g-face" cx="120" cy="118" r="108"/>';
    var p0 = gPt(0, 101), p2 = gPt(2, 101);
    s += '<path class="g-res" stroke-width="6" d="M' + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + " A101 101 0 0 1 " + p2[0].toFixed(1) + " " + p2[1].toFixed(1) + '"/>';
    for (var i = 0; i <= 16; i++) {
      var major = i % 4 === 0, len = major ? 18 : (i % 2 === 0 ? 12 : 7), a = gPt(i, 99), b = gPt(i, 99 - len);
      s += '<line class="g-tick' + (major ? "" : " minor") + '" stroke-width="' + (major ? 3.2 : 1.6) + '" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>';
    }
    ["E", "1/4", "1/2", "3/4", "F"].forEach(function (l, k) { var p = gPt(k * 4, 66); s += '<text class="g-lbl" text-anchor="middle" dominant-baseline="middle" x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '">' + l + "</text>"; });
    s += '<text class="g-fuel" text-anchor="middle" x="120" y="196">fuel</text>';
    var n = gPt(v, 90);
    s += '<line class="g-needle" data-needle="1" x1="120" y1="118" x2="' + n[0].toFixed(1) + '" y2="' + n[1].toFixed(1) + '"/><circle class="g-hub" cx="120" cy="118" r="10"/></svg>';
    if (ro) return s + "</div>";
    return s + '</div>'; // la lecture (7/8 · ≈ 109 L sur 125) s'affiche sur la ligne du titre de la jauge (gHead)
  }

  /* ---------- Bidons ---------- */
  function canSvg(b, i) {
    var lvl = b ? Math.max(0, Math.min(1, b.litres / SPEC.bidon)) : 0, h = 44 * lvl, id = "cc" + i + Math.random().toString(36).slice(2, 6);
    var body = "M8 16 h28 l12 12 v30 a4 4 0 0 1 -4 4 h-36 a4 4 0 0 1 -4 -4 v-38 a4 4 0 0 1 4 -4 z";
    return '<span class="can ' + (b ? b.f : "empty") + '"><svg viewBox="0 0 52 66" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs>' +
      (b ? '<rect class="lvl" clip-path="url(#' + id + ')" x="0" y="' + (62 - h) + '" width="52" height="' + h + '"/>' : "") +
      '<path class="body-out" d="' + body + '"/><path class="hdl" d="M14 16 v-8 h14 v8"/><path class="hdl" d="M40 12 l7 -7"/></svg>' +
      "<span>" + (b ? (b.litres >= SPEC.bidon ? SPEC.bidon + " L" : int0.format(b.litres) + " L") : "vide") + "</span></span>";
  }
  function cansHtml(list, cls) { list = list || bidons; var h = '<div class="cans ' + (cls || "") + '">'; for (var i = 0; i < 5; i++) h += canSvg(list[i] || null, i); return h + "</div>"; }
  function detteHtml(d) {
    var other = d.note ? " (" + esc(d.note) + ")" : "";
    var what = d.cans ? half(d.cans) + " bidon(s) (≈ " + eur.format(d.eur) + ")" : eur.format(d.eur);
    return '<div class="alert"><b>' + FAM[d.from].s + " doit " + what + " à " + FAM[d.to].s + "</b>" + (other ? other.slice(2, -1) + ". " : "") + "Réglé à la prochaine balance.</div>";
  }
  function stockL() { return bidons.reduce(function (a, b) { return a + b.litres; }, 0); }
  function stockEur() { return bidons.reduce(function (a, b) { return a + b.litres * b.prix; }, 0); }
  function stockN() { return bidons.reduce(function (a, b) { return a + b.litres / SPEC.bidon; }, 0); }
  /* Prélève n bidons pour la famille f : ses bidons d'abord (du plus ancien au plus récent), puis ceux de l'autre famille, qui créent une dette. */
  /* n = nombre de bidons vidés (entiers, ou un demi). Un bidon entier vidé = tout son contenu ; un demi = la moitié d'un bidon. */
  function planPrelevement(n, f) {
    var idx = bidons.map(function (b, i) { return i; });
    var order = idx.filter(function (i) { return bidons[i].f === f; }).concat(idx.filter(function (i) { return bidons[i].f !== f; }));
    var left = n, takes = [];
    order.forEach(function (i) {
      if (left <= 0.001) return;
      var b = bidons[i], part = left >= 1 ? 1 : left, lit = part >= 1 ? b.litres : Math.min(b.litres, SPEC.bidon * part);
      takes.push({ i: i, f: b.f, litres: lit, eur: lit * b.prix, cans: part }); left -= part;
    });
    return { takes: takes, manque: Math.max(0, left) };
  }
  function planText(plan, f) {
    if (!plan.takes.length) return "Le stock est vide.";
    var o = f === "YC" ? "OC" : "YC", own = 0, other = 0, otherEur = 0;
    plan.takes.forEach(function (t) { if (t.f === f) own += t.cans; else { other += t.cans; otherEur += t.eur; } });
    var s = "Bidons vidés : " + (own ? half(own) + " de la " + FAM[f].l : "");
    if (other) s += (own ? ", puis " : "") + half(other) + " de la " + FAM[o].l + ". " + FAM[f].s + " devra " + half(other) + " bidon(s) (≈ " + eur.format(otherEur) + ") à " + FAM[o].s + ".";
    else s += ".";
    return s + (plan.manque > 0.01 ? " Il manque " + half(plan.manque) + " bidon(s) dans le stock." : "");
  }
  function simulateStock(plan, addB, addL, addF) {
    var c = bidons.map(function (b) { return { f: b.f, litres: b.litres, prix: b.prix }; });
    plan.takes.forEach(function (t) { c[t.i].litres -= t.litres; });
    c = c.filter(function (b) { return b.litres > 0.01; });
    for (var k = 0; k < (addB || 0); k++) c.push({ f: addF, litres: addL / addB, prix: 0 });
    return c;
  }
  function applyPrelevement(plan, f, ctx) {
    plan.takes.forEach(function (t) {
      bidons[t.i].litres -= t.litres;
      if (t.f !== f) dettes.push({ from: f, to: t.f, cans: t.cans, eur: t.eur, d: todayFr() });
    });
    bidons = bidons.filter(function (b) { return b.litres > 0.01; });
    var n = plan.takes.reduce(function (a, t) { return a + t.cans; }, 0), tot = plan.takes.reduce(function (a, t) { return a + t.litres; }, 0);
    moves.unshift({ d: todayFr(), t: "Versement" + (ctx ? " " + ctx : ""), v: half(n) + " bidon(s) · " + int0.format(tot) + " L", who: FAM[f].n });
  }

  /* ---------- Sortie : moteur et tours ---------- */
  function engineMs(now) { return sortie.engAcc + (sortie.engine === "on" ? now - sortie.engSince : 0); }
  function tourMs(t, now) { return t.acc + (t.state === "run" ? now - t.since : 0); }
  function running() { for (var i = 0; i < sortie.tours.length; i++) if (sortie.tours[i].state === "run") return sortie.tours[i]; return null; }
  function findTour(id) { for (var i = 0; i < sortie.tours.length; i++) if (sortie.tours[i].id === id) return sortie.tours[i]; return null; }
  function participant(pid) { for (var i = 0; i < sortie.participants.length; i++) if (sortie.participants[i].pid === pid) return sortie.participants[i]; return null; }
  function famOf(p) { var c = person(p.pid).c; return c === "EXT" ? p.host : CATF[c]; }
  function tourName(t) { return t.pid ? person(t.pid).name : "Tout le bateau"; }
  function engineOn(now) { if (sortie.engine !== "on") { sortie.engine = "on"; sortie.engSince = now; } }
  function engineToggle() {
    var now = Date.now();
    if (sortie.engine === "on") {
      var r = running(); if (r) { r.acc += now - r.since; r.since = null; r.state = "pause"; r.pauses += 1; }
      sortie.engAcc += now - sortie.engSince; sortie.engine = "off";
      toast(r ? "Moteur arrêté : le tour de " + tourName(r) + " est en pause." : "Moteur arrêté.");
    } else { engineOn(now); toast("Moteur en route."); }
    save(1); render();
  }
  function act(id, a) {
    var now = Date.now(), t = findTour(id); if (!t) return;
    var r = running();
    if ((a === "start" || a === "resume" || a === "again") && r && r !== t) { toast("Le tour de " + tourName(r) + " est en cours : mettez-le en pause ou terminez-le."); return; }
    if (a === "start" || a === "again") { t.lapStart = t.acc; t.state = "run"; t.since = now; t.laps += 1; t.edit = false; t.tiny = false; engineOn(now); var p = t.pid ? participant(t.pid) : null; if (p && p.role === "pass") p.role = "ski"; }
    else if (a === "pause") { t.acc += now - t.since; t.since = null; t.state = "pause"; t.pauses += 1; }
    else if (a === "resume") { t.state = "run"; t.since = now; engineOn(now); }
    else if (a === "end") { if (t.state === "run") t.acc += now - t.since; t.since = null; t.state = "done"; if (t.acc - t.lapStart < 5000) t.tiny = true; }
    save(1); render();
  }
  function summary(t) {
    var s = ACTS[t.act];
    if (t.act === "slalom") { if (t.speed) s += " · " + t.speed + " km/h"; if (t.passes) s += " · " + t.passes + " passage" + (t.passes > 1 ? "s" : ""); }
    if ((t.act === "wake" || t.act === "ski") && t.speed) s += " · " + t.speed + " km/h";
    return s;
  }
  function needsDetails(t) { return (t.act === "slalom" && (!t.speed || !t.passes)) || ((t.act === "wake" || t.act === "ski") && !t.speed); }
  function piloteOpts(cur) { return sortie.participants.map(function (p) { return '<option value="' + p.pid + '"' + (p.pid === cur ? " selected" : "") + ">" + esc(person(p.pid).name) + "</option>"; }).join(""); }
  function detailsHtml(t) {
    var h = '<div class="details">';
    if (t.pid) h += '<div class="two"><div class="field"><label for="act' + t.id + '">Activité</label><select id="act' + t.id + '" data-f="act" data-id="' + t.id + '">' + PERSO_ACTS.map(function (a) { return '<option value="' + a + '"' + (a === t.act ? " selected" : "") + ">" + ACTS[a] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="pil' + t.id + '">Pilote</label><select id="pil' + t.id + '" data-f="pilote" data-id="' + t.id + '">' + piloteOpts(t.pilote) + "</select></div></div>";
    if (t.act === "slalom") h += '<div class="two"><div class="field"><label for="sp' + t.id + '">Vitesse</label><select id="sp' + t.id + '" data-f="speed" data-id="' + t.id + '"><option value="">—</option>' + SLALOM_SPEEDS.map(function (v) { return '<option value="' + v + '"' + (Number(t.speed) === v ? " selected" : "") + ">" + v + " km/h</option>"; }).join("") + '</select></div><div class="field"><label for="ps' + t.id + '">Passages</label><input id="ps' + t.id + '" inputmode="numeric" data-f="passes" data-id="' + t.id + '" value="' + esc(t.passes) + '" placeholder="ex. 4"></div></div>';
    if (t.act === "wake" || t.act === "ski") h += '<div class="field"><label for="sp' + t.id + '">Vitesse (km/h)</label><input id="sp' + t.id + '" inputmode="numeric" data-f="speed" data-id="' + t.id + '" value="' + esc(t.speed) + '" placeholder="ex. 30"></div>';
    if (t.act === "balade") h += '<div class="small muted">Temps partagé entre toutes les personnes à bord.</div>';
    if (t.act === "meca") h += '<div class="small muted">Essai ou réglage : partagé à 50/50 entre les familles.</div>';
    return h + '<div class="small muted">Optionnel : peut être complété à la clôture.</div></div>';
  }
  function editorHtml(t) {
    var s = Math.round(t.acc / 1000);
    return '<div class="editor"><div class="small"><b>Temps net de ce tour</b> (oubli de stop, mauvais départ…)</div>' +
      '<div class="mmss"><input id="edM' + t.id + '" inputmode="numeric" value="' + Math.floor(s / 60) + '" aria-label="Minutes"> min <input id="edS' + t.id + '" inputmode="numeric" value="' + (s % 60) + '" aria-label="Secondes"> s</div>' +
      '<div class="chips"><button class="chip" data-edq="-300" data-id="' + t.id + '">−5 min</button><button class="chip" data-edq="-60" data-id="' + t.id + '">−1 min</button><button class="chip" data-edq="60" data-id="' + t.id + '">+1 min</button></div>' +
      '<div class="actions"><button class="btn ghost sm" data-edit="' + t.id + '">Annuler</button><button class="btn sm" data-edsave="' + t.id + '">Enregistrer</button></div>' +
      '<div class="small muted">' + (t.orig != null ? "Temps chronométré d’origine : " + fmtClock(t.orig) + " (conservé)." : "Le temps chronométré d’origine reste enregistré.") + "</div></div>";
  }

  function renderSortie() {
    if (!sortie.active) return renderStart();
    var now = Date.now(), r = running(), on = sortie.engine === "on", h = "";
    h += '<div class="card engine"><div class="row"><div><div class="label">Temps moteur · départ ' + dec1.format(sortie.compteurDeb) + " h · jauge " + fracLabel(sortie.jaugeDeb) + "</div>" +
      '<div class="clock" data-timer="engine">' + fmtClock(engineMs(now)) + '</div></div><span class="pill ' + (on ? "on" : "off") + '">' + (on ? "moteur en route" : "moteur arrêté") + "</span></div>" +
      '<button class="btn big ' + (on ? "stop" : "run") + '" id="engBtn">' + (on ? "Arrêt moteur" : "Démarrer le moteur") + "</button>" +
      '<div class="two"><div class="field"><label for="pilDef">Pilote</label><select id="pilDef">' + piloteOpts(sortie.pilote) + '</select></div><div class="small muted" style="align-self:end">Tours : <span class="num" data-timer="total">' + fmtClock(totalMs(now)) + "</span><br>" + sortie.participants.length + " à bord</div></div></div>";
    if (sortie.closing) return h + renderClosing(now);
    sortie.tours.forEach(function (t) {
      var st = t.state, pill = { wait: "en attente", run: "en cours", pause: "en pause", done: "terminé" }[st], p = t.pid ? participant(t.pid) : null, blocked = r && r !== t;
      h += '<div class="tour ' + (st === "run" ? "run" : "") + '"><div class="row"><div class="who">' + (p ? famDot(famOf(p)) : "") + esc(tourName(t)) + "</div>" +
        (st === "wait" && !t.laps ? '<button class="x btn link" data-deltour="' + t.id + '" aria-label="Supprimer ce tour">Supprimer</button>' : '<span class="pill ' + st + '">' + pill + "</span>") + "</div>" +
        '<div class="row"><div class="t" data-timer="t' + t.id + '">' + fmtClock(tourMs(t, now)) + '</div><div class="summary">' + esc(summary(t)) + (t.orig != null ? " · corrigé" : "") + "<br>Pilote : " + esc(person(t.pilote) ? person(t.pilote).name : "—") + "</div></div>";
      if (t.tiny) h += '<div class="forgot"><span><b>Passage de ' + Math.round((t.acc - t.lapStart) / 1000) + " s</b> : erreur de manipulation ?</span>" +
        '<div class="actions"><button class="btn sm stop" data-tinydel="' + t.id + '">Supprimer ce passage</button><button class="btn sm ghost" data-tinykeep="' + t.id + '">Garder</button></div></div>';
      if (st === "run" && tourMs(t, now) > 20 * 60000) h += '<div class="forgot">En cours depuis plus de 20 min : oubli de stop ? Appuyez sur Fin, puis corrigez le temps.</div>';
      h += '<div class="actions">';
      if (st === "wait") h += '<button class="btn run" data-act="start" data-id="' + t.id + '"' + (blocked ? " disabled" : "") + ">Départ</button>";
      if (st === "run") h += '<button class="btn ghost" data-act="pause" data-id="' + t.id + '">Pause</button><button class="btn" data-act="end" data-id="' + t.id + '">Fin</button>';
      if (st === "pause") h += '<button class="btn run" data-act="resume" data-id="' + t.id + '">Reprise</button><button class="btn" data-act="end" data-id="' + t.id + '">Fin</button>';
      if (st === "done") h += '<button class="btn ghost sm" data-act="again" data-id="' + t.id + '"' + (blocked ? " disabled" : "") + ">Nouveau passage</button>";
      h += '</div><div class="row"><button class="btn link" data-det="' + t.id + '">' + (t.open ? "Masquer les détails" : "Détails et pilote") + "</button>" +
        (st === "done" || st === "pause" ? '<button class="btn link" data-edit="' + t.id + '">' + (t.edit ? "Fermer" : "Corriger le temps") + "</button>" : "") + "</div>" +
        (t.open ? detailsHtml(t) : "") + (t.edit ? editorHtml(t) : "") + "</div>";
    });
    h += '<div class="card"><div class="label">Nouveau tour</div><div class="chips">';
    sortie.participants.forEach(function (p) { h += '<button class="chip" data-newtour="' + p.pid + '">' + famDot(famOf(p)) + esc(person(p.pid).name) + "</button>"; });
    h += '</div><div class="chips"><button class="chip" data-newtour="balade">+ Balade (tout le bateau)</button><button class="chip" data-newtour="meca">+ Mécanique</button></div></div>';
    h += boardHtml();
    h += '<button class="btn big" id="goClose"' + (r ? " disabled" : "") + ">Clôturer la session</button>";
    if (r) h += '<p class="small muted m0" style="text-align:center">Terminez le tour en cours pour clôturer.</p>';
    return h + cancelHtml();
  }
  /* Annuler une session : rien n'est enregistré, après confirmation. */
  function cancelHtml() {
    if (!view.cancelAsk) return '<button class="btn link" id="cancelAsk" style="justify-self:center">Annuler la session sans l’enregistrer</button>';
    return '<div class="alert bad"><b>Annuler cette session ?</b>Les tours, les temps et les participants seront effacés. Rien ne sera enregistré ni partagé.' +
      '<div class="actions"><button class="btn ghost sm" id="cancelNo">Non, continuer</button><button class="btn stop sm" id="cancelYes">Oui, annuler la session</button></div></div>';
  }
  function renderStart() {
    if (!sortie.debEdited) sortie.compteurDeb = lastCompteur(); // suit les sessions arrivées par synchronisation
    var h = '<div class="card"><h3>Nouvelle session</h3><div class="step"><b>1</b>Saisissez le compteur constaté au bateau et positionnez la jauge.</div><div class="field"><label for="cDeb">Compteur moteur (h)</label><input id="cDeb" inputmode="decimal" value="' + dec1.format(sortie.compteurDeb) + '"></div>' +
      '<div id="cDebWarn">' + startWarnHtml(sortie.compteurDeb) + "</div>" +
      '<div class="field gauge-sm">' + gHead("Jauge au départ", "start", startJauge) + gaugeHtml("start", startJauge) + "</div>" +
      '</div>';
    h += boardHtml("Indiquez les personnes à bord.");
    if (startList.length) h += '<div class="card"><div class="field"><label for="pilStart">Pilote</label><select id="pilStart">' + startList.map(function (p) { return '<option value="' + p.pid + '"' + (p.pid === startPilote ? " selected" : "") + ">" + esc(person(p.pid).name) + "</option>"; }).join("") + "</select></div></div>";
    h += '<div class="card"><div class="step"><b>3</b>Vérifiez avant de partir :</div><div class="checks">' + [["huile", "Niveau d’huile"], ["cale", "Pompe de cale"], ["aera", "Aération moteur"]].map(function (c) { return '<label class="chk"><input type="checkbox" data-startchk="' + c[0] + '"' + (startChecks[c[0]] ? " checked" : "") + '> ' + c[1] + "</label>"; }).join("") + "</div></div>";
    return h + '<div class="card"><div class="step"><b>4</b>Démarrez la session au démarrage du moteur.</div><button class="btn big run" id="goStart">Démarrer la session</button></div>';
  }
  function curList() { return sortie.active ? sortie.participants : startList; }
  function inList(pid) { return curList().some(function (p) { return p.pid === pid; }); }
  var startChecks = {}; // vérifications avant départ (huile, pompe de cale, aération) : aide-mémoire, ne bloque rien
  function boardHtml(step) {
    var list = curList(), h = '<div class="card"><div class="row"><h3>À bord</h3><span class="small muted">' + list.length + " personne" + (list.length > 1 ? "s" : "") + "</span></div>" + (step ? '<div class="step"><b>2</b>' + step + "</div>" : "");
    ["YF", "OF", "EXT"].forEach(function (c) {
      var rows = list.filter(function (p) { return person(p.pid).c === c; }), open = picker === c;
      h += '<div class="group"><div class="group-head"><span class="gt">' + (c === "EXT" ? EXT_ICON : famAvatar(CATF[c])) + CAT[c] + (rows.length ? ' <span class="muted small">&nbsp;· ' + rows.length + "</span>" : "") + "</span>" +
        '<button class="plus" data-pick="' + c + '" aria-expanded="' + open + '" aria-label="Ajouter : ' + CAT[c] + '">' + (open ? "−" : "+") + "</button></div>";
      if (open) {
        var avail = PEOPLE.filter(function (q) { return q.c === c && !inList(q.id); });
        h += '<div class="picker">' + (avail.length ? '<div class="chips">' + avail.map(function (q) { return '<button class="chip" data-addp="' + q.id + '">+ ' + esc(q.name) + "</button>"; }).join("") + "</div>" : '<div class="small muted">Tout le monde est déjà à bord.</div>') +
          '<div class="newp"><input id="np' + c + '" placeholder="Nouvelle personne" aria-label="Nom de la nouvelle personne"><button class="btn sm" data-newp="' + c + '">Ajouter</button></div></div>';
      }
      rows.forEach(function (p) {
        var pp = person(p.pid), hasTour = sortie.active && sortie.tours.some(function (t) { return t.pid === p.pid; });
        h += '<div class="prow"><div class="pname"><span>' + famDot(famOf(p)) + esc(pp.name) + "</span>" + (hasTour ? "" : '<button class="x" data-rm="' + p.pid + '" aria-label="Retirer ' + esc(pp.name) + '">×</button>') + "</div>" +
          segHtml("mini", "data-role-" + p.pid, [["ski", "Skieur"], ["pass", "Passager"]], p.role);
        if (c === "EXT") h += segHtml("mini fam", "data-host-" + p.pid, [["YC", "Invité Yann"], ["OC", "Invité Olivier"]], p.host) +
          '<div class="toggle small"><span>Facturé ' + SPEC.tarif + " € la minute, au bénéfice de la " + FAM[p.host].l + '</span><button data-fact-' + p.pid + '="1" aria-pressed="' + p.fact + '" aria-label="Facturé"></button></div>';
        h += "</div>";
      });
      h += "</div>";
    });
    return h + "</div>";
  }
  function totalMs(now) { return sortie.tours.reduce(function (a, t) { return a + tourMs(t, now); }, 0); }
  function computeRecap(now) {
    var eMin = engineMs(now) / 60000, tMin = totalMs(now) / 60000, balade = 0, meca = 0, perso = {};
    sortie.tours.forEach(function (t) { var m = tourMs(t, now) / 60000; if (t.act === "balade") balade += m; else if (t.act === "meca") meca += m; else perso[t.pid] = (perso[t.pid] || 0) + m; });
    var libre = Math.max(0, eMin - tMin), heads = sortie.participants.length || 1, commun = (libre + balade) / heads, b = { YC: meca / 2, OC: meca / 2 }, rows = [], fact = { YC: 0, OC: 0 };
    sortie.participants.forEach(function (p) {
      var f = famOf(p), pm = perso[p.pid] || 0, tot = pm + commun;
      rows.push({ pid: p.pid, name: person(p.pid).name, role: p.role, f: f, perso: pm, commun: commun, tot: tot, fact: p.fact });
      b[f] += tot; if (p.fact) fact[f] += tot;
    });
    var cMin = sortie.compteurFin != null ? (sortie.compteurFin - sortie.compteurDeb) * 60 : null;
    return { eMin: eMin, tMin: tMin, libre: libre, balade: balade, meca: meca, rows: rows, b: b, fact: fact, cMin: cMin };
  }
  function consoEstHtml() {
    var d = sortie.jaugeDeb - sortie.jaugeFin, refill = (16 - sortie.jaugeFin) / 16 * SPEC.reservoir;
    var h = d >= 0 ? "Jauge " + fracLabel(sortie.jaugeDeb) + " → " + fracLabel(sortie.jaugeFin) + " : ≈ <b>" + Math.round(d / 16 * SPEC.reservoir) + " L</b> consommés." : "La jauge d’arrivée est plus haute qu’au départ : plein fait pendant la session ?";
    if (sortie.plein) h += refill < 4 ? " Le réservoir est déjà plein." : " Pour refaire le plein : ≈ " + Math.round(refill) + " L, soit environ " + half(Math.max(0.5, Math.round(refill / SPEC.bidon * 2) / 2)) + " bidons de " + SPEC.bidon + " L.";
    return h;
  }
  function renderClosing(now) {
    if (sortie.compteurFin == null) sortie.compteurFin = Math.round((sortie.compteurDeb + engineMs(now) / 3600000) * 10) / 10;
    var hasPh = !!photoSrc(sortie.photoCompteur);
    var h = '<div class="card meter-card"><h3>Photo du compteur</h3>' +
      (hasPh ? '<img class="cpt-photo" src="' + photoSrc(sortie.photoCompteur) + '" alt="Photo du compteur moteur">' : '<div class="small muted">Photographiez le compteur moteur : la photo est jointe à la session et consultable dans l’historique.</div>') +
      '<label class="btn ' + (hasPh ? "ghost " : "") + 'sm photo-btn">' + (hasPh ? "Reprendre la photo" : "Prendre la photo du compteur") + '<input type="file" accept="image/*" capture="environment" id="cPhoto" hidden></label></div>';
    h += '<div class="card"><h3>Clôture</h3><div class="field"><label for="cFin">Compteur moteur (h)</label><input id="cFin" inputmode="decimal" value="' + dec1.format(sortie.compteurFin) + '"></div>' +
      '<div class="field gauge-sm">' + gHead("Jauge à l’arrivée, avant le plein", "fin", sortie.jaugeFin) + gaugeHtml("fin", sortie.jaugeFin) + "</div>" +
      '<div class="small" id="consoEst">' + consoEstHtml() + "</div>" +
      '<div class="toggle"><span>Plein refait avec les bidons en partant</span><button id="tPlein" aria-pressed="' + sortie.plein + '" aria-label="Plein refait"></button></div>';
    if (sortie.plein) {
      var plan = planPrelevement(sortie.bidonsPlein, sortie.pleinF);
      h += '<div class="field"><span class="flabel">Qui verse ?</span>' + segHtml("fam", "data-pleinf", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], sortie.pleinF) + "</div>" +
        '<div class="field"><span class="flabel">Bidons versés</span><div class="stepper"><button data-cstep="-0.5" aria-label="Un demi-bidon de moins">−</button><span class="val">' + half(sortie.bidonsPlein) + '</span><button data-cstep="0.5" aria-label="Un demi-bidon de plus">+</button></div></div>' +
        '<div class="small muted">' + esc(planText(plan, sortie.pleinF)) + (plan.manque > 0.01 ? " Il manque " + int0.format(plan.manque) + " L dans le stock." : "") + "</div>";
    }
    h += "</div>";
    h += '<div class="card"><h3>Passages</h3><div class="small muted">Complétez les détails ou corrigez un temps si besoin (optionnel).</div><div class="list small">';
    sortie.tours.forEach(function (t) {
      h += '<div class="item"><span>' + esc(tourName(t)) + " · " + esc(summary(t)) + '</span><span class="num">' + Math.round(tourMs(t, now) / 60000) + ' min</span><span class="d"><button class="btn link" data-det="' + t.id + '">' + (t.open ? "Fermer" : (needsDetails(t) ? "Compléter" : "Détails")) + "</button> · " +
        '<button class="btn link" data-edit="' + t.id + '">' + (t.edit ? "Fermer" : "Corriger le temps") + "</button>" + (t.orig != null ? " · corrigé" : "") + "</span>" +
        (t.open ? '<div style="grid-column:1/-1">' + detailsHtml(t) + "</div>" : "") + (t.edit ? '<div style="grid-column:1/-1">' + editorHtml(t) + "</div>" : "") + "</div>";
    });
    h += "</div></div>";
    h += '<div class="card" id="recapCard">' + recapHtml(now) + "</div>";
    return h + '<div class="actions"><button class="btn ghost" id="backClose">Retour</button><button class="btn" id="saveSortie">Enregistrer la session</button></div>' + cancelHtml();
  }
  function recapHtml(now) {
    var R = computeRecap(now), h = "<h3>Répartition du temps moteur</h3>";
    h += '<div class="small muted">Moteur : ' + Math.round(R.eMin) + " min · tours : " + Math.round(R.tMin) + " min · moteur en route sans tour : " + Math.round(R.libre) + " min" + (R.balade ? " · balade : " + Math.round(R.balade) + " min" : "") + ". Le temps commun est partagé entre les " + R.rows.length + " personnes à bord.</div>";
    if (R.cMin != null && Math.abs(R.cMin - R.eMin) > 6) h += '<div class="alert">Le compteur indique ' + Math.round(R.cMin) + " min, l’app " + Math.round(R.eMin) + " min. Vérifiez le compteur (il est précis à 6 min près).</div>";
    h += '<table class="rtable"><thead><tr><th>Personne</th><th>Perso</th><th>Commun</th><th>Total</th></tr></thead><tbody>';
    R.rows.forEach(function (x) { h += "<tr><td>" + famDot(x.f) + esc(x.name) + (x.role === "pass" ? " (passager)" : "") + (x.fact ? " (invité facturé)" : "") + "</td><td>" + Math.round(x.perso) + "</td><td>" + Math.round(x.commun) + "</td><td>" + Math.round(x.tot) + "</td></tr>"; });
    h += "</tbody></table>";
    var tot = R.b.YC + R.b.OC || 1;
    h += '<div class="split"><i class="yc" style="width:' + (R.b.YC / tot * 100) + '%"></i><i class="oc" style="width:' + (R.b.OC / tot * 100) + '%"></i></div>' +
      '<div class="legend"><span>' + famDot("YC") + 'Famille Yann <b class="num">' + Math.round(R.b.YC) + " min</b></span><span>" + famDot("OC") + 'Famille Olivier <b class="num">' + Math.round(R.b.OC) + " min</b></span></div>";
    ["YC", "OC"].forEach(function (f) { if (R.fact[f] > 0.5) h += '<div class="alert ok"><b>Invités facturés : ' + Math.round(R.fact[f]) + " min → " + eur0.format(Math.round(R.fact[f]) * SPEC.tarif) + "</b>Recette pour la " + FAM[f].l + " (encaissée par elle).</div>"; });
    if (R.meca) h += '<div class="small muted">Mécanique (' + Math.round(R.meca) + " min) partagée à 50/50.</div>";
    return h;
  }

  /* ---------- Accueil ---------- */
  /* Trous de compteur : écart entre la fin d'une session et le début de la suivante, sur le même bateau. */
  function findGaps() {
    var out = [], by = {};
    sessionsArr.forEach(function (s) { if (hasNum(s.compteurDeb) && (hasNum(s.compteurFin) || Number(s.engineMin) > 0)) (by[s.bateau || ""] = by[s.bateau || ""] || []).push(s); });
    Object.keys(by).forEach(function (k) {
      var list = by[k].sort(function (a, b) { return Number(a.compteurDeb) - Number(b.compteurDeb); });
      for (var i = 1; i < list.length; i++) {
        var a = list[i - 1], b = list[i], g = Number(b.compteurDeb) - sessionEnd(a);
        if (g > GAP_TOL + 0.001) out.push({ key: a.id + ">" + b.id, from: a, to: b, h: g });
      }
    });
    return out;
  }
  function renderAccueil() {
    var now = Date.now(), h = "";
    h += quickHtml(now);
    h += '<div class="card"><div class="row"><h3>Stock de bidons</h3><span class="small muted">' + half(Math.round(stockN() * 2) / 2) + " sur 5 · " + int0.format(stockL()) + " L</span></div>" + cansHtml() + "</div>";
    dettes.forEach(function (d) { h += detteHtml(d); });
    if (!CONF.url || !CONF.code) h += '<div class="alert"><b>Base partagée non connectée</b>Les saisies restent sur ce téléphone. Connectez l’app dans l’onglet Bateau pour partager l’historique avec la famille.<div><button class="btn sm" data-go="bateau">Connecter</button></div></div>';
    h += '<div class="kpis"><div class="kpi"><span class="label">Compteur moteur</span><span class="v">' + dec1.format(lastCompteur()) + ' h</span><span class="s">fin de la dernière session</span></div>' +
      '<div class="kpi"><span class="label">Dernier plein</span><span class="v" style="font-size:19px">' + esc(lastPlein || "—") + "</span></div></div>";
    var gaps = findGaps(), rech = gaps.filter(function (g) { return (ETAT.gapsRecherche || []).indexOf(g.key) >= 0; });
    var gp = gaps.filter(function (g) { return rech.indexOf(g) < 0; })[0];
    if (rech.length) h += '<div class="small muted">' + rech.length + " trou(s) de compteur en recherche.</div>";
    if (gp) {
      var srch = false;
      gap.key = gp.key;
      h += '<div class="alert"><b>' + (srch ? "Trou de compteur en recherche : " : "Trou de compteur : ") + hm(gp.h * 60) + "</b>Entre la session du " + esc(isoToFr(dkey(gp.from))) + " (fin " + dec1.format(sessionEnd(gp.from)) + " h) et celle du " + esc(isoToFr(dkey(gp.to))) + " (début " + dec1.format(gp.to.compteurDeb) + " h). Ça ne bloque rien." + (gap.open ? "" : '<div><button class="btn sm" id="gapOpen">Rattraper cette session</button></div>') + "</div>";
      if (gap.open) h += '<div class="card"><h3>Session rattrapée</h3><div class="two"><div class="field"><label for="gD">Date</label><input id="gD" type="date" value="' + esc(dkey(gp.from)) + '"></div><div class="field"><label for="gM">Durée (min)</label><input id="gM" inputmode="numeric" placeholder="si connue"></div></div>' +
        '<div class="two"><div class="field"><label for="gC1">Compteur début</label><input id="gC1" inputmode="decimal" value="' + dec1.format(sessionEnd(gp.from)) + '"></div><div class="field"><label for="gC2">Compteur fin</label><input id="gC2" inputmode="decimal" value="' + dec1.format(gp.to.compteurDeb) + '"></div></div>' +
        '<div class="field"><span class="flabel">Rattacher à</span>' + segHtml("fam", "data-grat", [["YC", "Famille Yann"], ["OC", "Famille Olivier"], ["search", "À rechercher"]], gap.rat) + "</div>" +
        '<div class="actions"><button class="btn ghost" id="gapCancel">Annuler</button><button class="btn" id="gapSave">Enregistrer</button></div></div>';
    }
    var yk = latestYear();
    if (yk) {
      var Y = YEARS[yk], t = Y.fam.YC + Y.fam.OC || 1;
      h += '<div class="card"><div class="row"><h3>Temps moteur ' + yk + '</h3><span class="small muted">' + dec1.format(Y.min / 60) + " h</span></div>" +
        '<div class="split"><i class="yc" style="width:' + (Y.fam.YC / t * 100) + '%"></i><i class="oc" style="width:' + (Y.fam.OC / t * 100) + '%"></i></div>' +
        '<div class="legend"><span>' + famDot("YC") + 'Yann <b class="num">' + int0.format(Y.fam.YC) + " min</b></span><span>" + famDot("OC") + 'Olivier <b class="num">' + int0.format(Y.fam.OC) + " min</b></span></div></div>";
    }
    var T = theo();
    h += '<div class="card spray-card"><div class="spray-bg img-ski" aria-hidden="true"></div><span class="brandlogo img-logo" aria-hidden="true"></span><div class="spray-in">' +
      '<div class="glass"><div class="label">Stock d’essence estimé bateau</div><div class="num" id="theoL" style="font-size:18px;font-weight:600">≈ ' + Math.round(T.L) + " L · " + fracLabel(T.v) + '</div><div id="theoTxt">' + T.txt + "</div></div>" +
      '<div class="gwrap">' + gaugeHtml("theo", T.v, true) + "</div></div></div>";
    return h;
  }
  var RELIEF = true; // boutons en relief (accueil, Bateau) : mettre false pour revenir aux boutons plats
  /* Accueil : boutons d'accès direct, deux par ligne (la session occupe toute la première ligne) */
  var QI = {
    achat: '<svg viewBox="0 0 24 24"><path d="M5.5 9L9 5.5h9a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z"/><path d="M12 5.5V3h5v2.5"/><path d="M7.2 7.3L4.5 4.6 6 3.1l2.7 2.7"/><path d="M9.5 11.5l5.5 6M15 11.5l-5.5 6"/></svg>',
    mise: '<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M2.5 21h13"/><rect x="6.5" y="6" width="5" height="4" rx=".6"/><path d="M14 11h1.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 0 3 0V8.5L17.5 6"/></svg>',
    hist: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M3.5 12H2M22 12h-1.5"/></svg>',
    stats: '<svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>',
    journal: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4M8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>'
  };
  function qa(cls, attr, icon, title, sub, extra) {
    return '<button class="qa ' + cls + '" ' + attr + '><span class="qa-ic" aria-hidden="true">' + icon + "</span>" + (extra || "") + '<span class="qa-t">' + title + "</span>" + (sub ? '<span class="qa-s">' + sub + "</span>" : "") + "</button>";
  }
  function quickHtml(now) {
    var unread = unreadNotes(), h = '<div class="quick' + (RELIEF ? " relief" : "") + '">';
    if (sortie.active) h += '<button class="qa qa-session img-ski" data-go="sortie"><span class="qa-ic" aria-hidden="true">' + QI.play + '</span><span class="qa-t">Session en cours</span><span class="qa-s">moteur ' + (sortie.engine === "on" ? "en route" : "arrêté") + ' · <b data-timer="engine">' + fmtClock(engineMs(now)) + "</b> · ouvrir</span></button>";
    else h += '<button class="qa qa-session img-ski" data-go="sortie"><span class="qa-ic" aria-hidden="true">' + QI.play + '</span><span class="qa-t">Démarrer une session</span><span class="qa-s">chrono par skieur</span></button>';
    // 1re ligne : session (double largeur), achat essence, remplissage ; 2e ligne : quatre petits boutons
    h += qa("qa-achat qa-mid", 'data-qa="achat"', QI.achat, "Achat essence", int0.format(stockL()) + " L en bidons") +
      qa("qa-mise qa-mid", 'data-qa="mise"', QI.mise, "Remplissage bateau") +
      qa("qa-stats qa-sm", 'data-qa="stats"', QI.stats, "Statistiques") +
      qa("qa-hist qa-sm", 'data-qa="hist"', QI.hist, "Historique sessions") +
      qa("qa-journal qa-sm", 'data-go="journal"', QI.journal, "Journal - Notes", "", unread ? '<span class="qa-dot" aria-label="' + unread + ' nouvelle(s) note(s)">' + unread + "</span>" : "") +
      qa("qa-urg qa-sm", 'data-go="annuaire"', URG_ICON, "Contact urgence");
    return h + "</div>";
  }
  function theo() {
    var cap = SPEC.reservoir;
    if (sortie.active) {
      var L0 = sortie.jaugeDeb / 16 * cap, em = engineMs(Date.now()), used = em / 3600000 * SPEC.conso, L = Math.max(0, L0 - used);
      return { L: L, v: Math.max(0, Math.min(16, Math.round(L / cap * 16))), txt: "Départ " + fracLabel(sortie.jaugeDeb) + " − " + Math.round(em / 60000) + " min × " + int0.format(SPEC.conso) + " L/h" };
    }
    return { L: lastLevel / 16 * cap, v: lastLevel, txt: lastLevelDate ? "Fin de session du " + lastLevelDate + (lastLevel >= 16 ? " · plein" : "") : "Aucune session enregistrée : réservoir supposé plein" };
  }
  function updateTheo() {
    var svg = screen.querySelector('svg[data-gauge="theo"]'); if (!svg) return;
    var T = theo();
    if (Number(svg.getAttribute("aria-valuenow")) !== T.v) setGauge(svg, T.v);
    var l = document.getElementById("theoL"), t = document.getElementById("theoTxt");
    if (l) l.textContent = "≈ " + Math.round(T.L) + " L · " + fracLabel(T.v);
    if (t) t.textContent = T.txt;
  }

  /* ---------- Essence ---------- */
  function renderEssence() {
    var h = !view.essence ? '<div class="ess-acts"><button class="ess-btn ess-achat" data-ev="achat"><span class="qa-ic" aria-hidden="true">' + QI.achat + '</span><span>J’ai acheté</span></button><button class="ess-btn ess-mise" data-ev="mise"' + (bidons.length ? "" : " disabled") + '><span class="qa-ic" aria-hidden="true">' + QI.mise + '</span><span>J’ai versé des bidons</span></button></div>' : "";
    h += '<div class="card"><div class="row"><h3>Stock de bidons</h3><span class="small muted">' + int0.format(stockL()) + " L · " + eur.format(stockEur()) + "</span></div>" + cansHtml() +
      '<div class="legend"><span>' + famDot("YC") + "payé par la famille Yann</span><span>" + famDot("OC") + "payé par la famille Olivier</span></div>" +
      (bidons.length && view.essence !== "corr" ? '<button class="btn ghost sm" id="corrOpen">Corriger le stock (vol, perte, autre usage)</button>' : "") + "</div>";
    dettes.forEach(function (d) { h += detteHtml(d); });
    if (view.essence === "corr") {
      h += corrHtml();
    } else if (view.essence === "achat" && achatForm.step === "check") {
      h += achatCheckHtml();
    } else if (view.essence === "achat") {
      h += '<div class="card"><h3>J’ai acheté de l’essence</h3>' +
        '<div class="field"><span class="flabel">Payé par</span>' + segHtml("fam", "data-af", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], achatForm.f) + "</div>" +
        '<div class="two"><div class="field"><label for="aL">Litres</label><input id="aL" inputmode="decimal" value="' + (achatForm.L ? half(achatForm.L) : "40") + '"></div><div class="field"><label for="aP">Prix payé (€)</label><input id="aP" inputmode="decimal" value="' + (achatForm.P ? half(achatForm.P) : "69,20") + '"></div></div>' +
        '<div class="field"><span class="flabel">Bidons remplis</span><div class="stepper"><button data-astep="-1" aria-label="Un bidon de moins">−</button><span class="val">' + achatForm.b + '</span><button data-astep="1" aria-label="Un bidon de plus">+</button></div></div>' +
        '<div class="toggle"><span>Versé tout de suite dans le réservoir</span><button data-atog="verse" aria-pressed="' + achatForm.verse + '" aria-label="Versé tout de suite"></button></div>' +
        (achatForm.verse ? '<div class="toggle"><span>Le réservoir est plein</span><button data-atog="plein" aria-pressed="' + achatForm.plein + '" aria-label="Réservoir plein"></button></div>' : "") +
        '<div class="small muted" id="aPL"></div>' +
        '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="saveAchat">Enregistrer</button></div></div>';
    } else if (view.essence === "mise") {
      var plan = planPrelevement(miseForm.n, miseForm.f);
      h += '<div class="card"><h3>J’ai versé des bidons</h3>' +
        '<div class="field"><span class="flabel">Qui verse ?</span>' + segHtml("fam", "data-mf", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], miseForm.f) + "</div>" +
        '<div class="field"><span class="flabel">Bidons versés</span><div class="stepper"><button data-mstep="-0.5" aria-label="Un demi-bidon de moins">−</button><span class="val">' + half(miseForm.n) + '</span><button data-mstep="0.5" aria-label="Un demi-bidon de plus">+</button></div></div>' +
        '<div class="alert ok">' + esc(planText(plan, miseForm.f)) + "</div>" +
        '<div class="toggle"><span>Le réservoir est plein</span><button data-mtog="plein" aria-pressed="' + miseForm.plein + '" aria-label="Réservoir plein"></button></div>' +
        '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="saveMise">Enregistrer</button></div></div>';
    }
    h += '<div class="card"><h3>De plein à plein</h3><div class="small">Dernier plein : <b>' + esc(lastPlein) + "</b></div></div>";
    h += achatsTotHtml();
    h += '<div class="card">' + collHead("mvts", "Mouvements", moves.length + " mouvement" + (moves.length > 1 ? "s" : "") + (moves[0] ? " · dernier le " + esc(moves[0].d) : ""));
    if (ui.mvts) {
      h += '<div class="list small" style="margin-top:8px">';
      moves.slice(0, 30).forEach(function (m) { h += '<div class="item"><span>' + esc(m.t) + '</span><span class="num">' + esc(m.v) + '</span><span class="d">' + esc(m.d) + " · " + esc(m.who) + "</span></div>"; });
      h += "</div>" + (moves.length > 30 ? '<div class="small muted">Les 30 plus récents sont affichés.</div>' : "");
    }
    return h + "</div>";
  }
  /* Total des achats d'essence (litres et montant) par famille, par année */
  var essYear = "";
  function achatsTotHtml() {
    var ach = moves.filter(function (m) { return m.type === "achat" && (Number(m.litres) || Number(m.prix)); });
    if (!ach.length) return "";
    var yrs = []; ach.forEach(function (m) { var y = yearOf(m); if (y && yrs.indexOf(y) < 0) yrs.push(y); }); yrs.sort(); yrs.push("Toutes");
    if (!essYear || yrs.indexOf(essYear) < 0) essYear = yrs.length > 1 ? yrs[yrs.length - 2] : "Toutes";
    var T = { YC: { l: 0, e: 0, n: 0 }, OC: { l: 0, e: 0, n: 0 } };
    ach.forEach(function (m) { if (essYear !== "Toutes" && yearOf(m) !== essYear) return; var t = T[m.f] || T.YC; t.l += Number(m.litres) || 0; t.e += Number(m.prix) || 0; t.n++; });
    var row = function (f) { var t = T[f]; return "<tr><td>" + famDot(f) + FAM[f].n + '<span class="sub">' + t.n + " achat" + (t.n > 1 ? "s" : "") + (t.l ? " · " + dec2.format(t.e / t.l) + " €/L" : "") + "</span></td><td>" + int0.format(t.l) + " L</td><td>" + eur.format(t.e) + "</td></tr>"; };
    return '<div class="card"><h3>Total des achats</h3><div class="chips small-chips">' + yrs.map(function (y) { return '<button class="chip" data-essyear="' + y + '" aria-pressed="' + (y === essYear) + '">' + y + "</button>"; }).join("") + "</div>" +
      '<table class="rtable" style="margin-top:8px"><thead><tr><th>Famille</th><th>Volume</th><th>Montant</th></tr></thead><tbody>' + row("YC") + row("OC") +
      '<tr class="tot"><td>Total</td><td>' + int0.format(T.YC.l + T.OC.l) + " L</td><td>" + eur.format(T.YC.e + T.OC.e) + "</td></tr></tbody></table></div>";
  }

  /* Contrôle avant d'enregistrer un achat quand des bidons pleins sont encore notés en stock. */
  function cansAfter(plan) { var c = bidons.map(function (b) { return b.litres; }); plan.takes.forEach(function (t) { c[t.i] -= t.litres; }); return c.filter(function (l) { return l > 0.01; }).length; }
  function achatNeed() { return Math.max(0, achatForm.b - (5 - bidons.length)); }
  function achatCheckHtml() {
    var A = achatForm, need = achatNeed(), maxN = bidons.length;
    var h = '<div class="card"><h3>Avant d’enregistrer l’achat</h3><div class="small">Achat : ' + A.b + " bidon(s) · " + int0.format(A.L) + " L · " + eur.format(A.P) + " · " + FAM[A.f].n + (A.verse ? " · versé tout de suite" : " · mis en stock") + "</div>" +
      '<div class="label">Stock noté avant l’achat</div>' + cansHtml(bidons, "small");
    h += '<div class="alert' + (need ? " bad" : "") + '"><b>' + (need ? "Vous n’avez que 5 bidons." : "Il reste " + bidons.length + " bidon(s) dans le stock.") + "</b>" +
      (need ? bidons.length + " bidon(s) sont encore notés pleins : pour en remplir " + A.b + ", au moins " + need + (need > 1 ? " ont dû être vidés" : " a dû être vidé") + " dans le bateau sans être noté" + (need > 1 ? "s." : ".") : "Avez-vous oublié de noter leur versement dans le bateau ?") + "</div>";
    if (A.tfOpen || need) {
      A.tn = Math.min(maxN, Math.max(A.tn, need, 1));
      var plan = planPrelevement(A.tn, A.tf), left = cansAfter(plan), ok = left + A.b <= 5, after = simulateStock(plan, A.verse ? 0 : A.b, A.L, A.f);
      h += '<div class="field"><span class="flabel">Combien de bidons du stock ont été vidés dans le bateau ?</span><div class="stepper"><button data-tnstep="-1" aria-label="Un bidon de moins"' + (A.tn <= Math.max(need, 1) ? " disabled" : "") + '>−</button><span class="val">' + A.tn + '</span><button data-tnstep="1" aria-label="Un bidon de plus"' + (A.tn >= maxN ? " disabled" : "") + ">+</button></div>" +
        (need ? '<div class="small muted">Au minimum ' + need + ", sinon les " + A.b + " nouveaux bidons ne tiennent pas dans les 5. Maximum " + maxN + ".</div>" : '<div class="small muted">Entre 1 et ' + maxN + ".</div>") + "</div>" +
        '<div class="field"><span class="flabel">Qui les a vidés ?</span>' + segHtml("fam", "data-tf", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], A.tf) + "</div>" +
        '<div class="small muted">' + esc(planText(plan, A.tf)) + "</div>" +
        '<div class="label">Stock après ' + (A.verse ? "le versement" : "le versement et l’achat") + "</div>" + cansHtml(after, "small") +
        '<div class="actions"><button class="btn ghost" id="achBack">Corriger l’achat</button><button class="btn" id="achBoth"' + (ok ? "" : " disabled") + ">Enregistrer le versement, puis l’achat</button></div>";
    } else {
      h += '<div class="actions"><button class="btn" id="achYes">Oui, noter le versement</button><button class="btn ghost" id="achNo">' + (A.verse ? "Non, enregistrer l’achat" : "Non, ajouter au stock") + "</button></div>" +
        '<button class="btn link" id="achBack">Corriger l’achat</button>';
    }
    return h + "</div>";
  }
  /* Correction du stock : vol, perte ou autre usage de bidons. */
  var corrForm = { sel: {}, who: "yann", motif: "vol", usage: "Voiture", aff: "5050" };
  function corrSel() { return Object.keys(corrForm.sel).filter(function (k) { return corrForm.sel[k]; }).map(Number).filter(function (i) { return i < bidons.length; }); }
  function corrEffects(sel) {
    var C = corrForm, byP = { YC: 0, OC: 0 }, lit = 0, lines = [], dt = [], lab = C.motif === "autre" ? C.usage.toLowerCase() : C.motif;
    sel.forEach(function (i) { var b = bidons[i]; byP[b.f] += b.litres * b.prix; lit += b.litres; });
    ["YC", "OC"].forEach(function (p) {
      var v = byP[p], o = p === "YC" ? "OC" : "YC"; if (v < 0.005) return;
      lines.push({ lib: "Essence retirée du stock (" + lab + ")", cat: "Essence", m: -v, payeur: p, regle: "conso" });
      if (C.motif !== "autre") lines.push({ lib: "Perte d’essence (" + lab + ")", cat: "Essence", m: v, payeur: p, regle: C.aff });
      else if (C.aff !== p) dt.push({ from: o, to: p, eur: C.aff === "5050" ? v / 2 : v, note: "essence prise pour " + lab });
    });
    return { lit: lit, byP: byP, lines: lines, dettes: dt };
  }
  function corrHtml() {
    var C = corrForm, sel = corrSel(), h = '<div class="card"><h3>Corriger le stock</h3><div class="field"><span class="flabel">Bidons concernés (touchez-les)</span><div class="cans">';
    for (var i = 0; i < bidons.length; i++) h += '<button class="can-pick" data-cpick="' + i + '" aria-pressed="' + !!C.sel[i] + '" aria-label="Bidon ' + (i + 1) + '">' + canSvg(bidons[i], i) + "</button>";
    h += "</div></div>" +
      '<div class="field"><label for="cWho">Correction faite par</label><select id="cWho">' + PEOPLE.filter(function (p) { return p.c !== "EXT"; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === C.who ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><span class="flabel">Motif</span>' + segHtml("", "data-cmotif", [["vol", "Vol"], ["perte", "Perte"], ["autre", "Autre usage"]], C.motif) + "</div>";
    if (C.motif === "autre") h += '<div class="field"><span class="flabel">Usage</span><div class="chips">' + ["Voiture", "Moto", "Dépannage", "Autre"].map(function (u) { return '<button class="chip" data-cusage="' + u + '" aria-pressed="' + (u === C.usage) + '">' + u + "</button>"; }).join("") + "</div></div>";
    h += '<div class="field"><span class="flabel">' + (C.motif === "autre" ? "Utilisé par" : "Perte à la charge de") + "</span>" + segHtml("fam", "data-caff", [["YC", "Yann"], ["OC", "Olivier"], ["5050", "Commun"]], C.aff) + "</div>";
    if (!sel.length) h += '<div class="small muted">Touchez les bidons à retirer du stock.</div>';
    else {
      var e = corrEffects(sel), parts = [];
      ["YC", "OC"].forEach(function (p) { if (e.byP[p] > 0.005) parts.push(eur.format(e.byP[p]) + " payés par " + FAM[p].s); });
      var s = sel.length + " bidon(s), " + int0.format(e.lit) + " L (" + parts.join(", ") + "). Leur valeur est retirée des dépenses d’essence du bateau";
      if (C.motif !== "autre") s += ", puis comptée comme perte à la charge de " + (C.aff === "5050" ? "Yann et Olivier (50/50)" : FAM[C.aff].s) + ".";
      else s += (e.dettes.length ? ". " + e.dettes.map(function (d) { return FAM[d.from].s + " devra " + eur.format(d.eur) + " à " + FAM[d.to].s; }).join(" ; ") + "." : " : chacun a utilisé sa propre essence, rien d’autre à régler.");
      h += '<div class="alert ok">' + s + "</div>";
    }
    return h + '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="corrSave"' + (sel.length ? "" : " disabled") + ">Enregistrer la correction</button></div></div>";
  }
  function commitAchat() {
    var A = achatForm, f = A.f, B = A.b, Lt = A.L, P = A.P;
    var base = { type: "achat", date: todayIso(), d: todayFr(), f: f, litres: Lt, prix: P, bidons: B }; // type, famille, litres et prix : servent aux totaux d'achat
    if (A.verse) { moves.unshift(Object.assign({}, base, { t: "Achat versé tout de suite", v: B + " bidon(s) · " + int0.format(Lt) + " L · " + eur.format(P), who: FAM[f].n + (A.plein ? " · plein" : "") })); if (A.plein) { lastPlein = todayFr(); lastLevel = 16; lastLevelDate = todayFr(); } }
    else { for (var bi = 0; bi < B; bi++) bidons.push({ id: uid(), f: f, litres: Lt / B, prix: P / Lt, d: todayFr() }); moves.unshift(Object.assign({}, base, { t: "Achat mis en stock", v: B + " bidon(s) · " + int0.format(Lt) + " L · " + eur.format(P), who: FAM[f].n })); }
    depenses.unshift({ d: todayFr(), lib: "Essence " + int0.format(Lt) + " L", cat: "Essence", m: P, payeur: f, regle: "conso", isNew: true });
    A.step = null; A.tfOpen = false; A.L = 0; A.P = 0; view.essence = null; save(2); toast(savedMsg("Achat enregistré, dépense créée.")); render();
  }

  /* ---------- Dépenses ---------- */
  var REGL = "Règlement entre familles";
  var CATS = [["Assurance", "5050"], ["Matériel bateau", "5050"], ["Entretien", "5050"], ["Réparation", "5050"], ["Adhésion", "5050"], ["Taxes", "5050"], ["Taxe / corps mort lac", "5050"], ["Essence", "conso"], ["Matériel loisir", "payeur"], ["Recette invités", "payeur"], ["Remboursement", "5050"], [REGL, "regl"], ["Autres", "5050"]];
  var depForm = { cat: "Matériel bateau", regle: "5050", pct: 50, payeur: "YC" };
  /* Part de consommation de chaque famille : temps moteur de l'année de la dépense (toutes années si inconnue). */
  function consoRatio(year) {
    var y = YEARS[year];
    if (y && y.fam.YC + y.fam.OC > 0) return { YC: y.fam.YC / (y.fam.YC + y.fam.OC), OC: y.fam.OC / (y.fam.YC + y.fam.OC) };
    var a = 0, b = 0; Object.keys(YEARS).forEach(function (k) { a += YEARS[k].fam.YC; b += YEARS[k].fam.OC; });
    return a + b > 0 ? { YC: a / (a + b), OC: b / (a + b) } : { YC: 0.5, OC: 0.5 };
  }
  function shares(regle, m, pct, payeur, year, parts) {
    if (regle === "parts" && parts) return { YC: Number(parts.YC) || 0, OC: Number(parts.OC) || 0 };
    if (regle === "YC") return { YC: m, OC: 0 };
    if (regle === "OC") return { YC: 0, OC: m };
    if (regle === "payeur") return payeur === "OC" ? { YC: 0, OC: m } : { YC: m, OC: 0 };
    if (regle === "regl") return payeur === "OC" ? { YC: m, OC: 0 } : { YC: 0, OC: m };
    if (regle === "pct") { var p = Math.min(100, Math.max(0, pct)) / 100; return { YC: m * (1 - p), OC: m * p }; }
    if (regle === "conso") { var r = consoRatio(year); return { YC: m * r.YC, OC: m * r.OC }; }
    return { YC: m / 2, OC: m / 2 };
  }
  function sharesOf(d) { return shares(d.regle, Number(d.m) || 0, d.pct, d.payeur, yearOf(d), d.parts); }
  function tagOf(s) { return s.YC && s.OC ? '<span class="tag">Y+O</span>' : (s.YC ? '<span class="tag YC">Y</span>' : '<span class="tag OC">O</span>'); }
  /* Balance : ce que chaque famille a payé moins sa part, plus les dettes de bidons. Positif = la famille doit recevoir. */
  function balance() {
    var paid = { YC: 0, OC: 0 }, due = { YC: 0, OC: 0 }, tot = { total: 0, YC: 0, OC: 0 };
    depenses.forEach(function (d) {
      var s = sharesOf(d), m = Number(d.m) || 0;
      paid[d.payeur === "OC" ? "OC" : "YC"] += m; due.YC += s.YC; due.OC += s.OC;
      if (d.cat !== REGL) { tot.total += m; tot.YC += s.YC; tot.OC += s.OC; }
    });
    var net = { YC: paid.YC - due.YC, OC: paid.OC - due.OC };
    dettes.forEach(function (x) { var e = Number(x.eur) || 0; net[x.from] -= e; net[x.to] += e; });
    return { paid: paid, due: due, net: net, tot: tot };
  }
  function balanceText(B) {
    var v = (B.net.YC - B.net.OC) / 2;
    if (Math.abs(v) < 1) return "Les comptes sont équilibrés.";
    return v > 0 ? "Olivier doit " + eur.format(v) + " à Yann." : "Yann doit " + eur.format(-v) + " à Olivier.";
  }
  function renderDepenses() {
    var B = balance(), h = "";
    if (view.dep) h += depFormHtml();
    else h += '<button class="btn big center-btn" id="dNew">Saisir une dépense</button>';
    h += '<div class="banner"><div><span class="label">Total</span><span class="v">' + eur0.format(B.tot.total) + '</span></div><div class="yc"><span class="label">Part Yann</span><span class="v">' + eur0.format(B.tot.YC) + '</span></div><div class="oc"><span class="label">Part Olivier</span><span class="v">' + eur0.format(B.tot.OC) + "</span></div></div>" +
      '<div class="alert ok"><b>Balance : ' + balanceText(B) + "</b>Dépenses payées moins la part de chacun, dettes de bidons comprises. Un virement entre familles se note dans la catégorie « " + REGL + " ».</div>" +
      '<button class="btn ghost" id="xlsExport">Exporter la synthèse en Excel</button>';
    return h + depListHtml();
  }
  function depFormHtml() {
    var h = "";
    {
      h += '<div class="card"><h3>Nouvelle dépense</h3><div class="two"><div class="field"><label for="dM">Montant (€)</label><input id="dM" inputmode="decimal" value="120"></div><div class="field"><label for="dCat">Catégorie</label><select id="dCat">' + CATS.map(function (c) { return "<option" + (c[0] === depForm.cat ? " selected" : "") + ">" + esc(c[0]) + "</option>"; }).join("") + "</select></div></div>" +
        '<div class="field"><label for="dLib">Détail</label><input id="dLib" value="Gilet de sauvetage"></div>' +
        '<div class="field"><span class="flabel">Payé par</span>' + segHtml("fam", "data-dpay", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], depForm.payeur) + "</div>";
      if (depForm.regle === "conso") h += '<div class="alert ok"><b>Selon la consommation</b>Répartie de plein à plein, au temps moteur des familles.</div>';
      else if (depForm.regle === "regl") h += '<div class="alert ok"><b>Virement entre familles</b>La famille qui paie verse ce montant à l’autre : la balance diminue d’autant.</div>';
      else h += '<div class="field"><span class="flabel">Partage (pré-rempli selon la catégorie)</span>' + segHtml("", "data-r", [["5050", "Y+O"], ["YC", "Yann"], ["OC", "Olivier"], ["pct", "%"]], depForm.regle === "payeur" ? depForm.payeur : depForm.regle) + "</div>" +
        (depForm.regle === "pct" ? '<div class="field"><label for="dPct">Part Olivier (%)</label><input id="dPct" inputmode="numeric" value="' + depForm.pct + '"></div>' : "") + '<div id="dPrev"></div>';
      h += '<div class="actions"><button class="btn ghost" id="dCancel">Annuler</button><button class="btn" id="dSave">Enregistrer</button></div></div>';
    }
    return h;
  }
  function depListHtml() {
    var h = '<div class="card"><h3>Dépenses</h3><table class="rtable"><thead><tr><th>Dépense</th><th>Total</th><th>Yann</th><th>Olivier</th></tr></thead><tbody>';
    if (!depenses.length) h += '<tr><td colspan="4" class="muted">Aucune dépense. Importez l’historique (onglet Bateau) ou ajoutez la première.</td></tr>';
    depenses.forEach(function (d) {
      var s = sharesOf(d), pay = FAM[d.payeur] ? FAM[d.payeur].s : "?";
      h += "<tr><td>" + esc(d.lib) + " " + tagOf(s) + '<span class="sub">' + esc(d.d || isoToFr(d.date)) + " · " + esc(d.cat) + " · payé par " + pay + "</span></td><td><b>" + eur.format(Number(d.m) || 0) + '</b></td><td class="part">' + (s.YC ? eur.format(s.YC) : "—") + '</td><td class="part">' + (s.OC ? eur.format(s.OC) : "—") + "</td></tr>";
    });
    return h + '</tbody></table><div class="small muted">Y+O : partagé entre les deux familles · Y : Yann seul · O : Olivier seul. L’essence est répartie selon la consommation de chaque famille.</div></div>';
  }
  function depPreview() {
    var el = document.getElementById("dPrev"); if (!el) return;
    var m = parseNum(document.getElementById("dM").value), pctEl = document.getElementById("dPct"); if (pctEl) depForm.pct = parseNum(pctEl.value);
    var s = shares(depForm.regle, m, depForm.pct, depForm.payeur, String(new Date().getFullYear())), tot = Math.abs(s.YC) + Math.abs(s.OC) || 1;
    el.innerHTML = '<div class="split"><i class="yc" style="width:' + (Math.abs(s.YC) / tot * 100) + '%"></i><i class="oc" style="width:' + (Math.abs(s.OC) / tot * 100) + '%"></i></div><div class="legend" style="margin-top:6px"><span>' + famDot("YC") + 'Yann <b class="num">' + eur.format(s.YC) + "</b></span><span>" + famDot("OC") + 'Olivier <b class="num">' + eur.format(s.OC) + "</b></span></div>";
  }

  /* ---------- Export Excel (module SheetJS chargé à la demande) ---------- */
  function loadXlsx() {
    return new Promise(function (ok, ko) {
      if (window.XLSX) return ok();
      var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = function () { ok(); }; s.onerror = function () { ko(new Error("Module Excel introuvable : vérifiez le réseau.")); };
      document.head.appendChild(s);
    });
  }
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function exportExcel() {
    toast("Préparation du fichier Excel…");
    loadXlsx().then(function () {
      var wb = XLSX.utils.book_new(), B = balance(), agg = {}, years = {};
      depenses.forEach(function (d) {
        if (d.cat === REGL) return;
        var y = yearOf(d) || "?", s = sharesOf(d), k = y + "|" + d.cat; years[y] = 1;
        if (!agg[k]) agg[k] = [y, d.cat, 0, 0, 0]; agg[k][2] += Number(d.m) || 0; agg[k][3] += s.YC; agg[k][4] += s.OC;
      });
      var syn = [["Carnet " + SPEC.devise + " · synthèse des dépenses", "", "", "", ""], ["Exporté le " + todayFr() + " · version " + APP_VERSION, "", "", "", ""], [],
        ["Année", "Catégorie", "Total (€)", "Part Yann (€)", "Part Olivier (€)"]];
      Object.keys(years).sort().forEach(function (y) {
        var t = [0, 0, 0];
        Object.keys(agg).filter(function (k) { return k.indexOf(y + "|") === 0; }).sort().forEach(function (k) { var a = agg[k]; syn.push([a[0], a[1], r2(a[2]), r2(a[3]), r2(a[4])]); t[0] += a[2]; t[1] += a[3]; t[2] += a[4]; });
        syn.push([y, "Total " + y, r2(t[0]), r2(t[1]), r2(t[2])]); syn.push([]);
      });
      syn.push(["Toutes années", "Total", r2(B.tot.total), r2(B.tot.YC), r2(B.tot.OC)], [],
        ["Balance", "", "Famille Yann (€)", "Famille Olivier (€)", ""],
        ["", "Payé", r2(B.paid.YC), r2(B.paid.OC), ""], ["", "Part due", r2(B.due.YC), r2(B.due.OC), ""],
        ["", "Solde (dettes de bidons comprises)", r2(B.net.YC), r2(B.net.OC), ""], ["", balanceText(B), "", "", ""], [],
        ["Temps moteur par année", "", "Total (min)", "Famille Yann (min)", "Famille Olivier (min)"]);
      Object.keys(YEARS).sort().forEach(function (y) { var Y = YEARS[y]; if (Y.min) syn.push([y, "", Y.min, Math.round(Y.fam.YC), Math.round(Y.fam.OC)]); });
      var ws = XLSX.utils.aoa_to_sheet(syn); ws["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
      var dep = [["Date", "Libellé", "Catégorie", "Payé par", "Partage", "Total (€)", "Part Yann (€)", "Part Olivier (€)"]].concat(depenses.slice().sort(function (a, b) { return dkey(a) < dkey(b) ? -1 : 1; }).map(function (d) {
        var s = sharesOf(d); return [d.d || isoToFr(d.date), d.lib, d.cat, FAM[d.payeur] ? FAM[d.payeur].s : "", s.YC && s.OC ? "Y+O" : s.YC ? "Y" : "O", r2(d.m), r2(s.YC), r2(s.OC)];
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dep), "Dépenses");
      var ses = [["Date", "Type", "Bateau", "Minutes moteur", "Famille Yann (min)", "Famille Olivier (min)", "Compteur début", "Compteur fin", "Pilote"]].concat(sessionsArr.map(function (s) {
        return [isoToFr(dkey(s)), s.mode || "", s.bateau || "", r2(s.engineMin), r2(s.famMin && s.famMin.YC), r2(s.famMin && s.famMin.OC), s.compteurDeb == null ? "" : s.compteurDeb, s.compteurFin == null ? "" : s.compteurFin, s.pilote && person(s.pilote) ? person(s.pilote).name : ""];
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ses), "Sessions");
      var bd = [["Payé par", "Litres", "Prix au litre (€)", "Valeur (€)", "Date"]].concat(bidons.map(function (b) { return [FAM[b.f] ? FAM[b.f].s : "", r2(b.litres), r2(b.prix), r2(b.litres * b.prix), b.date || b.d || ""]; }));
      bd.push([]); bd.push(["Dettes de bidons"]); dettes.forEach(function (x) { bd.push([FAM[x.from].s + " doit à " + FAM[x.to].s, "", "", r2(x.eur), x.d || "", x.note || ""]); });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bd), "Bidons");
      var mv = [["Date", "Mouvement", "Détail", "Qui"]].concat(moves.map(function (m) { return [m.d || isoToFr(m.date), m.t, m.v, m.who]; }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mv), "Mouvements essence");
      XLSX.writeFile(wb, "carnet-" + String(SPEC.devise || "bateau").toLowerCase() + "-" + todayIso() + ".xlsx");
      toast("Fichier Excel téléchargé.");
    }).catch(function (e) { toast(e.message); });
  }
  /* ---------- Import de l'historique (fichier produit par outils/Export-Historique.ps1) ---------- */
  /* ---------- Sauvegarde, effacement et restauration ---------- */
  function backupData() {
    var out = { format: "carnet-noskids-sauvegarde", version: APP_VERSION, date: nowIso(), par: CONF.moi || "" };
    COLS.forEach(function (c) { out[c] = vals(c); });
    return out;
  }
  function downloadBackup() {
    var blob = new Blob([JSON.stringify(backupData(), null, 1)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "carnet-noskids-sauvegarde-" + todayIso() + "-" + new Date().toTimeString().slice(0, 5).replace(":", "h") + ".json";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("Sauvegarde téléchargée sur cet appareil.");
  }
  var PURGES = {
    depenses: { label: "Les dépenses", done: "Dépenses effacées.", cols: ["depenses"] },
    historique: { label: "Sessions, essence et dépenses", done: "Historique effacé (sessions, essence, dépenses).", cols: ["sessions", "mouvements", "bidons", "dettes", "depenses"] }
  };
  function purgeHtml() {
    var P = view.purge, def = PURGES[P.scope];
    var n = def.cols.reduce(function (a, c) { return a + vals(c).length; }, 0);
    return '<div class="card"><h3>Effacer des données</h3>' +
      '<div class="field"><span class="flabel">Que faut-il effacer ?</span>' + segHtml("", "data-pscope", [["depenses", "Les dépenses"], ["historique", "Tout l’historique"]], P.scope) + "</div>" +
      '<div class="alert bad"><b>' + esc(def.label) + " : " + n + " lignes seront effacées, sur tous les téléphones.</b>" +
      "Avant d’effacer, l’app télécharge une sauvegarde sur cet appareil" + (CONF.url ? " et fait une copie du Google Sheet dans votre Drive (dossier « Carnet Noskids – sauvegardes »)" : "") + ". Pour revenir en arrière, il suffit d’importer le fichier de sauvegarde.</div>" +
      '<div class="field"><label for="purgeWord">Tapez EFFACER pour confirmer</label><input id="purgeWord" autocomplete="off" autocapitalize="characters"></div>' +
      '<div class="actions"><button class="btn ghost" id="purgeCancel">Annuler</button><button class="btn stop" id="purgeGo">Sauvegarder puis effacer</button></div></div>';
  }
  function doPurge() {
    var w = (document.getElementById("purgeWord").value || "").trim().toUpperCase();
    if (w !== "EFFACER") return toast("Tapez EFFACER pour confirmer.");
    var def = PURGES[view.purge.scope];
    downloadBackup();
    var serverCopy = CONF.url && CONF.code && navigator.onLine ? Sync.call({ action: "backup" }).then(function (res) { if (!res.ok) throw new Error(res.error); return res.url; }) : Promise.resolve(null);
    serverCopy.then(function (url) {
      def.cols.forEach(function (c) {
        if (c === "sessions") sessionsArr = []; if (c === "mouvements") moves = []; if (c === "bidons") bidons = [];
        if (c === "dettes") dettes = []; if (c === "depenses") depenses = [];
      });
      if (view.purge.scope === "historique") ETAT.importHistorique = "";
      view.purge = null;
      toast(def.done + (url ? " Copie du Google Sheet faite dans Drive." : ""));
      render();
    }).catch(function (e) { toast("Rien n’a été effacé : la copie sur le serveur a échoué (" + e.message + ")."); });
  }
  function importHistorique(json) {
    if (json && json.format === "carnet-noskids-sauvegarde") {
      var nb = 0;
      COLS.forEach(function (c) { (json[c] || []).forEach(function (r) { if (!r || !r.id) return; var copy = JSON.parse(JSON.stringify(r)); delete copy.updatedAt; delete copy.serverAt; upsertLocal(c, copy); nb++; }); });
      dbSave(); loadArrays(); Sync.soon();
      return nb;
    }
    if (!json || json.format !== "carnet-noskids-import") throw new Error("Ce fichier n’est ni un import ni une sauvegarde du Carnet.");
    if (Array.isArray(json.annuaire)) { // annuaire urgence : remplace la liste des contacts du lac
      SPEC.annuaire = json.annuaire.map(function (c) { return { id: c.id || uid(), g: c.g || "", n: c.n || "", r: c.r || "", t: c.t || "" }; });
      if (!json.sessions && !json.mouvements && !json.depenses) return SPEC.annuaire.length;
    }
    var n = 0;
    [["sessions", "sessions"], ["mouvements", "mouvements"], ["depenses", "depenses"]].forEach(function (p) {
      (json[p[0]] || []).forEach(function (r) { if (!r.id) return; var copy = JSON.parse(JSON.stringify(r)); upsertLocal(p[1], copy); n++; });
    });
    ETAT.importHistorique = todayFr();
    var ann = SPEC.annuaire;
    dbSave(); loadArrays(); Sync.soon();
    if (Array.isArray(json.annuaire)) SPEC.annuaire = ann;
    return n;
  }

  /* ---------- Bilan ---------- */
  function usureMin() { return SPEC.valMoteur / Math.max(1, (SPEC.hVie - SPEC.hAchat) * 60); }
  function amortAn() { return SPEC.prix / Math.max(1, SPEC.ans); }
  function yearData(y) {
    if (y === "Toutes") {
      var ks = Object.keys(YEARS).filter(function (k) { return YEARS[k].min > 0; }); if (!ks.length) return null;
      var o2 = { min: 0, fam: { YC: 0, OC: 0 }, fixes: 0, essence: 0, litres: 0, years: ks.length, lnote: "achetés de " + ks[0] + " à " + ks[ks.length - 1], fx: { assurance: 0, adhesions: 0, taxes: 0 }, commun: 0, meca: 0, people: [] };
      ks.forEach(function (k) { var a = YEARS[k]; o2.min += a.min; o2.fam.YC += a.fam.YC; o2.fam.OC += a.fam.OC; o2.fixes += a.fixes; o2.essence += a.essence; o2.litres += a.litres; o2.fx.assurance += a.fx.assurance; o2.fx.adhesions += a.fx.adhesions; o2.fx.taxes += a.fx.taxes; o2.commun += a.commun; o2.meca += a.meca; o2.people = mergePeople(o2.people, a.people); });
      return o2;
    }
    var d = YEARS[y]; if (!d || !d.min) return null; var o = {}; for (var k in d) o[k] = d[k]; o.years = 1; return o;
  }
  function mergePeople(a, b) { var m = {}; a.concat(b).forEach(function (p) { if (!m[p[0]]) m[p[0]] = [p[0], p[1], 0, 0]; m[p[0]][2] += p[2]; m[p[0]][3] += p[3]; }); return Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return y[2] - x[2]; }); }
  function renderBilan() {
    var cy = String(new Date().getFullYear()), yrs = Object.keys(YEARS).filter(function (k) { return k; });
    if (yrs.indexOf(cy) < 0) yrs.push(cy); yrs.sort(); yrs.push("Toutes");
    if (!bilanYearUser || !bilanYear) bilanYear = latestYear() || cy; // suit les données tant que personne n'a choisi d'année
    var h = '<div class="card"><div class="label">Année</div><div class="chips">' + yrs.map(function (y) { return '<button class="chip" data-year="' + y + '" aria-pressed="' + (y === bilanYear) + '">' + y + "</button>"; }).join("") + "</div></div>";
    var D = yearData(bilanYear);
    if (!D) return h + '<div class="alert"><b>Aucune session enregistrée pour ' + esc(bilanYear) + ".</b>Les ratios apparaîtront dès les premières sessions. L’historique 2024-2025 s’importe depuis l’onglet Bateau.</div>";
    var fixM = D.fixes / D.min, essM = D.essence / D.min, usM = usureMin(), amM = amortAn() * D.years / D.min, total = fixM + essM + usM + amM, lh = D.litres / (D.min / 60);
    h += '<div class="card">' + collHead("indic", "Indicateurs financiers", dec2.format(total) + " € par minute moteur · " + dec1.format(D.min / 60) + " h moteur") + (!ui.indic ? "" : '<div class="kpis kpis-in"><div class="kpi hero"><span class="label">Coût complet par minute moteur</span><span class="v">' + dec2.format(total) + ' €</span><span class="s">soit ' + eur0.format(total * 60) + " de l’heure · invités facturés " + SPEC.tarif + " €/min</span></div>" +
      '<div class="kpi"><span class="label">Temps moteur</span><span class="v">' + dec1.format(D.min / 60) + ' h</span><span class="s">' + int0.format(D.min) + " min</span></div>" +
      '<div class="kpi"><span class="label">Litres achetés</span><span class="v">' + int0.format(D.litres) + ' L</span><span class="s">' + esc(D.lnote) + "</span></div>" +
      '<div class="kpi"><span class="label">Consommation constatée</span><span class="v">' + dec1.format(lh) + ' L/h</span><span class="s">référence ' + SPEC.conso + " L/h (nouveau bateau)</span></div>" +
      '<div class="kpi"><span class="label">Coût variable</span><span class="v">' + dec2.format(essM) + ' €</span><span class="s">essence par minute moteur</span></div></div>') + "</div>";
    h += '<div class="card">' + collHead("coutDet", "Détail du coût par minute moteur", "coûts fixes, essence, usure, amortissement") + (!ui.coutDet ? "" : '<table class="rtable"><thead><tr><th>Poste</th><th>Montant</th><th>€/min</th></tr></thead><tbody>' +
      "<tr><td>Coûts fixes<span class=\"sub\">assurance " + eur0.format(D.fx.assurance) + ", adhésions " + eur0.format(D.fx.adhesions) + ", taxes et corps mort " + eur0.format(D.fx.taxes) + "</span></td><td>" + eur0.format(D.fixes) + "</td><td>" + dec2.format(fixM) + "</td></tr>" +
      "<tr><td>Essence (variable)</td><td>" + eur0.format(D.essence) + "</td><td>" + dec2.format(essM) + "</td></tr>" +
      "<tr><td>Usure moteur<span class=\"sub\">" + eur0.format(SPEC.valMoteur) + " sur " + int0.format(SPEC.hVie - SPEC.hAchat) + " h restantes (" + int0.format(SPEC.hAchat) + " → " + int0.format(SPEC.hVie) + " h)</span></td><td>" + eur0.format(usM * D.min) + "</td><td>" + dec2.format(usM) + "</td></tr>" +
      "<tr><td>Amortissement bateau<span class=\"sub\">" + eur0.format(SPEC.prix) + " sur " + SPEC.ans + " ans = " + eur0.format(amortAn()) + " par an</span></td><td>" + eur0.format(amortAn() * D.years) + "</td><td>" + dec2.format(amM) + "</td></tr>" +
      '<tr class="tot"><td>Coût complet</td><td>' + eur0.format(total * D.min) + "</td><td>" + dec2.format(total) + "</td></tr></tbody></table>" +
      '<div class="small muted">Usure et amortissement utilisent la fiche technique du nouveau bateau (onglet Bateau), appliquée ici à l’historique pour illustrer.</div>') + "</div>";
    if (bilanYear !== "Toutes") h += chartHtml(D, fixM, essM, usM);
    else h += '<div class="small muted">Choisissez une année pour voir l’évolution du coût au fil de la saison.</div>';
    var t = D.fam.YC + D.fam.OC;
    h += '<div class="card"><h3>Temps moteur par famille</h3><div class="split"><i class="yc" style="width:' + (D.fam.YC / t * 100) + '%"></i><i class="oc" style="width:' + (D.fam.OC / t * 100) + '%"></i></div>' +
      '<div class="legend"><span>' + famDot("YC") + 'Famille Yann <b class="num">' + int0.format(D.fam.YC) + " min · " + Math.round(D.fam.YC / t * 100) + " %</b></span><span>" + famDot("OC") + 'Famille Olivier <b class="num">' + int0.format(D.fam.OC) + " min · " + Math.round(D.fam.OC / t * 100) + " %</b></span></div>" +
      '<div class="small muted">Invités compris dans leur famille ; temps commun et mécanique partagés.</div></div>';
    var ppl = D.people;
    if (ppl.length) {
      var w = ppl.filter(function (p) { return p[0] === bilanWho; })[0] || ppl[0]; bilanWho = w[0];
      var max = Math.max(ppl[0][2], D.commun || 0, D.meca || 0, 1);
      h += '<div class="card">' + collHead("perso", "Temps et sessions par personne", ppl.length + " personne" + (ppl.length > 1 ? "s" : "") + " · " + esc(bilanYear));
      if (ui.perso) {
        h += '<div class="field" style="margin-top:12px"><label for="bWho">Personne</label><select id="bWho">' + ppl.map(function (p) { return "<option" + (p[0] === bilanWho ? " selected" : "") + ">" + esc(p[0]) + "</option>"; }).join("") + "</select></div>" +
          '<div class="kpis"><div class="kpi"><span class="label">Temps de ski</span><span class="v">' + Math.round(w[2]) + ' min</span><span class="s">' + bilanYear + '</span></div><div class="kpi"><span class="label">Sessions</span><span class="v">' + w[3] + '</span><span class="s">≈ ' + Math.round(w[2] / Math.max(1, w[3])) + " min par session</span></div></div>" +
          '<div style="display:grid;gap:7px">';
        ppl.forEach(function (p) { h += '<div class="bar-row"><span>' + esc(p[0]) + '</span><div class="track"><div class="fill ' + p[1] + '" style="width:' + (p[2] / max * 100) + '%"></div></div><span class="n">' + Math.round(p[2]) + "</span></div>"; });
        if (D.commun) h += '<div class="bar-row"><span>Commun</span><div class="track"><div class="fill X" style="width:' + (D.commun / max * 100) + '%"></div></div><span class="n">' + Math.round(D.commun) + "</span></div>";
        if (D.meca) h += '<div class="bar-row"><span>Mécanique</span><div class="track"><div class="fill X" style="width:' + (D.meca / max * 100) + '%"></div></div><span class="n">' + Math.round(D.meca) + "</span></div>";
        h += '</div><div class="small muted">En minutes de tours (temps commun et mécanique à part).</div>';
      }
      h += "</div>";
    }
    return h + sessionListHtml(bilanYear);
  }
  /* Liste des sessions d'une année (ou de toutes), une carte repliable par année */
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function sessionWho(s) {
    var f = s.famMin || {}, y = Number(f.YC) > 0, o = Number(f.OC) > 0;
    return y && o ? famDot("YC") + famDot("OC") + "Yann et Olivier" : y ? famDot("YC") + "Yann" : o ? famDot("OC") + "Olivier" : '<span class="muted">—</span>';
  }
  /* Détail d'une session (touchée dans la liste) : compteur, jauge, pilote, personnes à bord, photo du compteur */
  function sessionDetailHtml(s) {
    var ppl = (s.participants || []).map(function (p) { var q = person(p.pid); return q ? q.name : p.pid; });
    if (!ppl.length) ppl = Object.keys(s.minutes || {}).map(function (pid) { var q = person(pid); return q ? q.name : pid; });
    var pil = s.pilote && person(s.pilote) ? person(s.pilote).name : "";
    var h = '<div class="ses-info">' +
      (hasNum(s.compteurDeb) ? "<span>Compteur <b>" + dec1.format(Number(s.compteurDeb)) + " → " + (hasNum(s.compteurFin) ? dec1.format(Number(s.compteurFin)) : "?") + " h</b></span>" : "") +
      (s.jaugeDeb != null ? "<span>Jauge <b>" + fracLabel(s.jaugeDeb) + " → " + fracLabel(s.jaugeFin) + "</b></span>" : "") +
      (pil ? "<span>Pilote <b>" + esc(pil) + "</b></span>" : "") +
      (ppl.length ? "<span>À bord <b>" + esc(ppl.join(", ")) + "</b></span>" : "") +
      (s.bateau ? '<span class="muted">' + esc(s.bateau) + "</span>" : "") + "</div>";
    return h + (photoSrc(s.photoCompteur) ? '<img class="cpt-photo" src="' + photoSrc(s.photoCompteur) + '" alt="Photo du compteur de la session">' : '<div class="small muted">Pas de photo du compteur pour cette session.</div>');
  }
  function sessionListHtml(sel) {
    var by = {};
    sessionsArr.forEach(function (s) { var y = yearOf(s); if (y) (by[y] = by[y] || []).push(s); });
    var yrs = sel === "Toutes" ? Object.keys(by).sort().reverse() : (by[sel] ? [sel] : []);
    var gapBefore = {}; findGaps().forEach(function (g) { gapBefore[g.to.id] = g; });
    return yrs.map(function (y) {
      var list = by[y].slice().sort(function (a, b) { return dkey(a) < dkey(b) ? -1 : 1; }), key = "ses" + y;
      var tot = list.reduce(function (t, s) { return t + (Number(s.engineMin) || 0); }, 0);
      var nGaps = list.filter(function (s) { return gapBefore[s.id]; }).length;
      var h = '<div class="card">' + collHead(key, "Sessions " + y, list.length + " session" + (list.length > 1 ? "s" : "") + " · " + hm(tot) + " de moteur" + (nGaps ? " · " + nGaps + " trou" + (nGaps > 1 ? "s" : "") + " de compteur" : ""));
      if (ui[key]) {
        h += '<table class="rtable ses-list" style="margin-top:10px"><thead><tr><th>N°</th><th>Mois</th><th>Qui</th><th>Temps</th></tr></thead><tbody>';
        list.slice().reverse().forEach(function (s, i) {
          var d = dkey(s), m = Number(d.slice(5, 7));
          var op = ui.sesOpen === s.id;
          h += '<tr data-ses="' + esc(s.id) + '" class="ses-click' + (op ? " open" : "") + '"><td>' + (list.length - i) + "</td><td>" + (m ? MOIS[m - 1] : "—") + '<span class="sub">' + isoToFr(d).slice(0, 5) + (s.mode === "rattrapage" ? " · rattrapage" : "") + "</span></td><td>" + sessionWho(s) + "</td><td>" + hm(s.engineMin) + "</td></tr>";
          if (op) h += '<tr class="ses-det"><td colspan="4">' + sessionDetailHtml(s) + "</td></tr>";
          var g = gapBefore[s.id];
          if (g) h += '<tr class="ses-gap"><td>⚠</td><td colspan="2">Trou de compteur<span class="sub">fin ' + dec1.format(sessionEnd(g.from)) + " h le " + isoToFr(dkey(g.from)).slice(0, 5) + " → début " + dec1.format(Number(g.to.compteurDeb)) + " h</span></td><td>" + hm(g.h * 60) + "</td></tr>";
        });
        h += "</tbody></table>";
      }
      return h + "</div>";
    }).join("");
  }
  var chartPts = [];
  function chartHtml(D, fixM, essM, usM) {
    var W = 340, H = 190, L = 34, R = 14, T = 14, B = 30, YMAX = 5, fixedYear = D.fixes + amortAn(), vari = essM + usM;
    var xmax = Math.ceil(D.min / 500) * 500, sx = function (v) { return L + v / xmax * (W - L - R); }, sy = function (v) { return T + (1 - Math.min(v, YMAX) / YMAX) * (H - T - B); };
    chartPts = D.curve.map(function (p) { var y = fixedYear / p[0] + vari; return { x: sx(p[0]), y: sy(y), v: y, cum: p[0], d: p[1], clip: y > YMAX }; });
    var s = '<div class="card"><h3>Coût complet par minute, au fil de la saison</h3><div class="small muted">Les coûts fixes et l’amortissement de l’année sont répartis sur les minutes déjà faites : très lourds au début, de plus en plus légers.</div><div class="chart" id="chartWrap"><svg viewBox="0 0 ' + W + " " + H + '" data-chart="1" role="img" aria-label="Coût complet par minute moteur selon les minutes cumulées">';
    for (var g = 0; g <= YMAX; g++) s += '<line class="c-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + sy(g) + '" y2="' + sy(g) + '"/><text class="c-axis" x="' + (L - 6) + '" y="' + (sy(g) + 3.5) + '" text-anchor="end">' + g + " €</text>";
    for (var xv = 0; xv <= xmax; xv += 500) s += '<text class="c-axis" x="' + sx(xv) + '" y="' + (H - 12) + '" text-anchor="middle">' + int0.format(xv) + "</text>";
    s += '<text class="c-axis" x="' + (W - R) + '" y="' + (H - 1) + '" text-anchor="end">minutes moteur cumulées</text>';
    s += '<path class="c-line" d="' + chartPts.map(function (p, i) { return (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" ") + '"/>';
    chartPts.forEach(function (p) { s += '<circle class="c-pt' + (p.clip ? " clip" : "") + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4"/>'; });
    var first = chartPts.filter(function (p) { return p.clip; })[0], last = chartPts[chartPts.length - 1];
    if (first) s += '<text class="c-end" x="' + (first.x + 8) + '" y="' + (first.y + 4) + '">' + dec1.format(first.v) + " €/min le " + first.d + " ↑</text>";
    s += '<text class="c-end" x="' + (last.x - 4) + '" y="' + (last.y - 10) + '" text-anchor="end">' + dec2.format(last.v) + " €/min</text>";
    s += '<line class="c-cross" id="cCross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" visibility="hidden"/><rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent" data-hit="1"/></svg><div class="c-tip" id="cTip" hidden></div></div>';
    s += '<details class="vals"><summary>Voir les valeurs</summary><table class="rtable"><thead><tr><th>Date</th><th>Minutes</th><th>€/min</th></tr></thead><tbody>' + chartPts.map(function (p) { return "<tr><td>" + p.d + "</td><td>" + int0.format(p.cum) + "</td><td>" + dec2.format(p.v) + "</td></tr>"; }).join("") + "</tbody></table></details></div>";
    return s;
  }

  /* ---------- Bateau ---------- */
  var SPEC_FIELDS = [["devise", "Nom du bateau", "txt"], ["ancienNom", "Nom sur le titre de navigation", "txt"], ["modele", "Modèle", "txt"], ["hin", "Numéro de coque (HIN)", "txt"], ["immat", "N° d’inscription", "txt"], ["moteur", "Moteur", "txt"], ["nMoteur", "N° moteur", "txt"], ["dims", "Dimensions", "txt"], ["categorie", "Catégorie de conception", "txt"], ["equip", "Équipement", "txt"], ["achat", "Achat", "txt"], ["gardiennage", "Gardiennage", "txt"], ["annee", "Année de construction"], ["reservoir", "Réservoir (L)"], ["conso", "Consommation moyenne (L/h)"], ["hAchat", "Compteur à l’achat (h)"], ["hVie", "Durée de vie moteur (h)"], ["valMoteur", "Valeur pour l’usure moteur (€)"], ["prix", "Prix pour l’amortissement (€)"], ["ans", "Durée d’amortissement (ans)"], ["bidon", "Contenance d’un bidon (L)"], ["tarif", "Tarif invités (€/min)"]];
  function collHead(key, title, sub) { return '<button class="coll" data-coll="' + key + '" aria-expanded="' + ui[key] + '"><span class="ct"><span class="ctitle">' + title + '</span><span class="small muted">' + sub + '</span></span><span class="chev" aria-hidden="true">' + (ui[key] ? "−" : "+") + "</span></button>"; }
  function intTxt(e) { var a = []; if (e[1]) a.push(e[1] + " h"); if (e[2]) a.push(e[2] === 1 ? "1 an" : e[2] + " ans"); return (a.length ? "Tous les " + a.join(" ou ") : "") + (e[3] ? (a.length ? " · " : "") + e[3] : ""); }
  function maintStatus(i) {
    var e = ENTR[i], m = maint[i], cur = lastCompteur(), now = new Date(), parts = [], late = false, soon = false;
    if (!m.date && !m.h) return ["à renseigner", "", ""];
    if (e[1] && m.h) { var nh = parseNum(m.h) + e[1], rest = nh - cur; parts.push(int0.format(nh) + " h"); if (rest < 0) late = true; else if (rest < 10) soon = true; }
    if (e[2] && m.date) { var d = new Date(m.date); d.setFullYear(d.getFullYear() + e[2]); var days = (d - now) / 86400000; parts.push(d.toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })); if (days < 0) late = true; else if (days < 60) soon = true; }
    return late ? ["à faire", "late", parts.join(" ou ")] : soon ? ["bientôt", "soon", parts.join(" ou ")] : ["OK", "okp", parts.join(" ou ")];
  }
  /* ---------- Documents : envoi groupé avec catégorie, année et personne devinées ---------- */
  function sizeTxt(n) { return n > 1048576 ? dec1.format(n / 1048576) + " Mo" : Math.max(1, Math.round(n / 1024)) + " ko"; }
  function guessDoc(name, lastMod) {
    var s = name.toLowerCase(), cat = "Autres", pid = "";
    PEOPLE.forEach(function (p) { if (!p.hidden && s.indexOf(p.name.toLowerCase()) >= 0) pid = p.id; });
    if (/permis|code ?c[oô]tier|code ?bateau|codecotier|codebateau|cerfa_?14682/.test(s)) cat = "Permis bateau";
    else if (/afps|psc|secouris|dipl[oô]me|initiateur|monitorat|cqp|bpjeps|formation/.test(s)) cat = "Diplômes et formations";
    else if (/carte grise|titre de nav|immatric|navigation int/.test(s)) cat = "Titre de navigation / carte grise";
    else if (/factur|bon de commande|devis/.test(s)) cat = "Factures";
    else if (/assurance/.test(s)) cat = "Assurance";
    else if (/r[eè]glement/.test(s)) cat = "Réglementation";
    else if (/adh[eé]sion|licence|cotisation/.test(s)) cat = "Adhésions et licences";
    else if (/corps mort|taxe|droit de nav/.test(s)) cat = "Taxe / corps mort lac";
    else if (/notice|manuel|fiche technique|configuration/.test(s)) cat = "Notice et fiche technique";
    else if (/\.(jpe?g|png|heic|webp)$/.test(s) || /^img|photo/.test(s)) cat = "Photos du bateau";
    var m = s.match(/(19[89]\d|20[0-4]\d)/), y = m ? m[1] : String(new Date(lastMod || Date.now()).getFullYear());
    if (cat !== "Permis bateau" && cat !== "Diplômes et formations") pid = ""; // factures, titres… : pas rattachés à une personne
    return { cat: cat, y: y, pid: pid };
  }
  function pendingHtml() {
    if (!docPending.length) return "";
    var opts = function (cur) { return DOC_CATS.map(function (c) { return "<option" + (c === cur ? " selected" : "") + ">" + esc(c) + "</option>"; }).join(""); };
    var ppl = function (cur) { return '<option value="">—</option>' + PEOPLE.filter(function (p) { return !p.hidden; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === cur ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join(""); };
    var h = '<div class="picker"><b class="small">À vérifier avant l’envoi (' + docPending.length + ")</b>";
    docPending.forEach(function (it, i) {
      h += '<div class="pend"><div class="row"><span class="small" style="overflow-wrap:anywhere"><b>' + esc(it.file.name) + "</b> · " + sizeTxt(it.file.size) + '</span><button class="x" data-pdel="' + i + '" aria-label="Retirer ce fichier">×</button></div>' +
        '<div class="pend-f"><select data-pi="' + i + '" data-pk="cat" aria-label="Catégorie">' + opts(it.cat) + '</select><input data-pi="' + i + '" data-pk="y" value="' + esc(it.y) + '" inputmode="numeric" aria-label="Année"><select data-pi="' + i + '" data-pk="pid" aria-label="Personne">' + ppl(it.pid) + "</select></div></div>";
    });
    return h + '<div class="actions"><button class="btn ghost sm" id="pendCancel">Annuler</button><button class="btn sm" id="pendSend">' + (CONF.url && CONF.code ? "Envoyer " + docPending.length + " document(s) dans Drive" : "Noter " + docPending.length + " document(s)") + "</button></div></div>";
  }
  function readB64(file) { return new Promise(function (ok, ko) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1]); }; fr.onerror = function () { ko(new Error("lecture impossible")); }; fr.readAsDataURL(file); }); }
  /* Envoie les fichiers un par un dans Drive et crée la fiche de chaque document. */
  function addDocs(items) {
    var connected = CONF.url && CONF.code && navigator.onLine, ok = 0, ko = 0;
    var recs = items.map(function (it) { var r = { id: uid(), n: it.file.name, y: String(it.y || ""), pid: it.pid || "", s: sizeTxt(it.file.size) + " · " + todayFr() }; (docs[it.cat] || docs["Autres"]).unshift(r); return { rec: r, it: it }; });
    render();
    if (!connected) { toast(recs.length + " document(s) noté(s). Les fichiers pourront être envoyés une fois l’app connectée."); return; }
    recs.reduce(function (p, x, i) {
      return p.then(function () {
        if (x.it.file.size > 15 * 1048576) { ko++; return; }
        toast("Envoi " + (i + 1) + "/" + recs.length + " : " + x.it.file.name);
        return readB64(x.it.file)
          .then(function (b64) { return Sync.call({ action: "upload", name: x.it.file.name, mime: x.it.file.type || "application/octet-stream", data: b64, cat: x.it.cat, y: x.rec.y }); })
          .then(function (res) { if (!res.ok) throw new Error(res.error); x.rec.url = res.url; ok++; render(); })
          .catch(function () { ko++; });
      });
    }, Promise.resolve()).then(function () { toast(ok + " document(s) rangé(s) dans Google Drive" + (ko ? ", " + ko + " en échec (trop lourd ou réseau)." : ".")); render(); });
  }
  /* Connexion à la base partagée, import, export, version */
  function connHtml() {
    var s = netState(), conf = !!(CONF.url && CONF.code);
    var sub = conf ? (s === "ok" ? "Connecté" + (CONF.lastSync ? " · synchro " + new Date(CONF.lastSync).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "") : s === "send" ? "Envoi en cours…" : "Hors ligne" + (Sync.lastError ? " · " + Sync.lastError : "")) : "Non connecté : les données restent sur ce téléphone";
    var h = '<div class="card">' + collHead("conn", "Connexion et partage", esc(sub));
    if (!conf) ui.conn = true;
    if (ui.conn) {
      h += '<div class="field"><label for="cfUrl">Adresse du serveur (Apps Script)</label><input id="cfUrl" value="' + esc(CONF.url) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></div>' +
        '<div class="field"><label for="cfCode">Code famille</label><input id="cfCode" type="password" value="' + esc(CONF.code) + '" autocomplete="off"></div>' +
        '<div class="field"><label for="cfMoi">Je suis</label><select id="cfMoi"><option value="">—</option>' + PEOPLE.filter(function (p) { return p.c !== "EXT"; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === CONF.moi ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
        '<div class="actions"><button class="btn" id="cfSave">Enregistrer et synchroniser</button>' + (conf ? '<button class="btn ghost" id="cfSync">Synchroniser</button>' : "") + "</div>" +
        '<div class="small muted">L’adresse et le code vous sont donnés par Yann. Ils restent sur ce téléphone.</div>';
      h += '<div class="field"><label for="impFile">Importer un historique ou restaurer une sauvegarde (fichier .json)</label><input id="impFile" class="file-in" type="file" accept=".json,application/json"></div>' +
        '<div class="small muted">' + (ETAT.importHistorique ? "Historique importé le " + esc(ETAT.importHistorique) + ". Un nouvel import remplace les mêmes lignes, sans doublon." : "Historique 2023-2025 : fichier historique.json. Restauration : fichier carnet-noskids-sauvegarde-….json.") + "</div>" +
        '<div class="actions"><button class="btn ghost sm" id="bkDownload">Télécharger une sauvegarde</button><button class="btn ghost sm" id="purgeOpen" style="color:var(--bad)">Effacer des données…</button></div>';
      if (view.purge) h += purgeHtml();
    }
    h += '<div class="actions"><button class="btn ghost sm" id="xlsExport">Exporter en Excel</button><button class="btn ghost sm" id="updCheck">Rechercher une mise à jour</button></div>' +
      '<div class="small muted">Carnet ' + esc(SPEC.devise) + " · version " + APP_VERSION + " · " + sessionsArr.length + " sessions · " + depenses.length + " dépenses" + (QUEUE.length ? " · " + QUEUE.length + " en attente d’envoi" : "") + "</div>";
    return h + "</div>";
  }
  function renderBateau() {
    var h = '<div class="card boat-hero img-boat" role="img" aria-label="Photo du bateau"><div class="cap"><b>' + esc(SPEC.devise) + "</b>" + esc(SPEC.modele) + " " + SPEC.annee + " · " + esc(SPEC.moteur.split(",")[0]) + "</div></div>";
    var pils = PEOPLE.filter(function (p) { return !p.hidden; }), graded = pils.filter(function (p) { return p.grade; }).length;
    h += '<div class="boat-links' + (RELIEF ? " relief" : "") + '"><button class="card link-card pilot-banner" data-go="pilotes"><span class="pb-ic" aria-hidden="true">' + WHEEL_ICON + '</span><span><b>Pilotes</b><span class="small">' + pils.length + " personnes · " + graded + " grade" + (graded > 1 ? "s" : "") + "</span></span>" + '<span class="chev" aria-hidden="true">›</span></button>';
    var nAnn = (SPEC.annuaire || []).length;
    h += '<button class="card link-card urg-banner" data-go="annuaire"><span class="pb-ic urg-ic" aria-hidden="true">' + URG_ICON + '</span><span><b>Urgence - Dépannage</b><span class="small">' + (nAnn ? nAnn + " contacts · " : "") + "appel direct</span></span>" + '<span class="chev" aria-hidden="true">›</span></button></div>';
    h += connHtml();
    h += '<div class="card">' + collHead("spec", "Fiche technique", esc(SPEC.devise) + " · " + esc(SPEC.modele) + " " + SPEC.annee + " · " + SPEC.reservoir + " L · " + dec1.format(SPEC.conso) + " L/h");
    if (ui.spec) {
      h += '<div class="spec">';
      SPEC_FIELDS.forEach(function (f) { var full = f[2] ? " full" : ""; h += '<label class="' + full + '" for="sp_' + f[0] + '">' + f[1] + '</label><input id="sp_' + f[0] + '" data-spec="' + f[0] + '" class="' + (f[2] || "") + full + '" ' + (f[2] ? "" : 'inputmode="decimal" ') + 'value="' + esc(f[2] ? SPEC[f[0]] : String(SPEC[f[0]]).replace(".", ",")) + '">'; });
      h += '</div><div class="small muted">Ces valeurs alimentent la jauge, les bidons et le bilan. Réservoir de 125 L d’après la notice du Malibu LXR 2015.</div>';
    }
    h += "</div>";
    var filled = maint.filter(function (m) { return m.date || m.h; }).length, late = ENTR.filter(function (e, i) { return maintStatus(i)[1] === "late"; }).length;
    h += '<div class="card">' + collHead("maint", "Entretien : pièces à renouveler", filled + " sur " + ENTR.length + " renseignées" + (late ? " · " + late + " à faire" : ""));
    if (ui.maint) {
      ENTR.forEach(function (e, i) {
        var st = maintStatus(i), m = maint[i];
        h += '<div class="mrow"><div class="row"><b class="small">' + esc(e[0]) + '</b><span class="pill ' + st[1] + '">' + st[0] + '</span></div><div class="small muted">' + esc(intTxt(e)) + "</div>" +
          '<div class="two"><div class="field"><label for="mtd' + i + '">Dernier changement</label><input type="date" id="mtd' + i + '" data-mnt="' + i + '" data-mnf="date" value="' + esc(m.date) + '"></div>' +
          '<div class="field"><label for="mth' + i + '">Au compteur (h)</label><input id="mth' + i + '" inputmode="decimal" data-mnt="' + i + '" data-mnf="h" value="' + esc(m.h) + '" placeholder="ex. 2300"></div></div>' +
          (st[2] ? '<div class="small">Prochain : <b>' + st[2] + "</b></div>" : "") + "</div>";
      });
    }
    h += "</div>";
    var years = ["2023", "2024", "2025", "2026", "2027"];
    var nDocs = flatDocs().length; if (docPending.length) ui.docs = true;
    h += '<div class="card">' + collHead("docs", "Documents", nDocs + " document" + (nDocs > 1 ? "s" : "") + " · factures, titres, permis, notices");
    if (ui.docs) {
    h += '<div class="field" style="margin-top:10px"><label for="docFile">Ajouter des documents (un ou plusieurs fichiers, ou une photo)</label><input id="docFile" class="file-in" type="file" multiple accept="image/*,application/pdf,.tif,.tiff"></div>' +
      pendingHtml() +
      '<div class="chips">' + ["Toutes"].concat(years.slice(0, 4)).map(function (y) { return '<button class="chip" data-docyear="' + y + '" aria-pressed="' + (y === docYear) + '">' + y + "</button>"; }).join("") + "</div>";
    Object.keys(docs).forEach(function (k) {
      var list = docs[k].filter(function (d) { return docYear === "Toutes" || d.y === docYear; });
      h += '<div class="doc-cat"><div class="row"><b class="small">' + esc(k) + '</b><span class="small muted">' + list.length + "</span></div>";
      if (!list.length) h += '<div class="small muted">Aucun document' + (docYear === "Toutes" ? "" : " en " + docYear) + ".</div>";
      list.forEach(function (d) { h += '<div class="doc"><span>' + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.n) + "</a>" : esc(d.n)) + ' <span class="tag">' + esc(d.y) + "</span>" + (d.pid && person(d.pid) ? ' <span class="tag">' + esc(person(d.pid).name) + "</span>" : "") + '</span><span class="muted small">' + esc(d.s) + (d.url ? "" : " · non envoyé") + "</span></div>"; });
      h += "</div>";
    });
    }
    return h + "</div>";
  }

  /* ---------- Notes ---------- */
  var NOTES = {
    accueil: "<p><b>Bandeau.</b> Chaque écran a son nom, sa couleur et son visuel : Accueil en blanc avec le logo, Session en bleu-gris avec la photo de slalom, Essence en rouge avec une pompe, Dépenses en vert pastel avec €, Bilan en gris avec un graphique, Bateau avec la photo de Noskids. « Synchro » devient « Hors ligne » en cas de coupure.</p><p><b>Accueil.</b>Les 5 bidons en image (bleu : payés par Yann, rouge : par Olivier, pointillé : vides), une éventuelle dette de bidons, le compteur et le dernier plein. Un trou de compteur s’affiche sans rien bloquer et se rattrape plus tard.</p><p>En bas, le <b>niveau d’essence théorique</b> : la jauge notée au départ, moins le temps moteur × 13 L/h. Il bouge pendant la session ; c’est une estimation à comparer avec la vraie jauge. En fond, votre photo de slalom en filigrane, avec MALIBU dans le coin libre.</p>",
    sortie: "<p><b>Session.</b> Le grand bouton <b>Arrêt moteur</b> met en pause le tour en cours et arrête le temps moteur, sans clôturer la session ; un Départ ou une Reprise redémarre le moteur. Le temps commun est le temps moteur sans tour.</p><p>Le bloc « À bord » a trois groupes avec un bouton +. Chaque personne ajoutée est skieur par défaut. Un extérieur est « Invité Yann » ou « Invité Olivier », facturé 1 €/min au bénéfice de cette famille. Le pilote se choisit pour la session et peut changer pour chaque tour.</p><p>Un passage de moins de 5 secondes propose sa suppression. « Corriger le temps » rattrape un oubli de stop.</p><p class=\"small muted\">Démo : appuyez sur Arrêt moteur pendant le tour de Baptiste, puis Reprise ; lancez Julien et appuyez tout de suite sur Fin.</p>",
    essence: "<p><b>Essence.</b> Les 5 bidons en image. Si des bidons pleins sont encore notés en stock, l’enregistrement d’un achat demande d’abord : « Avez-vous oublié de noter leur versement ? ». Oui : on note le versement, puis l’achat. Non : les nouveaux bidons s’ajoutent au stock. Si l’achat dépasse les 5 bidons, on doit indiquer combien de bidons ont été vidés (au minimum ce qu’il faut pour faire de la place), avec l’image du stock avant et après.</p><p>« Corriger le stock » sert en cas de vol, de perte ou d’un autre usage (voiture, moto, dépannage) : on touche les bidons concernés, on indique qui fait la correction, le motif et à qui l’imputer. La valeur des bidons est retirée des dépenses d’essence du bateau ; une perte est réimputée à Yann, à Olivier ou en commun. Au versement, la famille qui verse prend d’abord ses propres bidons ; si elle prend ceux de l’autre, l’app note qu’elle lui doit ces bidons.</p><p class=\"small muted\">Démo : « J’ai versé des bidons », famille Yann, 2 bidons.</p>",
    depenses: "<p><b>Dépenses.</b> Un bandeau donne le total depuis le début, la part de Yann et celle d’Olivier. Chaque ligne a son total en gras, puis une colonne Yann et une colonne Olivier plus discrètes, et une étiquette Y+O, Y ou O.</p>",
    bilan: "<p><b>Bilan.</b> L’année se choisit en haut (ou Toutes). Ratios : coût complet par minute moteur, litres consommés, consommation constatée, coûts fixes, essence, usure moteur et amortissement. La courbe montre le coût complet par minute qui baisse au fil de la saison. La partie par personne est en bas.</p>",
    bateau: "<p><b>Bateau.</b> En haut, la photo de Noskids. Les documents déposés sont rangés : titre de navigation, facture, bon de commande, configuration usine, photos. La fiche technique reprend leurs informations et se replie ; elle alimente la jauge (125 L), les bidons et le bilan. La section Entretien liste les pièces à renouveler (pompe à eau, pompe à essence, bougies, durites, pompe de cale, huile, filtres, courroie, transmission, anodes…) : on note la date et le compteur du dernier changement, l’app calcule le prochain et signale ce qui est à faire.</p><p>Les documents s’importent avec une catégorie et une année (assurance, adhésions, licences, taxe et corps mort du lac sont annuels), photo comprise, et se filtrent par année.</p><p class=\"small muted\">Démo : modifiez la durée d’amortissement, puis regardez le bilan.</p>"
  };

  /* ---------- Rendu ---------- */
  var screen = document.getElementById("screen");
  function render() {
    computeYears();
    var map = { accueil: renderAccueil, sortie: renderSortie, essence: renderEssence, activite: renderActivite, pilotes: renderPilotes, annuaire: renderAnnuaire, journal: renderJournal, bateau: renderBateau };
    screen.innerHTML = map[tab]();
    setTimeout(function () { persistAll(); updateNet(); }, 0);
    var navTab = tab === "pilotes" || tab === "annuaire" ? "bateau" : tab === "journal" ? "accueil" : tab; // Pilotes et Annuaire sont des sous-menus de Bateau
    document.querySelectorAll(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === navTab)); });
    if (tab === "activite" && finView === "dep") depPreview();
    if (tab === "essence" && view.essence === "achat") achatPreview();
    renderHead();
  }
  /* ---------- Pilotes : fiche, heures, grade ---------- */
  var GRADES = [
    { label: "Pilote 1 étoile", detail: "Conduite du bateau sur le lac, dans le respect de la réglementation, accompagné d’une personne qui connaît le bateau." },
    { label: "Pilote 2 étoiles", detail: "Peut transporter des passagers pour une balade. Sait débâcher et rebâcher le bateau à son corps mort." },
    { label: "Pilote 3 étoiles", detail: "Habilité à tracter en bi-ski, wake et kneeboard. Manœuvres au ponton. Connaît les risques liés." },
    { label: "Pilote 4 étoiles", detail: "Passages de slalom à haute vitesse, tout sport tracté autorisé. Autonome sur le bateau : vérifications moteur, petit dépannage." }
  ];
  var DIPLOMES = ["Premiers secours (PSC1 / AFPS)", "Radio (CRR)", "Initiateur baby-ski", "Initiateur wake", "Initiateur slalom", "Initiateur bi-ski", "Initiateur barefoot", "Monitorat fédéral", "CQP", "BPJEPS"];
  /* Performances : vitesses officielles du slalom (km/h, paliers de 3 jusqu'à 58) et longueurs de corde */
  var SL_SPEEDS = [25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58];
  var SL_CORDES = ["23 m (corde longue)", "18,25 m", "16 m", "14,25 m", "13 m", "12 m", "11,25 m", "10,75 m", "10,25 m", "9,75 m", "9,50 m"];
  var WK_SPEEDS = []; for (var wv = 16; wv <= 38; wv++) WK_SPEEDS.push(wv);
  var WK_CORDES = ["1er nœud", "2e nœud", "3e nœud"];
  var FIGURES = ["Ollie", "Surface 180", "Surface 360", "Saut d’une vague", "Saut des 2 vagues", "180 aérien", "360 aérien (Wake 360)", "Grab", "Back roll", "Front roll", "Tantrum", "Raley", "Scarecrow", "Switch (pied inversé)"];
  var FIG_ETATS = [["", "—"], ["travail", "En travail"], ["fait", "Fait"], ["plustard", "Pour plus tard"]];
  function selHtml(id, path, list, cur, fmt) {
    return '<select id="' + id + '" data-pfo="' + path + '"><option value="">—</option>' + list.map(function (v) { v = String(v); return '<option value="' + esc(v) + '"' + (v === String(cur || "") ? " selected" : "") + ">" + esc(fmt ? fmt(v) : v) + "</option>"; }).join("") + "</select>";
  }
  function kmh(v) { return v + " km/h"; }
  /* Paramètres de pratique : ski (démarrage, niveau actuel, meilleure performance), puis wake */
  var BOUEES = ["0", "1", "2", "3", "4", "5", "6"];
  function slLine(prefix, key, sl) {
    return '<div class="three">' +
      '<div class="field"><label for="' + prefix + 'V">Vitesse</label>' + selHtml(prefix + "V", "slalom." + key + "V", SL_SPEEDS, sl[key + "V"], kmh) + "</div>" +
      '<div class="field"><label for="' + prefix + 'C">Corde</label>' + selHtml(prefix + "C", "slalom." + key + "C", SL_CORDES, sl[key + "C"]) + "</div>" +
      '<div class="field"><label for="' + prefix + 'B">Bouées</label>' + selHtml(prefix + "B", "slalom." + key + "B", BOUEES, sl[key + "B"]) + "</div></div>";
  }
  function pratiqueHtml(p) {
    var sl = p.slalom || {}, wk = p.wake || {};
    return '<div class="card"><h3>Pratique</h3>' +
      '<div class="field"><label for="pfAct">Activité préférée</label><select id="pfAct" data-pf="actPref">' + ACT_PREF.map(function (a) { return '<option value="' + a + '"' + (a === (p.actPref || "") ? " selected" : "") + ">" + (a || "—") + "</option>"; }).join("") + "</select></div>" +
      '<div class="sub-h">Ski</div>' +
      '<div class="field"><label for="slDV">Vitesse de démarrage actuelle</label>' + selHtml("slDV", "slalom.debV", SL_SPEEDS, sl.debV, kmh) + "</div>" +
      '<div class="flabel">Niveau actuel</div>' + slLine("slN", "niv", sl) +
      '<div class="flabel">Meilleure performance</div>' + slLine("slB", "best", sl) +
      '<div class="sub-h">Wake</div><div class="two">' +
      '<div class="field"><label for="wkV">Vitesse souhaitée</label>' + selHtml("wkV", "wake.v", WK_SPEEDS, wk.v, kmh) + "</div>" +
      '<div class="field"><label for="wkC">Longueur de corde</label>' + selHtml("wkC", "wake.corde", WK_CORDES, wk.corde) + "</div></div></div>";
  }
  function figuresHtml(p) {
    var fig = p.figures || {};
    return '<div class="card"><h3>Figures de wake</h3><div class="small muted">Touchez une figure pour changer son état : en travail, fait, pour plus tard.</div><div class="chips figs">' +
      FIGURES.map(function (f) { var e = fig[f] || ""; return '<button class="chip fig fig-' + (e || "none") + '" data-fig="' + esc(f) + '">' + (e === "fait" ? "✓ " : e === "travail" ? "◐ " : e === "plustard" ? "⏳ " : "") + esc(f) + "</button>"; }).join("") + "</div>" +
      '<div class="field"><label for="pfFigA">Autres figures</label><input id="pfFigA" data-pf="figAutres" value="' + esc(p.figAutres || "") + '" placeholder="ex. HS 180, Whirlybird (en travail)"></div></div>';
  }
  function ageTxt(iso) { if (!iso) return ""; var b = new Date(iso), n = new Date(), a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a >= 0 && a < 120 ? a + " ans" : ""; }
  function permisHtml(p, key, label) {
    var on = !!p[key];
    return '<div class="perm"><label class="chk"><input type="checkbox" data-pfc="' + key + '"' + (on ? " checked" : "") + "> Permis " + label.toLowerCase() + "</label>" +
      '<span class="tiny">obtenu le</span><input type="date" class="mini-date" data-pf="' + key + 'Date" value="' + esc(p[key + "Date"] || "") + '" aria-label="Date d’obtention du permis ' + label.toLowerCase() + '"' + (on ? "" : " disabled") + "></div>";
  }
  function pilotAvatar(p, cls) { var s = photoSrc(p.photo); return s ? '<img class="' + cls + '" src="' + s + '" alt="">' : '<span class="' + cls + ' ph-empty" aria-hidden="true">' + esc(p.name.charAt(0)) + "</span>"; }
  var ACT_PREF = ["", "Slalom", "Wake", "Bi-ski", "Ski libre", "Bouée", "Balade", "Pêche", "Pilotage"];
  function starSvg(on, size) {
    return '<svg class="star' + (on ? " on" : "") + '" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';
  }
  function starsHtml(n, size) { var s = '<span class="stars" role="img" aria-label="' + (n ? n + " étoile" + (n > 1 ? "s" : "") : "aucun grade") + '">'; for (var i = 1; i <= 4; i++) s += starSvg(i <= n, size); return s + "</span>"; }
  function canValidate() { return CONF.moi === "yann" || CONF.moi === "olivier"; }
  /* Heures calculées à partir des sessions : tours, rôle à bord, pilotage. */
  function pilotStats(pid) {
    var st = { ski: 0, wake: 0, pass: 0, pilot: 0, hist: 0, sessions: 0 };
    sessionsArr.forEach(function (s) {
      var here = false;
      if (s.mode === "historique" || !s.tours) { var m = s.minutes && Number(s.minutes[pid]); if (m) { st.hist += m; here = true; } }
      (s.tours || []).forEach(function (t) {
        var m2 = Number(t.min) || 0;
        if (t.pid === pid) { here = true; if (t.act === "wake") st.wake += m2; else if (t.act !== "balade" && t.act !== "meca") st.ski += m2; }
        if (t.pilote === pid) st.pilot += m2;
      });
      if (s.pilote === pid) { st.pilot += Number(s.commun) || 0; here = true; }
      (s.participants || []).forEach(function (p) { if (p.pid === pid) { here = true; if (p.role === "pass") st.pass += Number(s.engineMin) || 0; } });
      if (here) st.sessions++;
    });
    return st;
  }
  function hm(min) { min = Math.round(min || 0); return min < 60 ? min + " min" : Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0"); }
  function renderPilotes() {
    var sel = pilotSel && person(pilotSel);
    if (sel) return pilotDetailHtml(sel);
    var h = '<button class="btn link" data-go="bateau">← Retour au bateau</button><div class="card"><h3>Les pilotes</h3><div class="small muted">Grades validés par Yann ou Olivier. Touchez une personne pour voir sa fiche.</div><div class="list">';
    ["YF", "OF", "EXT"].forEach(function (c) {
      PEOPLE.filter(function (p) { return p.c === c && !p.hidden; }).forEach(function (p) {
        var s = pilotStats(p.id), f = c === "EXT" ? (p.host || "") : CATF[c];
        h += '<button class="item pilot-row" data-pilot="' + p.id + '"><span>' + (p.photo ? pilotAvatar(p, "row-av") : f ? famDot(f) : "") + "<b>" + esc(p.name) + "</b>" + (p.actPref ? ' <span class="muted small">· ' + esc(p.actPref) + "</span>" : "") + "</span>" + starsHtml(p.grade || 0, 16) +
          '<span class="d">' + (p.diplomes && p.diplomes.length ? "🎓 " + esc(p.diplomes.join(", ")) + " · " : "") + (s.sessions ? s.sessions + " session(s) · ski " + hm(s.ski + s.hist) + " · wake " + hm(s.wake) + " · pilotage " + hm(s.pilot) : "Aucune session") + "</span></button>";
      });
    });
    h += "</div></div>";
    h += '<div class="card"><h3>Photos des familles</h3><div class="small muted">Elles s’affichent devant le nom de la famille dans l’onglet Session.</div><div class="fam-photos">' +
      ["YC", "OC"].map(function (f) {
        var s = photoSrc((SPEC.famPhotos || {})[f]);
        return '<label class="fam-ph">' + (s ? '<img src="' + s + '" alt="">' : '<span class="ph-empty f-' + f + '">' + FAM[f].s.charAt(0) + "</span>") + "<span>" + FAM[f].n + '</span><span class="small muted">' + (s ? "Changer" : "Ajouter") + '</span><input type="file" accept="image/*" data-famphoto="' + f + '" hidden></label>';
      }).join("") + "</div></div>";
    h += '<div class="card"><h3>Prérogatives selon le grade</h3><div class="small muted">Chaque grade inclut les prérogatives des grades précédents.</div>' + GRADES.map(function (g, i) { return '<div class="grade-row">' + starsHtml(i + 1, 14) + "<span><b>" + g.label + '</b><br><span class="small">' + esc(g.detail) + "</span></span><span></span></div>"; }).join("") + "</div>";
    return h;
  }
  function pilotDetailHtml(p) {
    var s = pilotStats(p.id), g = p.grade || 0;
    var h = '<button class="btn link" data-pilot="">← Tous les pilotes</button>';
    var age = ageTxt(p.naissance);
    h += '<div class="card pilot-hero"><div class="ph-left">' +
      "<h3>" + esc(p.name) + "</h3>" +
      '<div class="birth"><input type="date" class="mini-date" data-pf="naissance" value="' + esc(p.naissance || "") + '" aria-label="Date de naissance">' + '<span class="small muted" id="ageTxt">' + (age || "date de naissance") + "</span>" + "</div>" +
      '<div class="tel-line"><input type="tel" class="mini-tel" data-pf="tel" value="' + esc(p.tel || "") + '" placeholder="Téléphone" inputmode="tel" autocomplete="off" aria-label="Téléphone de ' + esc(p.name) + '">' + (p.tel ? '<a class="call" href="tel:' + telHref(p.tel) + '">' + PHONE_ICON + "Appeler</a>" : "") + "</div>" +
      starsHtml(g, 22) +
      '<div class="small muted">' + (g ? esc(GRADES[g - 1].label) + " · validé par " + esc(p.gradePar || "?") + (p.gradeLe ? " le " + esc(p.gradeLe) : "") : "Pas encore de grade") + "</div>" +
      '<div class="perms">' + permisHtml(p, "permisCotier", "Côtier") + permisHtml(p, "permisFluvial", "Fluvial") + "</div></div>" +
      '<label class="ph-pick">' + pilotAvatar(p, "hero-av") + '<span class="small">' + (p.photo ? "Changer" : "Ajouter une photo") + '</span><input type="file" accept="image/*" id="pfPhoto" hidden></label></div>';
    h += pratiqueHtml(p);
    h += '<div class="card"><h3>Statistiques de pratique</h3>';
    h += '<div class="kpis"><div class="kpi"><span class="label">Ski</span><span class="v">' + hm(s.ski) + '</span><span class="s">slalom, ski libre, formation</span></div>' +
      '<div class="kpi"><span class="label">Wake</span><span class="v">' + hm(s.wake) + '</span><span class="s">depuis l’app</span></div>' +
      '<div class="kpi"><span class="label">Passager</span><span class="v">' + hm(s.pass) + '</span><span class="s">sessions à bord sans skier</span></div>' +
      '<div class="kpi"><span class="label">Pilotage</span><span class="v">' + hm(s.pilot) + '</span><span class="s">tours tractés et trajets</span></div></div>';
    if (s.hist) h += '<div class="small muted">Historique 2024-2025 : ' + hm(s.hist) + " de tours, sans le détail ski ou wake. " + s.sessions + " session(s) au total.</div>";
    h += "</div>" + figuresHtml(p);
    h += '<div class="card"><h3>Diplômes et qualifications</h3><div class="chips">' +
      DIPLOMES.map(function (d) { var on = (p.diplomes || []).indexOf(d) >= 0; return '<button class="chip" data-dipl="' + esc(d) + '" aria-pressed="' + on + '">' + (on ? "✓ " : "") + esc(d) + "</button>"; }).join("") + "</div>" +
      '<div class="field"><label for="pfAutres">Autres qualifications</label><input id="pfAutres" data-pf="diplAutres" value="' + esc(p.diplAutres || "") + '" placeholder="ex. juge fédéral"></div></div>';
    var mine = flatDocs().filter(function (d) { return d.pid === p.id; });
    h += '<div class="card"><h3>Pièces : permis, diplômes, formations</h3>' +
      (mine.length ? '<div class="list small">' + mine.map(function (d) {
        return '<div class="item"><span>' + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.n) + "</a>" : esc(d.n)) + '</span><span class="tag">' + esc(d.y) + '</span><span class="d">' + esc(d.cat) + " · " + esc(d.s) + (d.url ? "" : " · non envoyé") + "</span></div>";
      }).join("") + "</div>" : '<div class="small muted">Aucune pièce pour l’instant.</div>') +
      '<div class="two"><div class="field"><label for="pjType">Type de pièce</label><select id="pjType"><option value="Permis bateau">Permis ou code</option><option value="Diplômes et formations">Diplôme, formation, secourisme</option><option value="Autres">Autre</option></select></div>' +
      '<div class="field"><label for="pjFile">Fichier ou photo</label><input id="pjFile" class="file-in" type="file" multiple accept="image/*,application/pdf,.tif,.tiff"></div></div></div>';
    h += '<div class="card"><h3>Grade</h3>';
    GRADES.forEach(function (gr, i) {
      var n = i + 1;
      h += '<div class="grade-row' + (n <= g ? " got" : "") + '">' + starsHtml(n, 16) + '<span><b>' + gr.label + "</b><br><span class=\"small muted\">" + esc(gr.detail) + "</span></span>" +
        (canValidate() && n !== g ? '<button class="btn sm ' + (n > g ? "" : "ghost") + '" data-grade="' + n + '">' + (n > g ? "Valider" : "Revenir ici") + "</button>" : "") + "</div>";
    });
    h += canValidate() ? (g ? '<button class="btn link" id="gradeRetire" style="color:var(--bad)">Retirer le grade</button>' : "") : '<div class="small muted">Seuls Yann et Olivier peuvent valider un grade (choix « Je suis » dans Bateau).</div>';
    return h + "</div>";
  }

  /* Journal - Notes : date et auteur automatiques, nature au choix, historique ; pastille rouge sur l'accueil pour les notes pas encore vues */
  var NOTE_CATS = ["Anomalie constatée", "Situation particulière", "Perte d’objet", "Chose à remplacer", "Déclaration d’un contrôle", "Alarme moteur", "Niveau d’huile faible", "Autres (à préciser)"];
  var NOTE_SEV = { "Anomalie constatée": "bad", "Alarme moteur": "bad", "Niveau d’huile faible": "bad", "Chose à remplacer": "warn", "Perte d’objet": "warn", "Déclaration d’un contrôle": "warn" };
  var noteForm = { cat: NOTE_CATS[0], auteur: "" };
  function unreadNotes() { var seen = LS.get("notesVues", ""); return notes.filter(function (n) { return (n.date || "") > seen && n.auteur !== CONF.moi; }).length; }
  function fmtDateTime(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  function renderJournal() {
    if (!noteForm.auteur) noteForm.auteur = CONF.moi || "";
    var ppl = PEOPLE.filter(function (p) { return p.c !== "EXT" && !p.hidden; });
    var h = '<button class="btn link" data-go="accueil">← Retour à l’accueil</button>';
    h += '<div class="card"><h3>Nouvelle note</h3><div class="small muted">Le ' + fmtDateTime(nowIso()) + " (date et heure ajoutées automatiquement)</div>" +
      '<div class="two"><div class="field"><label for="nPar">Par</label><select id="nPar"><option value="">—</option>' + ppl.map(function (p) { return '<option value="' + p.id + '"' + (p.id === noteForm.auteur ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="nCat">Nature</label><select id="nCat">' + NOTE_CATS.map(function (c) { return "<option" + (c === noteForm.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label for="nTxt">Note' + (noteForm.cat === NOTE_CATS[NOTE_CATS.length - 1] ? " (à préciser)" : "") + '</label><textarea id="nTxt" rows="4" placeholder="Ce qui s’est passé, où, ce qu’il faut faire…"></textarea></div>' +
      '<div class="actions"><button class="btn" id="noteSave">Enregistrer la note</button></div></div>';
    h += '<div class="card"><h3>Historique des notes</h3>';
    if (!notes.length) h += '<div class="small muted">Aucune note pour l’instant.</div>';
    var seen = LS.get("notesVues", "");
    notes.forEach(function (n) {
      var isNew = (n.date || "") > seen && n.auteur !== CONF.moi;
      h += '<div class="note-row"><div class="note-h"><span class="note-tag ' + (NOTE_SEV[n.cat] || "") + '">' + esc(n.cat) + "</span>" + (isNew ? '<span class="note-new">nouvelle</span>' : "") + '<span class="small muted">' + fmtDateTime(n.date) + " · " + esc(n.auteurNom || "?") + "</span></div>" +
        (n.txt ? '<div class="note-txt">' + esc(n.txt).replace(/\n/g, "<br>") + "</div>" : "") + "</div>";
    });
    LS.set("notesVues", nowIso()); // ouvertes : la pastille de l'accueil disparaît
    return h + "</div>";
  }

  /* Annuaire urgence : numéros nationaux fixes, contacts du lac gardés dans la base partagée (SPEC.annuaire), modifiables */
  var URG_NAT = [["112", "Urgences (numéro européen)"], ["15", "SAMU"], ["18", "Pompiers"], ["17", "Police, gendarmerie"]];
  function renderAnnuaire() {
    var list = SPEC.annuaire || [], edit = ui.annEdit, h = '<button class="btn link" data-go="bateau">← Retour au bateau</button>';
    h += '<div class="card urg-nat"><h3>Numéros d’urgence</h3><div class="urg-grid">' + URG_NAT.map(function (u) { return '<a class="urg-big" href="tel:' + u[0] + '"><b>' + u[0] + "</b><span>" + u[1] + "</span></a>"; }).join("") + "</div></div>";
    var groups = []; list.forEach(function (c) { if (groups.indexOf(c.g || "Autres") < 0) groups.push(c.g || "Autres"); });
    h += '<div class="card"><div class="row"><h3>Contacts du lac</h3><button class="btn link" id="annEdit">' + (edit ? "Terminé" : "Modifier") + "</button></div>";
    if (!list.length && !edit) h += '<div class="small muted">Aucun contact pour l’instant : touchez « Modifier » pour les saisir.</div>';
    if (edit) {
      h += '<div class="small muted">Groupe, nom, rôle et numéro. Les changements sont partagés avec la famille.</div>';
      list.forEach(function (c, i) {
        h += '<div class="ann-edit"><input data-ann="' + i + '" data-ak="g" value="' + esc(c.g || "") + '" placeholder="Groupe (ex. Association SNLG)" aria-label="Groupe"><input data-ann="' + i + '" data-ak="n" value="' + esc(c.n || "") + '" placeholder="Nom" aria-label="Nom">' +
          '<input data-ann="' + i + '" data-ak="r" value="' + esc(c.r || "") + '" placeholder="Rôle" aria-label="Rôle"><input data-ann="' + i + '" data-ak="t" value="' + esc(c.t || "") + '" placeholder="Téléphone" inputmode="tel" aria-label="Téléphone"><button class="x" data-anndel="' + i + '" aria-label="Supprimer ce contact">×</button></div>';
      });
      h += '<button class="btn ghost sm" id="annAdd">+ Ajouter un contact</button>';
    } else {
      groups.forEach(function (g) {
        h += '<div class="ann-g">' + esc(g) + "</div>";
        list.filter(function (c) { return (c.g || "Autres") === g; }).forEach(function (c) {
          h += '<div class="ann-row' + (c.n && c.n !== g ? " ind" : "") + '"><span><b>' + esc(c.n || g) + "</b>" + (c.r ? '<span class="small muted"> · ' + esc(c.r) + "</span>" : "") + "</span>" +
            (c.t ? '<a class="call" href="tel:' + telHref(c.t) + '">' + PHONE_ICON + esc(c.t) + "</a>" : '<span class="small muted">numéro à compléter</span>') + "</div>";
        });
      });
      if (ui.annNew) {
        var gNew = ui.annNewCat === "__new";
        h += '<div class="ann-new"><div class="sub-h">Nouveau numéro</div>' +
          '<div class="field"><label for="anGs">Section (facultatif)</label><select id="anGs"><option value="">— Aucune —</option>' + groups.filter(function (g) { return g !== "Autres"; }).map(function (g) { return '<option value="' + esc(g) + '"' + (ui.annNewCat === g ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + '<option value="__new"' + (gNew ? " selected" : "") + ">+ Nouvelle section…</option></select></div>" +
          (gNew ? '<div class="field"><label for="anG">Nom de la nouvelle section</label><input id="anG" placeholder="ex. Dépannage, Ponton…" autocomplete="off"></div>' : "") +
          '<div class="two"><div class="field"><label for="anN">Nom</label><input id="anN" placeholder="ex. Yvan" autocomplete="off"></div><div class="field"><label for="anR">Fonction (facultatif)</label><input id="anR" placeholder="ex. moniteur" autocomplete="off"></div></div>' +
          '<div class="field"><label for="anT">Téléphone</label><input id="anT" inputmode="tel" placeholder="06 00 00 00 00" autocomplete="off"></div>' +
          '<div class="actions"><button class="btn ghost" id="annNewCancel">Annuler</button><button class="btn" id="annNewSave">Ajouter</button></div></div>';
      } else h += '<button class="btn ghost sm" id="annNewOpen" style="margin-top:10px">+ Ajouter un numéro</button>';
    }
    return h + "</div>";
  }

  /* Activité : le bilan en premier ; les dépenses s'ouvrent par un lien en bas de page. */
  function renderActivite() {
    if (finView === "dep") return '<button class="btn link" data-fin="bilan">← Retour à l’activité</button>' + renderDepenses();
    var B = balance();
    return '<button class="btn big center-btn" data-depnew="1">Saisir une dépense</button>' + renderBilan() +
      '<button class="card link-card" data-fin="dep"><span><b>Dépenses et balance</b><span class="small muted">' + depenses.length + " dépenses · " + esc(balanceText(B)) + '</span></span><span class="chev" aria-hidden="true">›</span></button>';
  }
  /* Bandeau de l'accueil : voiles de fils fins qui ondulent et se croisent, du turquoise au jaune, sur bleu nuit (dessin original généré) */
  function meshSvg() {
    var s = '<svg class="hd-waves" viewBox="0 0 400 60" preserveAspectRatio="none"><defs><linearGradient id="meshG" x1="0" x2="1">' +
      '<stop offset="0" stop-color="#1fd1d9"/><stop offset=".28" stop-color="#6f5bff"/><stop offset=".5" stop-color="#ff3f93"/><stop offset=".74" stop-color="#ff7a1f"/><stop offset="1" stop-color="#ffc928"/></linearGradient></defs><g fill="none" stroke="url(#meshG)" stroke-width=".55">';
    for (var r = 0; r < 2; r++) for (var i = 0; i < 16; i++) {
      var d = "", ph = (r ? 2.6 : 0) + i * 0.11, amp = (r ? 11 : 15) + 5 * Math.sin(i * 0.45), cy = r ? 34 : 28;
      for (var x = 0; x <= 400; x += 8) { var y = cy + amp * Math.sin(x / 400 * Math.PI * (r ? 2.6 : 2) + ph) * (0.55 + 0.45 * Math.sin(x / 400 * Math.PI)); d += (x ? "L" : "M") + x + " " + y.toFixed(1); }
      s += '<path d="' + d + '" opacity="' + (0.28 + 0.4 * Math.sin(i / 15 * Math.PI)).toFixed(2) + '"/>';
    }
    return s + "</g></svg>";
  }
  var HEAD_DECO = meshSvg();
  /* Bandeaux en rubans de lumière (dessin original) : Session en bleu, Essence en orangé, Activité en violet.
     A : couleurs du ruban principal, C : couleurs de la vague du bas, k : couleur des reflets */
  function ribbonSvg(p, A, C, k) {
    var st = function (c, o) { return '<stop offset="' + o + '" stop-color="' + c[0] + '" stop-opacity="' + c[1] + '"/>'; };
    return '<svg class="hd-waves" viewBox="0 0 400 60" preserveAspectRatio="none"><defs>' +
      '<linearGradient id="' + p + 'A" x1="0" x2="1">' + st(A[0], 0) + st(A[1], 0.35) + st(A[2], 0.75) + st(A[3], 1) + "</linearGradient>" +
      '<linearGradient id="' + p + 'B" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#fff" stop-opacity=".9"/><stop offset=".8" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + p + 'C" x1="0" x2="1">' + st(C[0], 0) + st(C[1], 0.6) + st(C[2], 1) + "</linearGradient></defs>" +
      '<path d="M0 34C80 14 170 50 260 34S360 14 400 20V60H0z" fill="url(#' + p + 'C)"/>' +
      '<path d="M0 40C90 20 190 56 290 36S370 22 400 26V32C370 28 300 44 290 42 190 62 90 28 0 48z" fill="url(#' + p + 'A)"/>' +
      '<path d="M0 30C100 10 200 48 300 28S375 16 400 18" fill="none" stroke="url(#' + p + 'B)" stroke-width="1.4"/>' +
      '<path d="M0 46C110 30 210 60 310 44S380 34 400 36" fill="none" stroke="url(#' + p + 'B)" stroke-width=".9" opacity=".7"/>' +
      '<g fill="' + k + '"><circle cx="232" cy="38" r="2.2" opacity=".55"/><circle cx="252" cy="36" r="1.6" opacity=".45"/><circle cx="330" cy="27" r="2.6" opacity=".35"/><circle cx="356" cy="31" r="1.4" opacity=".5"/></g></svg>';
  }
  var SES_DECO = ribbonSvg("ses", [["#7fe7ff", .05], ["#9ff0ff", .55], ["#4fd8e8", .35], ["#2fe0b0", .6]], [["#1fb6d6", .55], ["#0b6f9e", .25], ["#19d4a8", .55]], "#bdf6ff");
  var ESS_DECO = ribbonSvg("ess", [["#ffd27a", .05], ["#ffe1a6", .6], ["#ffa463", .4], ["#ff6b45", .65]], [["#ffb347", .5], ["#b8361c", .25], ["#ff7a3d", .55]], "#ffe8c2");
  var ACT_DECO = ribbonSvg("act", [["#dcbcff", .05], ["#ead2ff", .6], ["#c592ff", .4], ["#ff7fbf", .65]], [["#a874ff", .5], ["#4f1f8a", .25], ["#e14ea0", .55]], "#f4dfff");
  /* Bandeau : nom de l'écran, visuel et couleur propres à chaque menu */
  var HEADS = {
    accueil: { t: "", v: '<span class="head-deco" aria-hidden="true">' + HEAD_DECO + '</span><span class="logo img-logo" role="img" aria-label="Malibu"></span>' },
    sortie: { t: "Session", v: '<span class="head-deco" aria-hidden="true">' + SES_DECO + "</span>", th: '<span class="thumb img-ski" aria-hidden="true"></span>' },
    essence: { t: "Essence", v: '<span class="head-deco" aria-hidden="true">' + ESS_DECO + '</span><span class="hv img-pump" aria-hidden="true"></span>' },
    activite: { t: "Activité", v: '<span class="head-deco" aria-hidden="true">' + ACT_DECO + '</span><span class="hv" style="background:#1f2a33;color:#d6dade" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg></span>' },
    depenses: { t: "Dépenses", v: '<span class="hv" style="background:#14532d;color:#cfeed3;font:700 23px var(--f-body)" aria-hidden="true">€</span>' },
    pilotes: { t: "Pilotes", v: '<span class="hv" style="background:#3b2a00;color:#f6c445" aria-hidden="true">' + WHEEL_ICON + "</span>" },
    journal: { t: "Journal - Notes", v: '<span class="hv" style="background:#ffffff;color:#1e4d6b" aria-hidden="true">' + QI.journal + "</span>" },
    annuaire: { t: "Urgence - Dépannage", v: '<span class="hv urg-ic" aria-hidden="true">' + URG_ICON + "</span>" },
    bateau: { t: "Bateau", v: '<span class="thumb img-boat" style="background-position:45% 60%" aria-hidden="true"></span>' }
  };
  function renderHead() {
    var key = tab === "activite" ? (finView === "dep" ? "depenses" : "activite") : tab, H = HEADS[key];
    document.getElementById("appHead").className = "app-head h-" + (key === "activite" ? "bilan" : key);
    document.getElementById("hVis").innerHTML = H.v || "";
    document.getElementById("hTitle").textContent = H.t;
    document.getElementById("hThumb").innerHTML = H.th || "";
  }
  function achatPreview() { var el = document.getElementById("aPL"); if (!el) return; var l = parseNum(document.getElementById("aL").value), p = parseNum(document.getElementById("aP").value); el.textContent = l > 0 ? "Soit " + dec2.format(p / l) + " € le litre." : ""; }
  function goTab(t) { tab = t; screen.scrollTop = 0; render(); }
  var toastTimer;
  function toast(msg) { var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2800); }

  document.querySelector(".tabs").addEventListener("click", function (e) { var b = e.target.closest("button[data-tab]"); if (b) goTab(b.dataset.tab); });

  screen.addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-ses]");
    if (tr) { ui.sesOpen = ui.sesOpen === tr.dataset.ses ? "" : tr.dataset.ses; return render(); } // liste des sessions : ouvrir / fermer le détail
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    var ds = b.dataset, k, t;
    if (ds.go) return goTab(ds.go);
    if (ds.essyear) { essYear = ds.essyear; return render(); }
    if (ds.qa) { // boutons d'accès direct de l'accueil
      if (ds.qa === "achat") { view.essence = "achat"; return goTab("essence"); }
      if (ds.qa === "mise") { if (!bidons.length) { toast("Aucun bidon en stock : notez d’abord un achat."); view.essence = null; return goTab("essence"); } view.essence = "mise"; return goTab("essence"); }
      if (ds.qa === "stats") { finView = "bilan"; return goTab("activite"); }
      if (ds.qa === "hist") {
        finView = "bilan"; var hy = latestYear() || String(new Date().getFullYear()); bilanYear = hy; ui["ses" + hy] = true; goTab("activite");
        var sc0 = document.querySelector('[data-coll="ses' + hy + '"]'); if (sc0) screen.scrollTop = sc0.closest(".card").offsetTop - 8;
        return;
      }
    }
    if (b.id === "engBtn") return engineToggle();
    if (ds.act) return act(Number(ds.id), ds.act);
    if (ds.det) { t = findTour(Number(ds.det)); t.open = !t.open; return render(); }
    if (ds.edit) { t = findTour(Number(ds.edit)); t.edit = !t.edit; return render(); }
    if (ds.edq) { var mI = document.getElementById("edM" + ds.id), sI = document.getElementById("edS" + ds.id), tot = Math.max(0, parseNum(mI.value) * 60 + parseNum(sI.value) + Number(ds.edq)); mI.value = Math.floor(tot / 60); sI.value = tot % 60; return; }
    if (ds.edsave) { t = findTour(Number(ds.edsave)); var secs = Math.max(0, Math.round(parseNum(document.getElementById("edM" + t.id).value) * 60 + parseNum(document.getElementById("edS" + t.id).value))); if (t.orig == null) t.orig = t.acc; t.acc = secs * 1000; t.lapStart = Math.min(t.lapStart, t.acc); t.edit = false; t.tiny = false; save(1); toast(savedMsg("Temps de " + tourName(t) + " corrigé : " + fmtClock(t.acc) + ".")); return render(); }
    if (ds.tinydel) { t = findTour(Number(ds.tinydel)); t.acc = t.lapStart; t.laps -= 1; t.tiny = false; if (t.laps <= 0) { t.laps = 0; t.state = "wait"; t.acc = 0; } save(1); toast("Passage supprimé."); return render(); }
    if (ds.tinykeep) { findTour(Number(ds.tinykeep)).tiny = false; return render(); }
    if (ds.deltour) { sortie.tours = sortie.tours.filter(function (x) { return x.id !== Number(ds.deltour); }); save(1); return render(); }
    if (ds.pick) { picker = picker === ds.pick ? null : ds.pick; return render(); }
    if (ds.newp) {
      var inp = document.getElementById("np" + ds.newp), nm = inp.value.trim(); if (!nm) { inp.focus(); return toast("Tapez le nom de la personne."); }
      var np = { id: "p" + (nextId++), name: nm, c: ds.newp }; PEOPLE.push(np); curList().push(newPart(np)); picker = null; save(1); toast(nm + " ajouté à bord."); return render();
    }
    if (ds.addp) { curList().push(newPart(person(ds.addp))); save(1); return render(); }
    if (ds.rm) { var L0 = curList(); for (var ri = 0; ri < L0.length; ri++) if (L0[ri].pid === ds.rm) { L0.splice(ri, 1); break; } save(1); return render(); }
    for (k in ds) {
      var lst = curList(), j, who;
      if (k.indexOf("role") === 0 && k.length > 4) { who = k.slice(4).toLowerCase(); for (j = 0; j < lst.length; j++) if (lst[j].pid === who) lst[j].role = ds[k]; save(1); return render(); }
      if (k.indexOf("host") === 0 && k.length > 4) { who = k.slice(4).toLowerCase(); for (j = 0; j < lst.length; j++) if (lst[j].pid === who) lst[j].host = ds[k]; save(1); return render(); }
      if (k.indexOf("fact") === 0 && k.length > 4) { who = k.slice(4).toLowerCase(); for (j = 0; j < lst.length; j++) if (lst[j].pid === who) lst[j].fact = !lst[j].fact; save(1); return render(); }
    }
    if (ds.newtour) { var nt = newTour(null, ds.newtour); if (ds.newtour !== "balade" && ds.newtour !== "meca") { nt.pid = ds.newtour; nt.act = "slalom"; } sortie.tours.push(nt); save(1); return render(); }
    if (b.id === "goStart") {
      if (!startList.length) return toast("Ajoutez au moins une personne à bord avec les boutons +.");
      var now = Date.now();
      sortie = { active: true, closing: false, compteurDeb: parseNum(document.getElementById("cDeb").value), jaugeDeb: startJauge, compteurFin: null, jaugeFin: startJauge, plein: true, bidonsPlein: 1, pleinF: "YC",
        pilote: inListStart(startPilote) ? startPilote : startList[0].pid, engine: "on", engAcc: 0, engSince: now, startedAt: now, participants: startList, tours: [] };
      sortie.pleinF = famOf(participant(sortie.pilote)) || "YC";
      sortie.checks = startChecks; startChecks = {};
      startList = []; picker = null; save(1); return render();
    }
    if (b.id === "goClose") { // en terminant : l'appareil photo s'ouvre tout de suite pour photographier le compteur
      sortie.closing = true; sortie.compteurFin = null; view.cancelAsk = false; render();
      var cp = document.getElementById("cPhoto"); if (cp && !sortie.photoCompteur) cp.click();
      return;
    }
    if (b.id === "cancelAsk") { view.cancelAsk = true; return render(); }
    if (b.id === "cancelNo") { view.cancelAsk = false; return render(); }
    if (b.id === "cancelYes") { view.cancelAsk = false; sortie = { active: false, compteurDeb: lastCompteur(), tours: [], participants: [] }; toast("Session annulée : rien n’a été enregistré."); return render(); }
    if (ds.fin) { finView = ds.fin; screen.scrollTop = 0; return render(); }
    if (ds.pilot !== undefined) { pilotSel = ds.pilot; screen.scrollTop = 0; return render(); }
    if (ds.pdel !== undefined) { docPending.splice(Number(ds.pdel), 1); return render(); }
    if (b.id === "pendCancel") { docPending = []; return render(); }
    if (b.id === "pendSend") { var items = docPending.slice(); docPending = []; addDocs(items); return; }
    if (b.id === "noteSave") {
      var nt = document.getElementById("nTxt").value.trim(), au = person(noteForm.auteur);
      if (!au) { toast("Indiquez qui écrit la note."); return; }
      if (!nt && noteForm.cat === NOTE_CATS[NOTE_CATS.length - 1]) { toast("Précisez la note dans la zone de saisie."); return; }
      notes.unshift({ id: "note-" + uid(), kind: "note", date: nowIso(), auteur: au.id, auteurNom: au.name, cat: noteForm.cat, txt: nt });
      LS.set("notesVues", nowIso()); // pas de pastille sur le téléphone qui l'a écrite
      toast("Note enregistrée et partagée avec la famille."); return render();
    }
    if (b.id === "annNewOpen") { ui.annNew = true; render(); var an = document.getElementById("anN"); if (an) an.focus(); return; }
    if (b.id === "annNewCancel") { ui.annNew = false; return render(); }
    if (b.id === "annNewSave") {
      var gv = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }, nn = gv("anN"), tt = gv("anT");
      var sec = gv("anGs") === "__new" ? gv("anG") : gv("anGs");
      if (!nn && !tt) { toast("Indiquez au moins un nom ou un numéro."); return; }
      SPEC.annuaire = (SPEC.annuaire || []).concat([{ id: uid(), g: sec || "Autres", n: nn || sec || "Contact", r: gv("anR"), t: tt }]);
      ui.annNew = false; ui.annNewCat = ""; toast("Numéro ajouté à l’annuaire, partagé avec la famille."); return render();
    }
    if (b.id === "annEdit") { ui.annEdit = !ui.annEdit; if (!ui.annEdit) SPEC.annuaire = (SPEC.annuaire || []).filter(function (c) { return c.n || c.t || c.g; }); return render(); }
    if (b.id === "annAdd") { SPEC.annuaire = (SPEC.annuaire || []).concat([{ id: uid(), g: "", n: "", r: "", t: "" }]); return render(); }
    if (ds.anndel) { SPEC.annuaire = (SPEC.annuaire || []).filter(function (c, i) { return i !== Number(ds.anndel); }); return render(); }
    if (ds.fig) { // figures de wake : — → en travail → fait → pour plus tard → —
      var pfg = person(pilotSel);
      if (pfg) { var fg = {}; Object.keys(pfg.figures || {}).forEach(function (k) { fg[k] = pfg.figures[k]; }); var order = FIG_ETATS.map(function (x) { return x[0]; }); fg[ds.fig] = order[(order.indexOf(fg[ds.fig] || "") + 1) % order.length]; if (!fg[ds.fig]) delete fg[ds.fig]; pfg.figures = fg; }
      return render();
    }
    if (ds.dipl) { var pdp = person(pilotSel); if (pdp) { var lst2 = (pdp.diplomes || []).slice(), ix = lst2.indexOf(ds.dipl); if (ix >= 0) lst2.splice(ix, 1); else lst2.push(ds.dipl); pdp.diplomes = lst2; } return render(); }
    if (ds.grade) { var pg = person(pilotSel); if (pg && canValidate()) { pg.grade = Number(ds.grade); pg.gradePar = person(CONF.moi).name; pg.gradeLe = todayFr(); toast(pg.name + " : " + GRADES[pg.grade - 1].label + " validé."); } return render(); }
    if (b.id === "gradeRetire") { var pr = person(pilotSel); if (pr && canValidate()) { pr.grade = 0; pr.gradePar = person(CONF.moi).name; pr.gradeLe = todayFr(); } return render(); }
    if (b.id === "bkDownload") { downloadBackup(); return; }
    if (b.id === "purgeOpen") { view.purge = { scope: "depenses" }; return render(); }
    if (b.id === "purgeCancel") { view.purge = null; return render(); }
    if (ds.pscope) { view.purge.scope = ds.pscope; return render(); }
    if (b.id === "purgeGo") { return doPurge(); }
    if (b.id === "backClose") { sortie.closing = false; return render(); }
    if (b.id === "tPlein") { sortie.plein = !sortie.plein; return render(); }
    if (ds.pleinf) { sortie.pleinF = ds.pleinf; return render(); }
    if (ds.cstep) { sortie.bidonsPlein = Math.max(0.5, Math.min(5, sortie.bidonsPlein + Number(ds.cstep))); return render(); }
    if (b.id === "saveSortie") {
      if (sortie.engine === "on") { sortie.engAcc += Date.now() - sortie.engSince; sortie.engine = "off"; }
      var mins = Math.round(totalMs(Date.now()) / 60000), endC = sortie.compteurFin, msg = "Session enregistrée : " + mins + " min de tours.";
      var R = computeRecap(Date.now()), perPid = {};
      R.rows.forEach(function (x) { if (x.perso > 0.05) perPid[x.pid] = Math.round(x.perso * 10) / 10; });
      sessionsArr.push({ id: uid(), mode: "app", bateau: SPEC.devise, date: frToIso(todayFr()), heureDeb: new Date(sortie.startedAt).toTimeString().slice(0, 5), heureFin: new Date().toTimeString().slice(0, 5),
        compteurDeb: sortie.compteurDeb, compteurFin: sortie.compteurFin, jaugeDeb: sortie.jaugeDeb, jaugeFin: sortie.jaugeFin, plein: !!sortie.plein, pilote: sortie.pilote, photoCompteur: sortie.photoCompteur || null, checks: sortie.checks || {},
        engineMin: Math.round(R.eMin * 10) / 10, famMin: { YC: Math.round(R.b.YC * 10) / 10, OC: Math.round(R.b.OC * 10) / 10 }, factMin: { YC: Math.round(R.fact.YC), OC: Math.round(R.fact.OC) },
        minutes: perPid, commun: Math.round((R.libre + R.balade) * 10) / 10, meca: Math.round(R.meca * 10) / 10,
        participants: sortie.participants.map(function (p) { return { pid: p.pid, role: p.role, host: p.host, fact: p.fact }; }),
        tours: sortie.tours.map(function (t) { return { pid: t.pid, act: t.act, min: Math.round(tourMs(t, Date.now()) / 600) / 100, pauses: t.pauses, laps: t.laps, speed: t.speed, passes: t.passes, pilote: t.pilote, orig: t.orig }; }) });
      ["YC", "OC"].forEach(function (f) { var mn = Math.round(R.fact[f]); if (mn > 0) depenses.unshift({ id: uid(), d: todayFr(), lib: "Invités facturés (" + mn + " min)", cat: "Recette invités", m: -mn * SPEC.tarif, payeur: f, regle: f }); });
      if (sortie.plein && bidons.length) { applyPrelevement(planPrelevement(sortie.bidonsPlein, sortie.pleinF), sortie.pleinF, "pour le plein"); lastPlein = todayFr(); msg = "Session et plein enregistrés."; }
      lastLevel = sortie.plein ? 16 : sortie.jaugeFin; lastLevelDate = todayFr();
      sortie = { active: false, compteurDeb: endC, tours: [], participants: [] }; save(3); toast(savedMsg(msg)); return render();
    }
    if (b.id === "gapOpen") { gap.open = true; return render(); }
    if (b.id === "gapCancel") { gap.open = false; return render(); }
    if (ds.grat) { gap.rat = ds.grat; return render(); }
    if (b.id === "gapSave") {
      var gpp = findGaps().filter(function (x) { return x.key === gap.key; })[0]; gap.open = false;
      if (gap.rat === "search") { if (ETAT.gapsRecherche.indexOf(gap.key) < 0) ETAT.gapsRecherche.push(gap.key); toast(savedMsg("Trou noté « à rechercher ».")); return render(); }
      var c1 = parseNum(document.getElementById("gC1").value), c2 = parseNum(document.getElementById("gC2").value), mm = parseNum(document.getElementById("gM").value) || Math.round((c2 - c1) * 60), fm = { YC: 0, OC: 0 };
      fm[gap.rat] = mm;
      sessionsArr.push({ id: uid(), mode: "rattrapage", bateau: gpp ? (gpp.from.bateau || "") : SPEC.devise, date: document.getElementById("gD").value || todayIso(), compteurDeb: c1, compteurFin: c2, engineMin: mm, famMin: fm, minutes: {}, commun: 0, meca: 0 });
      toast(savedMsg("Session rattrapée enregistrée.")); return render();
    }
    if (ds.ev === "achat" || ds.ev === "mise") { view.essence = ds.ev; return render(); }
    if (ds.ev === "cancel") { view.essence = null; achatForm.step = null; return render(); }
    if (ds.af) { achatForm.f = ds.af; return render(); }
    if (ds.mf) { miseForm.f = ds.mf; return render(); }
    if (ds.atog) { achatForm[ds.atog] = !achatForm[ds.atog]; return render(); }
    if (ds.mtog) { miseForm.plein = !miseForm.plein; b.setAttribute("aria-pressed", String(miseForm.plein)); return; }
    if (ds.astep) { achatForm.b = Math.max(1, Math.min(5, achatForm.b + Number(ds.astep))); achatForm.L = achatForm.b * SPEC.bidon; achatForm.P = Math.round(achatForm.L * 1.73 * 100) / 100; return render(); }
    if (ds.mstep) { miseForm.n = Math.max(0.5, Math.min(5, miseForm.n + Number(ds.mstep))); return render(); }
    if (b.id === "saveAchat") {
      achatForm.L = parseNum(document.getElementById("aL").value); achatForm.P = parseNum(document.getElementById("aP").value);
      if (achatForm.L <= 0 || achatForm.P <= 0) return toast("Indiquez les litres et le prix.");
      if (!bidons.length) return commitAchat();
      achatForm.step = "check"; achatForm.tfOpen = false; achatForm.tf = achatForm.f; achatForm.tn = Math.max(achatNeed(), 1); return render();
    }
    if (b.id === "achYes") { achatForm.tfOpen = true; return render(); }
    if (b.id === "achNo") return commitAchat();
    if (b.id === "achBack") { achatForm.step = null; return render(); }
    if (ds.tf) { achatForm.tf = ds.tf; return render(); }
    if (ds.tnstep) { achatForm.tn = Math.max(Math.max(achatNeed(), 1), Math.min(bidons.length, achatForm.tn + Number(ds.tnstep))); return render(); }
    if (b.id === "corrOpen") { view.essence = "corr"; corrForm.sel = {}; return render(); }
    if (ds.cpick) { corrForm.sel[ds.cpick] = !corrForm.sel[ds.cpick]; return render(); }
    if (ds.cmotif) { corrForm.motif = ds.cmotif; return render(); }
    if (ds.cusage) { corrForm.usage = ds.cusage; return render(); }
    if (ds.caff) { corrForm.aff = ds.caff; return render(); }
    if (b.id === "corrSave") {
      var sel = corrSel(); if (!sel.length) return toast("Touchez les bidons à retirer du stock.");
      var eff = corrEffects(sel), n = sel.length, lab = corrForm.motif === "autre" ? corrForm.usage.toLowerCase() : corrForm.motif;
      eff.lines.forEach(function (l) { l.d = todayFr(); l.isNew = true; depenses.unshift(l); });
      eff.dettes.forEach(function (d) { dettes.push(d); });
      bidons = bidons.filter(function (x, i) { return sel.indexOf(i) < 0; });
      moves.unshift({ d: todayFr(), t: "Correction du stock (" + lab + ")", v: n + " bidon(s) · " + int0.format(eff.lit) + " L", who: person(corrForm.who).name + " · " + (corrForm.aff === "5050" ? "commun" : FAM[corrForm.aff].s) });
      view.essence = null; corrForm.sel = {}; save(2); toast(savedMsg("Correction du stock enregistrée.")); return render();
    }
    if (b.id === "achBoth") {
      var pl = planPrelevement(achatForm.tn, achatForm.tf), left = cansAfter(pl);
      if (left + achatForm.b > 5) return toast("Il resterait " + left + " bidon(s) plein(s) : impossible d’en remplir " + achatForm.b + " de plus. Augmentez le nombre de bidons versés.");
      applyPrelevement(pl, achatForm.tf, "oublié, noté à l’achat"); return commitAchat();
    }
    if (b.id === "saveMise") { applyPrelevement(planPrelevement(miseForm.n, miseForm.f), miseForm.f, ""); if (miseForm.plein) lastPlein = todayFr(); view.essence = null; save(1); toast(savedMsg("Versement enregistré.")); return render(); }
    if (b.id === "dNew") { view.dep = true; return render(); }
    if (ds.depnew) { finView = "dep"; view.dep = true; screen.scrollTop = 0; return render(); }
    if (b.id === "dCancel") { view.dep = false; return render(); }
    if (ds.dpay) { depForm.payeur = ds.dpay; return render(); }
    if (ds.r) { depForm.regle = ds.r; return render(); }
    if (b.id === "dSave") { var m = parseNum(document.getElementById("dM").value); if (!m) return toast("Indiquez un montant."); depenses.unshift({ d: todayFr(), lib: document.getElementById("dLib").value || "Dépense", cat: depForm.cat, m: m, payeur: depForm.payeur, regle: depForm.regle, pct: depForm.pct, isNew: true }); view.dep = false; save(1); toast(savedMsg("Dépense enregistrée.")); return render(); }
    if (ds.year) { bilanYear = ds.year; bilanYearUser = true; return render(); }
    if (b.id === "cfSave") {
      var u = document.getElementById("cfUrl").value.trim(), cd = document.getElementById("cfCode").value.trim();
      if (u && u.indexOf("https://script.google.com/") !== 0) return toast("L’adresse doit commencer par https://script.google.com/");
      CONF.url = u; CONF.code = cd; CONF.moi = document.getElementById("cfMoi").value; CONF.lastSync = ""; dbSave();
      if (CONF.moi) { startPilote = CONF.moi; corrForm.who = CONF.moi; }
      Sync.status = ""; ui.conn = !(CONF.url && CONF.code);
      if (CONF.url && CONF.code) { toast("Synchronisation…"); Sync.run().then(function () { toast(Sync.status === "ok" ? "Synchronisé avec la base partagée." : "Synchronisation impossible : " + Sync.lastError); render(); }); }
      return render();
    }
    if (b.id === "cfSync") { toast("Synchronisation…"); Sync.run().then(function () { toast(Sync.status === "ok" ? "Synchronisé." : "Synchronisation impossible : " + Sync.lastError); render(); }); return; }
    if (b.id === "xlsExport") return exportExcel();
    if (b.id === "updCheck") return checkUpdate(true);
    if (ds.coll) { ui[ds.coll] = !ui[ds.coll]; return render(); }
    if (ds.docyear) { docYear = ds.docyear; return render(); }
  });
  function inListStart(pid) { return startList.some(function (p) { return p.pid === pid; }); }
  function newPart(pp) { var host = pp.c === "EXT" ? (sortie.active ? (famOf(participant(sortie.pilote) || { pid: "yann" }) || "YC") : "YC") : CATF[pp.c]; return { pid: pp.id, role: "ski", host: host, fact: pp.c === "EXT" }; }

  screen.addEventListener("input", function (e) {
    var el = e.target;
    if (el.dataset.f && el.tagName === "INPUT") { findTour(Number(el.dataset.id))[el.dataset.f] = el.value.replace(/\D/g, ""); return; }
    if (el.dataset.spec) { var key = el.dataset.spec; SPEC[key] = el.classList.contains("txt") ? el.value : parseNum(el.value); return; }
    if (el.id === "cDeb") { sortie.compteurDeb = parseNum(el.value); sortie.debEdited = true; var wd = document.getElementById("cDebWarn"); if (wd) wd.innerHTML = startWarnHtml(parseNum(el.value)); return; }
    if (el.id === "cFin") { sortie.compteurFin = parseNum(el.value); document.getElementById("recapCard").innerHTML = recapHtml(Date.now()); }
    if (el.id === "dM" || el.id === "dPct") depPreview();
    if (el.id === "aL" || el.id === "aP") achatPreview();
  });
  screen.addEventListener("change", function (e) {
    var el = e.target;
    if (el.dataset.f && el.tagName === "SELECT") { var t = findTour(Number(el.dataset.id)); t[el.dataset.f] = el.value; if (el.dataset.f === "act") { t.speed = ""; t.passes = ""; } save(1); return render(); }
    if (el.dataset.f && el.tagName === "INPUT") { save(1); return; }
    if (el.dataset.spec) { save(1); toast("Fiche technique mise à jour."); return; }
    if (el.dataset.pf && el.type === "date") { // dates : enregistrées sans redessiner l'écran, sinon la saisie au clavier est interrompue
      var ppd = person(pilotSel); if (ppd) ppd[el.dataset.pf] = el.value;
      if (el.dataset.pf === "naissance") { var ag = document.getElementById("ageTxt"); if (ag) ag.textContent = ageTxt(el.value) || "date de naissance"; }
      persistAll(); return;
    }
    if (el.dataset.pf) { var ppf = person(pilotSel); if (ppf) ppf[el.dataset.pf] = el.value.trim(); return render(); }
    if (el.id === "cPhoto" && el.files && el.files[0]) {
      shrinkMeter(el.files[0]).then(function (ph) { sortie.photoCompteur = ph; save(1); toast("Photo du compteur jointe à la session."); render(); }).catch(function (er) { toast(er.message); });
      return;
    }
    if (el.id === "anGs") { // section choisie : si « nouvelle section », on affiche le champ de saisie (sans perdre ce qui est déjà tapé)
      var keep = { n: document.getElementById("anN").value, r: document.getElementById("anR").value, t: document.getElementById("anT").value };
      ui.annNewCat = el.value; render();
      document.getElementById("anN").value = keep.n; document.getElementById("anR").value = keep.r; document.getElementById("anT").value = keep.t;
      var ng = document.getElementById("anG"); if (ng) ng.focus();
      return;
    }
    if (el.dataset.startchk) { startChecks[el.dataset.startchk] = el.checked; return; }
    if (el.id === "nPar") { noteForm.auteur = el.value; return; }
    if (el.id === "nCat") { noteForm.cat = el.value; var lb = document.querySelector('label[for="nTxt"]'); if (lb) lb.textContent = "Note" + (el.value === NOTE_CATS[NOTE_CATS.length - 1] ? " (à préciser)" : ""); return; }
    if (el.dataset.ann !== undefined) { var ca = (SPEC.annuaire || [])[Number(el.dataset.ann)]; if (ca) { ca[el.dataset.ak] = el.value.trim(); persistAll(); } return; }
    if (el.dataset.pfc) { var ppc = person(pilotSel); if (ppc) ppc[el.dataset.pfc] = el.checked; return render(); } // cases à cocher (permis)
    if (el.dataset.pfo) { // performances : « slalom.bestV », « wake.corde »…
      var ppo = person(pilotSel), kp = el.dataset.pfo.split(".");
      if (ppo) { var grp = {}; Object.keys(ppo[kp[0]] || {}).forEach(function (k) { grp[k] = ppo[kp[0]][k]; }); grp[kp[1]] = el.value; ppo[kp[0]] = grp; }
      return render();
    }
    if (el.id === "pfPhoto" && el.files && el.files[0]) {
      var pph = person(pilotSel);
      shrinkPhoto(el.files[0], 280, 0.72).then(function (ph) { if (pph) { pph.photo = ph; toast("Photo de " + pph.name + " enregistrée."); render(); } }).catch(function (er) { toast(er.message); });
      return;
    }
    if (el.dataset.famphoto && el.files && el.files[0]) {
      var ff = el.dataset.famphoto;
      shrinkPhoto(el.files[0], 160, 0.75).then(function (ph) { var fp = {}; Object.keys(SPEC.famPhotos || {}).forEach(function (k) { fp[k] = SPEC.famPhotos[k]; }); fp[ff] = ph; SPEC.famPhotos = fp; toast("Photo de la " + FAM[ff].l + " enregistrée."); render(); }).catch(function (er) { toast(er.message); });
      return;
    }
    if (el.id === "cWho") { corrForm.who = el.value; return; }
    if (el.dataset.mnt) { maint[Number(el.dataset.mnt)][el.dataset.mnf] = el.value; save(1); return render(); }
    if (el.id === "pilDef") { sortie.pilote = el.value; sortie.tours.forEach(function (t) { if (t.state === "wait") t.pilote = el.value; }); save(1); return render(); }
    if (el.id === "pilStart") { startPilote = el.value; return; }
    if (el.id === "bWho") { bilanWho = el.value; return render(); }
    if (el.id === "dCat") { depForm.cat = el.value; CATS.forEach(function (c) { if (c[0] === el.value) depForm.regle = c[1]; }); return render(); }
    if (el.id === "docFile" && el.files && el.files.length) {
      Array.prototype.forEach.call(el.files, function (f) { var g = guessDoc(f.name, f.lastModified); docPending.push({ file: f, cat: g.cat, y: g.y, pid: g.pid }); });
      return render();
    }
    if (el.dataset.pi !== undefined) { var itp = docPending[Number(el.dataset.pi)]; if (itp) itp[el.dataset.pk] = el.value.trim(); return; }
    if (el.id === "pjFile" && el.files && el.files.length) {
      var typ = document.getElementById("pjType").value;
      addDocs(Array.prototype.map.call(el.files, function (f) { return { file: f, cat: typ, y: guessDoc(f.name, f.lastModified).y, pid: pilotSel }; }));
      return;
    }
    if (el.id === "impFile" && el.files && el.files[0]) {
      var rdr = new FileReader();
      rdr.onload = function () { try { var js = JSON.parse(rdr.result), n = importHistorique(js); toast(n + (js.annuaire && !js.sessions ? " contacts ajoutés à l’annuaire urgence." : js.format === "carnet-noskids-sauvegarde" ? " lignes restaurées depuis la sauvegarde." : " lignes d’historique importées.")); render(); } catch (er) { toast(er.message); } };
      rdr.readAsText(el.files[0]); return;
    }
  });

  /* Jauge : aiguille déplaçable */
  var dragSvg = null;
  function setGauge(svg, v) {
    var key = svg.getAttribute("data-gauge");
    if (key === "start") startJauge = v; else if (key === "fin") sortie.jaugeFin = v;
    var n = gPt(v, 90), nd = svg.querySelector("[data-needle]"); nd.setAttribute("x2", n[0].toFixed(1)); nd.setAttribute("y2", n[1].toFixed(1));
    svg.setAttribute("aria-valuenow", v); svg.setAttribute("aria-valuetext", fracLabel(v));
    var rd = screen.querySelector('[data-gread="' + key + '"]'); if (rd) rd.innerHTML = gaugeRead(v);
    if (key === "fin") { var c = document.getElementById("consoEst"); if (c) c.innerHTML = consoEstHtml(); }
  }
  function gaugeFromEvent(svg, e) {
    var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * 240 / r.width, y = (e.clientY - r.top) * 236 / r.height;
    var deg = Math.atan2(GC.y - y, x - GC.x) * 180 / Math.PI; if (deg < -90) deg += 360;
    return Math.max(0, Math.min(16, Math.round((G0 - deg) / GSWEEP * 16)));
  }
  screen.addEventListener("pointerdown", function (e) { var svg = e.target.closest && e.target.closest("svg[data-gauge]:not([data-ro])"); if (!svg) return; dragSvg = svg; try { svg.setPointerCapture(e.pointerId); } catch (err) {} setGauge(svg, gaugeFromEvent(svg, e)); e.preventDefault(); });
  screen.addEventListener("pointermove", function (e) {
    if (dragSvg) return setGauge(dragSvg, gaugeFromEvent(dragSvg, e));
    var hit = e.target.closest && e.target.closest("svg[data-chart]"); var tip = document.getElementById("cTip"), cross = document.getElementById("cCross");
    if (!hit || !tip || !chartPts.length) { if (tip) tip.hidden = true; if (cross) cross.setAttribute("visibility", "hidden"); return; }
    var r = hit.getBoundingClientRect(), x = (e.clientX - r.left) * 340 / r.width, best = chartPts[0];
    chartPts.forEach(function (p) { if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; });
    cross.setAttribute("x1", best.x); cross.setAttribute("x2", best.x); cross.setAttribute("visibility", "visible");
    tip.hidden = false; tip.style.left = (best.x / 340 * r.width) + "px"; tip.style.top = (best.y / 190 * r.height) + "px";
    tip.textContent = best.d + " · " + int0.format(best.cum) + " min · " + dec2.format(best.v) + " €/min";
  });
  screen.addEventListener("pointerleave", function () { var tip = document.getElementById("cTip"), cross = document.getElementById("cCross"); if (tip) tip.hidden = true; if (cross) cross.setAttribute("visibility", "hidden"); });
  function endDrag() { if (dragSvg) { dragSvg = null; save(1); } }
  screen.addEventListener("pointerup", endDrag);
  screen.addEventListener("pointercancel", endDrag);
  screen.addEventListener("keydown", function (e) {
    var svg = e.target.closest && e.target.closest("svg[data-gauge]:not([data-ro])"); if (!svg) return;
    var v = Number(svg.getAttribute("aria-valuenow"));
    if (e.key === "ArrowRight" || e.key === "ArrowUp") v++; else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v--; else return;
    e.preventDefault(); setGauge(svg, Math.max(0, Math.min(16, v)));
  });

  /* ---------- Démarrage ---------- */
  loadArrays();
  (function restoreSession() {
    var saved = LS.get("enCours", null);
    if (saved && saved.active) { sortie = saved; (sortie.tours || []).forEach(function (t) { if (t.id >= nextId) nextId = t.id + 1; }); }
    else sortie.compteurDeb = lastCompteur();
  })();
  if (CONF.moi) { startPilote = CONF.moi; corrForm.who = CONF.moi; }
  window.addEventListener("online", function () { updateNet(); Sync.run(); });
  window.addEventListener("offline", updateNet);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") Sync.run(); });
  setInterval(function () { Sync.run(); }, 120000);

  /* Mises à jour de l'app : le service worker télécharge la nouvelle version, l'utilisateur l'active. */
  var swReg = null;
  function showUpdate() { var bar = document.getElementById("updBar"); if (bar) bar.hidden = false; }
  function checkUpdate(manual) {
    if (!swReg) { if (manual) toast("Version " + APP_VERSION + ". Mise à jour automatique indisponible ici."); return; }
    swReg.update().then(function () { if (swReg.waiting) showUpdate(); else if (manual) toast("Vous avez la dernière version (" + APP_VERSION + ")."); }).catch(function () { if (manual) toast("Pas de réseau : réessayez plus tard."); });
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      swReg = reg; if (reg.waiting) showUpdate();
      reg.addEventListener("updatefound", function () { var w = reg.installing; if (w) w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) showUpdate(); }); });
    }).catch(function () { /* hors https ou navigateur non compatible */ });
    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (!reloading) { reloading = true; location.reload(); } });
  }
  var updBtn = document.getElementById("updBtn");
  if (updBtn) updBtn.addEventListener("click", function () { if (swReg && swReg.waiting) swReg.waiting.postMessage("skipWaiting"); else location.reload(); });

  setInterval(function () {
    if (!sortie.active) return;
    var now = Date.now();
    document.querySelectorAll("[data-timer]").forEach(function (el) {
      var k = el.dataset.timer;
      if (k === "engine") el.textContent = fmtClock(engineMs(now));
      else if (k === "total") el.textContent = fmtClock(totalMs(now));
      else { var t = findTour(Number(k.slice(1))); if (t) el.textContent = fmtClock(tourMs(t, now)); }
    });
    updateTheo();
  }, 500);

  updateNet();
  render();
  Sync.run();
})();
