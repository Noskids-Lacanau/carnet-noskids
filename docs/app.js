(function () {
  "use strict";
  /* ---------- Référentiel ---------- */
  var FAM = { YC: { n: "Famille Yann", l: "famille Yann", s: "Yann", t: "Y" }, OC: { n: "Famille Olivier", l: "famille Olivier", s: "Olivier", t: "O" } };
  var CAT = { YF: "Famille Yann", OF: "Famille Olivier", EXT: "Extérieurs" };
  var CATF = { YF: "YC", OF: "OC" };
  var PEOPLE = [
    // histWake : part de wake (%) dans le temps de tours de l'historique 2024-2025, qui n'a pas le détail ski / wake (le reste est du ski, surtout du slalom)
    { id: "yann", name: "Yann", c: "YF", histWake: 10 }, { id: "pascale", name: "Pascale", c: "YF" }, { id: "elsa", name: "Elsa", c: "YF", histWake: 95 },
    { id: "baptiste", name: "Baptiste", c: "YF", histWake: 80 }, { id: "eve", name: "Eve", c: "YF" },
    { id: "olivier", name: "Olivier", c: "OF" }, { id: "fiorella", name: "Fiorella", c: "OF" }, { id: "thao", name: "Thao", c: "OF" },
    { id: "malou", name: "Malou", c: "OF" }, { id: "calie", name: "Calie", c: "OF" },
    { id: "julien", name: "Julien", c: "EXT" }, { id: "jessica", name: "Jessica", c: "EXT" }, { id: "louca", name: "Louca", c: "EXT" }, { id: "julian", name: "Julian", c: "EXT" },
    { id: "mateu", name: "Mateu", c: "EXT", kid: true, parent: "julien" }, { id: "alba", name: "Alba", c: "EXT", kid: true, parent: "julien" }, // v1.9.9 : enfants de Julien, moins de 10 ans (tarif enfant au camping)
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
    venteAncien: 25000, reservoir: 125, conso: 13, hAchat: 1950, hVie: 4000, valMoteur: 13000, prix: 22000, ans: 15, bidon: 20, tarif: 1,
    /* Annuaire urgence - dépannage : numéros publics (société, police du lac, association), modifiables dans l'app */
    annuaire: [
      { id: "ann-ss-roland", g: "Sport Service Pitrot", n: "Roland Jamin", r: "", t: "06 41 76 79 43" },
      { id: "ann-ss-hugo", g: "Sport Service Pitrot", n: "Hugo", r: "", t: "06 27 11 53 40" },
      { id: "ann-police-lac", g: "Police du lac", n: "Police du lac", r: "", t: "06 85 92 05 58" },
      { id: "ann-snlg-president", g: "Association SNLG", n: "Marc Sourty", r: "président", t: "06 87 61 62 55" },
      { id: "ann-snlg-moniteur", g: "Association SNLG", n: "Yvan", r: "moniteur", t: "06 44 31 68 28" },
      { id: "ann-snlg-secretariat", g: "Association SNLG", n: "Véronique", r: "secrétariat", t: "06 60 46 14 23" }
    ] };
  function person(id) { for (var i = 0; i < PEOPLE.length; i++) if (PEOPLE[i].id === id) return PEOPLE[i]; return null; }

  /* ---------- Bilans par année : recalculés à partir des sessions, des dépenses et des achats ---------- */
  var YEARS = {};
  var FIXED_CATS = { "Assurance": "assurance", "Adhésion": "adhesions", "Taxes": "taxes", "Taxe / corps mort lac": "taxes" };
  function computeYears() {
    YEARS = {};
    function Y(y) { return YEARS[y] || (YEARS[y] = { min: 0, ext: 0, fam: { YC: 0, OC: 0 }, fixes: 0, fx: { assurance: 0, adhesions: 0, taxes: 0 }, essence: 0, litres: 0, lnote: "achetés dans l’année", commun: 0, meca: 0, pmap: {}, curve: [], cum: 0 }); }
    sessionsArr.slice().sort(function (a, b) { return dkey(a) < dkey(b) ? -1 : 1; }).forEach(function (s) {
      var yk = yearOf(s); if (!yk) return; var y = Y(yk), m = Number(s.engineMin) || 0;
      y.min += m; y.fam.YC += (s.famMin && Number(s.famMin.YC)) || 0; y.fam.OC += (s.famMin && Number(s.famMin.OC)) || 0;
      y.commun += Number(s.commun) || 0; y.meca += Number(s.meca) || 0;
      Object.keys(s.minutes || {}).forEach(function (pid) {
        var p = person(pid), nm = p ? p.name : pid, f = p ? (p.c === "EXT" ? (p.host || "YC") : CATF[p.c]) : "YC";
        if (!y.pmap[nm]) y.pmap[nm] = [nm, f, 0, 0]; y.pmap[nm][2] += Number(s.minutes[pid]) || 0; y.pmap[nm][3] += 1;
        if (p && p.c === "EXT") y.ext += Number(s.minutes[pid]) || 0; // v2.0 : temps des extérieurs (déjà compté dans la famille qui invite)
      });
      y.cum += m;
      if (m > 0) { var dd = isoToFr(dkey(s)).slice(0, 5), last = y.curve[y.curve.length - 1]; if (last && last[1] === dd) last[0] = y.cum; else y.curve.push([y.cum, dd]); }
    });
    depenses.forEach(function (d) { var yk = yearOf(d); if (!yk) return; var y = Y(yk), fx = FIXED_CATS[d.cat]; if (d.cat === "Essence") y.essence += Number(d.m) || 0; if (fx) { y.fixes += Number(d.m) || 0; y.fx[fx] += Number(d.m) || 0; } });
    moves.forEach(function (mv) { if (isAchat(mv) && mv.litres && yearOf(mv)) Y(yearOf(mv)).litres += Number(mv.litres) || 0; });
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
  var APP_VERSION = "2.0.4", SCHEMA = 1;
  var tab = "accueil", nextId = Date.now() % 100000, picker = null, startList = [], startJauge = 16, startPilote = "yann";
  var sortie = { active: false, compteurDeb: 0, tours: [], participants: [] };
  var gap = { open: false, rat: "auto", key: "" };
  var sessionsArr = [], bidons = [], dettes = [], moves = [], depenses = [];
  var notes = []; // journal : rangé dans la table « etat » (kind = "note"), sans changement côté serveur
  var resas = []; // v1.9.9 : réservations du camping, table « etat » (kind = "resa"), indépendantes des dépenses du bateau
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
  var achatForm = { verse: false, plein: true, f: "", b: 2, step: null, L: 0, P: 0, tfOpen: false, tf: "YC", tn: 1 }, miseForm = { plein: true, f: "YC", n: 1 };
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
    return { personnes: PEOPLE, sessions: sessionsArr, bidons: bidons, dettes: dettes, mouvements: moves, depenses: depenses, documents: flatDocs(), entretien: maint, parametres: [SPEC], etat: [ETAT].concat(notes).concat(resas).concat(cpTar ? [cpTar] : []).concat(cpLits ? [cpLits] : []).concat(cpEdl) };
  }
  function snapshotAll() { SNAP = {}; var cur = currentCollections(); COLS.forEach(function (c) { cur[c].forEach(function (r) { if (!r.id) r.id = uid(); SNAP[c + ":" + r.id] = strip(r); }); }); }
  /* Compare l'état affiché à la dernière version connue : ce qui a changé part dans la file d'envoi. */
  function persistAll() {
    if (typeof DEMO !== "undefined" && DEMO) return; // mode démo : rien n'est enregistré ni envoyé
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
    resas = vals("etat").filter(function (r) { return r.kind === "resa"; });
    cpTar = vals("etat").filter(function (r) { return r.kind === "camptarif"; })[0] || null; // v2.0 : tarifs du camping par année
    cpLits = vals("etat").filter(function (r) { return r.kind === "camplits"; })[0] || null; cpEdl = vals("etat").filter(function (r) { return r.kind === "edl"; }); // v2.0 : lits et états des lieux du camping
    DOC_CATS.forEach(function (c) { docs[c] = []; });
    vals("documents").forEach(function (d) { (docs[d.cat] || docs["Autres"]).push(d); });
    vals("entretien").forEach(function (m) { if (maint[m.i]) maint[m.i] = m; });
    var sp = DB.parametres.spec; if (sp && !sp.deleted) Object.keys(sp).forEach(function (k) { SPEC[k] = sp[k]; });
    var et = DB.etat.etat; if (et && !et.deleted) { ETAT = et; lastPlein = et.lastPlein || ""; lastLevel = et.lastLevel != null ? et.lastLevel : 16; lastLevelDate = et.lastLevelDate || ""; if (!ETAT.gapsRecherche) ETAT.gapsRecherche = []; }
    // hivernage 2026 : le bateau a été hiverné réservoir vide (jauge en bas) ; appliqué une seule fois, puis partagé
    snapshotAll();
    // seulement pendant l'hiver et s'il n'y a eu aucune session depuis : un téléphone rouvert en saison n'écrase pas le vrai niveau
    var rz = moves.filter(function (m) { return m.type === "reset" && m.at; }).map(function (m) { return m.at; }).sort().pop();
    if (rz && !sessionsArr.some(function (s) { return sesKey(s) > rz; }) && !moves.some(function (m) { return (m.type === "verse" || (m.type === "achat" && m.verse && !m.annule)) && !m.annule && (m.at || "") > rz; })) { lastLevel = 0; lastLevelDate = "remise à zéro du " + isoToFr(rz.slice(0, 10)); }
    if (et && !et.deleted && !ETAT.hiver2026 && todayIso() < "2027-03-01" && !sessionsArr.some(function (s) { return dkey(s) >= "2026-11-24"; })) { lastLevel = 0; lastLevelDate = "hivernage 2026"; ETAT.hiver2026 = true; } // après la photo : la modification part à la base partagée
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
      if (!CONF.url || !CONF.code || Sync.busy || !navigator.onLine || (typeof DEMO !== "undefined" && DEMO)) { updateNet(); return Promise.resolve(); }
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
        var n = mergeRemote(res.records || []); CONF.lastSync = res.serverTime || CONF.lastSync; if (res.sheetUrl) CONF.sheetUrl = res.sheetUrl; dbSave();
        Sync.busy = false; Sync.status = "ok"; Sync.lastError = "";
        if (n) { loadArrays(); render(); } else updateNet();
        if (annCampAdd()) render(); // v2.0 : rubrique Camping, ajoutée seulement sur des données fraîchement synchronisées
        if (QUEUE.length) Sync.soon();
      }).catch(function (e) { Sync.busy = false; Sync.status = "err"; Sync.lastError = String((e && e.message) || e); updateNet(); });
    }
  };

  function save() { /* l'enregistrement se fait à chaque affichage (persistAll) */ }
  /* v2.0 : rubrique « Camping » des contacts (Centre de voile EDF, Accueil camping, numéros à compléter), ajoutée une seule fois.
     Seulement après une synchronisation réussie (ou sur une appli non connectée) : un téléphone pas à jour n'écrase pas l'annuaire partagé. */
  function annCampAdd() {
    var ch = false;
    if (!SPEC.annCamp) {
      if (!(SPEC.annuaire || []).some(function (c) { return /camping/i.test(c.g || ""); }))
        SPEC.annuaire = (SPEC.annuaire || []).concat([{ id: uid(), g: "Camping", n: "Centre de Voile EDF", r: "", t: "" }, { id: uid(), g: "Camping", n: "Accueil camping", r: "", t: "" }]);
      SPEC.annCamp = true; ch = true;
    }
    // v2.0 : rubrique VLG retirée (contacts et catégorie), « Centre de Voile » avec une majuscule
    if (!SPEC.annV2) {
      SPEC.annuaire = (SPEC.annuaire || []).filter(function (c) { return !/^\s*vlg\s*$/i.test(c.g || ""); }).map(function (c) { if (/^centre de voile/i.test(c.n || "")) c.n = c.n.replace(/^centre de voile/i, "Centre de Voile"); return c; });
      SPEC.annV2 = true; ch = true;
    }
    return ch;
  }
  function netState() { if (!CONF.url || !CONF.code) return "local"; if (!navigator.onLine) return "off"; if (Sync.status === "err") return "err"; if (QUEUE.length || Sync.busy) return "send"; return "ok"; }
  function updateNet() {
    var el = document.getElementById("net"); if (!el) return; var s = netState();
    el.className = "net" + (s === "off" || s === "err" ? " off" : "");
    el.textContent = { ok: "● Synchro", local: "● Local", off: "● Hors ligne", err: "● Hors ligne", send: "● Envoi…" }[s];
    el.title = s === "err" ? Sync.lastError : QUEUE.length ? QUEUE.length + " modification(s) en attente" : CONF.lastSync ? "Dernière synchro : " + new Date(CONF.lastSync).toLocaleString("fr-FR") : "Base partagée non configurée (onglet Admin)";
  }
  function savedMsg(msg) { var s = netState(); return s === "off" || s === "err" ? msg.replace(/\.$/, "") + " sur le téléphone, envoi au retour du réseau." : msg; }
  /* Compteur moteur : la fin d'une session = compteur relevé à la clôture (pré-rempli avec départ + temps chronométré).
     Un écart de GAP_TOL ou moins avec le départ de la session suivante est ignoré (le compteur est peu précis, on suit le chrono). */
  var GAP_TOL = 10 / 60;
  function hasNum(v) { return v != null && v !== "" && !isNaN(Number(v)); }
  function sessionEnd(s) { return hasNum(s.compteurFin) ? Number(s.compteurFin) : Number(s.compteurDeb) + (Number(s.engineMin) || 0) / 60; }
  function lastCompteur() { var v = SPEC.hAchat || 0; sessionsArr.forEach(function (s) { if ((s.bateau || SPEC.devise) === SPEC.devise && hasNum(s.compteurDeb) && sessionEnd(s) > v) v = sessionEnd(s); }); return Math.round(v * 10) / 10; }
  /* Compteur moteur au départ : une session peut manquer (trou signalé), mais un écart de plus de 100 h (virgule oubliée…) est refusé ; un compteur plus bas ou un écart de plus de 10 h demande une vérification. */
  var CPT_MAX = 100;
  function cptStartCheck(v) {
    var last = lastCompteur(), d = v - last;
    if (!(v > 0)) return { block: "Saisissez le compteur moteur constaté au bateau." };
    if (Math.abs(d) > CPT_MAX) return { block: "Compteur refusé : " + dec1.format(v) + " h, soit " + int0.format(Math.abs(d)) + " h d’écart avec la dernière session (" + dec1.format(last) + " h). Virgule oubliée ? (ex. 1952,4 et non 19524)" };
    if (d < -GAP_TOL - 0.001) return { ask: "Compteur plus bas que la fin de la dernière session (" + dec1.format(last) + " h) : vérifiez la saisie." };
    if (d > 10) return { ask: "Écart de " + int0.format(d) + " h avec la dernière session (" + dec1.format(last) + " h) : vérifiez la saisie." };
    return {};
  }
  /* Compteur de fin d'une session : refusé s'il est plus bas que le départ ou s'il donne plus de 24 h ; vérification s'il s'écarte de plus de 30 min du temps moteur de l'app. */
  function cptEndCheck(c1, c2, eMin) {
    var d = c2 - c1;
    if (d < 0) return { block: "Compteur de fin (" + dec1.format(c2) + " h) plus petit que le départ (" + dec1.format(c1) + " h) : saisie refusée." };
    if (d > 24) return { block: "Compteur de fin refusé : " + int0.format(d) + " h pour une seule session. Virgule oubliée ? (ex. 1952,4 et non 19524)" };
    if (eMin != null && Math.abs(d * 60 - eMin) > 30) return { ask: "Le compteur donne " + hm(d * 60) + " de moteur, l’app " + hm(eMin) + " : vérifiez le compteur de fin." };
    return {};
  }
  /* Saisie douteuse : premier appui = avertissement, deuxième appui sur la même valeur = confirmation. */
  function cptConfirm(key, chk) {
    if (chk.block) { toast(chk.block); return false; }
    if (!chk.ask || ui.cptOk === key) return true;
    ui.cptOk = key; toast(chk.ask + " Appuyez de nouveau pour confirmer."); return false;
  }
  function startWarnHtml(val) {
    var c0 = cptStartCheck(val); if (c0.block && val > 0) return '<div class="alert bad"><b>' + esc(c0.block) + "</b></div>";
    var last = lastCompteur(), d = (val - last) * 60;
    if (!sessionsArr.some(function (s) { return (s.bateau || SPEC.devise) === SPEC.devise && hasNum(s.compteurDeb); }) || Math.abs(d) <= GAP_TOL * 60 + 0.01) return "";
    return d > 0 ? '<div class="alert"><b>Écart de ' + hm(d) + " avec la fin de la dernière session (" + dec1.format(last) + " h).</b>Une session a-t-elle été oubliée ? Vous pouvez démarrer quand même : le trou sera signalé sur l’accueil et dans la liste des sessions, et pourra être rattrapé.</div>"
      : '<div class="alert"><b>Compteur plus bas de ' + hm(-d) + " que la fin de la dernière session (" + dec1.format(last) + " h).</b>Vérifiez la saisie.</div>";
  }

  /* ---------- Jauge ronde, de E (sous l'horizontale à gauche) à F (sous l'horizontale à droite) ---------- */
  var GC = { x: 120, y: 118 }, G0 = 210, GSWEEP = 240;
  function fracLabel(v) { if (v <= 0) return "Vide"; if (v >= 16) return "Plein"; var n = v, d = 16; while (n % 2 === 0) { n /= 2; d /= 2; } return n + "/" + d; }
  function gPt(v, r) { var a = (G0 - v / 16 * GSWEEP) * Math.PI / 180; return [GC.x + r * Math.cos(a), GC.y - r * Math.sin(a)]; }
  function gaugeRead(v, eq) {
    // v1.9.6 : écran Session, « 3/4 = 94 L sur 125 L » ; v1.9.7 : rouge jusqu'à 1/8, orange à 3/16, vert au-delà
    if (eq) return '<span class="gq ' + (v <= 2 ? "gq-r" : v <= 3 ? "gq-o" : "gq-g") + '"><b>' + fracLabel(v) + "</b> = " + Math.round(v / 16 * SPEC.reservoir) + " L sur " + SPEC.reservoir + " L</span>";
    return "<b>" + fracLabel(v) + '</b><span class="gr-sep"> · </span>≈ ' + Math.round(v / 16 * SPEC.reservoir) + " L sur " + SPEC.reservoir;
  }
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
    var cap = b ? Math.max(SPEC.bidon, Number(b.cap) || 0, b.litres) : SPEC.bidon; // un bidon de 20 L (jusqu'à 25 L) : un bidon pas plein est colorié à proportion de son remplissage
    var lvl = b ? Math.max(0, Math.min(1, b.litres / cap)) : 0, h = 44 * lvl, id = "cc" + i + Math.random().toString(36).slice(2, 6);
    var body = "M8 16 h28 l12 12 v30 a4 4 0 0 1 -4 4 h-36 a4 4 0 0 1 -4 -4 v-38 a4 4 0 0 1 4 -4 z";
    return '<span class="can ' + (b ? b.f : "empty") + '"><svg viewBox="0 0 52 66" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs>' +
      (b ? '<rect class="lvl" clip-path="url(#' + id + ')" x="0" y="' + (62 - h) + '" width="52" height="' + h + '"/>' : "") +
      '<path class="body-out" d="' + body + '"/><path class="hdl" d="M14 16 v-8 h14 v8"/><path class="hdl" d="M40 12 l7 -7"/></svg>' +
      "<span>" + (b ? int0.format(b.litres) + " L" : "vide") + "</span></span>";
  }
  function cansHtml(list, cls) { list = list || bidons; var h = '<div class="cans ' + (cls || "") + '">'; for (var i = 0; i < 5; i++) h += canSvg(list[i] || null, i); return h + "</div>"; }
  function detteHtml(d) {
    var other = d.note ? " (" + esc(d.note) + ")" : "";
    var what = d.cans ? half(d.cans) + " bidon(s) (≈ " + eur.format(d.eur) + ")" : eur.format(d.eur);
    if (d.kind === "essence") return '<div class="alert"><b>Balance essence : ' + FAM[d.from].s + " doit " + eur.format(d.eur) + " à " + FAM[d.to].s + "</b>" + esc(d.note || "") + ". À régler par virement, puis à noter dans les dépenses (« " + REGL + " »).</div>";
    return '<div class="alert"><b>' + FAM[d.from].s + " doit " + what + " à " + FAM[d.to].s + "</b>" + (other ? other.slice(2, -1) + ". " : "") + "Réglé à la prochaine balance.</div>";
  }
  function stockL() { return bidons.reduce(function (a, b) { return a + b.litres; }, 0); }
  function stockEur() { return bidons.reduce(function (a, b) { return a + b.litres * b.prix; }, 0); }
  function stockN() { return bidons.length; }
  /* Bidons disponibles pour un versement, au demi-bidon : un bidon entamé de moitié compte pour ½. On ne peut pas verser plus que le stock. */
  function stockCans() { return bidons.reduce(function (a, b) { var c = Number(b.cap) || Math.max(SPEC.bidon, b.litres); return a + Math.min(1, Math.ceil(b.litres / c * 2 - 0.02) / 2); }, 0); }
  function stockMaxTxt(n) { var m = stockCans(); return n >= m ? '<div class="small muted">' + (m ? "C’est tout le stock (" + half(m) + " bidon" + (m > 1 ? "s" : "") + ")." : "Le stock est vide.") + "</div>" : ""; }
  /* Horodatage local (AAAA-MM-JJTHH:MM:SS) : sert à remettre sessions et versements dans l'ordre pour la balance essence */
  function stamp(d) { d = d || new Date(); var p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()); }
  /* Prélève n bidons (entiers, ou un demi) pour la famille f : ses bidons d'abord, du plus ancien au plus récent, puis ceux de l'autre famille.
     Chaque bidon reste compté pour la famille qui l'a payé : c'est la balance essence qui répartit ensuite selon le temps de chacun. */
  function planPrelevement(n, f) {
    var idx = bidons.map(function (b, i) { return i; });
    var order = idx.filter(function (i) { return bidons[i].f === f; }).concat(idx.filter(function (i) { return bidons[i].f !== f; }));
    var left = n, takes = [];
    order.forEach(function (i) {
      if (left <= 0.001) return;
      var b = bidons[i], part = left >= 1 ? 1 : left, lit = part >= 1 ? b.litres : Math.min(b.litres, (b.cap || SPEC.bidon) * part);
      takes.push({ i: i, f: b.f, litres: lit, eur: lit * b.prix, cans: part }); left -= part;
    });
    return { takes: takes, manque: Math.max(0, left) };
  }
  function planText(plan) {
    if (!plan.takes.length) return "Le stock est vide.";
    var c = { YC: 0, OC: 0 }, lit = 0;
    plan.takes.forEach(function (t) { c[t.f] = (c[t.f] || 0) + t.cans; lit += t.litres; });
    var parts = []; ["YC", "OC"].forEach(function (f) { if (c[f]) parts.push(half(c[f]) + " payé" + (c[f] > 1 ? "s" : "") + " par la " + FAM[f].l); });
    return "Bidons vidés : " + parts.join(", ") + " (≈ " + int0.format(lit) + " L)." + (plan.manque > 0.01 ? " Il manque " + half(plan.manque) + " bidon(s) dans le stock." : "");
  }
  function simulateStock(plan, addB, addL, addF) {
    var c = bidons.map(function (b) { return { f: b.f, litres: b.litres, prix: b.prix, cap: b.cap }; });
    plan.takes.forEach(function (t) { c[t.i].litres -= t.litres; });
    c = c.filter(function (b) { return b.litres > 0.01; });
    for (var k = 0; k < (addB || 0); k++) c.push({ f: addF, litres: addL / addB, cap: addL / addB, prix: 0 });
    return c;
  }
  /* Versement dans le réservoir : noté avec son coût par famille payeuse et l'indication « plein », pour la balance essence. */
  function applyPrelevement(plan, f, ctx, plein) {
    var paye = { YC: 0, OC: 0 }, lit = { YC: 0, OC: 0 };
    plan.takes.forEach(function (t) { bidons[t.i].litres -= t.litres; var pf = t.f === "OC" ? "OC" : "YC"; paye[pf] += t.eur; lit[pf] += t.litres; });
    bidons = bidons.filter(function (b) { return b.litres > 0.01; });
    var n = plan.takes.reduce(function (a, t) { return a + t.cans; }, 0), tot = lit.YC + lit.OC;
    moves.unshift({ type: "verse", at: stamp(), date: todayIso(), d: todayFr(), t: "Versement" + (ctx ? " " + ctx : ""), v: half(n) + " bidon(s) · " + int0.format(tot) + " L", who: FAM[f].n + (plein ? " · plein" : ""),
      litres: Math.round(tot * 10) / 10, cout: Math.round((paye.YC + paye.OC) * 100) / 100, paye: { YC: Math.round(paye.YC * 100) / 100, OC: Math.round(paye.OC * 100) / 100 }, plein: !!plein });
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
  function stopEngine() { // fin de session : le moteur est arrêté, le temps moteur est figé
    if (sortie.engine !== "on") return;
    var now = Date.now(), r = running(); if (r) { r.acc += now - r.since; r.since = null; r.state = "pause"; r.pauses += 1; }
    sortie.engAcc += now - sortie.engSince; sortie.engine = "off";
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
    if (t.act === "slalom") { if (t.speed) s += " · " + t.speed + " km/h"; if (t.passes) s += " · " + t.passes + " passage" + (t.passes > 1 ? "s" : ""); if (t.res && (t.res.c || t.res.note)) s += " · " + resSummary(t.res); }
    if ((t.act === "wake" || t.act === "ski") && t.speed) s += " · " + t.speed + " km/h";
    return s;
  }
  /* ---------- Résultats de slalom (v1.9.4) ----------
     Par tour de skieur : meilleure vitesse, corde, bouées (au demi) et note de 1 à 4 étoiles (tour.res).
     Par session : état du plan d'eau (session.eau). Saisie pendant le tour, à la fin du skieur (écran horizontal),
     à la clôture, ou plus tard dans le détail de la session. Clé de saisie : « t:<id du tour> » (session en cours)
     ou « s:<id de session>:<n° du tour> » (session enregistrée) ; « live » ou « s:<id> » pour le plan d'eau. */
  var RES_BOUEES = []; for (var rb = 0; rb <= 12; rb++) RES_BOUEES.push(rb / 2);
  var EAUX = [
    ["plate", "Magnifique, plate", '<svg viewBox="0 0 34 22" aria-hidden="true"><circle cx="26" cy="6" r="3.5"/><path d="M2 15h30M6 19h22"/></svg>'],
    ["clapot", "Petit clapot", '<svg viewBox="0 0 34 22" aria-hidden="true"><path d="M2 9q3-2 6 0t6 0 6 0 6 0 6 0M2 16q3-2 6 0t6 0 6 0 6 0 6 0"/></svg>'],
    ["vagues", "Vagues de bateau", '<svg viewBox="0 0 34 22" aria-hidden="true"><path d="M2 17q5-9 10 0t10 0 10 0"/><path d="M4 10l5-4h8l3 4z"/></svg>'],
    ["agite", "Agité", '<svg viewBox="0 0 34 22" aria-hidden="true"><path d="M2 14q4-8 8 0t8 0 8 0 8 0M2 20q4-5 8 0t8 0 8 0"/><path d="M4 4h12M8 7h12"/></svg>']];
  function eauLabel(k) { var e = EAUX.filter(function (x) { return x[0] === k; })[0]; return e ? e[1] : ""; }
  function resTour(key) {
    var p = String(key).split(":");
    if (p[0] === "t") return findTour(Number(p[1]));
    if (p[0] === "s") { var s = sessionsArr.filter(function (x) { return x.id === p[1]; })[0]; return s && s.tours ? s.tours[Number(p[2])] : null; }
    return null;
  }
  function eauHolder(key) { if (key === "live") return sortie; var p = String(key).split(":"); return sessionsArr.filter(function (x) { return x.id === p[1]; })[0] || null; }
  function resFormHtml(key, res) {
    res = res || {};
    var sel = function (lab, f, opts) { return '<label class="res-s field"><span>' + lab + '</span><select data-res="' + esc(key) + "|" + f + '"><option value="">—</option>' + opts.map(function (o) { return '<option value="' + esc(String(o[0])) + '"' + (res[f] != null && String(res[f]) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; };
    return '<div class="res-g">' + sel("Meilleure vitesse", "v", SL_SPEEDS.map(function (v) { return [v, v + " km/h"]; })) + sel("Corde", "c", SL_CORDES.map(function (c) { return [c, c]; })) +
      sel("Bouées", "b", RES_BOUEES.map(function (b) { return [b, half(b)]; })) +
      '<div class="res-s"><span>Note du tour</span><div class="res-st">' + [1, 2, 3, 4].map(function (n) { return '<button type="button" class="st' + ((res.note || 0) >= n ? " on" : "") + '" data-rstar="' + esc(key) + "|" + n + '" aria-label="' + n + " étoile" + (n > 1 ? "s" : "") + '">★</button>'; }).join("") + "</div></div></div>";
  }
  function eauHtml(key, cur) { return '<div class="res-eau">' + EAUX.map(function (e) { return '<button type="button" class="eau' + (cur === e[0] ? " on" : "") + '" data-eau="' + esc(key) + "|" + e[0] + '">' + e[2] + "<span>" + e[1] + "</span></button>"; }).join("") + "</div>"; }
  function resSummary(r) { if (!r) return ""; var a = []; if (r.v) a.push(r.v + " km/h"); if (r.c) a.push(r.c); if (r.b != null && r.b !== "") a.push(half(r.b) + " bouée" + (Number(r.b) > 1 ? "s" : "")); if (r.note) a.push("★★★★".slice(0, r.note)); return a.join(" · "); }
  /* Saisie : sélecteur (vitesse, corde, bouées), étoile (un second appui sur la même retire la note), plan d'eau (idem). Renvoie true si traité. */
  function resInput(el) {
    if (el.dataset.res) { var p = el.dataset.res.split("|"), tr = resTour(p[0]); if (!tr) return true; var r = tr.res || (tr.res = {}), v = el.value; r[p[1]] = v === "" ? null : (p[1] === "c" ? v : Number(v)); bigKey = ""; render(); return true; }
    if (el.dataset.rstar) { var q = el.dataset.rstar.split("|"), tq = resTour(q[0]); if (!tq) return true; var rq = tq.res || (tq.res = {}), n = Number(q[1]); rq.note = rq.note === n ? 0 : n; bigKey = ""; render(); return true; }
    if (el.dataset.eau) { var w = el.dataset.eau.split("|"), hd = eauHolder(w[0]); if (!hd) return true; hd.eau = hd.eau === w[1] ? "" : w[1]; bigKey = ""; render(); return true; }
    return false;
  }
  function needsDetails(t) { return (t.act === "slalom" && (!t.speed || !t.passes || !t.res || !t.res.c)) || ((t.act === "wake" || t.act === "ski") && !t.speed); }
  function piloteOpts(cur) { return sortie.participants.map(function (p) { return '<option value="' + p.pid + '"' + (p.pid === cur ? " selected" : "") + ">" + esc(person(p.pid).name) + "</option>"; }).join(""); }
  function detailsHtml(t) {
    var h = '<div class="details">';
    if (t.pid) h += '<div class="two"><div class="field"><label for="act' + t.id + '">Activité</label><select id="act' + t.id + '" data-f="act" data-id="' + t.id + '">' + PERSO_ACTS.map(function (a) { return '<option value="' + a + '"' + (a === t.act ? " selected" : "") + ">" + ACTS[a] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="pil' + t.id + '">Pilote</label><select id="pil' + t.id + '" data-f="pilote" data-id="' + t.id + '">' + piloteOpts(t.pilote) + "</select></div></div>";
    if (t.act === "slalom") h += '<div class="two"><div class="field"><label for="sp' + t.id + '">Vitesse</label><select id="sp' + t.id + '" data-f="speed" data-id="' + t.id + '"><option value="">—</option>' + SLALOM_SPEEDS.map(function (v) { return '<option value="' + v + '"' + (Number(t.speed) === v ? " selected" : "") + ">" + v + " km/h</option>"; }).join("") + '</select></div><div class="field"><label for="ps' + t.id + '">Passages</label><input id="ps' + t.id + '" inputmode="numeric" data-f="passes" data-id="' + t.id + '" value="' + esc(t.passes) + '" placeholder="ex. 4"></div></div>';
    if (t.act === "wake" || t.act === "ski") h += '<div class="field"><label for="sp' + t.id + '">Vitesse (km/h)</label><input id="sp' + t.id + '" inputmode="numeric" data-f="speed" data-id="' + t.id + '" value="' + esc(t.speed) + '" placeholder="ex. 30"></div>';
    if (t.act === "slalom" && t.pid) h += '<div class="flabel res-h">Résultat du tour</div>' + resFormHtml("t:" + t.id, t.res) + (sortie.closing ? "" : '<div class="flabel res-h">Plan d’eau (pour toute la session)</div>' + eauHtml("live", sortie.eau)); // à la clôture, le plan d'eau a son propre encart
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
    if (!sortie.active) return view.manuel ? renderManuel() : renderStart();
    var now = Date.now(), r = running(), on = sortie.engine === "on", h = "";
    if (sortie.closing) { // fin de session : moteur arrêté, chrono figé, plus de bouton moteur
      h += '<div class="card engine closing-head"><div class="row"><div><div class="label">Session terminée · départ ' + dec1.format(sortie.compteurDeb) + " h</div>" +
        '<div class="clock">' + fmtClock(engineMs(now)) + '</div></div><span class="pill off">moteur arrêté</span></div>' +
        sumSesHtml(now) + "</div>";
      // v1.9.5 : plan d'eau de la session juste sous le premier encart
      h += '<div class="card clo-eau"><h3>Plan d’eau</h3>' + eauHtml("live", sortie.eau) + "</div>";
      return h + renderClosing(now);
    }
    h += '<div class="card engine"><div class="row"><div><div class="label">Temps moteur · départ ' + dec1.format(sortie.compteurDeb) + " h · jauge " + fracLabel(sortie.jaugeDeb) + ' · <span id="gpsV">' + gpsTxt() + "</span></div>" +
      '<div class="clock" data-timer="engine">' + fmtClock(engineMs(now)) + '</div></div><span class="pill ' + (on ? "on" : "off") + '">' + (on ? "moteur en route" : "moteur arrêté") + "</span></div>" +
      '<button class="btn big ' + (on ? "stop" : "run") + '" id="engBtn">' + (on ? "Arrêt moteur" : "Démarrer le moteur") + "</button>" +
      '<div class="two"><div class="field"><label for="pilDef">Pilote</label><select id="pilDef">' + piloteOpts(sortie.pilote) + '</select></div><div class="small muted" style="align-self:end">Tours : <span class="num" data-timer="total">' + fmtClock(totalMs(now)) + "</span><br>" + sortie.participants.length + " à bord</div></div>" +
      '<button class="btn ghost sm" id="bigOpenBtn">Grand affichage (à lire téléphone tourné)</button></div>';
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
    h += '<div class="card ski-zone"><div class="label">Nouveau tour</div><div class="chips">';
    sortie.participants.forEach(function (p) { h += '<button class="chip" data-newtour="' + p.pid + '">' + famDot(famOf(p)) + esc(person(p.pid).name) + "</button>"; });
    h += '</div><div class="chips"><button class="chip" data-newtour="balade">+ Balade (tout le bateau)</button><button class="chip" data-newtour="meca">+ Mécanique</button></div></div>';
    h += boardHtml();
    h += '<button class="btn big" id="goClose"' + (r ? " disabled" : "") + ">Clôturer la session</button>";
    if (r) h += '<p class="small muted m0" style="text-align:center">Terminez le tour en cours pour clôturer.</p>';
    return h + cancelHtml();
  }
  /* Coût de revient moyen par minute moteur, à date : bilan de l'année en cours du bateau actuel (toutes ses années si l'année n'a pas encore de minutes). */
  function coutMinNow() {
    try { var y = String(new Date().getFullYear()), bk = boatOf(y), D = bilanData(bk, y); if (!(D.min > 0)) D = bilanData(bk, "Toutes"); return D.min > 0 ? { v: D.total / D.min, per: D.ys.length === 1 ? D.ys[0] : "toutes saisons" } : null; } catch (e) { return null; }
  }
  /* Résumé en haut de la clôture : temps de ski par personne, moteur sans skieur, coût de revient estimé de la session. */
  function sumSesHtml(now) {
    var eMin = engineMs(now) / 60000, ski = {}, tot = 0;
    sortie.tours.forEach(function (t) { if (!t.pid || t.act === "balade" || t.act === "meca") return; var m = tourMs(t, now) / 60000; ski[t.pid] = (ski[t.pid] || 0) + m; tot += m; });
    var C = coutMinNow(), sans = Math.max(0, eMin - tot), pids = Object.keys(ski).sort(function (a, b) { return ski[b] - ski[a]; });
    var h = '<div class="ses-sum">' + (pids.length ? pids.map(function (pid) { var p = participant(pid); return '<span class="ss-p">' + (p ? famDot(famOf(p)) : "") + esc(person(pid).name) + " <b>" + hm(ski[pid]) + "</b></span>"; }).join("") : '<span class="ss-p muted">Aucun tour de ski</span>') +
      '<span class="ss-p muted">Moteur sans skieur <b>' + hm(sans) + "</b></span></div>";
    if (C) h += '<div class="ses-cost">Coût de revient ≈ <b>' + eur0.format(eMin * C.v) + "</b><span> " + Math.round(eMin) + " min × " + dec2.format(C.v) + " €/min (moyenne " + esc(C.per) + " à ce jour)</span></div>";
    return h;
  }
  /* Annuler une session : rien n'est enregistré, après confirmation. */
  function cancelHtml() {
    if (!view.cancelAsk) return '<button class="btn link" id="cancelAsk" style="justify-self:center">Annuler la session sans l’enregistrer</button>';
    return '<div class="alert bad"><b>Annuler cette session ?</b>Les tours, les temps et les participants seront effacés. Rien ne sera enregistré ni partagé.' +
      '<div class="actions"><button class="btn ghost sm" id="cancelNo">Non, continuer</button><button class="btn stop sm" id="cancelYes">Oui, annuler la session</button></div></div>';
  }
  function renderStart() {
    if (!sortie.debEdited) sortie.compteurDeb = lastCompteur(); // suit les sessions arrivées par synchronisation
    // 1 : compteur (champ étroit) et lecture de la jauge à gauche, jauge à droite
    // v2.0 : titre court, jauge remontée, le litrage estimé juste sous la jauge (plus de titre « Jauge au départ »)
    var h = '<div class="card p1">' + /* v2.0b : titre dans la colonne de gauche, la jauge monte jusqu'au bord haut du cadre */
      '<div class="p1-grid"><div class="p1-left"><div class="step"><b>1</b><span>Saisir compteur et Essence de départ</span></div><div class="field"><label for="cDeb" class="flabel p1-lab">Compteur moteur (h)</label><input id="cDeb" class="cpt-in" inputmode="decimal" value="' + dec1.format(sortie.compteurDeb) + '"></div></div>' +
      '<div class="p1-g2"><div class="gauge-sm p1-g">' + gaugeHtml("start", startJauge) + '</div><div class="g-side g-under"><span class="g-read" data-gread="start">' + gaugeRead(startJauge, true) + "</span></div></div></div>" +
      '<div id="cDebWarn">' + startWarnHtml(sortie.compteurDeb) + "</div></div>";
    h += boardHtml("Indiquez les personnes à bord.");
    if (startList.length) h += '<div class="card"><div class="field"><label for="pilStart">Pilote</label><select id="pilStart">' + startList.map(function (p) { return '<option value="' + p.pid + '"' + (p.pid === startPilote ? " selected" : "") + ">" + esc(person(p.pid).name) + "</option>"; }).join("") + "</select></div></div>";
    h += '<div class="card"><div class="step"><b>3</b>Vérifiez avant de partir :</div><div class="checks three">' + [["huile", "Niveau d’huile"], ["cale", "Pompe de cale"], ["aera", "Aération moteur"]].map(function (c) { return '<label class="chk"><input type="checkbox" data-startchk="' + c[0] + '"' + (startChecks[c[0]] ? " checked" : "") + "><span>" + c[1] + "</span></label>"; }).join("") + "</div></div>";
    return h + '<div class="card p4"><div class="step"><b>4</b>Démarrer</div><button class="rbtn-red rstart" id="goStart" aria-label="Démarrer la session">START<small>session</small></button></div>';
  }
  /* ---------- Saisie manuelle : session faite sans le téléphone (date, pilote, compteurs, temps et activité par personne) ---------- */
  var manForm = null;
  function manNew(prev) { return { date: prev ? prev.date : todayIso(), c1: prev ? prev.c2 : dec1.format(lastCompteur()), c2: "", pilote: prev ? prev.pilote : "", list: prev ? prev.list.map(function (r) { return { pid: r.pid, role: r.role, act: r.act, min: "", host: r.host }; }) : [], pick: null }; }
  function manRow(pid) { var M = manForm; for (var i = 0; i < M.list.length; i++) if (M.list[i].pid === pid) return M.list[i]; return null; }
  function manRead() { // relit les champs avant de redessiner, pour ne rien perdre de ce qui est tapé
    var M = manForm, g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    if (!M || !document.getElementById("mD")) return;
    M.date = g("mD") || M.date; M.pilote = g("mPil") || ""; M.c1 = g("mC1"); M.c2 = g("mC2");
    M.list.forEach(function (r) { var a = g("mA_" + r.pid), m = g("mM_" + r.pid); if (a != null) r.act = a; if (m != null) r.min = m; });
  }
  function manCalc() {
    var M = manForm, c1 = parseNum(M.c1), c2 = parseNum(M.c2), eMin = c2 > c1 ? Math.round((c2 - c1) * 600) / 10 : 0, perso = 0, minutes = {}, b = { YC: 0, OC: 0 };
    M.list.forEach(function (r) { var m = r.role === "ski" ? parseNum(r.min) || 0 : 0; if (m > 0) { perso += m; minutes[r.pid] = m; } });
    var heads = M.list.length || 1, libre = Math.max(0, eMin - perso), commun = libre / heads;
    M.list.forEach(function (r) { var f = person(r.pid).c === "EXT" ? r.host : CATF[person(r.pid).c]; b[f] += (minutes[r.pid] || 0) + commun; });
    return { c1: c1, c2: c2, eMin: eMin, perso: perso, libre: libre, commun: commun, minutes: minutes, b: b };
  }
  function manSumHtml() {
    var M = manForm, R = manCalc();
    if (!(R.c2 > R.c1)) return '<div class="small muted">Indiquez le compteur de fin (plus grand que le départ) pour calculer le temps moteur.</div>';
    var h = '<div class="small">Temps moteur : <b>' + hm(R.eMin) + "</b> · tours saisis : " + Math.round(R.perso) + " min" + (M.list.length ? " · temps commun : " + Math.round(R.libre) + " min partagé entre " + M.list.length + " personne" + (M.list.length > 1 ? "s" : "") : "") + "</div>";
    if (R.perso > R.eMin + 0.5) h += '<div class="alert bad">Les temps saisis (' + Math.round(R.perso) + " min) dépassent le temps moteur (" + Math.round(R.eMin) + " min) : vérifiez les compteurs ou les minutes.</div>";
    else if (M.list.length) h += '<div class="legend"><span>' + famDot("YC") + 'Famille Yann <b class="num">' + Math.round(R.b.YC) + " min</b></span><span>" + famDot("OC") + 'Famille Olivier <b class="num">' + Math.round(R.b.OC) + " min</b></span></div>";
    return h;
  }
  function renderManuel() {
    var M = manForm || (manForm = manNew()), FH = { YF: "<small>Famille</small>Yann", OF: "<small>Famille</small>Olivier", EXT: "Extérieur" };
    var pils = M.list.length ? M.list.map(function (r) { return person(r.pid); }) : PEOPLE.filter(function (p) { return p.c !== "EXT"; });
    var h = '<div class="man-form"><div class="card"><div class="row"><h3>Saisie manuelle</h3><button class="btn link" id="manClose">Fermer</button></div>' +
      '<div class="small muted">Pour une session faite sans le téléphone. Après l’enregistrement, vous pouvez saisir la suivante.</div>' +
      '<div class="two"><div class="field"><label for="mD">Date</label><input id="mD" type="date" value="' + esc(M.date) + '"></div>' +
      '<div class="field"><label for="mPil">Pilote</label><select id="mPil"><option value="">—</option>' + pils.map(function (p) { return '<option value="' + p.id + '"' + (p.id === M.pilote ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="two"><div class="field"><label for="mC1">Compteur départ (h)</label><input id="mC1" class="cpt-in" inputmode="decimal" value="' + esc(M.c1) + '"></div>' +
      '<div class="field"><label for="mC2">Compteur fin (h)</label><input id="mC2" class="cpt-in" inputmode="decimal" value="' + esc(M.c2) + '" placeholder="ex. 1952,4"></div></div></div>';
    h += '<div class="card board"><div class="step step-row"><b>2</b><span>Personnes à bord, temps et activité</span><span class="board-n' + (M.list.length > 8 ? " over" : "") + '">' + M.list.length + " / 8</span></div>";
    h += '<div class="fam-heads">' + ["YF", "OF", "EXT"].map(function (c) {
      var op = M.pick === c;
      return '<div class="fh fh-' + c + (op ? " open" : "") + '"><span class="fh-av">' + (c === "EXT" ? EXT_ICON : famAvatar(CATF[c])) + '</span><span class="fh-t">' + FH[c] + "</span>" +
        '<button class="plus" data-mpick="' + c + '" aria-expanded="' + op + '" aria-label="Ajouter : ' + CAT[c] + '">' + (op ? "−" : "+") + "</button></div>";
    }).join("") + "</div>";
    if (M.pick) {
      var avail = PEOPLE.filter(function (q) { return q.c === M.pick && !manRow(q.id); });
      h += '<div class="picker">' + (avail.length ? '<div class="chips">' + avail.map(function (q) { return '<button class="chip" data-maddp="' + q.id + '">+ ' + esc(q.name) + "</button>"; }).join("") + "</div>" : '<div class="small muted">Tout le monde est déjà ajouté.</div>') +
        (M.pick === "EXT" ? '<div class="newp"><input id="mNp" placeholder="Nouvelle personne" aria-label="Nom de la nouvelle personne"><button class="btn sm" id="mNewp">Ajouter</button></div>' : "") + "</div>";
    }
    ["YF", "OF", "EXT"].forEach(function (c) {
      var rows = M.list.filter(function (r) { return person(r.pid).c === c; });
      if (!rows.length) return;
      h += '<div class="group"><div class="fam-sub"><span class="gt">' + (c === "EXT" ? EXT_ICON : famAvatar(CATF[c])) + CAT[c] + '</span><span class="g-tot">' + rows.length + " personne" + (rows.length > 1 ? "s" : "") + "</span></div>";
      rows.forEach(function (r) {
        var pp = person(r.pid), seg = function (v, l) { return '<button data-mrole="' + r.pid + '" data-v="' + v + '" aria-pressed="' + (r.role === v) + '">' + l + "</button>"; };
        h += '<div class="prow"><div class="pname"><span class="pn">' + famDot(c === "EXT" ? r.host : CATF[c]) + esc(pp.name) + '</span><div class="seg mini role">' + seg("ski", "Skieur") + seg("pass", "Passager") + "</div>" +
          '<button class="x" data-mrm="' + r.pid + '" aria-label="Retirer ' + esc(pp.name) + '">×</button></div>';
        if (r.role === "ski") h += '<div class="man-line"><select id="mA_' + r.pid + '" aria-label="Activité de ' + esc(pp.name) + '">' + PERSO_ACTS.map(function (a) { return '<option value="' + a + '"' + (a === r.act ? " selected" : "") + ">" + ACTS[a] + "</option>"; }).join("") + "</select>" +
          '<span class="man-min"><input id="mM_' + r.pid + '" inputmode="numeric" value="' + esc(r.min) + '" placeholder="0" aria-label="Minutes de ' + esc(pp.name) + '"> min</span></div>';
        if (c === "EXT") h += '<div class="seg mini fam">' + ["YC", "OC"].map(function (f) { return '<button data-mhost="' + r.pid + '" data-v="' + f + '" aria-pressed="' + (r.host === f) + '">Invité ' + FAM[f].s + "</button>"; }).join("") + "</div>";
        h += "</div>";
      });
      h += "</div>";
    });
    h += "</div>";
    h += '<div class="card"><div id="mSum">' + manSumHtml() + "</div>" +
      '<div class="actions"><button class="btn ghost" id="manSaveNext">Enregistrer et saisir la suivante</button><button class="btn" id="manSave">Enregistrer</button></div></div></div>';
    return h;
  }
  function manSave() {
    manRead();
    var M = manForm, R = manCalc();
    if (!M.date) { toast("Indiquez la date de la session."); return false; }
    if (!(R.c2 > R.c1)) { toast("Le compteur de fin doit être plus grand que celui du départ."); return false; }
    // compteurs : refus au-delà de 100 h d'écart avec le dernier compteur connu ou de 24 h pour la session ; vérification au-delà de 8 h
    var lc = lastCompteur(), mk = "man:" + R.c1 + ">" + R.c2;
    if (Math.abs(R.c1 - lc) > CPT_MAX) { toast("Compteur de départ refusé : " + int0.format(Math.abs(R.c1 - lc)) + " h d’écart avec le dernier compteur connu (" + dec1.format(lc) + " h). Virgule oubliée ?"); return false; }
    var ce1 = cptEndCheck(R.c1, R.c2, null); if (!ce1.block && R.c2 - R.c1 > 8) ce1 = { ask: hm((R.c2 - R.c1) * 60) + " de moteur pour une session : vérifiez les compteurs." };
    if (!cptConfirm(mk, ce1)) return false;
    if (!M.list.length) { toast("Ajoutez au moins une personne à bord avec les boutons +."); return false; }
    if (R.perso > R.eMin + 0.5) { toast("Les temps saisis dépassent le temps moteur : vérifiez."); return false; }
    var pil = M.pilote && manRow(M.pilote) ? M.pilote : (M.list.filter(function (r) { return person(r.pid).c !== "EXT"; })[0] || M.list[0]).pid;
    sessionsArr.push({ id: uid(), mode: "manuel", bateau: SPEC.devise, date: M.date, compteurDeb: R.c1, compteurFin: R.c2, pilote: pil, plein: false,
      engineMin: R.eMin, famMin: { YC: Math.round(R.b.YC * 10) / 10, OC: Math.round(R.b.OC * 10) / 10 }, factMin: { YC: 0, OC: 0 },
      minutes: R.minutes, commun: Math.round(R.libre * 10) / 10, meca: 0,
      participants: M.list.map(function (r) { return { pid: r.pid, role: r.role, host: person(r.pid).c === "EXT" ? r.host : CATF[person(r.pid).c], fact: false }; }),
      tours: M.list.filter(function (r) { return R.minutes[r.pid]; }).map(function (r) { return { pid: r.pid, act: r.act || "slalom", min: R.minutes[r.pid], pauses: 0, laps: 1, pilote: pil }; }) });
    save(1); toast(savedMsg("Session du " + isoToFr(M.date) + " enregistrée (" + hm(R.eMin) + " de moteur)."));
    return true;
  }
  function curList() { return sortie.active ? sortie.participants : startList; }
  function inList(pid) { return curList().some(function (p) { return p.pid === pid; }); }
  var startChecks = {}; // vérifications avant départ (huile, pompe de cale, aération) : aide-mémoire, ne bloque rien
  function boardHtml(step) {
    var list = curList(), nTot = list.length;
    // préparation : le titre numéroté en haut, sans « À bord » ; session en cours : titre « À bord »
    var h = '<div class="card board">' + (step ? '<div class="step step-row"><b>2</b><span>' + step + '</span><span class="board-n' + (nTot > 8 ? " over" : "") + '">' + nTot + " / 8</span></div>" : '<div class="row"><h3>À bord</h3><span class="small muted">' + nTot + " personne" + (nTot > 1 ? "s" : "") + " / 8</span></div>");
    if (nTot <= 8) ui.over8Ack = false;
    if (nTot > 8) h += ui.over8Ack ? '<div class="small over8-mini">' + nTot + " personnes à bord : homologué pour 8, amendes à la charge du groupe.</div>"
      : '<div class="alert bad over8"><b>' + nTot + " personnes à bord : le bateau est homologué pour 8 personnes.</b>Toute amende sera à la charge du groupe.<div class=\"actions\"><button class=\"btn sm\" id=\"over8Ok\">Compris</button></div></div>";
    // les trois groupes sur une même ligne, le « + » collé au nom ; la liste des personnes choisies vient en dessous, par famille
    var FH = { YF: "Yann", OF: "Olivier", EXT: "Extérieur" }; // v1.9.8 : une seule ligne, couleur de la famille
    h += '<div class="fam-heads">' + ["YF", "OF", "EXT"].map(function (c) {
      var op = picker === c;
      return '<div class="fh fh-' + c + (op ? " open" : "") + '"><span class="fh-av">' + (c === "EXT" ? EXT_ICON : famAvatar(CATF[c])) + '</span><span class="fh-t">' + FH[c] + "</span>" +
        '<button class="plus" data-pick="' + c + '" aria-expanded="' + op + '" aria-label="Ajouter : ' + CAT[c] + '">' + (op ? "−" : "+") + "</button></div>";
    }).join("") + "</div>";
    if (picker && CAT[picker]) {
      var pc = picker, avail = PEOPLE.filter(function (q) { return q.c === pc && !inList(q.id); });
      // v1.9.8 : « Ajouter : » et les boutons sur une même ligne, boutons étroits ; invités : « Invité Y » (bleu) et « Invité O » (rouge)
      var chipLab = function (q) { return q.id === "invy" ? 'Invité <b class="n-yc">Y</b>' : q.id === "invo" ? 'Invité <b class="n-oc">O</b>' : esc(q.name); };
      h += '<div class="picker pk-row"><div class="pk-line"><span class="small muted pk-l">Ajouter :</span>' + (avail.length ? '<div class="chips">' + avail.map(function (q) { return '<button class="chip" data-addp="' + q.id + '" aria-label="Ajouter ' + esc(q.name) + '"><span>' + chipLab(q) + "</span></button>"; }).join("") + "</div>" : '<span class="small muted">tout le monde est déjà à bord.</span>') + "</div>" +
        (pc === "EXT" ? '<div class="newp"><input id="np' + pc + '" placeholder="Nouvelle personne" aria-label="Nom de la nouvelle personne"><button class="btn sm" data-newp="' + pc + '">Ajouter</button></div>' : "") + "</div>"; // nouvelle personne : seulement pour les extérieurs
    }
    ["YF", "OF", "EXT"].forEach(function (c) {
      var rows = list.filter(function (p) { return person(p.pid).c === c; });
      if (!rows.length) return;
      h += '<div class="group"><div class="fam-sub"><span class="gt">' + (c === "EXT" ? EXT_ICON : famAvatar(CATF[c])) + CAT[c] + "</span>" +
        '<span class="g-tot">' + rows.length + " personne" + (rows.length > 1 ? "s" : "") + "</span></div>";
      rows.forEach(function (p) {
        var pp = person(p.pid), hasTour = sortie.active && sortie.tours.some(function (t) { return t.pid === p.pid; });
        h += '<div class="prow"><div class="pname"><span class="pn">' + famDot(famOf(p)) + esc(pp.name) + "</span>" +
          segHtml("mini role", "data-role-" + p.pid, [["ski", "Skieur"], ["pass", "Passager"]], p.role) +
          (hasTour ? '<span class="x-ph"></span>' : '<button class="x" data-rm="' + p.pid + '" aria-label="Retirer ' + esc(pp.name) + '">×</button>') + "</div>";
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
  /* Cohérence jauge / temps moteur : la jauge se lit au 1/16 (≈ 8 L), d'où une tolérance de 12 L plus la moitié de l'estimation au temps. */
  function jaugeAnormale(gL, eMin) { var est = eMin / 60 * (SPEC.conso || 13); return eMin > 0 && (gL < -0.5 || Math.abs(gL - est) > Math.max(12, est * 0.5)); }
  function consoEstHtml() {
    var d = sortie.jaugeDeb - sortie.jaugeFin, refill = (16 - sortie.jaugeFin) / 16 * SPEC.reservoir, eMin = engineMs(Date.now()) / 60000, gL = d / 16 * SPEC.reservoir;
    var h = d >= 0 ? "Jauge " + fracLabel(sortie.jaugeDeb) + " → " + fracLabel(sortie.jaugeFin) + " : ≈ <b>" + Math.round(gL) + " L</b> consommés." : "La jauge d’arrivée est plus haute qu’au départ : plein fait pendant la session ?";
    if (jaugeAnormale(gL, eMin)) h += ' <span class="j-incoh">Écart avec le temps moteur (' + Math.round(eMin) + " min, soit ≈ " + Math.round(eMin / 60 * (SPEC.conso || 13)) + " L attendus) : vérifiez la jauge. Sinon, la balance retiendra l’estimation au temps.</span>";
    if (sortie.plein) h += refill < 4 ? " Le réservoir est déjà plein." : " Pour refaire le plein : ≈ " + Math.round(refill) + " L, soit environ " + half(Math.max(0.5, Math.round(refill / SPEC.bidon * 2) / 2)) + " bidons de " + SPEC.bidon + " L.";
    return h;
  }
  function renderClosing(now) {
    if (sortie.compteurFin == null) sortie.compteurFin = Math.round((sortie.compteurDeb + engineMs(now) / 3600000) * 10) / 10;
    var hasPh = !!photoSrc(sortie.photoCompteur);
    // v1.9.5 : photo du compteur en petite vignette, sur une ligne avec son bouton
    var h = '<div class="card meter-card clo-photo">' +
      (hasPh ? '<img class="cpt-photo cpt-mini" src="' + photoSrc(sortie.photoCompteur) + '" alt="Photo du compteur moteur">' : '<span class="clo-ph-t">Photo du compteur</span>') +
      '<label class="btn ' + (hasPh ? "ghost " : "") + 'sm photo-btn">' + (hasPh ? "Reprendre la photo" : "Prendre la photo") + '<input type="file" accept="image/*" capture="environment" id="cPhoto" hidden></label></div>';
    // v1.9.5 : clôture réduite au compteur et à la jauge ; le plein se note dans l'onglet Essence (« J'ai versé des bidons »)
    sortie.plein = false;
    h += '<div class="card"><h3>Clôture</h3><div class="field"><label for="cFin">Compteur moteur (h)</label><input id="cFin" inputmode="decimal" value="' + dec1.format(sortie.compteurFin) + '"></div>' +
      '<div class="field gauge-sm">' + gHead("Jauge à l’arrivée", "fin", sortie.jaugeFin) + gaugeHtml("fin", sortie.jaugeFin) + "</div></div>";
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
    var ce0 = sortie.compteurFin != null ? cptEndCheck(sortie.compteurDeb, sortie.compteurFin, null) : {};
    if (ce0.block) h += '<div class="alert bad"><b>' + esc(ce0.block) + "</b>Corrigez le compteur moteur avant d’enregistrer.</div>";
    else if (R.cMin != null && Math.abs(R.cMin - R.eMin) > 6) h += '<div class="alert">Le compteur indique ' + Math.round(R.cMin) + " min, l’app " + Math.round(R.eMin) + " min. Vérifiez le compteur (il est précis à 6 min près)" + (Math.abs(R.cMin - R.eMin) > 30 ? " : une confirmation sera demandée à l’enregistrement" : "") + ".</div>";
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
    // v1.9.7 : l'historique importé de l'ancien bateau (mode « historique », été 2025) n'est plus contrôlé : ses écarts ne peuvent plus être rattrapés
    sessionsArr.forEach(function (s) { if (s.mode !== "historique" && hasNum(s.compteurDeb) && (hasNum(s.compteurFin) || Number(s.engineMin) > 0)) (by[s.bateau || ""] = by[s.bateau || ""] || []).push(s); });
    Object.keys(by).forEach(function (k) {
      var list = by[k].sort(function (a, b) { return Number(a.compteurDeb) - Number(b.compteurDeb); });
      for (var i = 1; i < list.length; i++) {
        var a = list[i - 1], b = list[i], g = Number(b.compteurDeb) - sessionEnd(a);
        if (g <= GAP_TOL + 0.001) continue;
        // trou déjà traité (v1.9.4) : noté sur la session elle-même, plus dans la fiche commune qu'un autre téléphone peut écraser
        if (a.gapOk === b.id || (a.mode === "rattrapage" && a.gapKey && a.gapKey.split(">")[1] === b.id) || (b.mode === "rattrapage" && b.gapKey && b.gapKey.split(">")[0] === a.id)) continue;
        // v1.9.6 : session rattrapée avec une version antérieure (sans gapKey) ou compteurs saisis qui ne collent pas exactement : le trou est traité
        if ((a.mode === "rattrapage" && !a.gapKey && !a.aCompleter) || (b.mode === "rattrapage" && !b.gapKey && !b.aCompleter)) continue;
        out.push({ key: a.id + ">" + b.id, from: a, to: b, h: g, rech: a.gapRech === b.id || (ETAT.gapsRecherche || []).indexOf(a.id + ">" + b.id) >= 0 });
      }
    });
    return out;
  }
  /* Un trou de compteur est attribué à la famille de la session d'avant (au prorata de ses temps si elle était mixte). */
  function gapFam(prev) { var f = famSplit(prev), t = f.YC + f.OC; return t > 0 ? { YC: f.YC / t, OC: f.OC / t } : { YC: 0.5, OC: 0.5 }; }
  function gapFamTxt(prev) { var p = gapFam(prev); return p.YC > 0.99 ? "Famille Yann" : p.OC > 0.99 ? "Famille Olivier" : "Yann " + Math.round(p.YC * 100) + " % · Olivier " + Math.round(p.OC * 100) + " %"; }
  function renderAccueil() {
    var now = Date.now(), h = "";
    h += quickHtml(now);
    var nu = unreadNotes();
    if (nu) { var ln = notes.filter(function (n) { return isUnread(n, notesLues()); })[0]; h += '<button class="note-alert" data-go="journal"><span class="na-n">' + nu + '</span><span><b>' + (nu > 1 ? nu + " notes à lire" : "1 note à lire") + "</b>" + esc(ln.cat) + " · " + esc(ln.auteurNom || "?") + " · " + fmtDateTime(ln.date) + '</span><span class="chev" aria-hidden="true">›</span></button>'; }
    var todo = sessionsArr.filter(function (s) { return s.aCompleter; });
    if (todo.length) h += '<div class="alert alert-sm"><b>' + todo.map(function (s) { return "Saison " + yearOf(s) + " : " + hm(s.engineMin) + " de moteur à détailler"; }).join(" · ") + "</b></div>"; // v1.9.6 : bandeau réduit à sa ligne de titre
    // jauge estimée du bateau (à gauche) et stock de bidons compact (à droite), sur une même ligne
    var T = theo(), nb = stockN();
    h += '<div class="fuel-row"><div class="card fuel-g"><div class="gwrap">' + gaugeHtml("theo", T.v, true) + '</div></div>' + /* v2.0.1 : plus d'estimation en litres sous la jauge */
      '<div class="card fuel-c"><div class="fc-h fc-h2"><span>Stock de bidons</span><b title="≈ ' + int0.format(stockL()) + ' L">' + nb + " bidon" + (nb > 1 ? "s" : "") + "</b></div>" + cansHtml(null, "mini") + "</div></div>"; // v2.0b : total à droite du titre, ligne plus basse
    dettes.forEach(function (d) { if (!d.regle) h += detteHtml(d); });
    if (!CONF.url || !CONF.code) h += '<div class="alert"><b>Base partagée non connectée</b>Les saisies restent sur ce téléphone. Connectez l’app dans l’onglet Admin pour partager l’historique avec la famille.<div><button class="btn sm" data-go="bateau">Connecter</button></div></div>';
    h += '<div class="kpis"><div class="kpi"><span class="label">Compteur moteur</span><span class="v">' + dec1.format(lastCompteur()) + ' h</span><span class="s">fin de la dernière session</span></div>' +
      '<div class="kpi"><span class="label">Dernier plein</span><span class="v" style="font-size:19px">' + esc(lastPlein || "—") + "</span></div></div>";
    var gaps = findGaps(), rech = gaps.filter(function (g) { return g.rech; });
    var gp = gaps.filter(function (g) { return rech.indexOf(g) < 0; })[0];
    if (rech.length) h += '<div class="small muted">' + rech.length + " trou(s) de compteur en recherche.</div>";
    if (gp) {
      var srch = false;
      gap.key = gp.key;
      h += '<div class="alert"><b>' + (srch ? "Trou de compteur en recherche : " : "Trou de compteur : ") + hm(gp.h * 60) + "</b>Entre la session du " + esc(isoToFr(dkey(gp.from))) + " (fin " + dec1.format(sessionEnd(gp.from)) + " h) et celle du " + esc(isoToFr(dkey(gp.to))) + " (début " + dec1.format(gp.to.compteurDeb) + " h). Ça ne bloque rien.</div>";
      // v1.9.6 : encart repliable pour rattraper la session manquante
      h += '<div class="card">' + collHead("gapf", "Session rattrapée", "Rattraper les " + hm(gp.h * 60) + " manquantes");
      if (ui.gapf) h += '<div class="two"><div class="field"><label for="gD">Date</label><input id="gD" type="date" value="' + esc(dkey(gp.from)) + '"></div><div class="field"><label for="gM">Durée (min)</label><input id="gM" inputmode="numeric" placeholder="si connue"></div></div>' +
        '<div class="two"><div class="field"><label for="gC1">Compteur début</label><input id="gC1" inputmode="decimal" value="' + dec1.format(sessionEnd(gp.from)) + '"></div><div class="field"><label for="gC2">Compteur fin</label><input id="gC2" inputmode="decimal" value="' + dec1.format(gp.to.compteurDeb) + '"></div></div>' +
        '<div class="field"><span class="flabel">Attribué à</span><div class="small">' + gapFamTxt(gp.from) + " (la session d’avant le trou)</div></div>" +
        '<div class="toggle"><span>Je ne sais pas encore : à rechercher</span><button data-grat="' + (gap.rat === "search" ? "auto" : "search") + '" aria-pressed="' + (gap.rat === "search") + '" aria-label="À rechercher"></button></div>' +
        '<div class="actions"><button class="btn ghost" id="gapCancel">Annuler</button><button class="btn" id="gapSave">Enregistrer</button></div>';
      h += "</div>";
    }
    var yk = latestYear();
    if (yk) {
      var Y = YEARS[yk], t = Y.fam.YC + Y.fam.OC || 1;
      h += '<div class="card"><div class="row"><h3>Temps moteur ' + yk + '</h3><span class="small muted">' + dec1.format(Y.min / 60) + " h</span></div>" +
        '<div class="split"><i class="yc" style="width:' + (Y.fam.YC / t * 100) + '%"></i><i class="oc" style="width:' + (Y.fam.OC / t * 100) + '%"></i></div>' +
        // v2.0 : en heures, et le temps des extérieurs (compris dans celui de la famille qui invite)
        '<div class="legend"><span>' + famDot("YC") + 'Yann <b class="num">' + hm(Y.fam.YC) + "</b></span><span>" + famDot("OC") + 'Olivier <b class="num">' + hm(Y.fam.OC) + '</b></span><span class="muted">Extérieur : <b class="num">' + hm(Y.ext || 0) + "</b></span></div></div>";
    }
    h += '<div class="card spray-card photo-only"><div class="spray-bg img-ski" aria-hidden="true"></div><span class="brandlogo img-logo" aria-hidden="true"></span></div>'; // photo seule : la jauge est remontée à côté des bidons
    return h;
  }
  var RELIEF = true; // boutons en relief (accueil, Bateau) : mettre false pour revenir aux boutons plats
  /* Accueil : boutons d'accès direct, deux par ligne (la session occupe toute la première ligne) */
  var QI = {
    achat: '<svg viewBox="0 0 24 24"><path d="M5.5 9L9 5.5h9a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1z"/><path d="M12 5.5V3h5v2.5"/><path d="M7.2 7.3L4.5 4.6 6 3.1l2.7 2.7"/><path d="M9.5 11.5l5.5 6M15 11.5l-5.5 6"/></svg>',
    mise: '<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M2.5 21h13"/><rect x="6.5" y="6" width="5" height="4" rx=".6"/><path d="M14 11h1.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 0 3 0V8.5L17.5 6"/></svg>',
    hist: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M3.5 12H2M22 12h-1.5"/></svg>',
    camp: '<svg viewBox="0 0 24 24"><path d="M3 20L12 4l9 16z"/><path d="M12 4v16M9 20l3-6 3 6"/><path d="M1 20h22"/></svg>', // v1.9.9 : tente (réservation du camp)
    stats: '<svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg>',
    journal: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4M8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    euro: '<svg viewBox="0 0 24 24"><path d="M17.5 6.2A7 7 0 1 0 17.5 17.8"/><path d="M4 10h9M4 14h9"/></svg>',
    balance: '<svg viewBox="0 0 24 24"><path d="M12 3.5v17M7.5 20.5h9M4 7h16"/><path d="M6.5 7L3.5 13.5a3 3 0 0 0 6 0zM17.5 7l-3 6.5a3 3 0 0 0 6 0z"/></svg>'
  };
  function qa(cls, attr, icon, title, sub, extra) {
    return '<button class="qa ' + cls + '" ' + attr + '><span class="qa-ic" aria-hidden="true">' + icon + "</span>" + (extra || "") + '<span class="qa-t">' + title + "</span>" + (sub ? '<span class="qa-s">' + sub + "</span>" : "") + "</button>";
  }
  function quickHtml(now) {
    var unread = unreadNotes(), h = '<div class="quick' + (RELIEF ? " relief" : "") + '">' + demoTogHtml("on-quick"); // Live / Démo, au-dessus des boutons essence
    if (sortie.active) h += '<button class="qa qa-session img-ski" data-go="sortie"><span class="qa-ic" aria-hidden="true">' + QI.play + '</span><span class="qa-t">Session en cours</span><span class="qa-s">moteur ' + (sortie.engine === "on" ? "en route" : "arrêté") + ' · <b data-timer="engine">' + fmtClock(engineMs(now)) + "</b> · ouvrir</span></button>";
    else h += '<button class="qa qa-session qa-go2 img-ski" data-go="sortie"><span class="qa-t">GO pour session</span></button>'; // v2.0b : sans la flèche, texte centré sous le skieur
    // 1re ligne : session (double largeur), achat essence, remplissage ; 2e ligne : quatre petits boutons
    h += qa("qa-achat qa-mid", 'data-qa="achat"', QI.achat, "Achat SP95 E10") +
      qa("qa-mise qa-mid", 'data-qa="mise"', QI.mise, "Plein bateau") +
      // 2e ligne : dépense et balance ; 3e ligne : quatre petits boutons
      qa("qa-dep qa-wide", 'data-depnew="1"', QI.euro, "Saisir une dépense") +
      qa("qa-bal qa-wide", 'data-fin="balance"', QI.balance, "Faire la balance", balanceText(balance()).replace(/\.$/, "")) +
      qa("qa-stats qa-sm", 'data-qa="stats"', QI.stats, "Statistiques") +
      qa("qa-meteo qa-sm", 'data-go="meteo"', CP_HUB_IC.meteo, "Météo") + // v2.0 : la réservation du camping a son espace depuis la page de lancement
      qa("qa-journal qa-sm", 'data-go="journal"', QI.journal, "Journal - Notes", "", unread ? '<span class="qa-dot big" aria-label="' + unread + ' note(s) à lire">' + unread + "</span>" : "") +
      qa("qa-urg qa-sm", 'data-go="annuaire"', URG_ICON, "Contact urgence");
    return h + "</div>";
  }
  function theo() {
    var cap = SPEC.reservoir;
    if (sortie.active) {
      var L0 = sortie.jaugeDeb / 16 * cap, em = engineMs(Date.now()), used = em / 3600000 * SPEC.conso, L = Math.max(0, L0 - used);
      return { L: L, v: Math.max(0, Math.min(16, Math.round(L / cap * 16))), txt: "Départ " + fracLabel(sortie.jaugeDeb) + " − " + Math.round(em / 60000) + " min × " + int0.format(SPEC.conso) + " L/h" };
    }
    return { L: lastLevel / 16 * cap, v: lastLevel, txt: /^hivernage/.test(lastLevelDate) ? "Hiverné réservoir vide" : lastLevelDate ? "Fin de session du " + lastLevelDate + (lastLevel >= 16 ? " · plein" : "") : "Aucune session enregistrée : réservoir supposé plein" };
  }
  function updateTheo() {
    var svg = screen.querySelector('svg[data-gauge="theo"]'); if (!svg) return;
    var T = theo();
    if (Number(svg.getAttribute("aria-valuenow")) !== T.v) setGauge(svg, T.v);
    var l = document.getElementById("theoL"), t = document.getElementById("theoTxt");
    if (l) l.textContent = "≈ " + Math.round(T.L) + " L";
    if (t) t.textContent = T.txt;
  }

  /* ---------- Essence ---------- */
  /* v2.0 : versements en double du 23/11/2026 (famille Yann, 1 bidon de 20 L) et leurs annulations « Versement fictif annulé ». */
  function dupClean() {
    var vs = moves.filter(function (m) { return m.type === "verse" && (m.date === "2026-11-23" || m.d === "23/11/2026") && /Yann/.test(m.who || "") && (/20 L/.test(m.v || "") || Number(m.litres) === 20); });
    var ids = vs.map(function (m) { return m.id; });
    var fx = moves.filter(function (m) { return m.type === "vfictif" && ids.indexOf(m.ref) >= 0; });
    return { items: vs.concat(fx), ids: ids.concat(fx.map(function (m) { return m.id; })) };
  }
  /* Stock de bidons : encart réduit, calé à droite ; à sa gauche, le bouton de correction (saisie erronée ou en double, vol, perte, autre usage) */
  function stockCardHtml() {
    var n = bidons.length;
    // v2.0 : le stock au milieu (un peu plus large en v2.0b), un petit bouton « Correction » à sa droite, calé en bas
    return '<div class="stock-row stock-row2"><div class="card stock-c"><div class="fc-h">Stock de bidons</div>' + cansHtml(null, "mini") +
      '<div class="fc-s"><b>' + n + " bidon" + (n > 1 ? "s" : "") + "</b> · ≈ " + int0.format(stockL()) + " L · " + eur.format(stockEur()) + "</div>" +
      '<div class="legend small"><span>' + famDot("YC") + "payé Yann</span><span>" + famDot("OC") + "payé Olivier</span></div></div>" +
      (!view.essence ? '<button class="corr-btn corr-sm" id="corrOpen">Correction</button>' : "") + "</div>";
  }
  function isAchat(m) { return m.type === "achat" && !m.annule; } // un achat extourné (saisie erronée ou en double) ne compte plus
  function achatFormHtml() {
    var A = achatForm, perCan = A.L > 0 && A.b ? A.L / A.b : 0;
    return '<div class="card"><h3>1 - Renseigner les bidons achetés</h3>' +
      '<div class="two"><div class="field"><label for="aL">Litres</label><input id="aL" inputmode="decimal" value="' + (A.L ? half(A.L) : "") + '" placeholder="ex. 44"></div><div class="field"><label for="aP">Prix payé (€)</label><input id="aP" inputmode="decimal" value="' + (A.P ? half(A.P) : "") + '" placeholder="ex. 76,10"></div></div>' +
      '<div class="field"><span class="flabel">Nombre de bidons remplis</span><div class="stepper"><button data-astep="-1" aria-label="Un bidon de moins">−</button><span class="val">' + A.b + '</span><button data-astep="1" aria-label="Un bidon de plus">+</button></div></div>' +
      '<div class="small muted" id="aPL">' + achatPLText() + "</div>" +
      '<div class="field"><span class="flabel">Payé par (obligatoire)</span>' + segHtml("fam", "data-af", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], A.f) + "</div>" +
      (A.passe ? "" : '<div class="toggle"><span>Versé tout de suite dans le réservoir</span><button data-atog="verse" aria-pressed="' + A.verse + '" aria-label="Versé tout de suite"></button></div>') +
      '<div class="toggle"><span>Essence de la saison passée, déjà consommée (ni stock ni réservoir)</span><button data-atog="passe" aria-pressed="' + !!A.passe + '" aria-label="Saison passée"></button></div>' +
      (A.verse && !A.passe ? '<div class="toggle"><span>Le réservoir est plein</span><button data-atog="plein" aria-pressed="' + A.plein + '" aria-label="Réservoir plein"></button></div>' : "") +
      '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="saveAchat"' + (A.f ? "" : " disabled") + ">Enregistrer</button></div>" +
      (A.f ? "" : '<div class="small muted">Choisissez la famille qui a payé pour pouvoir enregistrer.</div>') + "</div>";
  }
  function achatPLText() { var A = achatForm; if (!(A.L > 0)) return ""; return "Soit " + dec1.format(A.L / Math.max(1, A.b)) + " L par bidon" + (A.P > 0 ? " · " + dec2.format(A.P / A.L) + " € le litre" : "") + "."; }
  function renderEssence() {
    var h = !view.essence ? demoTogHtml("on-ess") + '<div class="ess-acts"><button class="ess-btn ess-achat" data-ev="achat"><span class="qa-ic" aria-hidden="true">' + QI.achat + '</span><span>J’ai acheté</span></button><button class="ess-btn ess-mise" data-ev="mise"' + (bidons.length ? "" : " disabled") + '><span class="qa-ic" aria-hidden="true">' + QI.mise + '</span><span>J’ai versé des bidons</span></button></div>' : "";
    // remise à zéro unique (v1.9.4) : réservoir vide et stock vidé, tant qu'aucune n'a été faite
    if (!view.essence && !lastReset()) h += '<div class="alert"><b>Repartir à vide aujourd’hui</b>Réservoir vide et stock de bidons remis à zéro (les bidons notés sont retirés, sans toucher aux dépenses). La balance essence repart d’aujourd’hui.<div><button class="btn sm" id="resetGo">' + (ui.resetAsk ? "Confirmer la remise à zéro" : "Remettre à zéro") + "</button></div></div>";
    // le formulaire ouvert vient en premier, l'encart du stock en dessous
    if (view.essence === "corr") h += corrHtml();
    else if (view.essence === "achat" && achatForm.step === "check") h += achatCheckHtml();
    else if (view.essence === "achat") h += achatFormHtml();
    else if (view.essence === "mise") {
      var mMax = stockCans(); miseForm.n = Math.max(0.5, Math.min(miseForm.n, mMax || 0.5)); // jamais plus que le stock : pas de bidon négatif
      var plan = planPrelevement(miseForm.n, miseForm.f);
      h += '<div class="card"><h3>J’ai versé des bidons</h3>' +
        '<div class="field"><span class="flabel">Qui verse ?</span>' + segHtml("fam", "data-mf", [["YC", "Famille Yann"], ["OC", "Famille Olivier"]], miseForm.f) + "</div>" +
        '<div class="field"><span class="flabel">Bidons versés</span><div class="stepper"><button data-mstep="-0.5" aria-label="Un demi-bidon de moins"' + (miseForm.n <= 0.5 ? " disabled" : "") + '>−</button><span class="val">' + half(miseForm.n) + '</span><button data-mstep="0.5" aria-label="Un demi-bidon de plus"' + (miseForm.n >= mMax ? " disabled" : "") + ">+</button></div>" + stockMaxTxt(miseForm.n) + "</div>" +
        '<div class="alert ok">' + esc(planText(plan)) + "</div>" +
        '<div class="toggle"><span>Le réservoir est plein</span><button data-mtog="plein" aria-pressed="' + miseForm.plein + '" aria-label="Réservoir plein"></button></div>' +
        '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="saveMise">Enregistrer</button></div></div>';
    }
    h += stockCardHtml();
    dettes.forEach(function (d) { if (!d.regle) h += detteHtml(d); });
    h += achatsTotHtml();
    h += '<div class="card"><h3>De plein à plein</h3><div class="small">Dernier plein : <b>' + esc(lastPlein || "—") + "</b></div></div>"; // après le total des achats
    h += '<div class="card">' + collHead("mvts", "Mouvements", moves.length + " mouvement" + (moves.length > 1 ? "s" : "") + (moves[0] ? " · dernier le " + esc(moves[0].d) : ""));
    // v2.0 : nettoyage demandé par Yann : versements en double du 23/11/2026 (famille Yann, 1 bidon de 20 L) et leurs annulations
    var dc = dupClean();
    if (dc.items.length && canValidate()) h += '<div class="alert"><b>Nettoyage : ' + dc.items.length + " mouvement" + (dc.items.length > 1 ? "s" : "") + " à supprimer</b>Versements du 23/11/2026 (famille Yann, 20 L) et leurs annulations, sans raison d’exister :" +
      '<div class="list small" style="margin:6px 0">' + dc.items.map(function (m) { return '<div class="item"><span>' + esc(m.t) + (m.annule ? ' <b class="todo">annulé</b>' : "") + '</span><span class="num">' + esc(m.v) + '</span><span class="d">' + esc(m.d) + " · " + esc(m.who) + "</span></div>"; }).join("") + "</div>" +
      '<div><button class="btn sm' + (ui.dupAsk ? " stop" : "") + '" id="dupClean">' + (ui.dupAsk ? "Confirmer la suppression définitive" : "Supprimer ces mouvements") + "</button></div></div>";
    if (ui.mvts) {
      h += '<div class="list small" style="margin-top:8px">';
      moves.slice(0, 30).forEach(function (m) { h += '<div class="item"><span>' + esc(m.t) + (m.annule ? ' <b class="todo">' + (m.type === "verse" ? "annulé" : "extourné") + "</b>" : m.corrige ? ' <b class="todo">corrigé</b>' : "") + '</span><span class="num">' + esc(m.v) + '</span><span class="d">' + esc(m.d) + " · " + esc(m.who) + "</span></div>"; });
      h += "</div>" + (moves.length > 30 ? '<div class="small muted">Les 30 plus récents sont affichés.</div>' : "");
    }
    return h + "</div>";
  }
  /* Total des achats d'essence (litres et montant) par famille, par année */
  var essYear = "";
  function achatsTotHtml() {
    var ach = moves.filter(function (m) { return isAchat(m) && (Number(m.litres) || Number(m.prix)); });
    if (!ach.length) return "";
    var yrs = []; ach.forEach(function (m) { var y = yearOf(m); if (y && yrs.indexOf(y) < 0) yrs.push(y); }); yrs.sort(); yrs.push("Toutes");
    if (!essYear || yrs.indexOf(essYear) < 0) essYear = yrs.length > 1 ? yrs[yrs.length - 2] : "Toutes";
    var T = { YC: { l: 0, e: 0, n: 0 }, OC: { l: 0, e: 0, n: 0 } };
    ach.forEach(function (m) { if (essYear !== "Toutes" && yearOf(m) !== essYear) return; var t = T[m.f] || T.YC; t.l += Number(m.litres) || 0; t.e += Number(m.prix) || 0; t.n++; });
    // touchez une famille : la liste des achats qui composent son total
    var row = function (f) {
      var t = T[f], op = ui.achF === f, its = ach.filter(function (m) { return (m.f === "OC" ? "OC" : "YC") === f && (essYear === "Toutes" || yearOf(m) === essYear); });
      return '<tr class="det-click' + (op ? " open" : "") + '" data-achf="' + f + '" aria-expanded="' + op + '"><td>' + TRI + famDot(f) + FAM[f].n + '<span class="sub">' + t.n + " achat" + (t.n > 1 ? "s" : "") + (t.l ? " · " + dec2.format(t.e / t.l) + " €/L" : "") + "</span></td><td>" + int0.format(t.l) + " L</td><td>" + eur.format(t.e) + "</td></tr>" +
        (op ? '<tr class="det-row"><td colspan="3">' + (its.length ? its.map(function (m) { var l = Number(m.litres) || 0, p = Number(m.prix) || 0; return '<div class="det-it"><span>' + esc(m.d || isoToFr(m.date)) + '<span class="sub">' + (m.bidons ? m.bidons + " bidon" + (m.bidons > 1 ? "s" : "") + " · " : "") + int0.format(l) + " L" + (l ? " · " + dec2.format(p / l) + " €/L" : "") + (m.verse ? " · versé tout de suite" : "") + (m.retire ? " · " + esc(m.retire) : "") + '</span></span><b>' + eur.format(p) + "</b></div>"; }).join("") : '<div class="small muted">Aucun achat.</div>') + "</td></tr>" : "");
    };
    // v1.9.6 : encart repliable, le total de l'année choisie reste visible dans l'en-tête
    var head = collHead("achTot", "Total des achats", (essYear === "Toutes" ? "toutes années" : essYear) + " · " + int0.format(T.YC.l + T.OC.l) + " L · " + eur.format(T.YC.e + T.OC.e));
    if (!ui.achTot) return '<div class="card">' + head + "</div>";
    return '<div class="card">' + head + '<div class="chips small-chips" style="margin-top:8px">' + yrs.map(function (y) { return '<button class="chip" data-essyear="' + y + '" aria-pressed="' + (y === essYear) + '">' + y + "</button>"; }).join("") + "</div>" +
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
  var corrForm = { sel: {}, who: "yann", motif: "erreur", usage: "Voiture", aff: "5050", ach: "", unit: "bidons", qty: null, vf: "", vfL: null };
  var CORR_MOTIFS = [["erreur", "Saisie erronée ou en double"], ["versement", "Versement fictif"], ["vol", "Vol"], ["perte", "Perte"], ["autre", "Autre usage"]];
  /* Versement fictif (v1.9.4) : un versement noté pour de l'essence qui n'existait pas (achat de test, saisie en double déjà versée).
     Il est réduit des litres indiqués (tout, par défaut) ; à zéro, il est annulé et ne compte plus dans la balance essence ni dans les indicateurs. */
  function vfList() { return moves.filter(function (m) { return (m.type === "verse" && !m.annule && (Number(m.litres) || 0) > 0.05) || (isAchat(m) && m.verse); }).slice(0, 12); }
  function vfHtml() {
    var C = corrForm, list = vfList(), h = '<div class="field"><span class="flabel">Versement à annuler (touchez-le)</span>';
    if (!list.length) return h + '<div class="small muted">Aucun versement noté.</div></div>';
    h += '<div class="ach-pick">' + list.map(function (m) { return '<button class="chip" data-cvf="' + esc(m.id) + '" aria-pressed="' + (C.vf === m.id) + '">' + esc((m.d || isoToFr(m.date)) + " · " + int0.format(Number(m.litres) || 0) + " L · " + (m.type === "achat" ? "achat versé" : m.t) + " · " + (m.who || "")) + "</button>"; }).join("") + "</div></div>";
    var m = list.filter(function (x) { return x.id === C.vf; })[0];
    if (!m) return h + '<div class="small muted">Choisissez le versement d’essence qui n’a pas réellement eu lieu.</div>';
    if (m.type === "achat") return h + '<div class="alert">Cet achat a été versé tout de suite : extournez l’achat (motif « Saisie erronée ou en double »), le versement disparaîtra avec lui.</div>';
    var L = Number(m.litres) || 0, q = C.vfL != null ? Math.min(C.vfL, L) : L;
    return h + '<div class="field"><span class="flabel">Litres fictifs à retirer</span><div class="bal-amt"><input id="vfL" inputmode="decimal" value="' + dec1.format(q) + '" aria-label="Litres fictifs"><span>L</span></div><div class="small muted">Sur ' + dec1.format(L) + " L versés. Ces litres sortent du réservoir suivi par la balance essence ; les dépenses ne changent pas (elles se corrigent par l’extourne de l’achat).</div></div>";
  }
  function corrSel() { return Object.keys(corrForm.sel).filter(function (k) { return corrForm.sel[k]; }).map(Number).filter(function (i) { return i < bidons.length; }); }
  /* Quantité réellement retirée du stock : tous les bidons touchés par défaut, ou le nombre de bidons (au demi) ou de litres indiqué. */
  function corrTakes(sel) {
    var C = corrForm, tot = 0; sel.forEach(function (i) { tot += bidons[i].litres; });
    var leftL = C.qty != null && C.unit === "litres" ? Math.min(C.qty, tot) : null, leftC = C.qty != null && C.unit === "bidons" ? C.qty : null, takes = [];
    sel.forEach(function (i) {
      var b = bidons[i], lit = b.litres;
      if (leftL != null) { lit = Math.min(b.litres, leftL); leftL -= lit; }
      else if (leftC != null) { var part = Math.min(1, leftC); lit = part >= 1 ? b.litres : Math.min(b.litres, (Number(b.cap) || SPEC.bidon) * part); leftC = Math.max(0, leftC - part); }
      if (lit > 0.01) takes.push({ i: i, litres: lit, f: b.f === "OC" ? "OC" : "YC", eur: lit * b.prix, d: b.d });
    });
    return takes;
  }
  /* Achat d'origine d'un bidon (même famille, même date) : sa dépense et son mouvement, pour sortir l'essence utilisée ailleurs des comptes du bateau. */
  function achatOf(f, d) {
    return { dep: depenses.filter(function (x) { return x.cat === "Essence" && (x.payeur === "OC" ? "OC" : "YC") === f && x.d === d && Number(x.m) > 0 && /^Essence/.test(x.lib || ""); })[0] || null,
      mv: moves.filter(function (m) { return isAchat(m) && (m.f === "OC" ? "OC" : "YC") === f && m.d === d && !m.verse; })[0] || null };
  }
  function corrEffects(takes) {
    var C = corrForm, byP = { YC: 0, OC: 0 }, lit = 0, lines = [], dt = [], red = [], lab = C.motif === "autre" ? C.usage.toLowerCase() : C.motif, grp = {};
    takes.forEach(function (t) { byP[t.f] += t.eur; lit += t.litres; var k = t.f + "|" + (t.d || ""); (grp[k] = grp[k] || { f: t.f, d: t.d, L: 0, E: 0 }).L += t.litres; grp[k].E += t.eur; });
    if (C.motif === "autre") // autre usage (moto, voiture…) : l'essence n'est plus une dépense du bateau, l'achat d'origine est réduit d'autant
      Object.keys(grp).forEach(function (k) { var g = grp[k], a = achatOf(g.f, g.d); if (a.dep) red.push({ g: g, dep: a.dep, mv: a.mv }); else lines.push({ lib: "Essence sortie du stock (" + lab + ")", cat: "Essence", m: -g.E, payeur: g.f, regle: "payeur" }); });
    ["YC", "OC"].forEach(function (p) {
      var v = byP[p], o = p === "YC" ? "OC" : "YC"; if (v < 0.005) return;
      if (C.motif !== "autre") { lines.push({ lib: "Essence retirée du stock (" + lab + ")", cat: "Essence", m: -v, payeur: p, regle: "conso" }); lines.push({ lib: "Perte d’essence (" + lab + ")", cat: "Essence", m: v, payeur: p, regle: C.aff }); }
      else if (C.aff !== p) dt.push({ from: o, to: p, eur: C.aff === "5050" ? v / 2 : v, note: "essence prise pour " + lab });
    });
    return { lit: lit, byP: byP, lines: lines, dettes: dt, red: red };
  }
  /* Extourne d'un achat saisi par erreur ou en double : bidons encore en stock retirés, écriture inverse, dépense négative. */
  function extCans(m) {
    if (!m || m.verse || m.passe) return []; // achat versé tout de suite ou de la saison passée : aucun bidon en stock
    var per = (Number(m.litres) || 0) / Math.max(1, Number(m.bidons) || 1);
    return bidons.map(function (b, i) { return { i: i, b: b, s: (b.d === m.d ? 2 : 0) + (Math.abs(b.litres - per) < 0.05 ? 1 : 0) }; })
      .filter(function (x) { return x.b.f === m.f; }).sort(function (a, b) { return b.s - a.s; }).slice(0, Number(m.bidons) || 0).map(function (x) { return x.i; });
  }
  function achLabel(m) { return (m.d || isoToFr(m.date)) + " · " + (m.bidons || "?") + " bidon(s) · " + int0.format(Number(m.litres) || 0) + " L · " + eur.format(Number(m.prix) || 0) + " · " + FAM[m.f === "OC" ? "OC" : "YC"].s; }
  function extHtml() {
    var C = corrForm, list = moves.filter(isAchat).slice(0, 10), h = '<div class="field"><span class="flabel">Achat à extourner (touchez-le)</span>';
    if (!list.length) return h + '<div class="small muted">Aucun achat enregistré.</div></div>';
    h += '<div class="ach-pick">' + list.map(function (m) { return '<button class="chip" data-cach="' + esc(m.id) + '" aria-pressed="' + (C.ach === m.id) + '">' + esc(achLabel(m)) + (m.verse ? " · versé" : " · en stock") + "</button>"; }).join("") + "</div></div>";
    var m = moves.filter(function (x) { return x.id === C.ach && isAchat(x); })[0];
    if (!m) return h + '<div class="small muted">Choisissez l’achat saisi par erreur ou en double.</div>';
    var idx = extCans(m), B = Number(m.bidons) || 0;
    h += '<div class="alert ok">L’achat du ' + esc(m.d || isoToFr(m.date)) + " est extourné : une écriture inverse est passée dans les mouvements et une dépense de " + eur.format(-(Number(m.prix) || 0)) + " est créée pour la " + FAM[m.f === "OC" ? "OC" : "YC"].l + ". " +
      (m.verse ? "Cet achat avait été versé tout de suite : ce versement ne compte plus dans la balance essence." : idx.length + " bidon(s) retiré(s) du stock." + (idx.length < B ? " " + (B - idx.length) + " bidon(s) de cet achat ne sont plus en stock (déjà versés). Si cet essence n’a jamais existé, annulez aussi le versement : motif « Versement fictif »." : "")) + "</div>";
    if (idx.length) h += cansHtml(idx.map(function (i) { return bidons[i]; }), "mini");
    return h;
  }
  function corrEffText(takes) {
    if (!takes.length) return "Indiquez une quantité à retirer.";
    var C = corrForm, e = corrEffects(takes), parts = [];
    ["YC", "OC"].forEach(function (p) { if (e.byP[p] > 0.005) parts.push(eur.format(e.byP[p]) + " payés par " + FAM[p].s); });
    var s = dec1.format(e.lit) + " L retirés du stock (" + parts.join(", ") + ").";
    if (C.motif !== "autre") return s + " Leur valeur est retirée des dépenses d’essence du bateau, puis comptée comme perte à la charge de " + (C.aff === "5050" ? "Yann et Olivier (50/50)" : FAM[C.aff].s) + ".";
    s += " Cette essence n’a pas servi au bateau : elle sort de ses dépenses" + (e.red.length ? " (" + e.red.map(function (r) { return "achat du " + esc(r.dep.d) + " : " + eur.format(Number(r.dep.m)) + " → " + eur.format(Math.max(0, Number(r.dep.m) - r.g.E)); }).join(" ; ") + ")" : "") + ".";
    return s + (e.dettes.length ? " " + e.dettes.map(function (d) { return FAM[d.from].s + " devra " + eur.format(d.eur) + " à " + FAM[d.to].s; }).join(" ; ") + "." : " Chacun a utilisé sa propre essence : rien d’autre à régler.");
  }
  function corrHtml() {
    var C = corrForm;
    if (C.motif === "versement") return '<div class="card"><h3>Correction du stock</h3><div class="field"><span class="flabel">Motif</span>' + segHtml("", "data-cmotif", CORR_MOTIFS, C.motif) + "</div>" + vfHtml() +
      '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="vfSave"' + (C.vf ? "" : " disabled") + ">Annuler ce versement</button></div></div>";
    if (C.motif === "erreur") return '<div class="card"><h3>Correction du stock</h3><div class="field"><span class="flabel">Motif</span>' + segHtml("", "data-cmotif", CORR_MOTIFS, C.motif) + "</div>" + extHtml() +
      '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="extSave"' + (C.ach ? "" : " disabled") + ">Extourner l’achat</button></div></div>";
    var sel = corrSel(), h = '<div class="card"><h3>Correction du stock</h3><div class="field"><span class="flabel">Motif</span>' + segHtml("", "data-cmotif", CORR_MOTIFS, C.motif) + "</div>" +
      '<div class="field"><span class="flabel">Bidons concernés (touchez-les)</span><div class="cans">';
    for (var i = 0; i < bidons.length; i++) h += '<button class="can-pick" data-cpick="' + i + '" aria-pressed="' + !!C.sel[i] + '" aria-label="Bidon ' + (i + 1) + '">' + canSvg(bidons[i], i) + "</button>";
    h += "</div></div>" +
      '<div class="field"><label for="cWho">Correction faite par</label><select id="cWho">' + PEOPLE.filter(function (p) { return p.c !== "EXT"; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === C.who ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>";
    if (C.motif === "autre") h += '<div class="field"><span class="flabel">Usage</span><div class="chips">' + ["Voiture", "Moto", "Dépannage", "Autre"].map(function (u) { return '<button class="chip" data-cusage="' + u + '" aria-pressed="' + (u === C.usage) + '">' + u + "</button>"; }).join("") + "</div></div>";
    h += '<div class="field"><span class="flabel">' + (C.motif === "autre" ? "Utilisé par" : "Perte à la charge de") + "</span>" + segHtml("fam", "data-caff", [["YC", "Yann"], ["OC", "Olivier"], ["5050", "Commun"]], C.aff) + "</div>";
    var takes = [];
    if (!sel.length) h += '<div class="small muted">Touchez les bidons concernés, puis indiquez combien on retire du stock.</div>';
    else {
      // combien retire-t-on du stock ? en bidons (au demi) ou en litres ; par défaut, les bidons touchés en entier
      var selL = sel.reduce(function (a, i) { return a + bidons[i].litres; }, 0), qv = C.qty != null ? C.qty : (C.unit === "litres" ? Math.round(selL * 10) / 10 : sel.length);
      h += '<div class="field"><span class="flabel">Quantité retirée du stock</span>' + segHtml("mini", "data-cunit", [["bidons", "En bidons"], ["litres", "En litres"]], C.unit) +
        (C.unit === "bidons" ? '<div class="stepper"><button data-cqstep="-0.5" aria-label="Un demi-bidon de moins"' + (qv <= 0.5 ? " disabled" : "") + '>−</button><span class="val">' + half(qv) + '</span><button data-cqstep="0.5" aria-label="Un demi-bidon de plus"' + (qv >= sel.length ? " disabled" : "") + ">+</button></div>"
          : '<div class="bal-amt"><input id="cQty" inputmode="decimal" value="' + dec1.format(qv) + '" aria-label="Litres retirés du stock"><span>L</span></div>') +
        '<div class="small muted">Sur ' + sel.length + " bidon(s) touché(s), " + dec1.format(selL) + " L.</div></div>";
      takes = corrTakes(sel);
      h += '<div class="alert ok" id="corrEff">' + corrEffText(takes) + "</div>";
    }
    return h + '<div class="actions"><button class="btn ghost" data-ev="cancel">Annuler</button><button class="btn" id="corrSave"' + (takes.length ? "" : " disabled") + ">Enregistrer la correction</button></div></div>";
  }
  function commitAchat() {
    var A = achatForm, f = A.f, B = A.b, Lt = A.L, P = A.P, pay = { YC: 0, OC: 0 }; pay[f] = P;
    // type, famille, litres, prix, versement et plein : servent aux totaux d'achat et à la balance essence
    var base = { type: "achat", at: stamp(), date: todayIso(), d: todayFr(), f: f, litres: Lt, prix: P, bidons: B, verse: !!A.verse, plein: !!(A.verse && A.plein), cout: P, paye: pay };
    if (A.passe) { base.verse = false; base.plein = false; base.passe = true; moves.unshift(Object.assign({}, base, { t: "Achat de la saison passée (déjà consommé)", v: B + " bidon(s) · " + int0.format(Lt) + " L · " + eur.format(P), who: FAM[f].n })); }
    else if (A.verse) { moves.unshift(Object.assign({}, base, { t: "Achat versé tout de suite", v: B + " bidon(s) · " + int0.format(Lt) + " L · " + eur.format(P), who: FAM[f].n + (A.plein ? " · plein" : "") })); if (A.plein) { lastPlein = todayFr(); lastLevel = 16; lastLevelDate = todayFr(); } }
    else { for (var bi = 0; bi < B; bi++) bidons.push({ id: uid(), f: f, litres: Lt / B, cap: Lt / B, prix: P / Lt, d: todayFr() }); moves.unshift(Object.assign({}, base, { t: "Achat mis en stock", v: B + " bidon(s) · " + int0.format(Lt) + " L · " + eur.format(P), who: FAM[f].n })); }
    // la dépense est comptée pour la famille qui a payé ; la balance essence corrige ensuite selon la consommation
    depenses.unshift({ d: todayFr(), lib: "Essence " + int0.format(Lt) + " L (" + B + " bidon" + (B > 1 ? "s" : "") + ")", cat: "Essence", m: P, payeur: f, regle: "payeur", isNew: true });
    A.step = null; A.tfOpen = false; A.L = 0; A.P = 0; A.f = ""; A.verse = false; A.passe = false; A.plein = true; view.essence = null; save(2); toast(savedMsg("Achat enregistré, dépense créée.")); render();
  }

  /* ---------- Dépenses ---------- */
  var REGL = "Règlement entre familles";
  var CATS = [["Assurance", "5050"], ["Matériel bateau", "5050"], ["Entretien", "5050"], ["Réparation", "5050"], ["Adhésion", "5050"], ["Taxes", "5050"], ["Taxe / corps mort lac", "5050"], ["Essence", "payeur"], ["Matériel loisir", "payeur"], ["Recette invités", "payeur"], ["Remboursement", "5050"], [REGL, "regl"], ["Autres", "5050"]];
  var depForm = { cat: "Matériel bateau", /* « Essence » n'est plus proposé ici (v1.9.4) : l'essence passe par l'onglet Essence */ regle: "5050", pct: 50, payeur: "YC" };
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
  /* ---------- Balance essence : équilibrage depuis le dernier équilibrage ----------
     Le réservoir est suivi comme un mélange : chaque litre versé garde la famille qui l'a payé.
     Litres consommés par une session :
       - si le bateau est refait plein après la session (bidons versés en fin de session ou au début de la suivante),
         l'essence versée entre deux pleins = la consommation des sessions entre ces deux pleins (répartie au temps moteur) ;
       - sinon, la baisse de la jauge entre le début et la fin de la session ;
       - sans jauge (session saisie à la main) : temps moteur × consommation de la fiche technique.
     Chaque session consomme le mélange du réservoir ; son coût est réparti entre les familles au temps de chacune
     (passagers non comptés, mécanique 50/50). Seuls les croisements comptent : essence payée par Yann et consommée
     par Olivier, et inversement. L'écart est proposé comme écriture d'équilibrage (modifiable), ajoutée à la balance des comptes.
     Départ : l'hivernage du 23/11/2026, réservoir vide. */
  var BAL_T0 = "2026-11-23T00:00:00", balForm = null;
  /* Remise à zéro (v1.9.4) : réservoir vide et stock de bidons vidé, notée comme un mouvement (partagé, jamais écrasé).
     La balance essence repart de la dernière remise à zéro si elle est plus récente que l'hivernage. */
  function lastReset() { var r = moves.filter(function (m) { return m.type === "reset" && m.at; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0]; return r ? r.at : ""; }
  function balT0() { var r = lastReset(); return r && r > BAL_T0 ? r : BAL_T0; }
  function sesKey(s) { return dkey(s) + "T" + (s.heureFin || "12:00") + ":00"; }
  function pourKey(m) { return m.at || ((m.date || frToIso(m.d)) + "T12:00:00"); }
  function poursList() { return moves.filter(function (m) { return ((m.type === "verse" && !m.annule) || (isAchat(m) && m.verse)) && m.paye && (Number(m.litres) || 0) > 0.05; }).map(function (m) { return { m: m, k: pourKey(m) }; }).sort(function (a, b) { return a.k < b.k ? -1 : 1; }); }
  function famSplit(s) { var y = Number(s.famMin && s.famMin.YC) || 0, o = Number(s.famMin && s.famMin.OC) || 0; if (y + o <= 0) { var e = Number(s.engineMin) || 0; return { YC: e / 2, OC: e / 2 }; } return { YC: y, OC: o }; }
  function lastPrixL() { var a = moves.filter(function (m) { return isAchat(m) && Number(m.litres) > 0 && Number(m.prix) > 0; })[0]; return a ? Number(a.prix) / Number(a.litres) : 1.8; }
  function keyFr(k) { return k ? isoToFr(k.slice(0, 10)) : ""; }
  function zeroPool() { return { L: { YC: 0, OC: 0 }, E: { YC: 0, OC: 0 } }; }
  /* Minutes par famille pour répartir l'essence d'une session : passagers non comptés, temps commun partagé entre les actifs, mécanique 50/50. */
  function sesFam(s) {
    var parts = s.participants || [];
    if (!parts.length) { var f0 = famSplit(s); return { YC: f0.YC, OC: f0.OC, pass: 0 }; }
    var act = parts.filter(function (p) { return p.role !== "pass"; }), nPass = parts.length - act.length;
    if (!act.length) { act = parts; nPass = 0; }
    var meca = Number(s.meca) || 0, res = { YC: meca / 2, OC: meca / 2, pass: nPass }, com = (Number(s.commun) || 0) / act.length;
    act.forEach(function (p) {
      var pp = person(p.pid), f = pp && pp.c === "EXT" ? (p.host === "OC" ? "OC" : "YC") : (pp && CATF[pp.c]) || "YC";
      res[f] += (Number((s.minutes || {})[p.pid]) || 0) + com;
    });
    if (res.YC + res.OC <= 0) { var e = Number(s.engineMin) || 0; res.YC = e / 2; res.OC = e / 2; }
    return res;
  }
  function balStart() {
    var prevs = dettes.filter(function (d) { return d.kind === "essence" && d.fin && d.fin >= balT0(); }).sort(function (a, b) { return a.fin < b.fin ? -1 : 1; }), last = prevs[prevs.length - 1];
    if (last) {
      var r = last.detail && last.detail.reste, pool = zeroPool();
      if (r && r.L && r.E) ["YC", "OC"].forEach(function (f) { pool.L[f] = Number(r.L[f]) || 0; pool.E[f] = Number(r.E[f]) || 0; });
      if (last.fin >= balT0()) return { k: last.fin, label: "équilibrage du " + keyFr(last.fin), pool: pool };
    }
    var t0 = balT0();
    return { k: t0, label: t0 === BAL_T0 ? "hivernage, réservoir vide" : "remise à zéro du " + keyFr(t0) + ", réservoir vide", pool: zeroPool() };
  }
  function computeBalEss() {
    var B = balStart(), cap = SPEC.reservoir || 125, conso = SPEC.conso || 13, prixRef = lastPrixL();
    var R = { start: B.k, label: B.label, pool0: JSON.parse(JSON.stringify(B.pool)), mis: { YC: { L: 0, E: 0 }, OC: { L: 0, E: 0 } }, yForO: 0, oForY: 0, exces: 0, litres: 0, cout: 0 };
    var P = poursList().filter(function (x) { return x.k > B.k; });
    var S = sessionsArr.filter(function (s) { return (s.bateau || SPEC.devise) === SPEC.devise; }).map(function (s) { return { s: s, k: sesKey(s) }; })
      .filter(function (x) { return x.k > B.k; }).sort(function (a, b) { return a.k < b.k ? -1 : 1; });
    var fulls = P.filter(function (x) { return x.m.plein; });
    // 1. litres consommés par session
    S.forEach(function (x) {
      x.fam = sesFam(x.s); x.eMin = Number(x.s.engineMin) || (x.fam.YC + x.fam.OC);
      var A = null, Bf = null;
      fulls.forEach(function (f) { if (f.k < x.k) A = f; else if (!Bf) Bf = f; });
      x.A = A ? A.k : B.k; x.Aplein = !!A; x.Bk = Bf ? Bf.k : null;
    });
    var segs = {};
    S.forEach(function (x) { if (x.Bk) (segs[x.A + ">" + x.Bk] = segs[x.A + ">" + x.Bk] || []).push(x); });
    Object.keys(segs).forEach(function (key) {
      var list = segs[key], a = list[0].A, b = list[0].Bk, lvlA = list[0].Aplein ? cap : (B.pool.L.YC + B.pool.L.OC), verse = 0, tm = 0;
      P.forEach(function (p) { if (p.k > a && p.k <= b) verse += Number(p.m.litres) || 0; });
      list.forEach(function (x) { tm += x.eMin; });
      var C = lvlA + verse - cap;
      if (C > 0.05 && tm > 0) list.forEach(function (x) { x.L = C * x.eMin / tm; x.how = "plein"; x.howTxt = "plein refait : " + (list[0].Aplein ? "plein" : int0.format(lvlA) + " L au départ") + " + " + int0.format(verse) + " L versés − plein " + int0.format(cap) + " L = " + dec1.format(C) + " L" + (list.length > 1 ? ", partagés au temps moteur" : ""); });
    });
    S.forEach(function (x) {
      if (x.how) return;
      var est = x.eMin / 60 * conso, estTxt = Math.round(x.eMin) + " min × " + int0.format(conso) + " L/h";
      if (hasNum(x.s.jaugeDeb) && hasNum(x.s.jaugeFin)) {
        var gL = (Number(x.s.jaugeDeb) - Number(x.s.jaugeFin)) / 16 * cap, jTxt = "jauge " + fracLabel(Number(x.s.jaugeDeb)) + " → " + fracLabel(Number(x.s.jaugeFin));
        // la jauge est imprécise : si elle s'écarte trop du temps moteur, l'estimation au temps a la priorité
        if (jaugeAnormale(gL, x.eMin)) { x.L = est; x.how = "temps"; x.howTxt = jTxt + " (≈ " + int0.format(gL) + " L) incohérente avec le temps moteur : estimé " + estTxt; x.jIncoh = true; }
        else { x.L = Math.max(0, gL); x.how = "jauge"; x.howTxt = jTxt; }
      }
      else { x.L = est; x.how = "temps"; x.howTxt = "estimé : " + estTxt; }
    });
    // 2. réservoir suivi dans l'ordre : versements et sessions (à égalité, la session passe avant le plein qui la suit)
    var pool = JSON.parse(JSON.stringify(B.pool)), ev = P.map(function (p) { return { k: p.k, o: 1, p: p }; }).concat(S.map(function (x) { return { k: x.k, o: 0, x: x }; }));
    ev.sort(function (a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : a.o - b.o; });
    ev.forEach(function (e) {
      if (e.p) {
        var m = e.p.m, lit = Number(m.litres) || 0, py = Number(m.paye.YC) || 0, po = Number(m.paye.OC) || 0, tot = py + po;
        var ly = tot > 0 ? lit * py / tot : lit / 2, lo = lit - ly;
        pool.L.YC += ly; pool.L.OC += lo; pool.E.YC += py; pool.E.OC += po;
        R.mis.YC.L += ly; R.mis.YC.E += py; R.mis.OC.L += lo; R.mis.OC.E += po;
        return;
      }
      var x = e.x, C = x.L || 0, inT = pool.L.YC + pool.L.OC, take = Math.min(C, inT), fr = inT > 0 ? take / inT : 0;
      x.V = { YC: pool.E.YC * fr, OC: pool.E.OC * fr };
      ["YC", "OC"].forEach(function (f) { pool.L[f] -= pool.L[f] * fr; pool.E[f] -= pool.E[f] * fr; });
      x.exces = C - take; x.cost = x.V.YC + x.V.OC + x.exces * prixRef;
      var tf = x.fam.YC + x.fam.OC, tY = tf > 0 ? x.fam.YC / tf : 0.5, tO = 1 - tY;
      x.tY = tY; x.due = { YC: x.cost * tY, OC: x.cost * tO };
      x.yForO = x.V.YC * tO; x.oForY = x.V.OC * tY;
      R.yForO += x.yForO; R.oForY += x.oForY; R.exces += x.exces; R.litres += C; R.cout += x.cost;
    });
    R.S = S; R.P = P; R.end = ev.length ? ev[ev.length - 1].k : B.k;
    R.reste = { L: { YC: Math.round(pool.L.YC * 10) / 10, OC: Math.round(pool.L.OC * 10) / 10 }, E: { YC: Math.round(pool.E.YC * 100) / 100, OC: Math.round(pool.E.OC * 100) / 100 } };
    var net = R.yForO - R.oForY; // positif : la famille Olivier a consommé de l'essence payée par Yann
    R.amount = Math.round(Math.abs(net) * 100) / 100; R.from = net >= 0 ? "OC" : "YC"; R.to = R.from === "OC" ? "YC" : "OC";
    R.ready = S.length > 0 || P.length > 0;
    return R;
  }
  function balResultText(R) { return R.amount < 0.5 ? "Équilibre fait, pas de régularisation." : FAM[R.from].s + " doit " + eur.format(R.amount) + " à " + FAM[R.to].s + "."; }
  function balVTxt(v) { return Math.abs(v) < 0.5 ? "équilibrée" : (v > 0 ? "Olivier doit " + eur.format(v) + " à Yann" : "Yann doit " + eur.format(-v) + " à Olivier"); }
  function balEffHtml(R, amt, dir) {
    var Bc = balance(), v = (Bc.net.YC - Bc.net.OC) / 2, nv = v + (dir === "OC" ? amt : -amt);
    // v1.9.6 : sans répéter « Olivier doit à Yann » quand le sens ne change pas
    if (Math.abs(v) >= 0.5 && Math.abs(nv) >= 0.5 && (v > 0) === (nv > 0)) return "Balance des comptes : " + eur.format(Math.abs(v)) + " → <b>" + eur.format(Math.abs(nv)) + "</b> (" + (v > 0 ? "Olivier doit à Yann" : "Yann doit à Olivier") + ")";
    return "Balance des comptes : " + balVTxt(v) + " → <b>" + balVTxt(nv) + "</b>";
  }
  /* v1.9.6 : essence reportée au prochain équilibrage essence, dite clairement */
  function balResteTxt(R) {
    var t = R.reste.L.YC + R.reste.L.OC;
    if (t <= 0.05) return "Réservoir vide après cet équilibrage : rien n’est reporté.";
    return "Il restera " + dec1.format(t) + " L dans le réservoir (" + [R.reste.L.YC > 0.05 ? dec1.format(R.reste.L.YC) + " L payés par Yann" : "", R.reste.L.OC > 0.05 ? dec1.format(R.reste.L.OC) + " L payés par Olivier" : ""].filter(Boolean).join(", ") + ") : cette essence sera répartie au prochain équilibrage essence, selon qui la consommera.";
  }
  /* v1.9.6 : second équilibrage, celui des dépenses communes (hors essence). Un règlement est une dépense « Règlement entre familles » :
     elle augmente la part payée de la famille qui verse et diminue celle de la famille qui reçoit, ce qui solde la balance des comptes. */
  var reglForm = null;
  function reglHtml() {
    var Bc = balance(), v = (Bc.net.YC - Bc.net.OC) / 2, h = '<div class="card bal-card bal-regl"><div class="step"><b>5</b>Équilibrage des dépenses communes</div>' +
      '<div class="small">' + (Math.abs(v) < 0.5 ? "Balance des comptes : équilibrée." : "Balance des comptes : <b>" + balVTxt(v) + "</b>.") + "</div>";
    if (!reglForm) return h + '<button class="btn regl-btn" id="reglOpen"' + (canValidate() ? "" : " disabled") + ">Noter un règlement</button>" + (canValidate() ? "" : RESERVE_TXT) + "</div>";
    var F = reglForm;
    h += '<div class="field"><span class="flabel">Qui a payé qui ?</span>' + segHtml("fam mini", "data-reglp", [["OC", "Olivier a payé Yann"], ["YC", "Yann a payé Olivier"]], F.p) + "</div>" +
      '<div class="two"><div class="field"><label for="rgM">Montant réglé (€)</label><input id="rgM" inputmode="decimal" value="' + (F.m ? dec2.format(F.m) : "") + '"></div>' +
      '<div class="field"><label for="rgD">Date</label><input id="rgD" type="date" value="' + esc(F.d) + '"></div></div>' +
      '<div class="field"><label for="rgL">Motif</label><input id="rgL" value="' + esc(F.l) + '"></div>' +
      '<div class="small muted">Le montant est ajouté à la part payée ' + (F.p === "OC" ? "d’Olivier" : "de Yann") + " et retiré de celle " + (F.p === "OC" ? "de Yann" : "d’Olivier") + " dans les dépenses.</div>" +
      '<div class="actions"><button class="btn ghost" id="reglCancel">Annuler</button><button class="btn" id="reglSave">Enregistrer le règlement</button></div></div>';
    return h;
  }
  /* Frise « à régulariser » : versements (gouttes, couleur du payeur) et sessions (bleu Yann, rouge Olivier, mixte = partagée au temps, contour orange),
     dans l'ordre chronologique depuis le dernier équilibrage ; litres consommés entre deux versements. */
  function balFriseHtml(R) {
    var col = { YC: "var(--yc)", OC: "var(--oc)" }, drop = "M0,-12 C5,-5 8,-1 8,3 A8,8 0 0 1 -8,3 C-8,-1 -5,-5 0,-12 Z";
    var payer = function (m) { return (Number(m.paye.OC) || 0) > (Number(m.paye.YC) || 0) ? "OC" : "YC"; };
    var famOf = function (x) { return x.tY >= 0.999 ? "YC" : x.tY <= 0.001 ? "OC" : "MIX"; };
    var litF = function (v) { return (v >= 9.95 ? int0.format(v) : dec1.format(v)) + " L"; };
    var ev = R.P.map(function (p) { return { k: p.k, o: 1, p: p }; }).concat(R.S.map(function (x) { return { k: x.k, o: 0, x: x }; }));
    ev.sort(function (a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : a.o - b.o; });
    // au-delà de ~9 éléments, chaque élément garde 24 de large : la frise dépasse l'écran et se fait défiler au doigt
    var n = ev.length, SLOT = 24, X0 = 84, W = Math.max(340, X0 + n * SLOT + 42), X1 = W - 42, slot = (X1 - X0) / Math.max(n, 1), w = Math.max(4, Math.min(18, slot - 3)), sc = Math.min(1, slot / 18), wide = W > 340;
    ev.forEach(function (e, i) { e.cx = X0 + slot * (i + 0.5); });
    var s = (wide ? '<div class="bal-frise" data-fx="1">' : "") + '<svg viewBox="0 0 ' + W + ' 150" width="' + (wide ? (W / 3.4).toFixed(1) : 100) + '%" role="img" aria-label="Frise : ' + R.P.length + " versement(s) et " + R.S.length + ' session(s) depuis le dernier équilibrage" style="display:block;margin:6px 0 2px">';
    // litres consommés entre deux versements (et avant le premier, s'il y a déjà eu des sessions)
    var cuts = [{ x: 66, i: -1 }].concat(ev.map(function (e, i) { return e.p ? { x: e.cx, i: i } : null; }).filter(Boolean)).concat([{ x: W - 14, i: n }]);
    for (var c = 0; c < cuts.length - 1; c++) {
      var L = 0; for (var j = cuts[c].i + 1; j < cuts[c + 1].i; j++) if (ev[j].x) L += ev[j].x.L || 0;
      var a = cuts[c].x + (c ? 10 * sc : 0), b = cuts[c + 1].x - (c + 1 < cuts.length - 1 ? 10 * sc : 0);
      if (L < 0.05 || b - a < 8) continue;
      s += '<line x1="' + a + '" y1="34" x2="' + b + '" y2="34" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3"/>';
      if (b - a >= 26) s += '<text x="' + ((a + b) / 2) + '" y="24" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="var(--f-mono)">' + litF(L) + "</text>";
    }
    ev.forEach(function (e) { if (e.p) { var m = e.p.m, f = payer(m); s += '<path d="' + drop + '" transform="translate(' + e.cx + ',36) scale(' + sc + ')" fill="' + col[f] + '"><title>' + esc(keyFr(e.k)) + " · " + int0.format(Number(m.litres) || 0) + " L versés par " + FAM[f].s + (m.plein ? " (plein)" : "") + "</title></path>"; } });
    var ah = W - 36, at = W - 6;
    s += '<polygon points="64,58 ' + ah + ",58 " + ah + ",48 " + at + ",71 " + ah + ",94 " + ah + ',84 64,84 75,71" fill="var(--surface)" stroke="var(--line)" stroke-width="1.5"/>' +
      '<polygon points="4,58 50,58 63,71 50,84 4,84 15,71" fill="var(--ok)"/>' +
      '<text x="35" y="75.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--surface)" font-family="var(--f-display)">' + keyFr(R.start).slice(0, 5) + "</text>";
    var lastLab = -99;
    ev.forEach(function (e) {
      if (!e.x) return;
      var x = e.x, f = famOf(x), x0 = e.cx - w / 2, tip = "<title>" + esc(keyFr(x.k)) + " · " + Math.round(x.eMin) + " min · " + dec1.format(x.L || 0) + " L</title>";
      if (f === "MIX") {
        var wo = Math.round(w * (1 - x.tY) * 10) / 10;
        s += '<g><rect x="' + x0 + '" y="63" width="' + wo + '" height="16" fill="var(--oc)"/><rect x="' + (x0 + wo) + '" y="63" width="' + (w - wo) + '" height="16" fill="var(--yc)"/>' +
          '<rect x="' + x0 + '" y="63" width="' + w + '" height="16" rx="3" fill="none" stroke="var(--run)" stroke-width="2"/>' + tip + "</g>";
        if (e.cx - lastLab >= 34) { s += '<text x="' + e.cx + '" y="104" text-anchor="middle" font-size="11" fill="var(--muted)">' + keyFr(x.k).slice(0, 5) + "</text>"; lastLab = e.cx; }
      } else s += '<rect x="' + x0 + '" y="63" width="' + w + '" height="16" rx="3" fill="' + col[f] + '">' + tip + "</rect>";
    });
    if (!n) s += '<text x="190" y="75.5" text-anchor="middle" font-size="12" fill="var(--muted)">rien depuis</text>';
    s += '<text x="4" y="122" font-size="11" fill="var(--muted)">Dernier équilibrage</text>' + (R.label.indexOf("hivernage") === 0 ? '<text x="4" y="136" font-size="11" fill="var(--muted)">hivernage</text>' : "") +
      '<text x="' + (W - 4) + '" y="122" text-anchor="end" font-size="11" font-weight="600" fill="var(--ink)">Aujourd’hui</text><text x="' + (W - 4) + '" y="136" text-anchor="end" font-size="11" fill="var(--muted)">' + todayFr().slice(0, 5) + "</text></svg>" +
      (wide ? '</div><div class="small muted bal-fhint">← Glisser la frise du doigt pour remonter le temps</div>' : "");
    var dropIc = function (f) { return '<svg width="10" height="13" viewBox="-8 -12 16 23" style="vertical-align:-2px;margin-right:4px" aria-hidden="true"><path d="' + drop + '" fill="' + col[f] + '"/></svg>'; };
    // v1.9.6 : encart repliable (ouvert par défaut), sous-titre réduit à la date du dernier équilibrage
    var h = '<div class="card bal-head">' + collHead("balFriseOff", "Graphique dépenses Essence", "Dernier équilibrage : " + keyFr(R.start) + " · " + litF(R.litres) + " consommés").replace('aria-expanded="' + !!ui.balFriseOff + '"', 'aria-expanded="' + !ui.balFriseOff + '"');
    if (ui.balFriseOff) return h + '<div class="small" style="margin-top:6px"><b>' + balResultText(R) + "</b></div></div>";
    h += s +
      '<div class="legend"><span>' + dropIc("YC") + "Versé par Yann</span><span>" + dropIc("OC") + 'Versé par Olivier</span><span><i style="display:inline-block;width:12px;height:9px;border:2px solid var(--run);border-radius:2px;margin-right:4px;vertical-align:-1px"></i>Session mixte</span></div>';
    var nP = { YC: 0, OC: 0 }; R.P.forEach(function (p) { nP[payer(p.m)]++; });
    h += '<div class="kpis" style="margin-top:10px">' + ["YC", "OC"].map(function (f) { var m = R.mis[f]; return '<div class="kpi"><span class="label">Versé · ' + FAM[f].s + '</span><span class="v" style="color:' + col[f] + '">' + int0.format(m.L) + ' <small>L</small></span><span class="s">' + nP[f] + " versement" + (nP[f] > 1 ? "s" : "") + " · " + eur.format(m.E) + "</span></div>"; }).join("") + "</div>";
    // sessions mixtes : seules elles croisent l'essence d'une famille avec le temps de l'autre
    var mix = R.S.filter(function (x) { return famOf(x) === "MIX"; }), solo = { YC: 0, OC: 0 }, T = { YC: 0, OC: 0 }, D = { YC: 0, OC: 0 }, LL = { YC: 0, OC: 0 };
    R.S.forEach(function (x) { var f = famOf(x), t = x.fam.YC + x.fam.OC; if (f !== "MIX") solo[f] += t; T.YC += x.fam.YC; T.OC += x.fam.OC; D.YC += x.due.YC; D.OC += x.due.OC; LL.YC += (x.L || 0) * x.tY; LL.OC += (x.L || 0) * (1 - x.tY); });
    h += '<div class="label" style="margin-top:12px">Sessions mixtes à régulariser</div>';
    if (!mix.length) h += '<div class="small muted">Aucune session mixte' + (R.S.length ? " : chaque famille a navigué seule (" + Math.round(solo.YC) + " min Yann, " + Math.round(solo.OC) + " min Olivier)." : ".") + "</div>";
    else h += '<table class="rtable"><thead><tr><th>Date</th><th style="color:var(--oc)">Olivier</th><th style="color:var(--yc)">Yann</th></tr></thead><tbody>' +
      mix.map(function (x) { return "<tr><td>" + keyFr(x.k).slice(0, 5) + "</td><td>" + Math.round(x.fam.OC) + " min · " + dec1.format((x.L || 0) * (1 - x.tY)) + " L</td><td>" + Math.round(x.fam.YC) + " min · " + dec1.format((x.L || 0) * x.tY) + " L</td></tr>"; }).join("") +
      (solo.YC + solo.OC > 0.5 ? '<tr><td class="muted">+ seuls</td><td class="muted">' + Math.round(solo.OC) + ' min</td><td class="muted">' + Math.round(solo.YC) + " min</td></tr>" : "") + "</tbody></table>";
    // totaux depuis l'équilibrage : seul le croisement (essence payée par l'autre) donne lieu à l'ajustement
    var net = R.yForO - R.oForY, oDoit = net > 0.005, yDoit = net < -0.005, ec = Math.abs(net);
    var ecTd = function (neg) { return '<td style="color:var(' + (ec < 0.005 ? "--muted" : neg ? "--bad" : "--ok") + ')"><b>' + (ec < 0.005 ? "0,00 €" : (neg ? "− " : "+ ") + eur.format(ec)) + "</b></td>"; };
    if (R.S.length) h += '<div class="label" style="margin-top:12px">Total depuis l’équilibrage</div><table class="rtable"><thead><tr><th></th><th style="color:var(--oc)">Olivier</th><th style="color:var(--yc)">Yann</th></tr></thead><tbody>' +
      "<tr><td>Temps</td><td>" + Math.round(T.OC) + " min</td><td>" + Math.round(T.YC) + " min</td></tr>" +
      "<tr><td>Consommé</td><td>" + eur.format(D.OC) + '<span class="sub">' + dec1.format(LL.OC) + " L</span></td><td>" + eur.format(D.YC) + '<span class="sub">' + dec1.format(LL.YC) + " L</span></td></tr>" +
      "<tr><td>dont essence payée par l’autre</td><td>" + eur.format(R.yForO) + "</td><td>" + eur.format(R.oForY) + "</td></tr>" +
      "<tr><td><b>Écart</b></td>" + ecTd(oDoit) + ecTd(yDoit) + "</tr></tbody></table>";
    var bid = (SPEC.bidon || 20) * lastPrixL();
    h += '<div class="alert' + (R.amount < 0.5 ? " ok" : "") + '"><b>' + balResultText(R) + "</b>" + (R.amount >= 0.5 ? "≈ " + dec1.format(R.amount / bid) + " bidon. Les comptes repartent à 0 une fois l’équilibrage validé (étape 4)." : "") + "</div></div>";
    return h;
  }
  function renderBalance() {
    var R = computeBalEss(), dot = function (f) { return famDot(f); }, h = '<button class="btn link" data-fin="bilan">← Retour à l’activité</button>';
    var endFr = R.end > R.start ? keyFr(R.end) : todayFr();
    h += balFriseHtml(R);
    // 1. essence mise dans le bateau
    var r0 = R.pool0.L.YC + R.pool0.L.OC, stY = 0, stO = 0;
    bidons.forEach(function (b) { if (b.f === "OC") stO += b.litres; else stY += b.litres; });
    h += '<div class="card bal-card"><div class="step"><b>1</b>Essence mise dans le bateau</div>' +
      (r0 > 0.05 ? '<div class="bal-l small muted"><span>Déjà dans le réservoir au départ</span><span>' + int0.format(r0) + " L · " + eur.format(R.pool0.E.YC + R.pool0.E.OC) + "</span></div>" : "") +
      ["YC", "OC"].map(function (f) { var m = R.mis[f]; return '<div class="bal-l"><span>' + dot(f) + FAM[f].n + '</span><span>' + int0.format(m.L) + " L · " + eur.format(m.E) + (m.L > 0.05 ? ' <span class="muted">(' + dec2.format(m.E / m.L) + " €/L)</span>" : "") + "</span></div>"; }).join("") +
      (stY + stO > 0.05 ? '<div class="small muted bal-sep">Bidons encore en stock : ' + [stY > 0.05 ? int0.format(stY) + " L payés par Yann" : "", stO > 0.05 ? int0.format(stO) + " L payés par Olivier" : ""].filter(Boolean).join(", ") + ". Ils compteront quand ils seront versés.</div>" : "") + "</div>";
    // 2. essence consommée, session par session
    h += '<div class="card bal-card"><div class="step"><b>2</b>Essence consommée, session par session</div>';
    if (!R.S.length) h += '<div class="small muted">Aucune session depuis le dernier équilibrage.</div>';
    R.S.forEach(function (x, i) {
      var cross = (x.yForO || 0) + (x.oForY || 0), one = cross < 0.005, s = x.s; // rien à équilibrer : aucune essence payée par l'autre famille
      h += '<div class="bal-s' + (i ? " bal-sep" : "") + '"><div><b>' + esc(keyFr(x.k).slice(0, 5)) + " · " + Math.round(x.eMin) + ' min</b><span class="small muted">' + dot("YC") + Math.round(x.fam.YC) + " min · " + dot("OC") + Math.round(x.fam.OC) + " min" + (x.fam.pass ? " · " + x.fam.pass + " passager" + (x.fam.pass > 1 ? "s" : "") + " non compté" + (x.fam.pass > 1 ? "s" : "") : "") + "</span>" +
        (ui.bal2How ? '<span class="small muted">' + esc(x.howTxt) + (s.mode === "manuel" ? " · saisie manuelle" : "") + "</span>" : "") + "</div>" +
        '<div class="bal-r"><b>' + dec1.format(x.L || 0) + " L · " + eur.format(x.cost || 0) + "</b>" +
        (one ? '<span class="tag">' + (x.tY > 0.999 || x.tY < 0.001 ? "une seule famille, " : "") + "rien à équilibrer</span>" : '<span class="small muted">Y ' + eur.format(x.due.YC) + " · O " + eur.format(x.due.OC) + "</span>" +
          '<span class="small bal-x">' + [x.yForO >= 0.005 ? eur.format(x.yForO) + " payés par Yann pour Olivier" : "", x.oForY >= 0.005 ? eur.format(x.oForY) + " payés par Olivier pour Yann" : ""].filter(Boolean).join(" · ") + "</span>") + "</div></div>";
      if (x.exces > 0.5) h += '<div class="small bal-warn">' + dec1.format(x.exces) + " L consommés au-delà de l’essence notée dans le réservoir : comptés au prix moyen, sans payeur (pas d’équilibrage).</div>";
    });
    // v1.9.6 : commentaires repliés (toujours fermés à l'ouverture de l'app)
    if (R.S.length) h += '<button class="coll bal-sub bal-sep" data-coll="bal2How" aria-expanded="' + !!ui.bal2How + '"><span class="ct"><span class="small muted">Détail du calcul des litres</span></span>' + TRI + "</button>";
    if (ui.bal2How) h += '<div class="small muted">Litres consommés : essence versée pour refaire le plein après la session, sinon baisse de la jauge (au 1/16 près, environ 8 L), sinon temps moteur × ' + int0.format(SPEC.conso || 13) + " L/h. Répartition au temps de chaque famille, passagers non comptés.</div>";
    h += "</div>";
    // 3. qui a payé l'essence de qui
    var net = R.yForO - R.oForY;
    h += '<div class="card bal-card"><div class="step"><b>3</b>Qui a payé l’essence de qui</div>' +
      // v1.9.7 : prénoms en couleur, sans « par », pour tenir sur une ligne ; « Écart = … » aligné à droite
      '<div class="bal-l"><span>Payée <b class="n-yc">Yann</b>, consommée <b class="n-oc">Olivier</b></span><b>' + eur.format(R.yForO) + "</b></div>" +
      '<div class="bal-l"><span>Payée <b class="n-oc">Olivier</b>, consommée <b class="n-yc">Yann</b></span><b>' + eur.format(R.oForY) + "</b></div>" +
      '<div class="bal-ec bal-sep">Écart = <b>' + (Math.abs(net) < 0.005 ? "0,00 €" : eur.format(Math.abs(net))) + "</b>" + (Math.abs(net) < 0.005 ? "" : '<span class="small muted">en faveur ' + (net > 0 ? "de Yann" : "d’Olivier") + "</span>") + "</div></div>";
    // 4. ajustement proposé (modifiable)
    var dir = ui.balDir || R.from, amt = ui.balAmt != null ? ui.balAmt : R.amount;
    h += '<div class="card bal-card bal-prop"><div class="step"><b>4</b>Ajustement proposé</div>' +
      '<div class="small muted">Équilibrage essence du ' + keyFr(R.start) + " au " + endFr + "</div>" +
      segHtml("fam mini", "data-baldir", [["OC", "Olivier doit à Yann"], ["YC", "Yann doit à Olivier"]], dir) +
      '<div class="bal-amt"><input id="balAmt" inputmode="decimal" value="' + dec2.format(amt) + '" aria-label="Montant de l’équilibrage"><span>€</span>' + (ui.balAmt != null || ui.balDir ? '<button class="btn link" id="balReset">Revenir au calcul (' + eur.format(R.amount) + ")</button>" : "") + "</div>" +
      // v1.9.7 : la phrase « Balance des comptes » est retirée ici, elle figure à l'étape 5
      '<button class="btn" id="balValider"' + (canValidate() ? "" : " disabled") + ">Valider l’équilibrage</button>" + (canValidate() ? "" : RESERVE_TXT) +
      '<div class="small muted">' + balResteTxt(R) + "</div></div>";
    h += reglHtml();
    // explication et historique, repliés
    h += '<div class="card">' + collHead("balHow", "Comment ça marche ?", "le calcul en détail");
    if (ui.balHow) h += '<div class="small bal-how"><p>Chaque achat d’essence est d’abord compté en entier pour la famille qui l’a payé. L’équilibrage corrige ensuite selon qui a consommé quoi.</p>' +
      "<p>Le réservoir est suivi comme un mélange : chaque litre versé garde la famille qui l’a payé. Une session consomme ce mélange.</p>" +
      "<p>Litres consommés : si le bateau a été refait plein après la session (en fin de session ou au début de la suivante), l’essence versée entre deux pleins est exactement la consommation ; sinon on prend la baisse de la jauge ; pour une session saisie à la main, le temps moteur × " + int0.format(SPEC.conso || 13) + " L/h.</p>" +
      "<p>Le coût est réparti au temps de chaque famille (tours et temps commun ; passagers non comptés ; mécanique 50/50). Seuls les croisements comptent : l’essence payée par une famille et consommée par l’autre.</p>" +
      "<p>En validant, l’écart (modifiable) s’ajoute à la balance des comptes, et la période suivante commence. L’essence restée dans le réservoir passe à la période suivante.</p></div>";
    h += "</div>" + balHistHtml();
    return h;
  }
  function balHistHtml() {
    var list = dettes.filter(function (d) { return d.kind === "essence"; }).slice().reverse();
    var h = '<div class="card">' + collHead("balHist", "Équilibrages passés", list.length ? list.length + " · dernier le " + esc(list[0].d || "") : "aucun pour l’instant");
    if (ui.balHist) {
      if (!list.length) h += '<div class="small muted">Aucun pour l’instant.</div>';
      list.forEach(function (d) {
        h += '<div class="bal-row"><span><b>' + (Number(d.eur) >= 0.5 ? FAM[d.from].s + " doit " + eur.format(d.eur) + " à " + FAM[d.to].s : "Équilibré") + '</b><span class="small muted"> · ' + esc(d.note || "") + " · validé le " + esc(d.d || "") + "</span></span>" +
          (Number(d.eur) >= 0.5 ? (d.v === 2 ? '<span class="pill okp">dans la balance</span>' : d.regle ? '<span class="pill okp">réglée</span>' : canValidate() ? '<button class="btn sm" data-balregle="' + esc(d.id) + '">Virement fait : le noter</button>' : '<span class="pill">à régler</span>') : "") + "</div>";
      });
    }
    return h + '<div class="small muted">Balance des comptes (toutes dépenses) : ' + esc(balanceText(balance())) + "</div></div>";
  }
  function renderDepenses() {
    var B = balance(), h = "";
    if (view.dep) h += depFormHtml();
    else h += finBtnsHtml();
    h += '<div class="banner"><div><span class="label">Total</span><span class="v">' + eur0.format(B.tot.total) + '</span></div><div class="yc"><span class="label">Part Yann</span><span class="v">' + eur0.format(B.tot.YC) + '</span></div><div class="oc"><span class="label">Part Olivier</span><span class="v">' + eur0.format(B.tot.OC) + "</span></div></div>" +
      '<div class="alert ok"><b>Balance : ' + balanceText(B) + "</b>Dépenses payées moins la part de chacun, dettes de bidons comprises. Un virement entre familles se note dans la catégorie « " + REGL + " ».</div>" +
      '<button class="btn ghost" id="xlsExport">Exporter la synthèse en Excel</button>';
    return h + depListHtml() + sheetLinkHtml();
  }
  /* Lien vers le Google Sheet (base de données) : donné par le serveur à la synchro, ou saisi dans la fiche technique */
  function sheetLinkHtml() {
    var u = CONF.sheetUrl || SPEC.sheetUrl || "";
    if (!/^https:\/\/docs\.google\.com\//.test(u)) return '<div class="small muted sheet-link">Lien vers le Google Sheet : disponible après la mise à jour du serveur (1.3.0), ou à coller dans la fiche technique (onglet Admin).</div>';
    return '<a class="card link-card sheet-link" href="' + esc(u) + '" target="_blank" rel="noopener"><span><b>Ouvrir la base de données (Google Sheet)</b><span class="small muted">Carnet Noskids – données · réservé aux comptes autorisés</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }
  function depFormHtml() {
    var h = "";
    {
      h += '<div class="card"><h3>Nouvelle dépense</h3><div class="two"><div class="field"><label for="dM">Montant (€)</label><input id="dM" inputmode="decimal" value="120"></div><div class="field"><label for="dCat">Catégorie</label><select id="dCat">' + CATS.filter(function (c) { return c[0] !== "Essence"; }).map(function (c) { return "<option" + (c[0] === depForm.cat ? " selected" : "") + ">" + esc(c[0]) + "</option>"; }).join("") + "</select></div></div>" +
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
    if (!depenses.length) h += '<tr><td colspan="4" class="muted">Aucune dépense. Importez l’historique (onglet Admin) ou ajoutez la première.</td></tr>';
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
    if (DEMO) throw new Error("Import impossible en mode démo : repassez en live.");
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
  /* ---------- Synthèse par bateau ----------
     Ancien bateau (Response 1993) : toutes les dépenses jusqu'à fin 2025, achat compris, moins la revente (SPEC.venteAncien).
     Nouveau bateau (Noskids, depuis 2026) : dépenses depuis 2026, amortissement et usure moteur de la fiche technique ;
     tant que l'essence de la période n'est pas renseignée, elle est estimée à SPEC.conso L/h (13 L/h). */
  var BOATS = [{ k: "new", n: "Noskids · LXR 2015", d: "depuis 2026" }, { k: "old", n: "Response 1993", d: "2023 → 2025" }];
  var bilanBoat = "";
  function boatOf(y) { return y && y <= "2025" ? "old" : "new"; }
  function isAchatBateau(d) { return !!d.achatBateau || (d.cat === "Matériel bateau" && Number(d.m) >= 10000); } // achat du bateau (2 × 11 500 € en 2023, 2 × 5 000 € en 2026)
  /* Bateau d'une dépense : choisi à l'import (champ « bateau » : déculassage 2026 sur l'ancien, matériel repris sur le nouveau), sinon selon l'année.
     Une dépense affectée à l'autre bateau compte dans sa première (ou dernière) saison. */
  function depBoat(d) { return d.bateau === "old" || d.bateau === "new" ? d.bateau : boatOf(yearOf(d)); }
  function depYear(d) { var y = yearOf(d), b = depBoat(d); if (!y || boatOf(y) === b) return y; return b === "new" ? "2026" : "2025"; }
  function boatYears(bk) {
    var s = {};
    sessionsArr.forEach(function (x) { var y = yearOf(x); if (y && boatOf(y) === bk) s[y] = 1; });
    depenses.forEach(function (x) { var y = depYear(x); if (y && depBoat(x) === bk && x.cat !== REGL) s[y] = 1; });
    if (bk === "new") s[String(Math.max(2026, new Date().getFullYear()))] = 1;
    return Object.keys(s).sort();
  }
  function refPrixL() {
    var l = 0, e = 0; moves.forEach(function (m) { if (isAchat(m) && Number(m.litres) > 0 && Number(m.prix) > 0) { l += Number(m.litres); e += Number(m.prix); } });
    return l > 0 ? e / l : 1.85;
  }
  var CONSO_EXCL = { "2026": 1 }; // saisons écartées de la consommation moyenne
  function bilanData(bk, year) {
    var all = boatYears(bk), ys = year === "Toutes" ? all : [year];
    var D = { bk: bk, ys: ys, years: ys.length, min: 0, tour: 0, nSes: 0, fam: { YC: 0, OC: 0 }, commun: 0, meca: 0, people: [], curve: [], fixes: 0, fx: { assurance: 0, adhesions: 0, taxes: 0 }, essence: 0, litres: 0, autres: 0, recettes: 0, it: { fixes: [], essence: [], autres: [], recettes: [], achat: [] } };
    ys.forEach(function (y) { var a = YEARS[y]; if (!a) return; D.min += a.min; D.fam.YC += a.fam.YC; D.fam.OC += a.fam.OC; D.commun += a.commun; D.meca += a.meca; D.people = mergePeople(D.people, a.people || []); if (ys.length === 1) D.curve = a.curve; });
    sessionsArr.forEach(function (s) { if (ys.indexOf(yearOf(s)) < 0) return; D.nSes++; Object.keys(s.minutes || {}).forEach(function (p) { D.tour += Number(s.minutes[p]) || 0; }); });
    var achatTot = 0;
    depenses.forEach(function (d) {
      var y = depYear(d); if (!y || depBoat(d) !== bk || d.cat === REGL) return;
      var m = Number(d.m) || 0;
      if (isAchatBateau(d)) { achatTot += m; D.it.achat.push(d); return; }
      if (ys.indexOf(y) < 0) return;
      if (d.cat === "Essence") { D.essence += m; D.it.essence.push(d); }
      else if (FIXED_CATS[d.cat]) { D.fixes += m; D.fx[FIXED_CATS[d.cat]] += m; D.it.fixes.push(d); }
      else if (d.cat === "Recette invités") { D.recettes += m; D.it.recettes.push(d); }
      else { D.autres += m; D.it.autres.push(d); }
    });
    moves.forEach(function (mv) { if (isAchat(mv) && ys.indexOf(yearOf(mv)) >= 0) D.litres += Number(mv.litres) || 0; });
    /* v2.0.4 : consommation constatée (L/h) sans la saison 2026, reconstituée après coup et peu fiable (demande de Yann, 27/11/2026) */
    D.cMin = 0; D.cL = 0; D.cExcl = ys.some(function (y) { return CONSO_EXCL[y]; });
    ys.forEach(function (y) { if (!CONSO_EXCL[y] && YEARS[y]) D.cMin += YEARS[y].min; });
    moves.forEach(function (mv) { var y = yearOf(mv); if (isAchat(mv) && ys.indexOf(y) >= 0 && !CONSO_EXCL[y]) D.cL += Number(mv.litres) || 0; });
    if (bk === "new" && D.essence <= 0 && D.min > 0) { D.estime = true; D.litres = D.min / 60 * SPEC.conso; D.essence = D.litres * refPrixL(); }
    if (bk === "old") {
      D.achat = achatTot; D.vente = Number(SPEC.venteAncien) || 0;
      D.bateau = (achatTot - D.vente) * ys.length / Math.max(1, all.length); // achat moins revente, réparti sur les saisons du bateau
      D.usure = 0;
    } else {
      D.achat = (Number(SPEC.prix) || 0) + (Number(SPEC.valMoteur) || 0);
      D.bateau = amortAn() * ys.length; D.usure = usureMin() * D.min;
    }
    D.total = D.fixes + D.essence + D.autres + D.recettes + D.bateau + D.usure;
    D.fixedYear = (D.fixes + D.autres + D.recettes + D.bateau) / Math.max(1, ys.length); // part fixe d'une saison (pour la courbe)
    return D;
  }
  /* Détail d'un poste du coût (ligne touchée) : les dépenses qu'il contient, ou le calcul quand il n'y a pas de dépense */
  function detItemsHtml(D, k) {
    var row = function (lib, sub, m) { return '<div class="det-it"><span>' + lib + (sub ? '<span class="sub">' + sub + "</span>" : "") + '</span><b>' + eur.format(m) + "</b></div>"; };
    var depRow = function (d) {
      var moved = d.bateau && boatOf(yearOf(d)) !== d.bateau ? (d.bateau === "new" ? " · repris du Response 1993" : " · affecté au Response 1993") : "";
      return row(esc(d.lib), esc(d.d || isoToFr(d.date)) + " · " + esc(d.cat) + " · payé par " + (FAM[d.payeur] ? FAM[d.payeur].s : "?") + moved, Number(d.m) || 0);
    };
    var list = function (a) { return a.slice().sort(function (x, y) { return dkey(x) < dkey(y) ? 1 : -1; }); }, h = "";
    if (k === "essence" && D.estime) h = '<div class="small">Aucun achat d’essence saisi pour cette période : ' + int0.format(D.min) + " min moteur × " + SPEC.conso + " L/h = " + int0.format(D.litres) + " L, au prix moyen des achats déjà notés (" + dec2.format(refPrixL()) + " €/L).</div>";
    else if (k === "usure") h = '<div class="small">' + eur0.format(SPEC.valMoteur) + " répartis sur les " + int0.format(SPEC.hVie - SPEC.hAchat) + " heures restantes du moteur, soit " + dec2.format(usureMin()) + " € par minute moteur × " + int0.format(D.min) + " min.</div>";
    else if (k === "bateau" && D.bk === "new") {
      h = '<div class="small">' + eur0.format(SPEC.prix) + " amortis sur " + SPEC.ans + " ans = " + eur0.format(amortAn()) + " par saison × " + D.years + " saison" + (D.years > 1 ? "s" : "") + ". Le moteur (" + eur0.format(SPEC.valMoteur) + ") est compté à part, en usure.</div>";
      if (D.it.achat.length) h += '<div class="small muted">Paiements de l’achat notés dans les dépenses (déjà compris dans l’amortissement, non ajoutés) :</div>' + list(D.it.achat).map(depRow).join("");
    } else if (k === "bateau") {
      h = list(D.it.achat).map(depRow).join("") + row("Revente du bateau", "fiche technique (onglet Admin)", -D.vente);
      if (D.years < boatYears("old").length) h += '<div class="small muted">Achat moins revente réparti sur ' + boatYears("old").length + " saisons : " + eur.format(D.bateau) + " pour " + esc(D.ys.join(", ")) + ".</div>";
    } else {
      var a = list(D.it[k] || []);
      h = a.length ? a.map(depRow).join("") : '<div class="small muted">Aucune dépense dans ce poste.</div>';
    }
    return '<div class="det-list">' + h + "</div>";
  }
  function perMin(v, min) { return min > 0 ? dec2.format(v / min) + " €" : "—"; }
  function renderBilan() {
    if (!bilanBoat) bilanBoat = boatOf(latestYear() || String(new Date().getFullYear()));
    var yrs = boatYears(bilanBoat).concat(["Toutes"]);
    if (!bilanYearUser || yrs.indexOf(bilanYear) < 0) { var ly = latestYear(); bilanYear = ly && boatOf(ly) === bilanBoat ? ly : yrs[yrs.length - 2] || "Toutes"; }
    var h = '<div class="card"><div class="label">Bateau</div><div class="boat-sel">' + BOATS.map(function (b) { return '<button class="boat-chip" data-boat="' + b.k + '" aria-pressed="' + (b.k === bilanBoat) + '"><b>' + esc(b.n) + "</b><span>" + esc(b.d) + "</span></button>"; }).join("") + "</div>" +
      '<div class="label">Année</div><div class="chips">' + yrs.map(function (y) { return '<button class="chip" data-year="' + y + '" aria-pressed="' + (y === bilanYear) + '">' + y + "</button>"; }).join("") + "</div></div>";
    var D = bilanData(bilanBoat, bilanYear), B0 = BOATS.filter(function (b) { return b.k === bilanBoat; })[0];
    var essM = D.min ? D.essence / D.min : 0, usM = D.min ? D.usure / D.min : 0;
    var per = bilanYear === "Toutes" ? (bilanBoat === "old" ? "sur toute la période du bateau" : "depuis l’achat") : "en " + bilanYear;
    h += '<div class="card">' + collHead("indic", "Synthèse " + esc(B0.n), (D.min ? perMin(D.total, D.min) + " par minute moteur · " : "") + eur0.format(D.total) + " " + per) + (!ui.indic ? "" :
      '<div class="kpis kpis-in"><div class="kpi hero"><span class="label">Coût total de l’activité</span><span class="v">' + eur0.format(D.total) + '</span><span class="s">' + per + (D.min ? " · " + perMin(D.total, D.min) + " par minute moteur, soit " + eur0.format(D.total / D.min * 60) + " de l’heure" : "") + "</span></div>" +
      '<div class="kpi"><span class="label">Temps moteur</span><span class="v">' + dec1.format(D.min / 60) + ' h</span><span class="s">' + int0.format(D.min) + " min · " + D.nSes + " session" + (D.nSes > 1 ? "s" : "") + "</span></div>" +
      '<div class="kpi"><span class="label">Minutes de tours</span><span class="v">' + int0.format(D.tour) + ' min</span><span class="s">' + (D.tour ? perMin(D.total, D.tour) + " par minute de tour" : "skieurs, wake, bouée") + "</span></div>" +
      '<div class="kpi"><span class="label">' + (D.estime ? "Litres estimés" : "Litres achetés") + '</span><span class="v">' + int0.format(D.litres) + ' L</span><span class="s">' + (D.estime ? SPEC.conso + " L/h tant que l’essence n’est pas renseignée" : D.cMin && D.cL ? dec1.format(D.cL / (D.cMin / 60)) + " L/h constatés" + (D.cExcl ? " (hors 2026)" : "") : D.cExcl ? "conso 2026 non retenue (suivi peu fiable)" : "") + "</span></div>" +
      '<div class="kpi"><span class="label">Coût fixe annuel</span><span class="v">' + eur0.format(D.fixes / Math.max(1, D.years)) + '</span><span class="s">assurance, adhésions, taxes</span></div>' +
      // coût par minute moteur, en deux parts : fixe (ne dépend pas du temps passé sur l'eau) et variable (essence, usure moteur) ; fixe + variable = coût total par minute
      '<div class="kpi"><span class="label">Coût fixe</span><span class="v">' + perMin(D.total - D.essence - D.usure, D.min) + (D.min ? '<small> / min</small>' : "") + '</span><span class="s">assurance, taxes, entretien, ' + (bilanBoat === "old" ? "achat − revente" : "amortissement") + "</span></div>" +
      '<div class="kpi"><span class="label">Coût variable</span><span class="v">' + perMin(D.essence + D.usure, D.min) + (D.min ? '<small> / min</small>' : "") + '</span><span class="s">essence' + (D.estime ? " estimée" : "") + (D.usure ? " + usure moteur" : "") + "</span></div></div>") + "</div>";
    var lines = [
      ["Coûts fixes", "assurance " + eur0.format(D.fx.assurance) + ", adhésions " + eur0.format(D.fx.adhesions) + ", taxes et corps mort " + eur0.format(D.fx.taxes), D.fixes, "fixes"],
      ["Essence" + (D.estime ? " (estimée)" : ""), D.estime ? int0.format(D.litres) + " L à " + SPEC.conso + " L/h × " + dec2.format(refPrixL()) + " €/L" : int0.format(D.litres) + " L achetés", D.essence, "essence"],
      ["Entretien, réparations, matériel", "toutes les autres dépenses (hors achat du bateau)", D.autres, "autres"]
    ];
    if (D.recettes) lines.push(["Recettes invités", "minutes facturées aux invités", D.recettes, "recettes"]);
    if (bilanBoat === "old") lines.push(["Achat moins revente", "achat " + eur0.format(D.achat) + " − revente " + eur0.format(D.vente) + (bilanYear === "Toutes" ? "" : ", réparti sur " + boatYears("old").length + " saisons"), D.bateau, "bateau"]);
    else {
      lines.push(["Amortissement bateau", eur0.format(SPEC.prix) + " sur " + SPEC.ans + " ans = " + eur0.format(amortAn()) + " par an", D.bateau, "bateau"]);
      lines.push(["Usure moteur", eur0.format(SPEC.valMoteur) + " sur " + int0.format(SPEC.hVie - SPEC.hAchat) + " h (" + int0.format(SPEC.hAchat) + " → " + int0.format(SPEC.hVie) + " h)", D.usure, "usure"]);
    }
    h += '<div class="card">' + collHead("coutDet", "Détail du coût", "par poste, " + per) + (!ui.coutDet ? "" : '<table class="rtable"><thead><tr><th>Poste</th><th>Montant</th><th>€/min</th></tr></thead><tbody>' +
      lines.map(function (l) { var op = ui.detK === l[3]; return '<tr class="det-click' + (op ? " open" : "") + '" data-detk="' + l[3] + '" aria-expanded="' + op + '"><td>' + TRI + l[0] + '<span class="sub">' + l[1] + "</span></td><td>" + eur0.format(l[2]) + "</td><td>" + (D.min ? dec2.format(l[2] / D.min) : "—") + "</td></tr>" + (op ? '<tr class="det-row"><td colspan="3">' + detItemsHtml(D, l[3]) + "</td></tr>" : ""); }).join("") +
      '<tr class="tot"><td>Coût total</td><td>' + eur0.format(D.total) + "</td><td>" + (D.min ? dec2.format(D.total / D.min) : "—") + "</td></tr></tbody></table>" +
      '<div class="small muted">' + (bilanBoat === "old" ? "Ancien bateau : dépenses jusqu’à fin 2025. Revente à " + eur0.format(D.vente) + " (modifiable dans la fiche technique, onglet Admin)." : "Nouveau bateau : dépenses depuis 2026 ; amortissement et usure d’après la fiche technique (achat " + eur0.format(D.achat) + ").") + "</div>") + "</div>";
    if (bilanYear !== "Toutes" && D.curve.length) h += chartHtml(D, D.fixedYear, essM + usM);
    if (D.min) {
      var t = D.fam.YC + D.fam.OC || 1;
      h += '<div class="card"><h3>Temps moteur par famille</h3><div class="split"><i class="yc" style="width:' + (D.fam.YC / t * 100) + '%"></i><i class="oc" style="width:' + (D.fam.OC / t * 100) + '%"></i></div>' +
        '<div class="legend"><span>' + famDot("YC") + 'Famille Yann <b class="num">' + int0.format(D.fam.YC) + " min · " + Math.round(D.fam.YC / t * 100) + " %</b></span><span>" + famDot("OC") + 'Famille Olivier <b class="num">' + int0.format(D.fam.OC) + " min · " + Math.round(D.fam.OC / t * 100) + " %</b></span></div>" +
        '<div class="small muted">Invités compris dans leur famille ; temps commun et mécanique partagés.</div></div>';
    } else h += '<div class="alert"><b>Aucune session enregistrée ' + (bilanYear === "Toutes" ? "pour ce bateau" : "en " + esc(bilanYear)) + ".</b>Les ratios par minute apparaîtront dès les premières sessions.</div>";
    h += personCardHtml();
    return h + sessionListHtml(bilanYear, bilanBoat);
  }
  /* Temps de ski par personne : tous les bateaux confondus (l'année choisie, ou toutes les années) */
  function personCardHtml() {
    var ys = bilanYear === "Toutes" ? Object.keys(YEARS) : [bilanYear], ppl = [], com = 0, mec = 0;
    ys.forEach(function (y) { var a = YEARS[y]; if (a) { ppl = mergePeople(ppl, a.people || []); com += a.commun; mec += a.meca; } });
    if (!ppl.length) return "";
    var w = ppl.filter(function (p) { return p[0] === bilanWho; })[0] || ppl[0]; bilanWho = w[0];
    var max = Math.max(ppl[0][2], com, mec, 1), lab = bilanYear === "Toutes" ? "toutes années, tous bateaux" : bilanYear;
    var h = '<div class="card">' + collHead("perso", "Temps et sessions par personne", ppl.length + " personne" + (ppl.length > 1 ? "s" : "") + " · " + lab);
    if (ui.perso) {
      h += '<div class="field" style="margin-top:12px"><label for="bWho">Personne</label><select id="bWho">' + ppl.map(function (p) { return "<option" + (p[0] === bilanWho ? " selected" : "") + ">" + esc(p[0]) + "</option>"; }).join("") + "</select></div>" +
        '<div class="kpis"><div class="kpi"><span class="label">Temps de ski</span><span class="v">' + Math.round(w[2]) + ' min</span><span class="s">' + lab + '</span></div><div class="kpi"><span class="label">Sessions</span><span class="v">' + w[3] + '</span><span class="s">≈ ' + Math.round(w[2] / Math.max(1, w[3])) + " min par session</span></div></div>" +
        '<div style="display:grid;gap:7px">';
      ppl.forEach(function (p) { h += '<div class="bar-row"><span>' + esc(p[0]) + '</span><div class="track"><div class="fill ' + p[1] + '" style="width:' + (p[2] / max * 100) + '%"></div></div><span class="n">' + Math.round(p[2]) + "</span></div>"; });
      if (com) h += '<div class="bar-row"><span>Commun</span><div class="track"><div class="fill X" style="width:' + (com / max * 100) + '%"></div></div><span class="n">' + Math.round(com) + "</span></div>";
      if (mec) h += '<div class="bar-row"><span>Mécanique</span><div class="track"><div class="fill X" style="width:' + (mec / max * 100) + '%"></div></div><span class="n">' + Math.round(mec) + "</span></div>";
      h += '</div><div class="small muted">En minutes de tours, tous bateaux confondus (temps commun et mécanique à part).</div>';
    }
    return h + "</div>";
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
    if (s.note) h += '<div class="small" style="margin-bottom:6px">' + esc(s.note) + '</div>';
    var vs = s.vitesses || {}, vk = Object.keys(vs);
    if (s.vitesse || vk.length) h += '<div class="ses-info">' + (s.vitesse ? "<span>Bateau (GPS) <b>moy. " + dec1.format(s.vitesse.moy) + " · max " + dec1.format(s.vitesse.max) + " km/h</b></span>" : "") +
      vk.map(function (pid) { var q = person(pid), v = vs[pid]; return "<span>" + esc(q ? q.name : pid) + " <b>moy. " + dec1.format(v.moy) + " · max " + dec1.format(v.max) + " km/h</b></span>"; }).join("") + "</div>";
    var sl = []; (s.tours || []).forEach(function (t, i) { if (t.act === "slalom" && t.pid) sl.push(i); });
    if (sl.length) {
      var ed = ui.resEdit === s.id;
      h += '<div class="res-box"><div class="row"><b>Résultats slalom</b><button class="btn link" data-resedit="' + esc(s.id) + '">' + (ed ? "Fermer" : "Modifier les résultats") + "</button></div>";
      sl.forEach(function (i) { var t = s.tours[i], q = person(t.pid); h += ed ? '<div class="small res-who">' + esc(q ? q.name : t.pid) + "</div>" + resFormHtml("s:" + s.id + ":" + i, t.res) : '<div class="small">' + esc(q ? q.name : t.pid) + " : " + (resSummary(t.res) || '<span class="muted">pas encore saisi</span>') + "</div>"; });
      h += ed ? '<div class="small res-who">Plan d’eau</div>' + eauHtml("s:" + s.id, s.eau) : '<div class="small">Plan d’eau : ' + (eauLabel(s.eau) || '<span class="muted">pas encore saisi</span>') + "</div>";
      h += "</div>";
    }
    var pgs = {}; (s.tours || []).forEach(function (t) { if (t.pid && t.pg && t.pg.length) pgs[t.pid] = (pgs[t.pid] || []).concat(t.pg); });
    Object.keys(pgs).forEach(function (pid) { var q = person(pid); h += '<div class="small" style="margin-bottom:4px">Passages de ' + esc(q ? q.name : pid) + " : " + pgs[pid].map(function (x, i) { return "P" + (i + 1) + " " + dec1.format(x.moy); }).join(" · ") + " km/h</div>"; });
    return h + (photoSrc(s.photoCompteur) ? '<img class="cpt-photo" src="' + photoSrc(s.photoCompteur) + '" alt="Photo du compteur de la session">' : '<div class="small muted">Pas de photo du compteur pour cette session.</div>');
  }
  function sessionListHtml(sel, bk) {
    var by = {};
    sessionsArr.forEach(function (s) { var y = yearOf(s); if (y) (by[y] = by[y] || []).push(s); });
    var yrs = sel === "Toutes" ? Object.keys(by).filter(function (y) { return !bk || boatOf(y) === bk; }).sort().reverse() : (by[sel] ? [sel] : []);
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
          h += '<tr data-ses="' + esc(s.id) + '" class="ses-click' + (op ? " open" : "") + '"><td>' + (list.length - i) + "</td><td>" + (m ? MOIS[m - 1] : "—") + '<span class="sub">' + isoToFr(d).slice(0, 5) + (s.mode === "rattrapage" ? " · rattrapage" : "") + (s.aCompleter ? ' · <b class="todo">à compléter</b>' : "") + "</span></td><td>" + sessionWho(s) + "</td><td>" + hm(s.engineMin) + "</td></tr>";
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
  function chartHtml(D, fixedYear, vari) {
    var W = 340, H = 190, L = 34, R = 14, T = 14, B = 30, YMAX = 5;
    var xmax = Math.ceil(D.min / 500) * 500, sx = function (v) { return L + v / xmax * (W - L - R); }, sy = function (v) { return T + (1 - Math.min(v, YMAX) / YMAX) * (H - T - B); };
    chartPts = D.curve.map(function (p) { var y = fixedYear / p[0] + vari; return { x: sx(p[0]), y: sy(y), v: y, cum: p[0], d: p[1], clip: y > YMAX }; });
    var lastV = chartPts.length ? chartPts[chartPts.length - 1].v : 0;
    if (!ui.courbe) { chartPts = []; return '<div class="card">' + collHead("courbe", "Coût complet par minute", "au fil de la saison" + (lastV ? " · " + dec2.format(lastV) + " €/min à ce jour" : "")) + "</div>"; }
    var s = '<div class="card">' + collHead("courbe", "Coût complet par minute", "au fil de la saison" + (lastV ? " · " + dec2.format(lastV) + " €/min à ce jour" : "")) + '<div class="small muted">Les coûts fixes et l’amortissement de l’année sont répartis sur les minutes déjà faites : très lourds au début, de plus en plus légers.</div><div class="chart" id="chartWrap"><svg viewBox="0 0 ' + W + " " + H + '" data-chart="1" role="img" aria-label="Coût complet par minute moteur selon les minutes cumulées">';
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
  var SPEC_FIELDS = [["devise", "Nom du bateau", "txt"], ["ancienNom", "Nom sur le titre de navigation", "txt"], ["modele", "Modèle", "txt"], ["hin", "Numéro de coque (HIN)", "txt"], ["immat", "N° d’inscription", "txt"], ["moteur", "Moteur", "txt"], ["nMoteur", "N° moteur", "txt"], ["dims", "Dimensions", "txt"], ["categorie", "Catégorie de conception", "txt"], ["equip", "Équipement", "txt"], ["achat", "Achat", "txt"], ["gardiennage", "Gardiennage", "txt"], ["sheetUrl", "Lien du Google Sheet (base de données)", "txt"], ["annee", "Année de construction"], ["reservoir", "Réservoir (L)"], ["conso", "Consommation moyenne (L/h)"], ["hAchat", "Compteur à l’achat (h)"], ["hVie", "Durée de vie moteur (h)"], ["valMoteur", "Valeur pour l’usure moteur (€)"], ["prix", "Prix pour l’amortissement (€)"], ["venteAncien", "Revente de l’ancien bateau, Response 1993 (€)"], ["ans", "Durée d’amortissement (ans)"], ["bidon", "Contenance d’un bidon (L)"], ["tarif", "Tarif invités (€/min)"]];
  function collHead(key, title, sub) { return '<button class="coll" data-coll="' + key + '" aria-expanded="' + !!ui[key] + '"><span class="ct"><span class="ctitle">' + title + '</span><span class="small muted">' + sub + '</span></span>' + TRI + "</button>"; }
  /* Triangle vers le bas (tourné vers le haut quand la partie est ouverte) : un « + » se confondait avec un ajout */
  var TRI = '<span class="tri" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5.5 8.5h13L12 16.5z"/></svg></span>';
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
      h += '<div class="field"><label for="impFile">Importer un historique ou restaurer une sauvegarde (fichier .json)</label><input id="impFile" class="file-in" type="file" accept=".json,application/json"' + (canValidate() ? "" : " disabled") + "></div>" + (canValidate() ? "" : RESERVE_TXT) +
        '<div class="small muted">' + (ETAT.importHistorique ? "Historique importé le " + esc(ETAT.importHistorique) + ". Un nouvel import remplace les mêmes lignes, sans doublon." : "Historique 2023-2025 : fichier historique.json. Restauration : fichier carnet-noskids-sauvegarde-….json.") + "</div>" +
        '<div class="actions"><button class="btn ghost sm" id="bkDownload">Télécharger une sauvegarde</button>' + (canValidate() ? '<button class="btn ghost sm" id="purgeOpen" style="color:var(--bad)">Effacer des données…</button>' : "") + "</div>";
      if (view.purge) h += purgeHtml();
    }
    h += '<div class="actions"><button class="btn ghost sm" id="xlsExport">Exporter en Excel</button><button class="btn ghost sm" id="updCheck">Rechercher une mise à jour</button></div>' +
      '<div class="small muted">Carnet ' + esc(SPEC.devise) + " · version " + APP_VERSION + " · " + sessionsArr.length + " sessions · " + depenses.length + " dépenses" + (QUEUE.length ? " · " + QUEUE.length + " en attente d’envoi" : "") + "</div>";
    return h + "</div>";
  }
  function renderBateau() {
    var h = '<div class="card boat-hero img-boat" role="img" aria-label="Photo du bateau"><div class="cap"><b>' + esc(SPEC.devise) + "</b>" + esc(SPEC.modele) + " " + SPEC.annee + " · " + esc(SPEC.moteur.split(",")[0].replace(/\s*\([^)]*\)/g, "")) + "</div></div>";
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
  /* ---------- Session : rotation automatique et grand affichage ----------
     En dehors d'une session, l'app reste en portrait (verrouillage quand le téléphone le permet, sinon message « tournez le téléphone »).
     Pendant une session, si l'option est activée, le téléphone tourné en paysage affiche une fenêtre en surface :
     skieur en cours, chrono du tour, temps moteur, pilote et heure ; l'app reste derrière, voilée. */
  function rotOn() { return true; } // rotation toujours permise pendant une session (plus de case à cocher)
  var bigOpen = false, bigKey = "";
  var landMq = window.matchMedia ? matchMedia("(orientation: landscape) and (max-height: 600px)") : null;
  function isLandscape() { return !!(landMq && landMq.matches); }
  function applyOrientation() {
    var o = screen.orientation;
    if (!o || !o.lock) return;
    try { if (sortie.active && !sortie.closing && rotOn()) { if (o.unlock) o.unlock(); } else o.lock("portrait").catch(function () { /* non pris en charge (iPhone, navigateur) */ }); } catch (e) { /* ignoré */ }
  }
  /* Session en cours : l'écran reste allumé (Wake Lock), repris à chaque retour sur l'app, relâché à la fin de la session. */
  var wakeLock = null, wakeAsk = false;
  function keepAwake() {
    var want = !!(sortie && sortie.active) && document.visibilityState === "visible";
    if (want && !wakeLock && !wakeAsk && navigator.wakeLock && navigator.wakeLock.request) {
      wakeAsk = true;
      navigator.wakeLock.request("screen").then(function (l) { wakeAsk = false; wakeLock = l; l.addEventListener("release", function () { wakeLock = null; }); if (!(sortie && sortie.active)) { l.release(); } })
        .catch(function () { wakeAsk = false; /* refusé (batterie faible) ou non pris en charge */ });
    } else if (!want && wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }
  document.addEventListener("visibilitychange", keepAwake);
  /* ---------- Vitesse GPS du bateau (v1.9.4) ----------
     L'autorisation est demandée au lancement de l'app. Pendant une session (écran allumé), la position est suivie :
     vitesse moyenne et maximale du bateau moteur en route, et pour chaque tour de skieur. Les mesures douteuses sont écartées
     (précision au-delà de 30 m, plus de 90 km/h, saut de plus de 5 s compté 5 s).
     Tours des skieurs : les 3 premières secondes après le départ ou la reprise du tour (prise de vitesse) ne comptent pas. */
  var gpsWatch = null, gpsLast = null, gpsKmh = null, GPS_VMAX = 25, GPS_DEMARRAGE = 3000, GPS_MIN_KMH = 19;
  function gpsAsk() { if (navigator.geolocation) try { navigator.geolocation.getCurrentPosition(function () {}, function () {}, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }); } catch (e) { /* GPS indisponible */ } }
  function gpsDist(a, b) { var R0 = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r, x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R0 * Math.asin(Math.sqrt(x)); }
  function gpsAdd(o, v, dt) { o.sum = (o.sum || 0) + v * dt; o.dur = (o.dur || 0) + dt; if (!(o.max >= v)) o.max = v; }
  function gpsOn(pos) {
    if (!(sortie && sortie.active)) return;
    var c = pos.coords, tm = pos.timestamp || Date.now(), here = { lat: c.latitude, lon: c.longitude, t: tm }, v = c.speed;
    if (c.accuracy > 30) { gpsLast = null; return; }
    if ((v == null || isNaN(v)) && gpsLast && tm > gpsLast.t + 500) v = gpsDist(gpsLast, here) / ((tm - gpsLast.t) / 1000);
    gpsLast = here;
    if (v == null || isNaN(v) || v < 0 || v > GPS_VMAX) return;
    gpsKmh = v * 3.6;
    var dt = sortie.gpsT ? Math.min(5, Math.max(0, (tm - sortie.gpsT) / 1000)) : 0; sortie.gpsT = tm;
    // v2.0 : sous 19 km/h, ce n'est plus un sport tracté (chute, bateau qui ralentit) : la mesure n'est pas retenue pour les skieurs
    var tracte = v * 3.6 >= GPS_MIN_KMH;
    if (dt > 0 && sortie.pas) {
      var P0 = sortie.pas, avg0 = P0.dur > 0 ? P0.sum / P0.dur : 0;
      if (P0.dur >= 2 && v < avg0 * 0.85) { pasEnd(true); } // baisse brutale de plus de 15 % : chute, fin de la mesure du passage
      else if (tracte) { P0.sum += v * dt; P0.dur += dt; var pl = document.getElementById("bigPasLive"); if (pl) pl.textContent = pasLive(); }
    }
    if (dt > 0 && sortie.engine === "on") { gpsAdd(sortie.gps || (sortie.gps = {}), v, dt); var r = running(); if (r && r.since && tm - r.since >= GPS_DEMARRAGE && tracte) gpsAdd(r.gps || (r.gps = {}), v, dt); }
    var el = document.getElementById("gpsV"); if (el) el.textContent = gpsTxt();
    var bg = document.getElementById("bigGps"); if (bg) bg.innerHTML = bigGpsHtml(bigTour());
  }
  function gpsTxt() {
    if (gpsWatch == null) return "GPS inactif";
    if (gpsKmh == null) return "GPS : recherche…";
    var r = running(), g = r && r.gps, s = "GPS " + Math.round(gpsKmh) + " km/h";
    if (g && g.dur >= 3) s += " · tour de " + tourName(r) + " : moy. " + dec1.format(g.sum / g.dur * 3.6) + " · pointe " + dec1.format(g.max * 3.6) + " km/h";
    return s;
  }
  function gpsSync() {
    if (!navigator.geolocation) return;
    var want = !!(sortie && sortie.active);
    if (want && gpsWatch == null) { try { gpsWatch = navigator.geolocation.watchPosition(gpsOn, function () { gpsKmh = null; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }); } catch (e) { gpsWatch = null; } }
    else if (!want && gpsWatch != null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; gpsLast = null; gpsKmh = null; }
  }
  /* Résumé d'une mesure : moyenne et maximum en km/h (au dixième), seulement si au moins 10 s ont été mesurées. */
  function gpsRes(o) { return o && o.dur >= 10 ? { moy: Math.round(o.sum / o.dur * 36) / 10, max: Math.round(o.max * 36) / 10, s: Math.round(o.dur) } : null; }
  /* Vitesses par skieur : tous ses tours de la session réunis. */
  function gpsBySkier(tours) {
    var by = {};
    tours.forEach(function (t) { if (!t.pid || !t.gps || !(t.gps.dur > 0)) return; var o = by[t.pid] || (by[t.pid] = {}); o.sum = (o.sum || 0) + t.gps.sum; o.dur = (o.dur || 0) + t.gps.dur; if (!(o.max >= t.gps.max)) o.max = t.gps.max; });
    var out = {}; Object.keys(by).forEach(function (pid) { var r = gpsRes(by[pid]); if (r) out[pid] = r; });
    return out;
  }
  /* Grand affichage : tour en cours ou en pause, et boutons pause / fin du skieur et du bateau */
  function bigTour() { var r = running(); if (r) return r; for (var i = sortie.tours.length - 1; i >= 0; i--) if (sortie.tours[i].state === "pause") return sortie.tours[i]; return null; }
  var bigEndAsk = 0, bigRes = 0, bigActOpen = false;
  function bigAction(a) {
    var t = bigTour();
    if (a === "actmenu") { bigActOpen = !bigActOpen; return updateBig(); } // v1.9.5 : changer l'activité du skieur (slalom, wake…)
    if (a.indexOf("act:") === 0) { bigActOpen = false; if (t && t.pid && t.act !== a.slice(4)) { t.act = a.slice(4); t.speed = ""; t.passes = ""; save(1); toast(tourName(t) + " : " + ACTS[t.act] + "."); } bigKey = ""; return render(); }
    if (a === "tpause" && t) return act(t.id, t.state === "run" ? "pause" : "resume");
    if (a === "tend" && t) { if (t.act === "slalom" && t.pid) bigRes = t.id; return act(t.id, "end"); } // slalom : encart des résultats
    if (a === "resok") { bigRes = 0; bigKey = ""; return updateBig(); }
    if (a === "boat") return engineToggle();
    if (a === "pstart") return pasStart();
    if (a === "pend") return pasEnd();
    if (a === "end") {
      if (Date.now() - bigEndAsk > 4000) { bigEndAsk = Date.now(); bigKey = ""; updateBig(); setTimeout(function () { bigKey = ""; updateBig(); }, 4100); return; } // deuxième appui pour confirmer
      bigEndAsk = 0; var r = running(); if (r) act(r.id, "end");
      stopEngine(); bigOpen = false; sortie.closing = true; sortie.compteurFin = null; view.cancelAsk = false; tab = "sortie"; screen.scrollTop = 0; render(); // retour à la clôture classique, avec la photo du compteur
      var cp = document.getElementById("cPhoto"); if (cp && !sortie.photoCompteur) cp.click();
    }
  }
  /* Grand affichage : toucher le médaillon d'une personne la met en tour de ski (son tour en pause reprend, sinon nouveau passage ou nouveau tour). */
  function bigSki(pid) {
    var r = running(); if (r && r.pid === pid) return;
    if (r) act(r.id, "end");
    var mine = sortie.tours.filter(function (x) { return x.pid === pid; }), open = mine.filter(function (x) { return x.state !== "done"; }).pop(), last = mine[mine.length - 1];
    if (open) act(open.id, open.state === "wait" ? "start" : "resume");
    else if (last) act(last.id, "again");
    else { var nt = newTour(pid, "slalom"); sortie.tours.push(nt); act(nt.id, "start"); }
    toast(person(pid).name + " en tour de ski.");
  }
  (function pasLongPress() {
    var tm = null;
    function stop() { if (tm) { clearTimeout(tm); tm = null; } }
    document.addEventListener("pointerdown", function (e) {
      var b = e.target.closest && e.target.closest("#bigView [data-bpas]"); if (!b) return;
      stop(); var i = Number(b.dataset.bpas);
      tm = setTimeout(function () { tm = null; var t = bigTour(); if (!t || !t.pg || !t.pg[i]) return; t.pg.splice(i, 1); bigKey = ""; render(); toast("Passage P" + (i + 1) + " supprimé (chute)."); }, 700);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { document.addEventListener(n, stop, true); });
    document.addEventListener("contextmenu", function (e) { if (e.target.closest && e.target.closest("#bigView [data-bpas]")) e.preventDefault(); });
  })();
  document.addEventListener("change", function (e) { var el = e.target; if (el.closest && el.closest("#bigView") && el.dataset.res) resInput(el); });
  function bigLayer(id) { var el = document.getElementById(id); if (!el) { el = document.createElement("div"); el.id = id; el.hidden = true; document.body.appendChild(el); } return el; }
  function updateBig() {
    var big = bigLayer("bigView"), msg = bigLayer("rotMsg"), land = isLandscape();
    var show = sortie.active && !sortie.closing && ((land && rotOn()) || bigOpen); // à la clôture, retour à l'affichage classique
    msg.hidden = !(land && !show);
    var mk = sortie.active && sortie.closing ? "close" : "std";
    if (!msg.hidden && msg.dataset.k !== mk) { msg.dataset.k = mk; msg.innerHTML = '<div class="rot-in"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/></svg><b>Tournez le téléphone en portrait</b><span>' + (mk === "close" ? "Fin de la session : la clôture (photo du compteur, jauge) se fait en portrait." : "La rotation n’est possible que pendant une session.") + "</span></div>"; }
    document.body.classList.toggle("big-on", show);
    big.hidden = !show; big.classList.toggle("rot", show && !land); // téléphone resté en portrait : la fenêtre est affichée couchée, à lire en tournant le téléphone
    if (!show) { bigKey = ""; return; }
    var rt = bigRes ? findTour(bigRes) : null;
    if (rt) { // résultats du skieur qui vient de finir, en gros, avant de reprendre l'écran de session
      var rk = "res|" + rt.id + "|" + JSON.stringify(rt.res || {}) + "|" + (sortie.eau || "") + "|" + land;
      if (rk !== bigKey) {
        bigKey = rk;
        big.innerHTML = '<div class="big-card big-res"><div class="big-res-h"><span class="big-who">Résultat de ' + esc(tourName(rt)) + '</span><span class="big-act">' + (rt.pg && rt.pg.length ? "Passages : " + rt.pg.map(function (x, i) { return "P" + (i + 1) + " " + dec1.format(x.moy); }).join(" · ") + " km/h" : "Slalom") + "</span></div>" +
          resFormHtml("t:" + rt.id, rt.res) + '<div class="res-h2">Plan d’eau</div>' + eauHtml("live", sortie.eau) +
          '<div class="big-res-a"><button class="ba-later" data-bact="resok">Plus tard</button><button class="ba-ok" data-bact="resok">Valider</button></div></div>';
      }
      return;
    }
    var now = new Date(), r = running(), pil = person((r && r.pilote) || sortie.pilote), on = sortie.engine === "on";
    var t = bigTour(), ask = Date.now() - bigEndAsk < 4000;
    var key = (r ? r.id + r.state : "-") + "|" + (t ? t.id + t.state + t.act : "-") + "|" + (pil ? pil.id : "") + "|" + on + "|" + land + "|" + ask + "|" + (sortie.pas ? 1 : 0) + "|" + (t && t.pg ? t.pg.length : 0) + "|" + bigActOpen + "|" + (sortie.eau || "") + "|" + sortie.participants.map(function (p) { return p.pid; }).join(",");
    if (key !== bigKey) {
      bigKey = key;
      // v1.9.5 : trois lignes. En haut : skieur (activité modifiable), vignettes des personnes à bord, boutons de session.
      // Au milieu : plan d'eau à gauche, chrono au centre, passages à droite. En bas : temps moteur, pilote, heure (et Fermer).
      var actLine = !t ? "" : !t.pid ? '<span class="big-act">' + esc(ACTS[t.act] || "") + (t.state === "pause" ? " · en pause" : "") + "</span>" :
        bigActOpen ? '<div class="big-actl">' + PERSO_ACTS.map(function (a) { return '<button class="bal-a' + (a === t.act ? " on" : "") + '" data-bact="act:' + a + '">' + esc(ACTS[a]) + "</button>"; }).join("") + "</div>" :
        '<button class="big-act big-actb" data-bact="actmenu">' + esc(ACTS[t.act] || "") + ' <span aria-hidden="true">▾</span></button>' + (t.state === "pause" ? '<span class="big-act"> · en pause</span>' : "");
      var skTop = '<div class="big-sk bv-sk"><div class="big-sk-l">' + sortie.participants.map(function (p) {
        var pp = person(p.pid), st = r && r.pid === p.pid ? " on" : (t && t.pid === p.pid && t.state === "pause" ? " pz" : "");
        return '<button class="bsk f-' + famOf(p) + st + '" data-bsk="' + esc(p.pid) + '" aria-label="Lancer le tour de ' + esc(pp.name) + '">' + pilotAvatar(pp, "bsk-av") + "<span>" + esc(pp.name) + "</span></button>";
      }).join("") + "</div></div>";
      var eauSm = '<div class="bv-eau"><span class="label">Plan d’eau</span><div class="bv-eau-l">' + EAUX.map(function (e) { return '<button type="button" class="eau' + (sortie.eau === e[0] ? " on" : "") + '" data-eau="live|' + e[0] + '" aria-label="' + esc(e[1]) + '" title="' + esc(e[1]) + '">' + e[2] + "</button>"; }).join("") + "</div>" +
        '<span class="bv-eau-t">' + esc(eauLabel(sortie.eau) || "à choisir") + "</span></div>";
      var actsB = '<div class="big-acts">' +
        '<button class="ba-ski" data-bact="tpause"' + (t ? "" : " disabled") + ">" + (t && t.state === "pause" ? "Reprise skieur" : "Pause skieur") + "</button>" +
        '<button class="ba-ski" data-bact="tend"' + (t ? "" : " disabled") + ">Fin skieur</button>" +
        '<button class="ba-boat" data-bact="boat">' + (on ? "Pause bateau" : "Reprise bateau") + "</button>" +
        '<button class="ba-end' + (ask ? " ask" : "") + '" data-bact="end">' + (ask ? "Confirmer la fin ?" : "Fin session") + "</button></div>";
      var pasB = '<div class="big-pas"><button class="ba-pas' + (sortie.pas ? " on" : "") + '" data-bact="' + (sortie.pas ? "pend" : "pstart") + '"' + (r || sortie.pas ? "" : " disabled") + ">" + PAS_ICON +
        (sortie.pas ? '<span>Arrivée</span><span class="bpl" id="bigPasLive">' + pasLive() + "</span>" : "<span>Passage</span>") + '</button><div class="big-pas-l">' + pasListHtml(t) + "</div></div>";
      big.innerHTML = '<div class="big-card bv">' +
        '<div class="bv-top"><div class="big-id"><span class="big-who">' + (t ? esc(tourName(t)) : "Aucun skieur en cours") + "</span>" + actLine + '<div class="big-gps" id="bigGps">' + bigGpsHtml(t) + "</div></div>" + skTop + actsB + "</div>" +
        '<div class="bv-mid">' + eauSm + '<div class="big-tour' + (t && t.state === "pause" ? " paused" : "") + '"' + (t ? ' data-timer="t' + t.id + '"' : "") + ">" + (t ? fmtClock(tourMs(t, Date.now())) : "—") + "</div>" + pasB + "</div>" +
        '<div class="big-grid bv-bot">' +
        '<div><span class="label">Temps moteur</span><b data-timer="engine">' + fmtClock(engineMs(Date.now())) + '</b><span class="big-s">' + (on ? "moteur en route" : "moteur arrêté") + "</span></div>" +
        '<div><span class="label">Pilote</span><b>' + esc(pil ? pil.name : "—") + "</b></div>" +
        '<div><span class="label">Heure</span><b id="bigClock">' + now.toTimeString().slice(0, 5) + "</b></div>" +
        (land ? "" : '<button class="btn ghost sm big-close" id="bigClose">Fermer</button>') + "</div></div>";
    }
    var ck = document.getElementById("bigClock"); if (ck) ck.textContent = now.toTimeString().slice(0, 5);
  }
  /* Grand affichage, sous le nom du skieur, une ligne par vitesse : moyenne et max du tour en cours (sans les 3 s de démarrage), puis vitesse instantanée. */
  function bigGpsHtml(t) {
    if (gpsWatch == null) return '<span class="bg-k">GPS inactif</span>';
    var g = t && t.gps, ok = g && g.dur >= 3, row = function (k, v) { return '<span class="bg-k">' + k + ' :</span><b class="bg-v">' + v + "</b>"; };
    return row("Vitesse moy", ok ? dec1.format(g.sum / g.dur * 3.6) + " km/h" : "—") + row("Vitesse max", ok ? dec1.format(g.max * 3.6) + " km/h" : "—") + row("Vitesse instant", gpsKmh != null ? dec1.format(gpsKmh) + " km/h" : "—");
  }
  /* Passages de slalom (v1.9.4) : « Départ passage » puis « Arrivée passage » mesure la vitesse moyenne GPS entre les deux appuis.
     Les passages du skieur sont numérotés P1, P2… ; un appui long sur un passage le supprime (chute). */
  function pasStart() { var r = running(); if (!r) return toast("Lancez d'abord un skieur."); sortie.pas = { tid: r.id, at: Date.now(), sum: 0, dur: 0 }; bigKey = ""; render(); }
  function pasEnd(chute) { // chute : arrêt automatique (v2.0), la vitesse a baissé brutalement de plus de 15 %
    var P = sortie.pas; sortie.pas = null; bigKey = "";
    var tr = P && findTour(P.tid);
    if (!tr || !(P.dur >= 2)) { render(); return toast("Passage trop court ou sans mesure GPS : non enregistré."); }
    (tr.pg = tr.pg || []).push({ moy: Math.round(P.sum / P.dur * 36) / 10, s: Math.round(P.dur) });
    render(); toast((chute ? "Chute détectée, mesure arrêtée. " : "") + "P" + tr.pg.length + " : " + dec1.format(tr.pg[tr.pg.length - 1].moy) + " km/h");
  }
  var PAS_ICON = '<svg class="bp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5v3.5M18.5 6.5l1.5-1.5"/></svg>';
  function pasLive() { var P = sortie.pas; return P && P.dur > 0 ? dec1.format(P.sum / P.dur * 3.6) + " km/h" : "mesure…"; }
  function pasListHtml(t) {
    var pg = (t && t.pg) || [];
    if (!pg.length) return '<span class="bp-none">Aucun passage mesuré</span>';
    return pg.map(function (x, i) { return '<button class="bp" data-bpas="' + i + '" aria-label="Passage P' + (i + 1) + ", appui long pour le supprimer\">P" + (i + 1) + " : " + dec1.format(x.moy) + " km/h</button>"; }).join("");
  }
  if (landMq) { var onLand = function () { updateBig(); }; if (landMq.addEventListener) landMq.addEventListener("change", onLand); else if (landMq.addListener) landMq.addListener(onLand); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#bigClose"); if (b) { bigOpen = false; updateBig(); return; }
    var ba = e.target.closest && e.target.closest("#bigView [data-bact]"); if (ba && !ba.disabled) return bigAction(ba.dataset.bact);
    var br = e.target.closest && e.target.closest("#bigView [data-rstar], #bigView [data-eau]"); if (br) { resInput(br); return; }
    var bs = e.target.closest && e.target.closest("#bigView [data-bsk]"); if (bs) bigSki(bs.dataset.bsk);
  });
  /* ---------- Camping « Les petits Pellegrins » (v1.9.9, refondu en v2.0) ----------
     Réservation de jours au camp, de juin à août. Indépendant du bateau : les réservations sont rangées dans la table « etat »
     (kind = "resa") et ne créent ni dépense, ni dette, ni écriture d'essence. Le coût affiché n'est qu'une estimation.
     Hébergements : caravane 4 places + 1 enfant de moins de 12 ans, deux tentes de 3 places ; une réservation peut en prendre plusieurs. */
  var CP_LODGE = { car: { n: "Caravane", cap: 4, kid: 1, s: "4 places + 1 enfant" }, t1: { n: "Tente 1", cap: 3, kid: 0, s: "3 places" }, t2: { n: "Tente 2", cap: 3, kid: 0, s: "3 places" } };
  var CP_CAP = 10, CP_CAPK = 1, CP_N = 92; // 92 nuits : du 1er juin au 31 août
  var CP_FAMN = { YC: "Famille Yann", OC: "Famille Olivier", JC: "Famille Julien", EXT: "Extérieurs" };
  var CP_FAMS = { YC: "Yann", OC: "Olivier", JC: "Julien", EXT: "Extér." };
  var CP_JUL = ["julien", "jessica", "louca", "mateu", "alba"]; // famille Julien (au camping)
  var CP_AMIS = [["amis-o", "Amis O"], ["amis-y", "Amis Y"], ["amis-j", "Amis J"]];
  var CP_MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  var CP_LOCK = '<svg class="cp-ic cp-lk" viewBox="0 0 12 12" aria-hidden="true"><rect x="2.3" y="5.3" width="7.4" height="5.4" rx="1.2"/><path d="M3.9 5.3V3.9a2.1 2.1 0 0 1 4.2 0v1.4"/></svg>';
  var CP_NOSH = '<svg class="cp-ic cp-ns" viewBox="0 0 22 12" aria-hidden="true"><circle cx="4" cy="3.2" r="1.8"/><path d="M1 11.2c0-2.6 1.3-4.2 3-4.2s3 1.6 3 4.2"/><path d="M11 4.6v3.2M9.4 6.2h3.2"/><circle cx="18" cy="3.2" r="1.8"/><path d="M15 11.2c0-2.6 1.3-4.2 3-4.2s3 1.6 3 4.2"/><path class="x" d="M1.5 1L20.5 11.5"/></svg>';
  var CP_WARN = '<svg class="cp-ic cp-warn" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.3L11 10.5H1z"/><path d="M6 4.6v2.8M6 8.9v.1"/></svg>';
  var CP_ICON = {
    car: '<svg class="cp-lg" viewBox="0 0 48 30" aria-hidden="true"><path d="M5 6h28a8 8 0 0 1 8 8v8H5z"/><rect x="9" y="10" width="9" height="6" rx="1"/><rect x="22" y="10" width="7" height="12" rx="1"/><circle cx="16" cy="24" r="3.2"/><path d="M41 21h5"/><path d="M2 22h3"/></svg>',
    tent: '<svg class="cp-lg" viewBox="0 0 48 30" aria-hidden="true"><path d="M6 26L24 4l18 22z"/><path d="M24 4v22M19 26l5-9 5 9"/><path d="M2 26h44"/></svg>'
  };
  var cpUi = { m: 6, form: false, sel: {}, ext: "", from: "", to: "", lodges: { car: true }, share: true, cost: {}, del: "", tarEdit: false };
  var cpTar = null; // tarifs des nuits par année (table « etat », kind = "camptarif")
  function cpYear() { var d = new Date(); return d.getMonth() > 7 ? d.getFullYear() + 1 : d.getFullYear(); } // après août : l'été suivant
  function cpRate() { var t = cpTar && cpTar.t && cpTar.t[String(cpYear())]; return { ad: t && t.ad != null ? Number(t.ad) : 8, kid: t && t.kid != null ? Number(t.kid) : 5 }; }
  function cpT0() { return Date.UTC(cpYear(), 5, 1); }
  function cpDi(iso) { var a = String(iso || "").split("-"); return a.length < 3 ? NaN : Math.round((Date.UTC(+a[0], +a[1] - 1, +a[2]) - cpT0()) / 86400000); }
  function cpDt(i) { return new Date(cpT0() + i * 86400000); }
  function cpIso(i) { return cpDt(i).toISOString().slice(0, 10); }
  function cpLab(i) { var d = cpDt(i); return d.getUTCDate() + " " + CP_MOIS[d.getUTCMonth()]; }
  function cpFamId(id) { if (CP_JUL.indexOf(id) >= 0) return "JC"; if (/^amis-|^x:/.test(id)) return "EXT"; var p = person(id); return !p ? "EXT" : p.c === "YF" ? "YC" : p.c === "OF" ? "OC" : "EXT"; }
  function cpName(id) { var a = CP_AMIS.filter(function (x) { return x[0] === id; })[0]; if (a) return a[1]; if (/^x:/.test(id)) return id.slice(2); var p = person(id); return p ? p.name : id; }
  function cpKid(id) { var p = person(id); return !!(p && p.kid); }
  function cpPpl(b) { return (b.ppl || []).concat((b.ext || []).map(function (n) { return "x:" + n; })); }
  function cpCounts(b) { var all = cpPpl(b), k = all.filter(cpKid).length; return { ad: all.length - k, kid: k, n: all.length }; }
  function cpLodges(b) { var l = (b.lodges && b.lodges.length ? b.lodges : [b.lodge || "t1"]).filter(function (k) { return CP_LODGE[k]; }); return l.length ? l : ["t1"]; }
  function cpLodgeTxt(b) { return cpLodges(b).map(function (k) { return CP_LODGE[k].n; }).join(" + "); }
  function cpNights(b) { return cpDi(b.to) - cpDi(b.from); }
  function cpCost(b) { var c = cpCounts(b), r = cpRate(); return cpNights(b) * (c.ad * r.ad + c.kid * r.kid); }
  function cpById(id) { return resas.filter(function (b) { return b.id === id; })[0]; }
  function cpSeason() { var y = String(cpYear()); return resas.filter(function (b) { return String(b.from || "").slice(0, 4) === y; }); }
  /* Occupation de chaque nuit, par hébergement et au total ; les personnes d'une réservation sont réparties dans ses hébergements
     (la caravane d'abord, enfants compris). Conflit : hébergement trop plein (satL) ou réservation « pas ouverte » qui partage la nuit (ns). */
  function cpOcc(list) {
    var O = [], byId = {}; list.forEach(function (b) { byId[b.id] = b; });
    for (var n = 0; n < CP_N; n++) O.push({ tot: 0, L: { car: { n: 0, k: 0 }, t1: { n: 0, k: 0 }, t2: { n: 0, k: 0 } }, b: [] });
    list.forEach(function (b) {
      var c = cpCounts(b), ls = cpLodges(b), split = [], rem = c.n, kr = c.kid;
      ls.forEach(function (l, i) { var cap = CP_LODGE[l].cap + Math.min(CP_LODGE[l].kid, kr), take = i === ls.length - 1 ? rem : Math.min(rem, cap), kt = Math.min(kr, take); split.push([l, take, kt]); rem -= take; kr -= kt; });
      for (var n = Math.max(0, cpDi(b.from)); n < Math.min(CP_N, cpDi(b.to)); n++) { var o = O[n]; o.tot += c.n; split.forEach(function (s) { o.L[s[0]].n += s[1]; o.L[s[0]].k += s[2]; }); o.b.push(b.id); }
    });
    O.forEach(function (o) {
      o.satL = {}; Object.keys(CP_LODGE).forEach(function (k) { var l = o.L[k], cap = CP_LODGE[k]; o.satL[k] = l.n > cap.cap + Math.min(cap.kid, l.k); });
      o.ns = o.b.length > 1 && o.b.some(function (id) { return byId[id].share === false; });
      o.free = Math.max(0, CP_CAP + CP_CAPK - o.tot);
    });
    return O;
  }
  function cpSat(o, b) { return cpLodges(b).some(function (l) { return o.satL[l]; }); }
  function cpAnyConf(o) { return o.ns || Object.keys(o.satL).some(function (k) { return o.satL[k]; }); }
  function cpOverlaps(O) {
    var out = [], cur = null;
    for (var n = 0; n <= CP_N; n++) {
      var o = O[n], sat = o ? Object.keys(o.satL).filter(function (k) { return o.satL[k]; }) : [], key = o && o.b.length > 1 ? o.b.slice().sort().join(",") + "|" + sat.join(",") + "|" + o.ns : "";
      if (cur && key !== cur.key) { out.push(cur); cur = null; }
      if (key && !cur) cur = { key: key, a: n, z: n, ids: o.b.slice(), sat: sat, ns: o.ns, tot: o.tot };
      if (cur) { cur.z = n; cur.tot = Math.max(cur.tot, o.tot); }
    }
    return out;
  }
  function cpFreeCls(f) { return f >= 5 ? "f-ok" : f > 0 ? "f-mid" : "f-full"; }
  function cpSec(key, title, sub, body) { return '<div class="card">' + collHead(key, title, sub) + (ui[key] ? body : "") + "</div>"; }
  /* v2.0b : les semaines d'un mois (jours, barres de réservation et lignes), utilisées par le planning, l'agenda et l'image à partager */
  function cpWeeks(O, list, m) {
    var Y = cpYear(), first = Date.UTC(Y, m, 1), last = Date.UTC(Y, m + 1, 0), T0 = cpT0(), out = [];
    var start = first - ((new Date(first).getUTCDay() + 6) % 7) * 86400000;
    for (var w = start; w <= last; w += 7 * 86400000) {
      var i0 = Math.round((w - T0) / 86400000), days = [], segs = [];
      for (var d = 0; d < 7; d++) {
        var i = i0 + d, inM = cpDt(i).getUTCMonth() === m && i >= 0 && i < CP_N, o = inM ? O[i] : null;
        days.push({ i: i, inM: inM, n: cpDt(i).getUTCDate(), free: o ? o.free : 0, cf: !!(o && cpAnyConf(o)) });
      }
      list.forEach(function (b) {
        var a = Math.max(cpDi(b.from), i0), z = Math.min(cpDi(b.to), i0 + 7); if (!(a < z)) return;
        var run = null;
        for (var n = a; n < z; n++) {
          if (cpDt(n).getUTCMonth() !== m || n < 0 || n >= CP_N) { if (run) { segs.push(run); run = null; } continue; }
          var s = !!(cpSat(O[n], b) || O[n].ns), why = !s ? "" : O[n].ns ? "ns" : "cap";
          if (run && (run.sat !== s || run.why !== why)) { segs.push(run); run = null; }
          if (!run) run = { b: b, a: n - i0, z: n - i0 + 1, sat: s, why: why, first: !segs.some(function (x) { return x.b === b; }) };
          else run.z = n - i0 + 1;
        }
        if (run) segs.push(run);
      });
      var lanes = [], laneOf = {};
      segs.forEach(function (s) { if (laneOf[s.b.id] != null) return; var l = 0; while (lanes[l] && lanes[l].some(function (x) { return !(x.z <= s.a || x.a >= s.z); })) l++; lanes[l] = (lanes[l] || []).concat(segs.filter(function (x) { return x.b.id === s.b.id; })); laneOf[s.b.id] = l; });
      segs.forEach(function (s) { s.lane = laneOf[s.b.id]; });
      out.push({ i0: i0, days: days, segs: segs, nl: lanes.length });
    }
    return out;
  }
  function cpCalendar(O, list, mm) {
    var m = mm != null ? mm : cpUi.m, h = '<div class="cp-dow">' + ["L", "M", "M", "J", "V", "S", "D"].map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>";
    cpWeeks(O, list, m).forEach(function (W) {
      var cells = W.days.map(function (x) { return '<div class="cp-day' + (x.inM ? "" : " out") + (x.cf ? " sat" : "") + '">' + (x.inM ? '<span class="n">' + x.n + '</span><span class="f ' + (x.cf ? "f-full" : cpFreeCls(x.free)) + '">' + x.free + " pl.</span>" : "") + "</div>"; }).join("");
      var bars = W.segs.map(function (s) {
        var c = cpCounts(s.b), mk = (s.b.ok ? CP_LOCK : "") + (s.b.share === false ? CP_NOSH : "");
        var t = s.sat ? (s.why === "ns" ? CP_NOSH : CP_WARN) + (s.first ? esc(s.b.who) : "") : (s.first ? mk + esc(s.b.who) + " · " + c.n : "");
        return '<div class="cp-bar ' + s.b.f + (s.sat ? " sat" : "") + '" style="left:calc(' + (s.a / 7 * 100) + '% + 2px);width:calc(' + ((s.z - s.a) / 7 * 100) + '% - 4px);top:' + (s.lane * 18 + 2) + 'px" title="' + esc(s.b.who + " · " + cpLodgeTxt(s.b) + (s.b.ok ? " · confirmée" : "") + (s.b.share === false ? " · seuls pendant le séjour" : "")) + '">' + t + "</div>";
      }).join("");
      h += '<div class="cp-week"><div class="cp-days">' + cells + '</div><div class="cp-lanes" style="height:' + (W.nl ? W.nl * 18 + 4 : 0) + 'px">' + bars + "</div></div>";
    });
    return h;
  }
  function cpFormHtml(list) {
    var Y = cpYear(), sel = Object.keys(cpUi.sel).filter(function (k) { return cpUi.sel[k]; }), extN = cpUi.ext.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var chip = function (id, nm, kid) { return '<button class="chip" data-cpp="' + esc(id) + '" aria-pressed="' + !!cpUi.sel[id] + '"' + (kid ? ' title="enfant"' : "") + ">" + esc(nm) + "</button>"; };
    var row = function (f, chips) { return '<div class="cp-frow"><span class="cp-grp ' + f + '"><span class="cp-dot ' + f + '"></span>' + CP_FAMS[f] + '</span><div class="cp-sel">' + chips + "</div></div>"; };
    var h = '<div class="card" id="cpForm"><h3>Nouvelle réservation</h3>' +
      row("YC", PEOPLE.filter(function (p) { return !p.hidden && p.c === "YF"; }).map(function (p) { return chip(p.id, p.name, p.kid); }).join("")) +
      row("OC", PEOPLE.filter(function (p) { return !p.hidden && p.c === "OF"; }).map(function (p) { return chip(p.id, p.name, p.kid); }).join("")) +
      row("JC", CP_JUL.map(function (id) { var p = person(id); return p ? chip(id, p.name, p.kid) : ""; }).join("")) +
      row("EXT", CP_AMIS.map(function (a) { return chip(a[0], a[1], false); }).join("")) +
      '<div class="field cp-extf"><input id="cpExt" placeholder="Autres personnes : prénoms séparés par des virgules" value="' + esc(cpUi.ext) + '" aria-label="Autres personnes"></div>' +
      '<div class="two"><div class="field"><label for="cpFrom">Arrivée</label><input id="cpFrom" type="date" min="' + Y + '-06-01" max="' + Y + '-08-31" value="' + esc(cpUi.from) + '"></div><div class="field"><label for="cpTo">Départ</label><input id="cpTo" type="date" min="' + Y + '-06-02" max="' + Y + '-09-01" value="' + esc(cpUi.to) + '"></div></div>' +
      '<div class="field"><span class="flabel">Hébergement (plusieurs possibles)</span><div class="seg cp-lseg">' + Object.keys(CP_LODGE).map(function (k) { return '<button data-cpl="' + k + '" aria-pressed="' + !!cpUi.lodges[k] + '">' + CP_LODGE[k].n + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><span class="flabel">Ouvert à la présence d’autres personnes pendant le séjour ?</span><div class="seg"><button data-cpsh="1" aria-pressed="' + cpUi.share + '">Oui</button><button data-cpsh="0" aria-pressed="' + !cpUi.share + '">' + CP_NOSH + " Non</button></div></div>";
    var ls = Object.keys(CP_LODGE).filter(function (k) { return cpUi.lodges[k]; });
    var b = { id: "new", who: "?", f: sel.length ? cpFamId(sel[0]) : "EXT", ppl: sel, ext: extN, from: cpUi.from, to: cpUi.to, lodges: ls, share: cpUi.share }, nn = cpNights(b);
    if (!(sel.length + extN.length) || !(nn > 0) || !ls.length) return h + '<div class="small muted">Choisissez les personnes, les dates et au moins un hébergement.</div><div class="actions"><button class="btn ghost" id="cpCancel">Annuler</button></div></div>';
    var O2 = cpOcc(list.concat([b])), satN = [], ovN = [], nsW = {};
    for (var n = Math.max(0, cpDi(b.from)); n < Math.min(CP_N, cpDi(b.to)); n++) {
      if (cpSat(O2[n], b)) satN.push(n);
      if (O2[n].b.length > 1) { ovN.push(n); O2[n].b.forEach(function (id) { var x = cpById(id); if (x && x.share === false) nsW[x.who] = 1; }); }
    }
    var c = cpCounts(b);
    h += '<div class="cp-sum bal-sep">' + nn + " nuit" + (nn > 1 ? "s" : "") + " · " + c.ad + " adulte" + (c.ad > 1 ? "s" : "") + (c.kid ? " + " + c.kid + " enfant" + (c.kid > 1 ? "s" : "") : "") + " · coût estimé <b>" + eur0.format(cpCost(b)) + "</b></div>";
    if (satN.length) h += '<div class="alert bad"><b>Chevauchement : ' + cpLodgeTxt(b) + " trop plein du " + cpLab(satN[0]) + " au " + cpLab(satN[satN.length - 1] + 1) + "</b>Ajoutez un hébergement ou changez de dates. Vous pouvez aussi réserver quand même : seules les nuits en chevauchement seront en pointillé avec le pictogramme.</div>";
    else if (ovN.length && (!cpUi.share || Object.keys(nsW).length)) h += '<div class="alert bad"><b>Chevauchement du ' + cpLab(ovN[0]) + " au " + cpLab(ovN[ovN.length - 1] + 1) + "</b>" + (!cpUi.share ? "Vous souhaitez être seuls, mais d’autres ont déjà réservé ces dates." : esc(Object.keys(nsW).join(", ")) + " souhaite être seul pendant son séjour.") + " Vous pouvez réserver quand même : seules les nuits en chevauchement seront en pointillé avec le pictogramme.</div>";
    else if (ovN.length) h += '<div class="alert ok"><b>D’autres personnes seront présentes, mais il reste de la place</b>Du ' + cpLab(ovN[0]) + " au " + cpLab(ovN[ovN.length - 1] + 1) + ".</div>";
    return h + '<div class="actions"><button class="btn ghost" id="cpCancel">Annuler</button><button class="btn" id="cpSave">Enregistrer la réservation</button></div></div>';
  }
  function renderCamp() {
    var Y = cpYear(), list = cpSeason(), O = cpOcc(list), ov = cpOverlaps(O), h = "", R = cpRate();
    if (!ui.cpInit) { ui.cpInit = true; ui.cpCamp = ui.cpPlan = ui.cpChev = ui.cpRes = true; } // parties ouvertes à la première visite
    if (!cpUi.from) { cpUi.from = Y + "-07-03"; cpUi.to = Y + "-07-10"; }
    h += campBackHtml();
    // le camp : taux d'occupation du 1er juillet au 31 août (jours avec au moins une personne, couchages occupés sur 11 par nuit)
    var a0 = cpDi(Y + "-07-01"), nJ = CP_N - a0, jOcc = 0, pn = 0;
    for (var q = a0; q < CP_N; q++) { if (O[q].tot > 0) jOcc++; pn += Math.min(O[q].tot, CP_CAP + CP_CAPK); }
    h += '<div class="card"><div class="cp-top"><button class="coll cp-tog" data-coll="cpCamp" aria-expanded="' + !!ui.cpCamp + '"><span class="ctitle">Le Camp</span>' + TRI + '</button><div class="cp-occ" title="Du 1er juillet au 31 août"><span><b>' + Math.round(jOcc / nJ * 100) + ' %</b> des jours</span><span><b>' + Math.round(pn / (nJ * (CP_CAP + CP_CAPK)) * 100) + ' %</b> des couchages</span></div><button class="btn sm" id="cpBook">' + (cpUi.form ? "Fermer" : "Réserver") + "</button></div>" +
      (ui.cpCamp ? '<div class="cp-cap">' + Object.keys(CP_LODGE).map(function (k) { return '<div class="cp-lodge">' + (k === "car" ? CP_ICON.car : CP_ICON.tent) + "<b>" + CP_LODGE[k].n + "</b><span>" + CP_LODGE[k].s + "</span></div>"; }).join("") + "</div>" : "") + "</div>";
    if (cpUi.form) h += cpFormHtml(list);
    // planning
    h += cpSec("cpPlan", "Planning", "été " + Y, '<div class="cp-months">' + ["Juin", "Juillet", "Août"].map(function (l, k) { return '<button class="chip" data-cpm="' + (5 + k) + '" aria-pressed="' + (cpUi.m === 5 + k) + '">' + l + "</button>"; }).join("") + "</div>" + cpCalendar(O, list) +
      '<div class="cp-legend"><span><i class="YC"></i>Famille Yann</span><span><i class="OC"></i>Famille Olivier</span><span><i class="JC"></i>Famille Julien</span><span><i class="EXT"></i>Extérieurs</span><span><i class="dash"></i>Chevauchement</span><span class="lg-ic">' + CP_LOCK + 'Confirmée</span><span class="lg-ic">' + CP_NOSH + "Seuls pendant le séjour</span></div>");
    if (ov.length) h += cpSec("cpChev", "Chevauchements", ov.length + " période" + (ov.length > 1 ? "s" : ""), ov.map(function (c) {
      var bs = c.ids.map(cpById).filter(Boolean), who = bs.map(function (b) { return b.who; }).join(" + "), why = [];
      c.sat.forEach(function (k) { why.push(CP_LODGE[k].n + " : trop de monde pour " + CP_LODGE[k].s); });
      if (c.ns) bs.filter(function (b) { return b.share === false; }).forEach(function (b) { why.push(b.who + " souhaite être seul pendant son séjour"); });
      return why.length ? '<div class="alert bad"><b>' + cpLab(c.a) + " → " + cpLab(c.z + 1) + " : " + esc(who) + "</b>" + esc(why.join(" ; ")) + ". À régler entre vous (autre hébergement ou autres dates).</div>"
        : '<div class="alert ok"><b>' + cpLab(c.a) + " → " + cpLab(c.z + 1) + " : " + esc(who) + "</b>" + c.tot + " personnes sur 11 places : ça passe, chacun a son hébergement.</div>";
    }).join(""));
    // périodes réservées : le cadenas confirme la réservation ; suppression réservée à Yann et Olivier
    var sorted = list.slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    h += cpSec("cpRes", "Périodes réservées", sorted.length + " réservation" + (sorted.length > 1 ? "s" : ""), !sorted.length ? '<div class="small muted">Aucune réservation pour l’été ' + Y + ". Touchez « Réserver ».</div>" :
      '<table class="rtable cp-res"><thead><tr><th>Qui</th><th>Dates</th><th class="r">Nuits</th><th class="r">Pers.</th><th class="r">Confirmée</th></tr></thead><tbody>' +
      sorted.map(function (b) {
        var c = cpCounts(b), del = canValidate() ? (cpUi.del === b.id ? ' <button class="btn link cp-delok" data-cpdel="' + esc(b.id) + '">Supprimer ?</button>' : ' <button class="cp-x" data-cpdel="' + esc(b.id) + '" aria-label="Supprimer la réservation">×</button>') : "";
        return '<tr><td><span class="cp-dot ' + b.f + '"></span>' + esc(b.who) + (b.share === false ? CP_NOSH : "") + '<span class="sub">' + cpLodgeTxt(b) + " · " + esc(cpPpl(b).map(cpName).join(", ")) + "</span></td><td>" + cpLab(cpDi(b.from)) + " → " + cpLab(cpDi(b.to)) + '</td><td class="r">' + cpNights(b) + '</td><td class="r">' + c.ad + (c.kid ? " + " + c.kid + " enf." : "") + '</td><td class="r cp-act"><button class="cp-lock" data-cpok="' + esc(b.id) + '" aria-pressed="' + !!b.ok + '" aria-label="' + (b.ok ? "Réservation confirmée, toucher pour annuler la confirmation" : "Confirmer la réservation") + '">' + CP_LOCK + "</button>" + del + "</td></tr>";
      }).join("") + "</tbody></table>");
    // semaines libres, du samedi au samedi
    var weeks = [], w0 = 0 - ((new Date(cpT0()).getUTCDay() + 1) % 7);
    for (var w = w0; w < CP_N; w += 7) { var a = Math.max(0, w), z = Math.min(CP_N, w + 7), min = 99; for (var n = a; n < z; n++) min = Math.min(min, O[n].free); if (z > a) weeks.push({ a: a, z: z, min: min }); }
    var libres = weeks.filter(function (x) { return x.min >= CP_CAP + CP_CAPK; }), part = weeks.filter(function (x) { return x.min > 0 && x.min < CP_CAP + CP_CAPK; });
    h += cpSec("cpFree", "Semaines libres", "du samedi au samedi · " + libres.length + " libre" + (libres.length > 1 ? "s" : ""), (libres.length ? '<div class="chips">' + libres.map(function (x) { return '<span class="chip">' + cpLab(x.a) + " → " + cpLab(x.z) + "</span>"; }).join("") + "</div>" : '<div class="small muted">Aucune semaine entièrement libre.</div>') +
      (part.length ? '<div class="label" style="margin-top:10px">En partie occupées</div><table class="rtable"><tbody>' + part.map(function (x) { return "<tr><td>" + cpLab(x.a) + " → " + cpLab(x.z) + '</td><td class="r">au moins ' + x.min + " places libres chaque nuit</td></tr>"; }).join("") + "</tbody></table>" : ""));
    // coût estimé par famille, dépliable (simple estimation : aucune dépense n'est créée)
    var per = {}, grand = 0;
    list.forEach(function (b) { cpPpl(b).forEach(function (id) { per[id] = per[id] || { id: id, n: 0 }; per[id].n += cpNights(b); }); });
    var costBody = ["YC", "OC", "JC", "EXT"].map(function (f) {
      var rows = Object.keys(per).map(function (k) { return per[k]; }).filter(function (x) { return cpFamId(x.id) === f; }); if (!rows.length) return "";
      var tot = 0, nn = 0; rows.forEach(function (x) { x.c = x.n * (cpKid(x.id) ? R.kid : R.ad); tot += x.c; nn += x.n; }); grand += tot;
      var op = !!cpUi.cost[f];
      return '<button class="cp-fam" data-cpcost="' + f + '" aria-expanded="' + op + '"><span class="cp-dot ' + f + '"></span><b>' + CP_FAMN[f] + '</b><span class="muted">' + rows.length + " pers. · " + nn + ' nuitées</span><b class="r">' + eur0.format(tot) + "</b>" + TRI + "</button>" +
        (op ? '<table class="rtable cp-det"><tbody>' + rows.map(function (x) { return "<tr><td>" + esc(cpName(x.id)) + (cpKid(x.id) ? ' <span class="muted">(enfant)</span>' : "") + '</td><td class="r">' + x.n + ' nuits</td><td class="r">' + eur0.format(x.c) + "</td></tr>"; }).join("") + "</tbody></table>" : "");
    }).join("");
    if (Object.keys(per).length) grand = grand || 0;
    h += cpSec("cpCost", "Coût estimé du séjour", eur0.format(grand), (costBody || '<div class="small muted">Aucune réservation.</div>') + '<div class="cp-grand"><span>Total du séjour</span><b>' + eur0.format(grand) + '</b></div><div class="small muted" style="margin-top:6px">Estimation seulement : rien n’est ajouté aux dépenses du bateau.</div>');
    // tarifs des nuits de l'année (modifiables par Yann et Olivier)
    h += cpSec("cpTarif", "Tarifs " + Y, eur.format(R.ad) + " adulte · " + eur.format(R.kid) + " enfant, par nuit", !cpUi.tarEdit ?
      '<div class="small">Adulte : <b>' + eur.format(R.ad) + '</b> par nuit · enfant de moins de 10 ans : <b>' + eur.format(R.kid) + "</b> par nuit.</div>" + (canValidate() ? '<div><button class="btn ghost sm" id="cpTarEdit">Modifier les tarifs ' + Y + "</button></div>" : RESERVE_TXT) :
      '<div class="two"><div class="field"><label for="cpTarAd">Adulte (€ / nuit)</label><input id="cpTarAd" inputmode="decimal" value="' + dec2.format(R.ad) + '"></div><div class="field"><label for="cpTarKid">Enfant de moins de 10 ans (€ / nuit)</label><input id="cpTarKid" inputmode="decimal" value="' + dec2.format(R.kid) + '"></div></div>' +
      '<div class="actions"><button class="btn ghost" id="cpTarCancel">Annuler</button><button class="btn" id="cpTarSave">Enregistrer</button></div>');
    return h;
  }
  /* ---------- v2.0 : espace Camping (accueil, capacité, agenda, états des lieux) et page Météo ----------
     Tout reste indépendant du bateau : lits et états des lieux sont rangés dans la table « etat » (kind « camplits » et « edl »). */
  var cpLits = null, cpEdl = [], edlForm = { txt: "", photo: null, video: null, busy: false };
  var CP_HUB_IC = {
    cap: '<svg viewBox="0 0 24 24"><path d="M3 18V8M3 14h18v4M21 18v-6a2 2 0 0 0-2-2h-8v4"/><circle cx="7" cy="11" r="1.6"/></svg>',
    res: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5"/></svg>',
    agenda: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M6.5 13h6M9 16.5h8"/></svg>',
    edl: '<svg viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.3"/></svg>',
    meteo: '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.4"/><path d="M9 2.5v1.6M2.5 9h1.6M4.4 4.4l1.1 1.1M13.6 4.4l-1.1 1.1"/><path d="M8 19h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 8 19z"/></svg>'
  };
  function campBackHtml() { return '<button class="btn link" data-go="camphub">← Espace camping</button>'; }
  function renderCampHub() {
    var list = cpSeason(), conf = list.filter(function (b) { return b.ok; }).length;
    var tile = function (go, ic, t, s) { return '<button class="hub-t" data-go="' + go + '"' + (go === "camp" ? ' data-book="1"' : "") + '><span class="hub-ic" aria-hidden="true">' + ic + '</span><span class="hub-tt">' + t + '</span><span class="hub-s">' + s + "</span></button>"; };
    return '<div class="hub">' +
      tile("camp", CP_HUB_IC.res, "Réserver", list.length + " réservation" + (list.length > 1 ? "s" : "") + " · " + conf + " confirmée" + (conf > 1 ? "s" : "")) +
      tile("campcap", CP_HUB_IC.cap, "Capacité du camp", "caravane et tentes, qui dort où") +
      tile("campagenda", CP_HUB_IC.agenda, "Visualiser l’agenda", "les réservations en grand, été " + cpYear()) +
      tile("campedl", CP_HUB_IC.edl, "États des lieux", cpEdl.length + " état" + (cpEdl.length > 1 ? "s" : "") + " des lieux enregistré" + (cpEdl.length > 1 ? "s" : "")) +
      "</div>"; // v2.0b : 4 boutons, sans la phrase sur l'indépendance du bateau
  }
  /* Capacité : la caravane vue de dessus (lit double à gauche, lit double à droite, lit superposé au-dessus du lit de gauche)
     et les deux tentes ; on pose une personne sur chaque couchage (toucher la place, puis le prénom). */
  var CP_SLOTS = { car: [["carL1", "Lit gauche"], ["carL2", "Lit gauche"], ["carS", "Lit superposé"], ["carR1", "Lit droit"], ["carR2", "Lit droit"]], t1: [["t1a", ""], ["t1b", ""], ["t1c", ""]], t2: [["t2a", ""], ["t2b", ""], ["t2c", ""]] };
  function litOf(slot) { return cpLits && cpLits.a ? cpLits.a[slot] || "" : ""; }
  /* v2.0c : un dormeur vu de dessus, la tête en bas sur l'oreiller : bras le long du corps, jambes un peu écartées */
  var FIG_SVG = '<svg class="fig" viewBox="0 0 36 82" aria-hidden="true"><path class="fl" d="M14.5 38L11.5 6M21.5 38L24.5 6M11.5 57L4.5 41M24.5 57L31.5 41"/>' +
    '<rect class="fb" x="10.5" y="33" width="15" height="29" rx="6.5"/><circle class="fb" cx="18" cy="71" r="8.2"/></svg>';
  function slotBtn(slot) { var id = litOf(slot), on = cpUi.capSlot === slot; return '<button class="lit2' + (id ? " pris " + cpFamId(id) : "") + (on ? " on" : "") + '" data-lit="' + slot + '" aria-label="' + (id ? esc(cpName(id)) : "Place libre") + '"><span class="lit-n">' + (id ? esc(cpName(id)) : "libre") + "</span>" + FIG_SVG + "</button>"; }
  /* La caravane vue de dessus : les lits sont dans la largeur, les dormeurs côte à côte, la tête en bas ; lit superposé à droite, porte en bas entre les deux lits. */
  function renderCampCap() {
    var h = campBackHtml();
    h += '<div class="card"><h3>Caravane <span class="small muted">4 places + 1 enfant</span></h3><div class="cv2-car" aria-label="Caravane vue de dessus">' +
      '<div class="cv2-bed"><span class="cv2-l">Lit double</span><div class="cv2-sl">' + slotBtn("carL1") + slotBtn("carL2") + "</div></div>" +
      '<div class="cv2-mid"></div>' +
      '<div class="cv2-bed"><span class="cv2-l">Lit double</span><div class="cv2-sl">' + slotBtn("carR1") + slotBtn("carR2") + "</div></div>" +
      '<div class="cv2-bed cv2-bunk"><span class="cv2-l">Superposé</span><div class="cv2-sl">' + slotBtn("carS") + "</div></div>" +
      '<div class="cv2-door" aria-hidden="true"><span>porte</span></div><div class="cv2-hitch" aria-hidden="true"></div></div></div>';
    ["t1", "t2"].forEach(function (t) { h += '<div class="card"><h3>' + CP_LODGE[t].n + ' <span class="small muted">3 places</span></h3><div class="cv2-tent"><div class="cv2-bed"><div class="cv2-sl">' + CP_SLOTS[t].map(function (s) { return slotBtn(s[0]); }).join("") + "</div></div></div></div>"; });
    if (cpUi.capSlot) {
      var cands = PEOPLE.filter(function (p) { return !p.hidden; }).map(function (p) { return [p.id, p.name]; }).concat(CP_AMIS);
      h += '<div class="card cv-pick"><div class="row"><h3>Qui dort ici ?</h3><button class="btn link" data-lit="">Fermer</button></div><div class="chips">' +
        cands.map(function (c) { return '<button class="chip ' + cpFamId(c[0]) + '" data-litp="' + esc(c[0]) + '" aria-pressed="' + (litOf(cpUi.capSlot) === c[0]) + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>" +
        (litOf(cpUi.capSlot) ? '<div><button class="btn ghost sm" data-litp="-">Libérer cette place</button></div>' : "") + "</div>";
    }
    return h + '<div class="small muted">Touchez une place, puis le prénom de la personne qui y dort. Les places sont partagées avec la famille.</div>';
  }
  /* v2.0b : l'agenda reprend le format du planning de réservation, les trois mois l'un sous l'autre, et s'envoie en image (WhatsApp, e-mail…) */
  function cpLegendHtml() { return '<div class="cp-legend"><span><i class="YC"></i>Famille Yann</span><span><i class="OC"></i>Famille Olivier</span><span><i class="JC"></i>Famille Julien</span><span><i class="EXT"></i>Extérieurs</span><span><i class="dash"></i>Chevauchement</span><span class="lg-ic">' + CP_LOCK + 'Confirmée</span><span class="lg-ic">' + CP_NOSH + "Seuls pendant le séjour</span></div>"; }
  function renderCampAgenda() {
    var Y = cpYear(), list = cpSeason(), O = cpOcc(list), h = campBackHtml();
    h += '<div class="card ag2-top"><div class="row"><h3>Agenda · été ' + Y + '</h3><button class="btn sm" id="agShare">' + CP_SHARE_IC + "Envoyer</button></div>" +
      '<div class="small muted">' + list.length + " réservation" + (list.length > 1 ? "s" : "") + ". « Envoyer » prépare une image du planning à partager par WhatsApp ou par e-mail.</div>" + (ui.agImg ? agShareHtml() : "") + "</div>";
    [5, 6, 7].forEach(function (m) { h += '<div class="card ag2"><h3>' + ["Juin", "Juillet", "Août"][m - 5] + " " + Y + "</h3>" + cpCalendar(O, list, m) + "</div>"; });
    return h + '<div class="card">' + cpLegendHtml() + "</div>";
  }
  var CP_SHARE_IC = '<svg class="sh-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4"/></svg>';
  /* Repli quand le téléphone ne sait pas partager une image directement : aperçu, enregistrement, WhatsApp et e-mail avec le texte du planning */
  function agShareHtml() {
    var Y = cpYear(), t = encodeURIComponent(ui.agTxt || "");
    return '<div class="ag-share"><img src="' + ui.agImg + '" alt="Planning du camping, été ' + Y + '"><div class="actions ag-sh-btns"><a class="btn sm" href="' + ui.agImg + '" download="planning-camping-' + Y + '.png">Enregistrer l’image</a>' +
      '<a class="btn ghost sm" href="https://wa.me/?text=' + t + '" target="_blank" rel="noopener">WhatsApp</a><a class="btn ghost sm" href="mailto:?subject=' + encodeURIComponent("Planning camping " + Y) + "&body=" + t + '">E-mail</a></div>' +
      '<div class="small muted">Enregistrez l’image, puis joignez-la au message WhatsApp ou à l’e-mail. <button class="btn link small" id="agShClose">Fermer</button></div></div>';
  }
  function cpPlanText() {
    var Y = cpYear(), list = cpSeason().slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    return "Camping Les petits Pellegrins · planning été " + Y + "\n" + (list.length ? list.map(function (b) { var c = cpCounts(b); return "• " + b.who + " : " + cpLab(cpDi(b.from)) + " → " + cpLab(cpDi(b.to)) + " (" + cpNights(b) + " nuits, " + c.n + " pers., " + cpLodgeTxt(b) + ")" + (b.ok ? " · confirmée" : ""); }).join("\n") : "Aucune réservation pour l’instant.");
  }
  /* L'image du planning, dessinée sur un canvas (mêmes semaines et mêmes barres que l'écran) */
  function cpPlanCanvas() {
    var Y = cpYear(), list = cpSeason(), O = cpOcc(list), W = 1080, P = 36, cw = (W - 2 * P) / 7, cs = getComputedStyle(document.documentElement);
    var col = { YC: (cs.getPropertyValue("--yc") || "").trim() || "#2f6fd6", OC: (cs.getPropertyValue("--oc") || "").trim() || "#d23a3a", JC: "#2e9e4f", EXT: "#14a3b5" };
    var c = document.createElement("canvas"); c.width = W; c.height = 4200; var x = c.getContext("2d"), y = P;
    var F = "Barlow, 'Segoe UI', Arial, sans-serif";
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, c.height);
    x.fillStyle = "#1f5a3a"; x.font = "700 40px " + F; x.textBaseline = "top"; x.fillText("Camping Les petits Pellegrins", P, y); y += 50;
    x.fillStyle = "#5b6b75"; x.font = "500 24px " + F; x.fillText("Planning été " + Y + " · " + list.length + " réservation" + (list.length > 1 ? "s" : ""), P, y); y += 48;
    function rr(X, Yy, w, h, r) { x.beginPath(); x.moveTo(X + r, Yy); x.arcTo(X + w, Yy, X + w, Yy + h, r); x.arcTo(X + w, Yy + h, X, Yy + h, r); x.arcTo(X, Yy + h, X, Yy, r); x.arcTo(X, Yy, X + w, Yy, r); x.closePath(); }
    [5, 6, 7].forEach(function (m) {
      x.fillStyle = "#1c2b36"; x.font = "700 30px " + F; x.fillText(["Juin", "Juillet", "Août"][m - 5] + " " + Y, P, y); y += 42;
      x.font = "700 18px " + F; x.fillStyle = "#6b7a84"; ["L", "M", "M", "J", "V", "S", "D"].forEach(function (d, k) { x.fillText(d, P + k * cw + 8, y); }); y += 26;
      cpWeeks(O, list, m).forEach(function (Wk) {
        var hh = 52 + Wk.nl * 32 + 6;
        x.strokeStyle = "#dde3e6"; x.lineWidth = 1; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke();
        Wk.days.forEach(function (d, k) {
          var X = P + k * cw;
          if (!d.inM) { x.fillStyle = "#f3f5f6"; x.fillRect(X, y, cw, hh); return; }
          if (d.cf) { x.fillStyle = "rgba(210,58,58,.09)"; x.fillRect(X, y, cw, hh); }
          if (k) { x.strokeStyle = "#e7ecee"; x.beginPath(); x.moveTo(X, y); x.lineTo(X, y + hh); x.stroke(); }
          x.fillStyle = "#1c2b36"; x.font = "700 20px " + F; x.fillText(String(d.n), X + 8, y + 6);
          x.fillStyle = d.cf || d.free <= 0 ? "#c62828" : d.free >= 5 ? "#1f7a3a" : "#e07b00"; x.font = "600 16px " + F; x.fillText(d.free + " pl.", X + 8, y + 29);
        });
        Wk.segs.forEach(function (s) {
          var X = P + s.a * cw + 4, w = (s.z - s.a) * cw - 8, Yb = y + 52 + s.lane * 32, cc = col[s.b.f] || col.EXT;
          rr(X, Yb, w, 26, 6);
          if (s.sat) { x.fillStyle = "#ffffff"; x.fill(); x.setLineDash([7, 5]); x.strokeStyle = cc; x.lineWidth = 3; x.stroke(); x.setLineDash([]); x.lineWidth = 1; } else { x.fillStyle = cc; x.fill(); }
          if (s.first || s.sat) {
            x.save(); rr(X, Yb, w, 26, 6); x.clip(); x.fillStyle = s.sat ? cc : "#ffffff"; x.font = "700 16px " + F;
            x.fillText((s.sat ? "⚠ " : s.b.ok ? "✔ " : "") + (s.first ? s.b.who + " · " + cpCounts(s.b).n : ""), X + 8, Yb + 5); x.restore();
          }
        });
        y += hh;
      });
      x.strokeStyle = "#dde3e6"; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke(); y += 30;
    });
    // légende et liste des réservations
    x.font = "600 18px " + F; var lx = P;
    [["YC", "Famille Yann"], ["OC", "Famille Olivier"], ["JC", "Famille Julien"], ["EXT", "Extérieurs"]].forEach(function (l) { x.fillStyle = col[l[0]]; rr(lx, y + 2, 20, 16, 4); x.fill(); x.fillStyle = "#1c2b36"; x.fillText(l[1], lx + 28, y); lx += x.measureText(l[1]).width + 56; });
    y += 30; x.fillStyle = "#5b6b75"; x.fillText("✔ confirmée   ⚠ chevauchement à régler   pl. = places libres sur 11", P, y); y += 40;
    x.fillStyle = "#1c2b36"; x.font = "700 24px " + F; x.fillText("Réservations", P, y); y += 34; x.font = "500 19px " + F;
    cpPlanText().split("\n").slice(1).forEach(function (l) { x.fillText(l, P, y); y += 28; });
    var out = document.createElement("canvas"); out.width = W; out.height = Math.ceil(y + P); out.getContext("2d").drawImage(c, 0, 0); return out;
  }
  function agShare() {
    var Y = cpYear(), url = cpPlanCanvas().toDataURL("image/png"), txt = cpPlanText(), f = null;
    try { var bin = atob(url.split(",")[1]), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); f = new File([u8], "planning-camping-" + Y + ".png", { type: "image/png" }); } catch (e) { f = null; }
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], title: "Planning camping " + Y, text: txt }).catch(function (e) { if (e && e.name !== "AbortError") { ui.agImg = url; ui.agTxt = txt; render(); } });
      return;
    }
    ui.agImg = url; ui.agTxt = txt; render(); // pas de partage direct : aperçu et boutons WhatsApp / e-mail
  }
  /* États des lieux : photos ou vidéo de l'état au départ, avec un commentaire. */
  function renderCampEdl() {
    var h = campBackHtml() + '<div class="card"><h3>Nouvel état des lieux</h3>' +
      (edlForm.photo ? '<img class="edl-ph" src="' + photoSrc(edlForm.photo) + '" alt="Photo de l’état des lieux">' : "") +
      '<div class="edl-btns"><label class="btn ghost sm photo-btn">' + (edlForm.photo ? "Reprendre la photo" : "Prendre une photo") + '<input type="file" accept="image/*" capture="environment" id="edlPhoto" hidden></label>' +
      '<label class="btn ghost sm media-btn">' + VID_ICON + (edlForm.video ? "Changer la vidéo" : "Filmer une vidéo") + '<input type="file" accept="video/*" capture="environment" id="edlVideo" hidden></label></div>' + // v2.0c : vidéo possible
      (edlForm.video ? '<div class="note-att small">' + VID_ICON + " " + esc(edlForm.video.name) + " · " + sizeTxt(edlForm.video.size) + ' <button class="btn link" id="edlVidRm">Retirer</button></div><div class="small muted">20 à 30 secondes (15 Mo au plus). Elle est envoyée sur le Drive partagé avec un lien dans l’état des lieux.</div>' : "") +
      '<div class="field"><label for="edlTxt">Commentaire</label><textarea id="edlTxt" rows="3" placeholder="État de la caravane, des tentes, ce qui manque…">' + esc(edlForm.txt) + "</textarea></div>" +
      '<div class="actions"><button class="btn" id="edlSave"' + (edlForm.busy ? " disabled" : "") + ">Enregistrer l’état des lieux</button></div></div>";
    var list = cpEdl.slice().sort(function (a, b) { return (a.date || "") < (b.date || "") ? 1 : -1; });
    h += '<div class="card"><h3>États des lieux enregistrés</h3>' + (!list.length ? '<div class="small muted">Aucun pour l’instant.</div>' : list.map(function (e) {
      return '<div class="edl-it"><div class="small"><b>' + esc(fmtDateTime(e.date)) + "</b> · " + esc(e.auteurNom || "?") + "</div>" + (photoSrc(e.photo) ? '<img class="edl-ph" src="' + photoSrc(e.photo) + '" alt="Photo de l’état des lieux">' : "") +
        (e.video && e.video.url ? '<a class="note-vid" href="' + esc(e.video.url) + '" target="_blank" rel="noopener">' + VID_ICON + "Voir la vidéo</a>" : "") +
        (e.txt ? '<div class="small">' + esc(e.txt) + "</div>" : "") + (canValidate() ? '<div><button class="btn link small" data-edldel="' + esc(e.id) + '">' + (ui.edlDel === e.id ? "Confirmer l’effacement" : "Effacer") + "</button></div>" : "") + "</div>";
    }).join("")) + "</div>";
    return h;
  }
  /* Météo : prévisions Windguru du spot 192 et webcam de la plage de Lacanau Océan. */
  var METEO = { wg: "https://www.windguru.cz/192", cam: "https://www.windy.com/webcams/1334243169", camEmbed: "https://webcams.windy.com/webcams/public/embed/player/1334243169/day" };
  function renderMeteo() {
    return '<div class="card"><div class="row"><h3>Prévisions Windguru</h3><a class="btn link" href="' + METEO.wg + '" target="_blank" rel="noopener">Ouvrir Windguru</a></div>' +
      '<div class="wg-box" id="wgBox">' + (navigator.onLine ? '<div class="small muted">Chargement des prévisions…</div>' : '<div class="small muted">Hors ligne : les prévisions s’afficheront avec une connexion.</div>') + "</div></div>" +
      '<div class="card"><div class="row"><h3>Webcam Lacanau Océan</h3><a class="btn link" href="' + METEO.cam + '" target="_blank" rel="noopener">Plein écran</a></div>' +
      (navigator.onLine ? '<div class="cam-box"><iframe src="' + METEO.camEmbed + '" title="Webcam de la plage de Lacanau Océan" loading="lazy" allowfullscreen></iframe></div>' : '<div class="small muted">Hors ligne.</div>') + "</div>";
  }
  function meteoLoad() {
    var box = document.getElementById("wgBox"); if (!box || !navigator.onLine || box.dataset.ok) return;
    box.dataset.ok = "1";
    var uid0 = "wg_fwdg_192_100_" + Date.now(), anchor = document.createElement("script"); anchor.id = uid0; anchor.type = "text/plain";
    box.innerHTML = ""; box.appendChild(anchor);
    var arg = ["s=192", "m=100", "uid=" + uid0, "wj=knots", "tj=c", "waj=m", "tij=cm", "odh=0", "doh=24", "fhours=240", "hrsm=2", "vt=forecasts", "lng=fr", "idbs=1", "p=WINDSPD,GUST,SMER,TMPE,CDC,APCP1s,RATING"];
    var s = document.createElement("script"); s.src = "https://www.windguru.cz/js/widget.php?" + arg.join("&"); s.async = true;
    s.onerror = function () { box.innerHTML = '<div class="small muted">Prévisions indisponibles : touchez « Ouvrir Windguru ».</div>'; };
    box.appendChild(s);
  }
  function render() {
    computeYears();
    var map = { accueil: renderAccueil, sortie: renderSortie, essence: renderEssence, activite: renderActivite, pilotes: renderPilotes, annuaire: renderAnnuaire, journal: renderJournal, bateau: renderBateau, camp: renderCamp, camphub: renderCampHub, campcap: renderCampCap, campagenda: renderCampAgenda, campedl: renderCampEdl, meteo: renderMeteo };
    screen.innerHTML = map[tab]();
    var fr = screen.querySelector(".bal-frise"); // frise de la balance : on garde la position de défilement, sinon on s'ouvre sur « Aujourd'hui »
    if (fr) { fr.scrollLeft = ui.friseX != null ? ui.friseX : fr.scrollWidth; fr.addEventListener("scroll", function () { ui.friseX = fr.scrollLeft; }, { passive: true }); } else ui.friseX = null;
    setTimeout(function () { persistAll(); updateNet(); }, 0);
    var navTab = tab === "pilotes" || tab === "annuaire" ? "bateau" : tab === "journal" || tab === "meteo" || /^camp/.test(tab) ? "accueil" : tab; // Pilotes et Annuaire sont des sous-menus de Bateau ; Journal, Météo et Camping, de l'Accueil
    document.querySelectorAll(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === navTab)); });
    if (tab === "activite" && finView === "dep") depPreview();
    if (tab === "essence" && view.essence === "achat") achatPreview();
    if (tab === "meteo") meteoLoad(); // v2.0 : prévisions Windguru chargées à l'ouverture de la page
    document.body.classList.toggle("camp-mode", /^camp/.test(tab)); // v2.0 : l'espace camping est séparé du ski nautique (pas de barre d'onglets du bateau)
    var hl = document.getElementById("launchBtn"); if (hl) hl.hidden = !!screen.querySelector(".dt-launch"); // v2.0b : un seul bouton de lancement à l'écran
    if (tab === "campagenda") { var ags = document.getElementById("agScroll"); if (ags) { ags.scrollLeft = ui.agX != null ? ui.agX : Math.max(0, (cpDi(cpYear() + "-07-01") - 2) * 20); ags.addEventListener("scroll", function () { ui.agX = ags.scrollLeft; }, { passive: true }); } }
    renderHead();
    navSync();
    gpsSync(); applyOrientation(); updateBig(); keepAwake(); // GPS lancé avant le grand affichage, qui affiche son état
  }
  /* ---------- Retour arrière hiérarchique (v1.9.4) ----------
     Le retour (geste Android, bouton Précédent, glissé depuis le bord sur iPhone) remonte toujours d'un niveau :
     sous-menu → menu → Accueil. Jamais de boucle : l'historique du navigateur ne garde que deux entrées,
     l'Accueil (racine) et l'écran courant, plus une entrée « garde » sous l'Accueil :
     à l'Accueil, le retour ne fait rien (on reste sur l'Accueil, l'app ne se ferme pas). */
  var navKey = "", navAtTop = false, navSkip = false, navGuarded = false, annUp = "accueil";
  var NAV_GUARD = { guard: 1 };
  var NAV_ROOT = { tab: "accueil", fin: "", pil: "", ess: "", dep: 0, up: "" };
  function navState() {
    return { tab: tab, fin: tab === "activite" ? finView : "", pil: tab === "pilotes" ? pilotSel : "", ess: tab === "essence" ? (view.essence || "") : "", dep: tab === "activite" && finView === "dep" && view.dep ? 1 : 0, up: tab === "annuaire" ? annUp : "" };
  }
  function navIsRoot(s) { return s.tab === "accueil"; }
  /* Niveau supérieur d'un écran. Accueil > Session, Essence, Activité (Bilan), Bateau, Journal
     > Essence : achat, versement, correction · Activité : balance, dépenses (> nouvelle dépense) · Bateau : pilotes (> fiche pilote), annuaire. */
  function navParent(s) {
    var p = { tab: s.tab, fin: s.fin, pil: s.pil, ess: s.ess, dep: 0, up: s.up };
    if (s.dep) return p;
    if (s.tab === "activite" && s.fin && s.fin !== "bilan") { p.fin = "bilan"; return p; }
    if (s.tab === "essence" && s.ess) { p.ess = ""; return p; }
    if (s.tab === "pilotes" && s.pil) { p.pil = ""; return p; }
    if (s.tab === "pilotes") return { tab: "bateau", fin: "", pil: "", ess: "", dep: 0, up: "" };
    if (s.tab === "annuaire") return s.up === "bateau" ? { tab: "bateau", fin: "", pil: "", ess: "", dep: 0, up: "" } : NAV_ROOT; // urgence : ouvert depuis Bateau ou depuis l'Accueil
    if (s.tab === "accueil") return null;
    if (s.tab === "camp" || s.tab === "campcap" || s.tab === "campagenda" || s.tab === "campedl") return { tab: "camphub", fin: "", pil: "", ess: "", dep: 0, up: "" }; // v2.0 : pages du camping > espace camping
    return NAV_ROOT;
  }
  function navSync() {
    var prev = navKey ? JSON.parse(navKey) : null;
    if (tab === "annuaire" && (!prev || prev.tab !== "annuaire")) annUp = prev && prev.tab === "bateau" ? "bateau" : "accueil";
    var s = navState(), k = JSON.stringify(s);
    if (k === navKey) return;
    try {
      if (!navKey) { // premier affichage, ou retour en arrière qui vient d'être traité
        if (navIsRoot(s)) { history.replaceState(s, ""); navAtTop = false; }
        else { history.replaceState(NAV_ROOT, ""); history.pushState(s, ""); navAtTop = true; }
      } else if (navIsRoot(s)) {
        if (navAtTop) { navSkip = true; navAtTop = false; history.back(); } // retour à l'Accueil par le menu : on retire l'écran courant de l'historique
        else history.replaceState(s, "");
      } else if (navAtTop) history.replaceState(s, ""); // d'un écran à l'autre : on remplace, on n'empile pas
      else { history.pushState(s, ""); navAtTop = true; }
    } catch (e) { /* historique indisponible */ }
    navKey = k;
  }
  /* La garde est posée au premier appui sur l'écran : les navigateurs ignorent les entrées d'historique créées sans geste de l'utilisateur. */
  document.addEventListener("click", function () {
    if (navGuarded || navAtTop || !navKey) return;
    try { history.replaceState(NAV_GUARD, ""); history.pushState(JSON.parse(navKey), ""); navGuarded = true; } catch (e) { /* historique indisponible */ }
  }, true);
  window.addEventListener("popstate", function (e) {
    if (navSkip) { navSkip = false; return; }
    if (e.state && e.state.guard) { try { history.pushState(NAV_ROOT, ""); } catch (er) { /* historique indisponible */ } navAtTop = false; return; } // retour depuis l'Accueil : on y reste
    var cur = navKey ? JSON.parse(navKey) : null;
    navAtTop = false;
    if (!cur) return;
    if (sortie.active && sortie.closing && tab === "sortie") { sortie.closing = false; navKey = ""; screen.scrollTop = 0; render(); return; } // retour depuis la clôture : on revient à la session en cours
    var p = navParent(cur); if (!p) return; // déjà à l'Accueil
    tab = p.tab; finView = p.fin || "bilan"; pilotSel = p.pil || ""; view.essence = p.ess || null; view.dep = !!p.dep; if (p.up) annUp = p.up;
    achatForm.step = null; view.cancelAsk = false;
    navKey = ""; screen.scrollTop = 0; render();
  });
  /* iPhone (app installée) : pas de geste retour natif. Glisser depuis le bord droit (ou gauche) de l'écran vers l'intérieur = retour. */
  (function edgeSwipe() {
    if (/Android/i.test(navigator.userAgent)) return; // Android a déjà son geste retour système
    var installed = navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    if (!installed) return; // dans Safari, le geste retour existe déjà (il ferait doublon)
    var x0 = null, y0 = 0, side = 0, EDGE = 28;
    document.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || (e.target.closest && e.target.closest(".bal-frise"))) { x0 = null; return; } // la frise de la balance se fait glisser : pas de retour
      var t = e.touches[0], w = window.innerWidth;
      side = t.clientX <= EDGE ? 1 : t.clientX >= w - EDGE ? -1 : 0;
      x0 = side ? t.clientX : null; y0 = t.clientY;
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (x0 == null) return;
      var t = e.changedTouches[0], dx = (t.clientX - x0) * side, dy = Math.abs(t.clientY - y0); x0 = null;
      if (dx > 70 && dy < 60 && navAtTop) history.back(); // à l'Accueil, rien ne se passe
    }, { passive: true });
  })();
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
      '<div class="field"><label for="pfHw">Historique 2024-2025 : part de wake (%)</label><input id="pfHw" data-pf="histWake" inputmode="numeric" value="' + esc(p.histWake != null ? p.histWake : "") + '" placeholder="ex. 80 (le reste compte en ski)"></div>' +
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
  /* Actions réservées à Yann et Olivier (choix « Je suis ») : effacer, importer ou restaurer, valider la balance, noter un virement */
  var RESERVE_TXT = '<div class="small muted reserve">Réservé à Yann et Olivier (choix « Je suis » dans Admin, Connexion et partage).</div>';
  function reserveOk() { if (canValidate()) return true; toast("Réservé à Yann et Olivier."); return false; }
  /* Fiche pilote : modifiable par la personne elle-même (choix « Je suis »), Yann et Olivier modifient tout */
  function canEdit(p) { return canValidate() || (!!CONF.moi && !!p && CONF.moi === p.id); }
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
    var pp = person(pid);
    if (st.hist && pp && hasNum(pp.histWake) && String(pp.histWake) !== "") { // historique réparti entre wake et ski selon la part indiquée sur la fiche
      var hw = Math.max(0, Math.min(100, Number(pp.histWake))) / 100;
      st.histTot = st.hist; st.histWake = hw; st.wake += st.hist * hw; st.ski += st.hist * (1 - hw); st.hist = 0;
    }
    return st;
  }
  function hm(min) { min = Math.round(min || 0); return min < 60 ? min + " min" : Math.floor(min / 60) + " h " + String(min % 60).padStart(2, "0"); }
  function renderPilotes() {
    var sel = pilotSel && person(pilotSel);
    if (sel) return pilotDetailHtml(sel);
    var h = '<button class="btn link" data-go="bateau">← Retour à Admin</button><div class="card"><h3>Les pilotes</h3><div class="small muted">Grades validés par Yann ou Olivier. Touchez une personne pour voir sa fiche.</div><div class="list">';
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
        var img = s ? '<img src="' + s + '" alt="">' : '<span class="ph-empty f-' + f + '">' + FAM[f].s.charAt(0) + "</span>";
        if (!canValidate()) return '<span class="fam-ph ro">' + img + "<span>" + FAM[f].n + "</span></span>";
        return '<label class="fam-ph">' + img + "<span>" + FAM[f].n + '</span><span class="small muted">' + (s ? "Changer" : "Ajouter") + '</span><input type="file" accept="image/*" data-famphoto="' + f + '" hidden></label>';
      }).join("") + "</div>" + (canValidate() ? "" : '<div class="small muted">Seuls Yann et Olivier peuvent changer ces photos.</div>') + "</div>";
    h += '<div class="card"><h3>Prérogatives selon le grade</h3><div class="small muted">Chaque grade inclut les prérogatives des grades précédents.</div>' + GRADES.map(function (g, i) { return '<div class="grade-row">' + starsHtml(i + 1, 14) + "<span><b>" + g.label + '</b><br><span class="small">' + esc(g.detail) + "</span></span><span></span></div>"; }).join("") + "</div>";
    return h;
  }
  function pilotDetailHtml(p) {
    var s = pilotStats(p.id), g = p.grade || 0;
    var h = '<button class="btn link" data-pilot="">← Tous les pilotes</button>';
    var age = ageTxt(p.naissance), ed = canEdit(p);
    if (!ed) h += '<div class="alert ro-note"><b>Fiche en lecture seule</b>Seuls ' + esc(p.name) + (p.id === "yann" || p.id === "olivier" ? "" : ", Yann") + (p.id === "olivier" ? " et Yann" : " et Olivier") + " peuvent la modifier" + (CONF.moi ? "." : " (choix « Je suis » dans Admin, Connexion et partage).") + "</div>";
    h += '<fieldset class="pf-lock"' + (ed ? "" : " disabled") + '>';
    h += '<div class="card pilot-hero"><div class="ph-left">' +
      '<div class="name-line"><h3>' + esc(p.name) + "</h3>" + starsHtml(g, 22) + "</div>" +
      '<div class="birth"><input type="date" class="mini-date" data-pf="naissance" value="' + esc(p.naissance || "") + '" aria-label="Date de naissance">' + '<span class="small muted" id="ageTxt">' + (age || "date de naissance") + "</span>" + "</div>" +
      '<div class="tel-line"><input type="tel" class="mini-tel" data-pf="tel" value="' + esc(p.tel || "") + '" placeholder="Téléphone" inputmode="tel" autocomplete="off" aria-label="Téléphone de ' + esc(p.name) + '">' + (p.tel ? '<a class="call" href="tel:' + telHref(p.tel) + '">' + PHONE_ICON + "Appeler</a>" : "") + "</div>" +
      '<div class="small muted">' + (g ? esc(GRADES[g - 1].label) + " · validé par " + esc(p.gradePar || "?") + (p.gradeLe ? " le " + esc(p.gradeLe) : "") : "Pas encore de grade") + "</div>" +
      '<div class="perms">' + permisHtml(p, "permisCotier", "Côtier") + permisHtml(p, "permisFluvial", "Fluvial") + "</div></div>" +
      (ed ? '<label class="ph-pick">' + pilotAvatar(p, "hero-av") + '<span class="small">' + (p.photo ? "Changer" : "Ajouter une photo") + '</span><input type="file" accept="image/*" id="pfPhoto" hidden></label>' : '<span class="ph-pick ro">' + pilotAvatar(p, "hero-av") + "</span>") + "</div>";
    h += pratiqueHtml(p);
    h += '<div class="card"><h3>Statistiques de pratique</h3>';
    h += '<div class="kpis"><div class="kpi"><span class="label">Ski</span><span class="v">' + hm(s.ski) + '</span><span class="s">slalom, ski libre, formation</span></div>' +
      '<div class="kpi"><span class="label">Wake</span><span class="v">' + hm(s.wake) + '</span><span class="s">' + (s.histTot ? "historique 2024-2025 compris" : "depuis l’app") + '</span></div>' +
      '<div class="kpi"><span class="label">Passager</span><span class="v">' + hm(s.pass) + '</span><span class="s">sessions à bord sans skier</span></div>' +
      '<div class="kpi"><span class="label">Pilotage</span><span class="v">' + hm(s.pilot) + '</span><span class="s">tours tractés et trajets</span></div></div>';
    if (s.hist) h += '<div class="small muted">Historique 2024-2025 : ' + hm(s.hist) + " de tours, sans le détail ski ou wake (part de wake à indiquer dans Pratique). " + s.sessions + " session(s) au total.</div>";
    else if (s.histTot) h += '<div class="small muted">Dont historique 2024-2025 : ' + hm(s.histTot) + " de tours, comptés " + Math.round(s.histWake * 100) + " % en wake et " + Math.round((1 - s.histWake) * 100) + " % en ski (réglable dans Pratique). " + s.sessions + " session(s) au total.</div>";
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
    h += "</fieldset>";
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
  var noteForm = { cat: NOTE_CATS[0], auteur: "", photo: null, video: null, busy: false };
  /* Notes lues : liste des identifiants déjà vus sur ce téléphone (une note arrivée plus tard par la synchro reste « nouvelle »). */
  function notesLues() {
    var l = LS.get("notesLues", null);
    if (!l) { var seen = LS.get("notesVues", ""); l = notes.filter(function (n) { return seen && (n.date || "") <= seen; }).map(function (n) { return n.id; }); LS.set("notesLues", l); }
    return l;
  }
  function isUnread(n, lues) { return lues.indexOf(n.id) < 0 && (!CONF.moi || n.auteur !== CONF.moi); }
  function unreadNotes() { var l = notesLues(); return notes.filter(function (n) { return isUnread(n, l); }).length; }
  function markNotesRead() { LS.set("notesLues", notes.map(function (n) { return n.id; })); }
  var CAM_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>';
  var VID_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="12.5" height="11" rx="1.6"/><path d="M15.5 10.5l5.5-3v9l-5.5-3z"/></svg>';
  function fmtDateTime(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  function renderJournal() {
    if (!noteForm.auteur) noteForm.auteur = CONF.moi || "";
    var ppl = PEOPLE.filter(function (p) { return p.c !== "EXT" && !p.hidden; });
    var h = '<button class="btn link" data-go="accueil">← Retour à l’accueil</button>';
    h += '<div class="card"><h3>Nouvelle note</h3><div class="small muted">Le ' + fmtDateTime(nowIso()) + " (date et heure ajoutées automatiquement)</div>" +
      '<div class="two"><div class="field"><label for="nPar">Par</label><select id="nPar"><option value="">—</option>' + ppl.map(function (p) { return '<option value="' + p.id + '"' + (p.id === noteForm.auteur ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="nCat">Nature</label><select id="nCat">' + NOTE_CATS.map(function (c) { return "<option" + (c === noteForm.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label for="nTxt">Note' + (noteForm.cat === NOTE_CATS[NOTE_CATS.length - 1] ? " (à préciser)" : "") + '</label><textarea id="nTxt" rows="4" placeholder="Ce qui s’est passé, où, ce qu’il faut faire…">' + esc(noteForm.txt || "") + "</textarea></div>" +
      '<div class="note-media"><label class="btn ghost sm media-btn">' + CAM_ICON + (noteForm.photo ? "Reprendre la photo" : "Prendre une photo") + '<input type="file" accept="image/*" capture="environment" id="nPhoto" hidden></label>' +
      '<label class="btn ghost sm media-btn">' + VID_ICON + (noteForm.video ? "Changer la vidéo" : "Filmer une vidéo") + '<input type="file" accept="video/*" capture="environment" id="nVideo" hidden></label></div>' +
      (noteForm.photo ? '<div class="note-att"><img class="note-img" src="' + photoSrc(noteForm.photo) + '" alt="Photo jointe"><button class="btn link" data-nrm="photo">Retirer la photo</button></div>' : "") +
      (noteForm.video ? '<div class="note-att small">' + VID_ICON + " " + esc(noteForm.video.name) + " · " + sizeTxt(noteForm.video.size) + ' <button class="btn link" data-nrm="video">Retirer</button><div class="small muted">' + (CONF.url && CONF.code ? "La vidéo sera rangée dans Google Drive avec la note (15 Mo au plus, soit 20 à 30 secondes)." : "Connexion à la base partagée nécessaire pour envoyer une vidéo.") + "</div></div>" : "") +
      '<div class="actions"><button class="btn" id="noteSave"' + (noteForm.busy ? " disabled" : "") + ">" + (noteForm.busy ? "Envoi de la vidéo…" : "Enregistrer la note") + "</button></div></div>";
    h += '<div class="card"><h3>Historique des notes</h3>';
    if (!notes.length) h += '<div class="small muted">Aucune note pour l’instant.</div>';
    var lues = notesLues();
    notes.forEach(function (n) {
      var isNew = isUnread(n, lues);
      h += '<div class="note-row"><div class="note-h"><span class="note-tag ' + (NOTE_SEV[n.cat] || "") + '">' + esc(n.cat) + "</span>" + (isNew ? '<span class="note-new">nouvelle</span>' : "") + '<span class="small muted">' + fmtDateTime(n.date) + " · " + esc(n.auteurNom || "?") + "</span></div>" +
        (n.txt ? '<div class="note-txt">' + esc(n.txt).replace(/\n/g, "<br>") + "</div>" : "") +
        (photoSrc(n.photo) ? '<img class="note-img" src="' + photoSrc(n.photo) + '" alt="Photo jointe à la note" loading="lazy">' : "") +
        (n.video && n.video.url ? '<a class="note-vid" href="' + esc(n.video.url) + '" target="_blank" rel="noopener">' + VID_ICON + "Voir la vidéo</a>" : "") +
        (ui.noteDel === n.id
          ? '<div class="alert bad note-del"><b>Effacer cette note ?</b>Elle disparaîtra aussi des autres téléphones.<div class="actions"><button class="btn ghost sm" data-notedel="">Non</button><button class="btn stop sm" data-notedelok="' + esc(n.id) + '">Oui, effacer</button></div></div>'
          : '<button class="btn link note-x" data-notedel="' + esc(n.id) + '">Effacer</button>') + "</div>";
    });
    markNotesRead(); // ouvertes : la pastille de l'accueil disparaît
    return h + "</div>";
  }

  /* Annuaire urgence : numéros nationaux fixes, contacts du lac gardés dans la base partagée (SPEC.annuaire), modifiables */
  var URG_NAT = [["112", "Urgences (numéro européen)"], ["15", "SAMU"], ["18", "Pompiers"], ["17", "Police, gendarmerie"]];
  /* Sections : Propriétaires (numéros des fiches de Yann et Olivier) en tête, puis l'ordre choisi dans l'app (SPEC.annOrdre) */
  var OWN_G = "Propriétaires", ANN_ORDRE = [OWN_G, "Police du lac", "Sport Service Pitrot", "Association SNLG", "Camping"];
  /* Section « Propriétaire(s) » déjà saisie dans l'annuaire (quel que soit l'accord ou les accents) : c'est elle qui passe en tête, sans doublon */
  function annNorm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
  function annOwnSaisie(list) { for (var i = 0; i < list.length; i++) if (/^propri/.test(annNorm(list[i].g))) return list[i].g; return ""; }
  function annGroups(list) {
    var own = annOwnSaisie(list) || OWN_G, gs = [own]; list.forEach(function (c) { var g = c.g || "Autres"; if (gs.indexOf(g) < 0) gs.push(g); });
    var ord = (SPEC.annOrdre && SPEC.annOrdre.length ? SPEC.annOrdre : ANN_ORDRE), rk = function (g) { var i = ord.indexOf(g); if (i < 0 && g === own) i = ord.indexOf(OWN_G); return i < 0 ? 1000 + gs.indexOf(g) : i; };
    return gs.sort(function (a, b) { return rk(a) - rk(b); });
  }
  function renderAnnuaire() {
    var list = SPEC.annuaire || [], edit = ui.annEdit, h = '<button class="btn link" data-go="bateau">← Retour à Admin</button>';
    h += '<div class="card urg-nat"><h3>Numéros d’urgence</h3><div class="urg-grid">' + URG_NAT.map(function (u) { return '<a class="urg-big" href="tel:' + u[0] + '"><b>' + u[0] + "</b><span>" + u[1] + "</span></a>"; }).join("") + "</div></div>";
    var groups = annGroups(list);
    h += '<div class="card"><div class="row"><h3>Contacts du lac</h3><button class="btn link" id="annEdit">' + (edit ? "Terminé" : "Modifier") + "</button></div>";
    if (!list.length && !edit) h += '<div class="small muted">Aucun contact pour l’instant : touchez « Modifier » pour les saisir.</div>';
    if (edit) {
      h += '<div class="sub-h">Ordre des sections</div><div class="ann-order">' + groups.map(function (g, i) {
        return '<div class="ao-row"><span>' + esc(g) + '</span><button class="ao-b" data-annmv="' + i + '" data-dir="-1" aria-label="Monter ' + esc(g) + '"' + (i ? "" : " disabled") + '>▲</button><button class="ao-b" data-annmv="' + i + '" data-dir="1" aria-label="Descendre ' + esc(g) + '"' + (i < groups.length - 1 ? "" : " disabled") + ">▼</button></div>";
      }).join("") + "</div>";
      h += '<div class="sub-h">Contacts</div><div class="small muted">Groupe, nom, rôle et numéro. Les changements sont partagés avec la famille. Les numéros des propriétaires se saisissent dans leur fiche pilote.</div>';
      list.forEach(function (c, i) {
        h += '<div class="ann-edit"><input data-ann="' + i + '" data-ak="g" value="' + esc(c.g || "") + '" placeholder="Groupe (ex. Association SNLG)" aria-label="Groupe"><input data-ann="' + i + '" data-ak="n" value="' + esc(c.n || "") + '" placeholder="Nom" aria-label="Nom">' +
          '<input data-ann="' + i + '" data-ak="r" value="' + esc(c.r || "") + '" placeholder="Rôle" aria-label="Rôle"><input data-ann="' + i + '" data-ak="t" value="' + esc(c.t || "") + '" placeholder="Téléphone" inputmode="tel" aria-label="Téléphone"><button class="x" data-anndel="' + i + '" aria-label="Supprimer ce contact">×</button></div>';
      });
      h += '<button class="btn ghost sm" id="annAdd">+ Ajouter un contact</button>';
    } else {
      groups.forEach(function (g) {
        h += '<div class="ann-g">' + esc(g) + "</div>";
        if (g === OWN_G && !annOwnSaisie(list)) ["yann", "olivier"].forEach(function (id) { // numéros des fiches pilotes, seulement si aucune section Propriétaire n'a été saisie
          var p = person(id); if (!p) return;
          h += '<div class="ann-row ind"><span><b>' + esc(p.name) + '</b><span class="small muted"> · propriétaire</span></span>' +
            (p.tel ? '<a class="call" href="tel:' + telHref(p.tel) + '">' + PHONE_ICON + esc(p.tel) + "</a>" : '<button class="btn link small" data-pilotgo="' + id + '">numéro à saisir dans sa fiche</button>') + "</div>";
        });
        list.filter(function (c) { return (c.g || "Autres") === g; }).forEach(function (c) {
          h += '<div class="ann-row' + (c.n && c.n !== g ? " ind" : "") + '"><span><b>' + esc(c.n || g) + "</b>" + (c.r ? '<span class="small muted"> · ' + esc(c.r) + "</span>" : "") + "</span>" +
            (c.t ? '<a class="call" href="tel:' + telHref(c.t) + '">' + PHONE_ICON + esc(c.t) + "</a>" : '<span class="small muted">numéro à compléter</span>') + "</div>";
        });
      });
      if (ui.annNew) {
        var gNew = ui.annNewCat === "__new";
        h += '<div class="ann-new"><div class="sub-h">Nouveau numéro</div>' +
          '<div class="field"><label for="anGs">Section (facultatif)</label><select id="anGs"><option value="">— Aucune —</option>' + groups.filter(function (g) { return g !== "Autres" && g !== OWN_G; }).map(function (g) { return '<option value="' + esc(g) + '"' + (ui.annNewCat === g ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + '<option value="__new"' + (gNew ? " selected" : "") + ">+ Nouvelle section…</option></select></div>" +
          (gNew ? '<div class="field"><label for="anG">Nom de la nouvelle section</label><input id="anG" placeholder="ex. Dépannage, Ponton…" autocomplete="off"></div>' : "") +
          '<div class="two"><div class="field"><label for="anN">Nom</label><input id="anN" placeholder="ex. Yvan" autocomplete="off"></div><div class="field"><label for="anR">Fonction (facultatif)</label><input id="anR" placeholder="ex. moniteur" autocomplete="off"></div></div>' +
          '<div class="field"><label for="anT">Téléphone</label><input id="anT" inputmode="tel" placeholder="06 00 00 00 00" autocomplete="off"></div>' +
          '<div class="actions"><button class="btn ghost" id="annNewCancel">Annuler</button><button class="btn" id="annNewSave">Ajouter</button></div></div>';
      } else h += '<button class="btn ghost sm" id="annNewOpen" style="margin-top:10px">+ Ajouter un numéro</button>';
    }
    return h + "</div>";
  }

  /* Activité : le bilan en premier ; les dépenses s'ouvrent par un lien en bas de page. */
  function finBtnsHtml() { return '<div class="fin-btns"><button class="btn big" data-depnew="1"><span class="fb-ic" aria-hidden="true">' + QI.euro + '</span>Saisir une dépense</button><button class="btn big ghost" data-fin="balance"><span class="fb-ic" aria-hidden="true">' + QI.balance + '</span>Faire la balance</button></div>'; }
  function renderActivite() {
    if (finView === "dep") return '<button class="btn link" data-fin="bilan">← Retour à l’activité</button>' + renderDepenses();
    if (finView === "balance") return renderBalance();
    var B = balance();
    return finBtnsHtml() + renderBilan() +
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
  /* Logo « Noskids Chouillou » (v1.9.4) : dessin original, en SVG, mis en page à l'affichage (nkLayout) selon la police chargée.
     Bandeau Bateau : à la place de la photo et du titre. Accueil : au centre du bandeau, le logo Malibu en petit à gauche. */
  var NK_SVG = '<svg class="nk-logo" viewBox="0 0 360 104" role="img" aria-label="Noskids Chouillou"><defs>' +
    '<linearGradient id="nkW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".38" stop-color="#e6eef2"/><stop offset=".5" stop-color="#8fa6b1"/><stop offset=".56" stop-color="#f4f8fa"/><stop offset=".8" stop-color="#c3d3da"/><stop offset="1" stop-color="#7e97a3"/></linearGradient>' +
    '<linearGradient id="nkG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9f1dc"/><stop offset=".38" stop-color="#e2cd93"/><stop offset=".5" stop-color="#8d774a"/><stop offset=".56" stop-color="#efe3c1"/><stop offset=".8" stop-color="#cbb47a"/><stop offset="1" stop-color="#85704a"/></linearGradient>' +
    '<filter id="nkRel" x="-10%" y="-15%" width="125%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="bl"/><feSpecularLighting in="bl" surfaceScale="3" specularConstant=".9" specularExponent="18" lighting-color="#ffffff" result="sp"><fePointLight x="-60" y="-80" z="120"/></feSpecularLighting><feComposite in="sp" in2="SourceAlpha" operator="in" result="spc"/><feComposite in="SourceGraphic" in2="spc" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0" result="lit"/><feDropShadow in="lit" dx="1.6" dy="2.4" stdDeviation=".7" flood-color="#000" flood-opacity=".6"/></filter></defs>' +
    '<g transform="skewX(-8)"><path class="nk-n" d="M16 106 C37 94 57 71 64 56 L77 11 L108 12 L141 56 L172 15 L226 10 C205 22 185 45 178 60 L165 105 L134 105 L101 60 L70 105 Z" fill="url(#nkW)" stroke="#06161d" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke" filter="url(#nkRel)"/>' +
    '<text class="nk-tt" x="96" y="62" font-family="\'Racing Sans One\',\'Arial Black\',sans-serif" fill="url(#nkW)" stroke="#06161d" stroke-width="1.2" paint-order="stroke" filter="url(#nkRel)"><tspan font-size="42">O</tspan><tspan font-size="42" fill="url(#nkG)">S</tspan><tspan font-size="42" fill="url(#nkG)" dx="9">KI</tspan><tspan font-size="42">DS</tspan></text>' +
    '<path class="nk-trace" fill="none" stroke="#14b5c8" stroke-width="1.2" stroke-linecap="round" opacity=".85"/><g class="nk-buoys"></g><line class="nk-r1" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/><line class="nk-r2" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/><g class="nk-pal" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none"></g>' +
    '<text class="nk-ch" x="80" y="88" font-family="\'Racing Sans One\',\'Arial Black\',sans-serif" font-size="17" fill="#9fe7f0" letter-spacing="3">CHOUILLOU</text><g class="nk-boat"></g></g></svg>';
  function nkLayout(svg) {
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg", q = function (c) { return svg.querySelector("." + c); };
    // v1.9.6 : le N est un dessin (arrondi et pointu), posé droit dans le groupe incliné ; OSKIDS reste en police inclinée.
    // Positions « écran » (droites) converties en coordonnées du groupe incliné : x + tan(8°) × y.
    var t8 = Math.tan(8 * Math.PI / 180), gx = function (sx, y) { return sx + t8 * y; };
    // tracé du N : boîte 16..226 × 10..106 (unités du dessin), ramenée à 46 de haut
    var NX = 22, NY = 16, NSC = 46 / 96, NW = 210 * NSC, NH = 96 * NSC, base = NY + NH, top = NY;
    q("nk-n").setAttribute("transform", "translate(" + gx(NX, NY) + "," + NY + ") skewX(8) scale(" + NSC + ") translate(-16,-10)");
    var tt = q("nk-tt"), ch = q("nk-ch"); tt.setAttribute("x", gx(NX + (165 - 16) * NSC + 7, base)); tt.setAttribute("y", base); // O collé au pied droit du N
    var b = tt.getBBox(), x2 = b.x + b.width - 2;
    if (!b.width) return;
    ch.setAttribute("x", 0); var cw = ch.getComputedTextLength(), x0 = x2 - cw; ch.setAttribute("x", x0);
    var cb = ch.getBBox(), yr = cb.y + cb.height * 0.55;
    // slalom régulier : quatre bouées à intervalle égal, une en bas, une en haut, en alternance
    var BX = [0.13, 0.38, 0.63, 0.88].map(function (f) { return NX + NW * f; }), BY = [base - 3, top + 3, base - 3, top + 3];
    var B = BX.map(function (x, i) { return [gx(x, BY[i]), BY[i]]; }), o = 5, bz = q("nk-buoys"); bz.innerHTML = "";
    var L = gx(BX[0] - (BX[1] - BX[0]) + 26, (top + base) / 2);
    B.forEach(function (p) { var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", 3.2); c.setAttribute("fill", "#f0a46a"); c.setAttribute("opacity", ".85"); bz.appendChild(c); });
    var P = [[L - 26, (top + base) / 2], [B[0][0], base + o], [B[1][0], top - o], [B[2][0], base + o], [B[3][0], top - o]], d = "M" + P[0][0] + " " + P[0][1];
    for (var i = 0; i < P.length - 1; i++) { var k = Math.max(10, ((P[i + 1][0] - t8 * P[i + 1][1]) - (P[i][0] - t8 * P[i][1])) * 0.55); /* écart mesuré à l'écran : arcs identiques */ d += " C" + (P[i][0] + k) + " " + P[i][1] + " " + (P[i + 1][0] - k) + " " + P[i + 1][1] + " " + P[i + 1][0] + " " + P[i + 1][1]; }
    q("nk-trace").setAttribute("d", d);
    var pa = x0 - 26, r1 = q("nk-r1"), r2 = q("nk-r2"), bx = x2 + 26, by = yr + 4;
    r1.setAttribute("x1", pa + 6); r1.setAttribute("y1", yr); r1.setAttribute("x2", x0 - 5); r1.setAttribute("y2", yr);
    r2.setAttribute("x1", cb.x + cb.width + 5); r2.setAttribute("y1", yr); r2.setAttribute("x2", bx + 2.5); r2.setAttribute("y2", yr);
    q("nk-pal").innerHTML = '<line x1="' + pa + '" y1="' + (yr - 7) + '" x2="' + pa + '" y2="' + (yr + 7) + '"/><path d="M' + pa + " " + (yr - 6) + " L" + (pa + 6) + " " + yr + " L" + pa + " " + (yr + 6) + '"/>';
    var s = "";
    s+='<path d="M'+(bx+2)+' '+(by-6)+' L'+(bx+46)+' '+(by-7)+' Q'+(bx+66)+' '+(by-6.5)+' '+(bx+82)+' '+(by-4)+' L'+(bx+66)+' '+(by+2)+' Q'+(bx+32)+' '+(by+3.6)+' '+(bx+6)+' '+(by+3)+' L'+(bx+2)+' '+(by+1)+' Z" fill="#ffffff"/>';
    s+='<path d="M'+(bx-4)+' '+(by+1.4)+' L'+(bx+4)+' '+(by+1.4)+'" stroke="#d9e7ee" stroke-width="1.8" stroke-linecap="round"/>';
    s+='<path d="M'+(bx+6)+' '+(by-3)+' L'+(bx+58)+' '+(by-4.2)+' Q'+(bx+66)+' '+(by-4)+' '+(bx+72)+' '+(by-4.6)+' Q'+(bx+64)+' '+(by-2.2)+' '+(bx+56)+' '+(by-1.2)+' L'+(bx+8)+' '+(by-0.6)+' Z" fill="#3b5561"/>';
    s+='<path d="M'+(bx+10)+' '+(by+0.8)+' L'+(bx+54)+' '+(by+0.2)+'" stroke="#f4c542" stroke-width="1.2" stroke-linecap="round"/>';
    s+='<path d="M'+(bx+42)+' '+(by-7)+' L'+(bx+50)+' '+(by-12.5)+' L'+(bx+57)+' '+(by-12)+' L'+(bx+63)+' '+(by-6.4)+' Z" fill="#9fe7f0" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round"/>';
    s+='<path d="M'+(bx+19)+' '+(by-6.6)+' L'+(bx+28)+' '+(by-22)+' M'+(bx+25)+' '+(by-6.8)+' L'+(bx+34)+' '+(by-22)+'" stroke="#d9e7ee" stroke-width="2" stroke-linecap="round"/>';
    s+='<path d="M'+(bx+18)+' '+(by-23)+' Q'+(bx+20)+' '+(by-26.5)+' '+(bx+30)+' '+(by-26.5)+' L'+(bx+42)+' '+(by-26)+' Q'+(bx+46)+' '+(by-25.5)+' '+(bx+44)+' '+(by-22.5)+' L'+(bx+20)+' '+(by-22)+' Z" fill="#d9e7ee"/>';
    s+='<path d="M'+(bx-22)+' '+(by+7)+' Q'+(bx+30)+' '+(by+10)+' '+(bx+80)+' '+(by+5)+'" fill="none" stroke="#14b5c8" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>';
    q("nk-boat").innerHTML = s;
    svg.setAttribute("viewBox", "0 0 " + Math.max(360, bx + 86) + " 104");
  }
  var HEADS = {
    accueil: { t: "", v: '<span class="head-deco" aria-hidden="true">' + HEAD_DECO + '</span><span class="logo logo-sm img-logo" role="img" aria-label="Malibu"></span><span class="nk-wrap nk-home">' + NK_SVG + "</span>" },
    sortie: { t: "Session", v: '<span class="head-deco" aria-hidden="true">' + SES_DECO + "</span>", th: '<span class="thumb img-ski" aria-hidden="true"></span>' },
    essence: { t: "Essence", v: '<span class="head-deco" aria-hidden="true">' + ESS_DECO + '</span><span class="hv img-pump" aria-hidden="true"></span>' },
    activite: { t: "Activité", v: '<span class="head-deco" aria-hidden="true">' + ACT_DECO + '</span><span class="hv" style="background:#1f2a33;color:#d6dade" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/></svg></span>' },
    balance: { t: "Balance", v: '<span class="hv" style="background:#14532d;color:#cfeed3" aria-hidden="true">' + QI.balance + "</span>" },
    depenses: { t: "Dépenses", v: '<span class="hv" style="background:#14532d;color:#cfeed3;font:700 23px var(--f-body)" aria-hidden="true">€</span>' },
    pilotes: { t: "Pilotes", v: '<span class="hv" style="background:#3b2a00;color:#f6c445" aria-hidden="true">' + WHEEL_ICON + "</span>" },
    journal: { t: "Journal - Notes", v: '<span class="hv" style="background:#ffffff;color:#1e4d6b" aria-hidden="true">' + QI.journal + "</span>" },
    camp: { t: "Camping Les petits Pellegrins", v: '<span class="hv" style="background:#ffffff;color:#2f7d4f" aria-hidden="true">' + QI.camp + "</span>" },
    camphub: { t: "Camping Les petits Pellegrins", v: '<span class="hv" style="background:#ffffff;color:#2f7d4f" aria-hidden="true">' + QI.camp + "</span>" },
    campcap: { t: "Capacité du camp", v: '<span class="hv" style="background:#ffffff;color:#2f7d4f" aria-hidden="true">' + QI.camp + "</span>" },
    campagenda: { t: "Agenda du camp", v: '<span class="hv" style="background:#ffffff;color:#2f7d4f" aria-hidden="true">' + QI.camp + "</span>" },
    campedl: { t: "États des lieux", v: '<span class="hv" style="background:#ffffff;color:#2f7d4f" aria-hidden="true">' + QI.camp + "</span>" },
    meteo: { t: "Météo · Lacanau", v: '<span class="hv" style="background:#ffffff;color:#1d6fa5" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.4"/><path d="M9 2.5v1.6M2.5 9h1.6M4.4 4.4l1.1 1.1M13.6 4.4l-1.1 1.1"/><path d="M8 19h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 8 19z"/></svg></span>' },
    annuaire: { t: "Urgence - Dépannage", v: '<span class="hv urg-ic" aria-hidden="true">' + URG_ICON + "</span>" },
    bateau: { t: "", v: '<span class="nk-wrap">' + NK_SVG + "</span>" } // le logo suffit : pas de titre « Bateau »
  };
  function renderHead() {
    var key = tab === "activite" ? (finView === "dep" ? "depenses" : finView === "balance" ? "balance" : "activite") : tab, H = HEADS[key];
    document.getElementById("appHead").className = "app-head h-" + (key === "activite" ? "bilan" : key === "balance" ? "depenses" : key);
    document.getElementById("hVis").innerHTML = H.v || "";
    var nks = document.querySelector("#hVis .nk-logo"); if (nks) { nkLayout(nks); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { nkLayout(nks); }); }
    document.getElementById("hTitle").textContent = H.t;
    // Session sans chrono en cours : bouton « Saisie manuelle » en haut à droite, à la place de la vignette
    document.getElementById("hThumb").innerHTML = key === "sortie" && !sortie.active ? '<button class="hd-btn" id="manOpen" aria-pressed="' + !!view.manuel + '">Saisie manuelle</button>' : (H.th || "");
    var db = document.getElementById("demoBar"); if (db) db.hidden = !DEMO;
    document.body.classList.toggle("demo", DEMO);
  }
  function achatPreview() { var el = document.getElementById("aPL"); if (el) el.textContent = achatPLText(); }
  function goTab(t) { tab = t; screen.scrollTop = 0; render(); }
  var toastTimer;
  function toast(msg) { var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2800); }

  document.getElementById("appHead").addEventListener("click", function (e) {
    var b = e.target.closest("#manOpen"); if (!b) return;
    view.manuel = !view.manuel; if (view.manuel && !manForm) manForm = manNew(); screen.scrollTop = 0; render();
  });
  /* Mode démonstration : rien n'est enregistré ni envoyé ; en revenant en live, l'app recharge les vraies données. */
  var DEMO = false;
  function setDemo(on) {
    if (on === DEMO) return;
    if (on) { DEMO = true; toast("Mode démo : les saisies ne sont pas comptabilisées."); return render(); }
    toast("Retour en live : les saisies de démo sont effacées.");
    setTimeout(function () { location.reload(); }, 600); // DEMO reste vrai jusqu'au rechargement : rien de la démo n'est écrit
  }
  /* v2.0b : le bouton de retour à la page de lancement se tient à côté de Live / Démo */
  function demoTogHtml(cls) { return '<div class="dt-wrap ' + (cls || "") + '"><button class="dt-launch" data-launch="1" aria-label="Retour à la page de lancement" title="Page de lancement">' + LAUNCH_IC + "</button>" + demoTogIn() + "</div>"; }
  var LAUNCH_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>';
  function demoTogIn(cls) { return '<div class="demo-tog ' + (cls || "") + '" role="group" aria-label="Mode de saisie"><button data-demo="0" aria-pressed="' + !DEMO + '">Live</button><button data-demo="1" aria-pressed="' + DEMO + '">Démo</button></div>'; }
  document.getElementById("demoBar").addEventListener("click", function (e) { if (e.target.closest("button")) setDemo(false); });
  document.querySelector(".tabs").addEventListener("click", function (e) { var b = e.target.closest("button[data-tab]"); if (b) goTab(b.dataset.tab); });

  screen.addEventListener("click", function (e) {
    var tra = e.target.closest("tr[data-achf]");
    if (tra) { ui.achF = ui.achF === tra.dataset.achf ? "" : tra.dataset.achf; return render(); } // total des achats : détail par famille
    var trd = e.target.closest("tr[data-detk]");
    if (trd) { ui.detK = ui.detK === trd.dataset.detk ? "" : trd.dataset.detk; return render(); } // détail du coût : ouvrir / fermer un poste
    var tr = e.target.closest("tr[data-ses]");
    if (tr) { ui.sesOpen = ui.sesOpen === tr.dataset.ses ? "" : tr.dataset.ses; return render(); } // liste des sessions : ouvrir / fermer le détail
    var b = e.target.closest("button"); if (!b || b.disabled || b.matches(":disabled")) return;
    var ds = b.dataset, k, t;
    if (ds.resedit) { ui.resEdit = ui.resEdit === ds.resedit ? "" : ds.resedit; return render(); }
    if ((ds.rstar || ds.eau) && resInput(b)) return;
    if (ds.book) { cpUi.form = true; cpUi.del = ""; goTab("camp"); var cpf0 = document.getElementById("cpForm"); if (cpf0) cpf0.scrollIntoView({ block: "start" }); return; } // v2.0.1 : Réserver ouvre directement le formulaire
    if (ds.go) return goTab(ds.go);
    // v1.9.9 : camping « Les petits Pellegrins » (indépendant du bateau : aucune dépense)
    if (b.id === "dupClean") { if (!canValidate()) return toast("Réservé à Yann et Olivier."); if (!ui.dupAsk) { ui.dupAsk = true; return render(); } var dci = dupClean().ids; moves = moves.filter(function (m) { return dci.indexOf(m.id) < 0; }); ui.dupAsk = false; toast(dci.length + " mouvement(s) supprimé(s) de la base et de l’historique."); return render(); } // v2.0 : nettoyage
    // v2.0 : capacité (qui dort où) et états des lieux du camping
    if (ds.lit !== undefined) { cpUi.capSlot = cpUi.capSlot === ds.lit ? "" : ds.lit; return render(); }
    if (ds.litp) { if (!cpLits) cpLits = { id: "camplits", kind: "camplits", a: {} }; cpLits.a = cpLits.a || {}; if (ds.litp === "-") delete cpLits.a[cpUi.capSlot]; else cpLits.a[cpUi.capSlot] = ds.litp; cpUi.capSlot = ""; return render(); }
    if (b.id === "edlSave") {
      var et0 = document.getElementById("edlTxt"); edlForm.txt = et0 ? et0.value.trim() : edlForm.txt;
      if (!edlForm.txt && !edlForm.photo && !edlForm.video) return toast("Ajoutez une photo, une vidéo ou un commentaire.");
      var au0 = person(CONF.moi), erec = { id: "edl-" + uid(), kind: "edl", date: nowIso(), auteur: au0 ? au0.id : "", auteurNom: au0 ? au0.name : "", txt: edlForm.txt };
      if (edlForm.photo) erec.photo = edlForm.photo;
      var efin = function () { cpEdl.push(erec); edlForm = { txt: "", photo: null, video: null, busy: false }; toast("État des lieux enregistré."); render(); };
      // v2.0c : la vidéo part dans le dossier Drive des documents (comme celles du journal), l'état des lieux garde son lien
      var ev = edlForm.video;
      if (!ev || DEMO) return efin();
      if (!(CONF.url && CONF.code && navigator.onLine)) return toast("Pas de connexion : la vidéo ne peut pas partir. Retirez-la ou réessayez avec du réseau.");
      if (ev.size > 15 * 1048576) return toast("Vidéo trop lourde (15 Mo au plus) : filmez 20 à 30 secondes.");
      edlForm.busy = true; render(); toast("Envoi de la vidéo…");
      readB64(ev).then(function (b64) { return Sync.call({ action: "upload", name: "État des lieux " + todayIso() + " - " + ev.name, mime: ev.type || "video/mp4", data: b64, cat: "Camping - États des lieux", y: String(new Date().getFullYear()) }); })
        .then(function (res) { if (!res.ok) throw new Error(res.error || "erreur du serveur"); erec.video = { url: res.url, n: ev.name }; efin(); })
        .catch(function (er) { edlForm.busy = false; toast("Envoi de la vidéo impossible : " + ((er && er.message) || er)); render(); });
      return;
    }
    if (b.id === "edlVidRm") { edlForm.video = null; return render(); }
    if (ds.edldel) { if (!canValidate()) return toast("Réservé à Yann et Olivier."); if (ui.edlDel !== ds.edldel) { ui.edlDel = ds.edldel; return render(); } cpEdl = cpEdl.filter(function (x) { return x.id !== ds.edldel; }); ui.edlDel = ""; toast("État des lieux effacé."); return render(); }
    if (b.id === "cpBook") { cpUi.form = !cpUi.form; cpUi.del = ""; return render(); }
    if (b.id === "cpCancel") { cpUi.form = false; cpUi.sel = {}; cpUi.ext = ""; return render(); }
    if (ds.launch) return introShow(); // v2.0b : bouton à côté de Live / Démo
    if (b.id === "agShare") return agShare(); // v2.0b : image du planning à envoyer
    if (b.id === "agShClose") { ui.agImg = null; ui.agTxt = ""; return render(); }
    if (ds.cpm) { cpUi.m = +ds.cpm; return render(); }
    if (ds.cpp) { cpUi.sel[ds.cpp] = !cpUi.sel[ds.cpp]; return render(); }
    if (ds.cpl) { cpUi.lodges[ds.cpl] = !cpUi.lodges[ds.cpl]; return render(); } // plusieurs hébergements possibles
    if (ds.cpsh) { cpUi.share = ds.cpsh === "1"; return render(); }
    if (ds.cpcost) { cpUi.cost[ds.cpcost] = !cpUi.cost[ds.cpcost]; return render(); }
    if (ds.cpok) { var cpb = cpById(ds.cpok); if (cpb) { cpb.ok = !cpb.ok; toast(cpb.ok ? "Réservation confirmée." : "Confirmation retirée."); } return render(); }
    if (ds.cpdel) { if (!canValidate()) return toast("Réservé à Yann et Olivier."); if (cpUi.del !== ds.cpdel) { cpUi.del = ds.cpdel; return render(); } resas = resas.filter(function (x) { return x.id !== ds.cpdel; }); cpUi.del = ""; toast("Réservation supprimée."); return render(); }
    if (b.id === "cpTarEdit") { cpUi.tarEdit = true; return render(); }
    if (b.id === "cpTarCancel") { cpUi.tarEdit = false; return render(); }
    if (b.id === "cpTarSave") {
      if (!canValidate()) return toast("Réservé à Yann et Olivier.");
      var ta = parseNum(document.getElementById("cpTarAd").value), tk = parseNum(document.getElementById("cpTarKid").value);
      if (!(ta >= 0) || !(tk >= 0)) return toast("Indiquez les deux tarifs.");
      if (!cpTar) cpTar = { id: "camptarif", kind: "camptarif", t: {} };
      cpTar.t = cpTar.t || {}; cpTar.t[String(cpYear())] = { ad: ta, kid: tk };
      cpUi.tarEdit = false; toast("Tarifs " + cpYear() + " enregistrés."); return render();
    }
    if (b.id === "cpSave") {
      var cpx = document.getElementById("cpExt"); if (cpx) cpUi.ext = cpx.value;
      var cps = Object.keys(cpUi.sel).filter(function (k) { return cpUi.sel[k]; }), cpe = cpUi.ext.split(",").map(function (s) { return s.trim(); }).filter(Boolean), cpn = cpDi(cpUi.to) - cpDi(cpUi.from);
      var cpls = Object.keys(CP_LODGE).filter(function (k) { return cpUi.lodges[k]; });
      if (!cps.length && !cpe.length) return toast("Choisissez au moins une personne.");
      if (!cpls.length) return toast("Choisissez au moins un hébergement.");
      if (!(cpn > 0) || cpDi(cpUi.from) < 0 || cpDi(cpUi.to) > CP_N) return toast("Dates à vérifier : arrivée avant le départ, entre le 1er juin et le 31 août.");
      var cpf = cps.length ? cpFamId(cps[0]) : "EXT", cpfs = {}; cps.forEach(function (id) { cpfs[cpFamId(id)] = 1; }); if (cpe.length) cpfs.EXT = 1;
      var cpwho = Object.keys(cpfs).length === 1 && cpf !== "EXT" ? CP_FAMN[cpf] : (cps.length ? cpName(cps[0]) : cpe[0]);
      var me = person(CONF.moi);
      resas.push({ id: "resa-" + uid(), kind: "resa", date: nowIso(), who: cpwho, f: cpf, ppl: cps, ext: cpe, from: cpUi.from, to: cpUi.to, lodges: cpls, lodge: cpls[0], ok: false, share: cpUi.share, auteur: me ? me.id : "", auteurNom: me ? me.name : "" });
      cpUi.form = false; cpUi.sel = {}; cpUi.ext = ""; cpUi.share = true; cpUi.m = cpDt(cpDi(cpUi.from)).getUTCMonth(); toast("Réservation enregistrée."); return render();
    }
    if (ds.demo) return setDemo(ds.demo === "1");
    if (ds.essyear) { essYear = ds.essyear; return render(); }
    if (ds.qa) { // boutons d'accès direct de l'accueil
      if (ds.qa === "achat") { view.essence = "achat"; return goTab("essence"); }
      if (ds.qa === "mise") { if (!bidons.length) { toast("Aucun bidon en stock : notez d’abord un achat."); view.essence = null; return goTab("essence"); } view.essence = "mise"; return goTab("essence"); }
      if (ds.qa === "stats") { finView = "bilan"; return goTab("activite"); }
      if (ds.qa === "camp") return goTab("camp");
      if (ds.qa === "hist") {
        finView = "bilan"; var hy = latestYear() || String(new Date().getFullYear()); bilanYear = hy; ui["ses" + hy] = true; goTab("activite");
        var sc0 = document.querySelector('[data-coll="ses' + hy + '"]'); if (sc0) screen.scrollTop = sc0.closest(".card").offsetTop - 8;
        return;
      }
    }
    if (b.id === "engBtn") return engineToggle();
    if (b.id === "over8Ok") { ui.over8Ack = true; return render(); }
    if (b.id === "bigOpenBtn") { bigOpen = true; return updateBig(); }
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
    // saisie manuelle des sessions
    if (b.id === "manClose") { view.manuel = false; manForm = null; screen.scrollTop = 0; return render(); }
    if (ds.mpick) { manRead(); manForm.pick = manForm.pick === ds.mpick ? null : ds.mpick; return render(); }
    if (ds.maddp) { manRead(); var mp = person(ds.maddp); manForm.list.push({ pid: mp.id, role: "ski", act: "slalom", min: "", host: (manForm.pilote && person(manForm.pilote) && CATF[person(manForm.pilote).c]) || "YC" }); return render(); }
    if (b.id === "mNewp") {
      manRead(); var mi = document.getElementById("mNp"), mn = mi.value.trim(); if (!mn) { mi.focus(); return toast("Tapez le nom de la personne."); }
      var mnp = { id: "p" + (nextId++), name: mn, c: "EXT" }; PEOPLE.push(mnp); manForm.list.push({ pid: mnp.id, role: "ski", act: "slalom", min: "", host: "YC" }); manForm.pick = null; return render();
    }
    if (ds.mrm) { manRead(); manForm.list = manForm.list.filter(function (r) { return r.pid !== ds.mrm; }); if (manForm.pilote === ds.mrm) manForm.pilote = ""; return render(); }
    if (ds.mrole) { manRead(); manRow(ds.mrole).role = ds.v; return render(); }
    if (ds.mhost) { manRead(); manRow(ds.mhost).host = ds.v; return render(); }
    if (b.id === "manSave") { if (manSave()) { view.manuel = false; manForm = null; screen.scrollTop = 0; render(); } return; }
    if (b.id === "manSaveNext") { if (manSave()) { manForm = manNew(manForm); screen.scrollTop = 0; render(); } return; }
    if (b.id === "goStart") {
      if (!startList.length) return toast("Ajoutez au moins une personne à bord avec les boutons +.");
      var cd0 = parseNum(document.getElementById("cDeb").value); if (!cptConfirm("deb:" + cd0, cptStartCheck(cd0))) return;
      var now = Date.now();
      sortie = { active: true, closing: false, compteurDeb: parseNum(document.getElementById("cDeb").value), jaugeDeb: startJauge, compteurFin: null, jaugeFin: startJauge, plein: false, bidonsPlein: 1, pleinF: "YC",
        pilote: inListStart(startPilote) ? startPilote : startList[0].pid, engine: "on", engAcc: 0, engSince: now, startedAt: now, participants: startList, tours: [] };
      sortie.pleinF = famOf(participant(sortie.pilote)) || "YC";
      sortie.checks = startChecks; startChecks = {};
      startList = []; picker = null; save(1); render();
      screen.scrollTop = 0; window.scrollTo(0, 0); // session lancée : retour en haut, sur le chrono
      frameSparkle(); // v1.9.8 : le cadre de l'écran scintille
      return;
    }
    if (b.id === "goClose") { // en terminant : l'appareil photo s'ouvre tout de suite pour photographier le compteur
      stopEngine(); sortie.closing = true; sortie.compteurFin = null; view.cancelAsk = false; screen.scrollTop = 0; render();
      var cp = document.getElementById("cPhoto"); if (cp && !sortie.photoCompteur) cp.click();
      return;
    }
    if (b.id === "cancelAsk") { view.cancelAsk = true; return render(); }
    if (b.id === "cancelNo") { view.cancelAsk = false; return render(); }
    if (b.id === "cancelYes") { view.cancelAsk = false; sortie = { active: false, compteurDeb: lastCompteur(), tours: [], participants: [] }; toast("Session annulée : rien n’a été enregistré."); return render(); }
    if (ds.fin) { finView = ds.fin; if (ds.fin === "balance") balForm = null; return goTab("activite"); }
    if (ds.pilot !== undefined) { pilotSel = ds.pilot; screen.scrollTop = 0; return render(); }
    if (ds.pdel !== undefined) { docPending.splice(Number(ds.pdel), 1); return render(); }
    if (b.id === "pendCancel") { docPending = []; return render(); }
    if (b.id === "pendSend") { var items = docPending.slice(); docPending = []; addDocs(items); return; }
    if (ds.notedel !== undefined) { ui.noteDel = ds.notedel; return render(); }
    if (ds.notedelok) { notes = notes.filter(function (n) { return n.id !== ds.notedelok; }); ui.noteDel = ""; toast("Note effacée."); return render(); }
    if (b.id === "noteSave") {
      var nt = document.getElementById("nTxt").value.trim(), au = person(noteForm.auteur);
      noteForm.txt = nt;
      if (!au) { toast("Indiquez qui écrit la note."); return; }
      if (!nt && !noteForm.photo && noteForm.cat === NOTE_CATS[NOTE_CATS.length - 1]) { toast("Précisez la note dans la zone de saisie."); return; }
      var nrec = { id: "note-" + uid(), kind: "note", date: nowIso(), auteur: au.id, auteurNom: au.name, cat: noteForm.cat, txt: nt };
      if (noteForm.photo) nrec.photo = noteForm.photo;
      var nfin = function () {
        notes.unshift(nrec); LS.set("notesLues", notesLues().concat([nrec.id])); // pas de pastille sur le téléphone qui l'a écrite
        noteForm.photo = null; noteForm.video = null; noteForm.txt = ""; noteForm.busy = false;
        toast("Note enregistrée et partagée avec la famille."); render();
      };
      var vf = noteForm.video;
      if (!vf || DEMO) return nfin(); // en démo, la vidéo n'est pas envoyée
      if (!(CONF.url && CONF.code && navigator.onLine)) return toast("Pas de connexion : la vidéo ne peut pas partir. Retirez-la ou réessayez avec du réseau.");
      if (vf.size > 15 * 1048576) return toast("Vidéo trop lourde (15 Mo au plus) : filmez 20 à 30 secondes.");
      noteForm.busy = true; render(); toast("Envoi de la vidéo…");
      readB64(vf).then(function (b64) { return Sync.call({ action: "upload", name: "Note " + todayIso() + " - " + vf.name, mime: vf.type || "video/mp4", data: b64, cat: "Journal - Notes", y: String(new Date().getFullYear()) }); })
        .then(function (res) { if (!res.ok) throw new Error(res.error || "erreur du serveur"); nrec.video = { url: res.url, n: vf.name }; nfin(); })
        .catch(function (er) { noteForm.busy = false; toast("Envoi de la vidéo impossible : " + ((er && er.message) || er)); render(); });
      return;
    }
    if (ds.nrm) { var tx0 = document.getElementById("nTxt"); if (tx0) noteForm.txt = tx0.value; noteForm[ds.nrm] = null; return render(); }
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
    if (ds.annmv !== undefined) { var go = annGroups(SPEC.annuaire || []), ia = Number(ds.annmv), ib = ia + Number(ds.dir); if (ib >= 0 && ib < go.length) { var tg = go[ia]; go[ia] = go[ib]; go[ib] = tg; SPEC.annOrdre = go; } return render(); }
    if (ds.pilotgo) { pilotSel = ds.pilotgo; return goTab("pilotes"); }
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
    if (b.id === "purgeOpen") { if (!reserveOk()) return; view.purge = { scope: "depenses" }; return render(); }
    if (b.id === "purgeCancel") { view.purge = null; return render(); }
    if (ds.pscope) { view.purge.scope = ds.pscope; return render(); }
    if (b.id === "purgeGo") { if (!reserveOk()) return; return doPurge(); }
    if (b.id === "backClose") { sortie.closing = false; toast("Session reprise : moteur arrêté, redémarrez-le pour continuer."); return render(); }
    if (b.id === "tPlein") { sortie.plein = !sortie.plein; return render(); }
    if (ds.pleinf) { sortie.pleinF = ds.pleinf; return render(); }
    if (ds.cstep) { sortie.bidonsPlein = Math.max(0.5, Math.min(stockCans() || 0.5, sortie.bidonsPlein + Number(ds.cstep))); return render(); }
    if (b.id === "saveSortie") {
      var cf0 = document.getElementById("cFin"); if (cf0) sortie.compteurFin = parseNum(cf0.value);
      if (!cptConfirm("fin:" + sortie.compteurFin, cptEndCheck(sortie.compteurDeb, sortie.compteurFin, engineMs(Date.now()) / 60000))) return;
      if (sortie.engine === "on") { sortie.engAcc += Date.now() - sortie.engSince; sortie.engine = "off"; }
      var mins = Math.round(totalMs(Date.now()) / 60000), endC = sortie.compteurFin, msg = "Session enregistrée : " + mins + " min de tours.";
      var R = computeRecap(Date.now()), perPid = {};
      R.rows.forEach(function (x) { if (x.perso > 0.05) perPid[x.pid] = Math.round(x.perso * 10) / 10; });
      sessionsArr.push({ id: uid(), mode: "app", bateau: SPEC.devise, date: frToIso(todayFr()), heureDeb: new Date(sortie.startedAt).toTimeString().slice(0, 5), heureFin: new Date().toTimeString().slice(0, 5),
        compteurDeb: sortie.compteurDeb, compteurFin: sortie.compteurFin, jaugeDeb: sortie.jaugeDeb, jaugeFin: sortie.jaugeFin, plein: !!sortie.plein, pilote: sortie.pilote, photoCompteur: sortie.photoCompteur || null, checks: sortie.checks || {},
        engineMin: Math.round(R.eMin * 10) / 10, famMin: { YC: Math.round(R.b.YC * 10) / 10, OC: Math.round(R.b.OC * 10) / 10 }, factMin: { YC: Math.round(R.fact.YC), OC: Math.round(R.fact.OC) },
        minutes: perPid, commun: Math.round((R.libre + R.balade) * 10) / 10, meca: Math.round(R.meca * 10) / 10,
        participants: sortie.participants.map(function (p) { return { pid: p.pid, role: p.role, host: p.host, fact: p.fact }; }),
        tours: sortie.tours.map(function (t) { return { pid: t.pid, act: t.act, min: Math.round(tourMs(t, Date.now()) / 600) / 100, pauses: t.pauses, laps: t.laps, speed: t.speed, passes: t.passes, pilote: t.pilote, orig: t.orig, gps: gpsRes(t.gps), pg: t.pg && t.pg.length ? t.pg : undefined, res: t.res && (t.res.v || t.res.c || t.res.b != null || t.res.note) ? t.res : undefined }; }),
        eau: sortie.eau || undefined,
        vitesse: gpsRes(sortie.gps), vitesses: gpsBySkier(sortie.tours) });
      ["YC", "OC"].forEach(function (f) { var mn = Math.round(R.fact[f]); if (mn > 0) depenses.unshift({ id: uid(), d: todayFr(), lib: "Invités facturés (" + mn + " min)", cat: "Recette invités", m: -mn * SPEC.tarif, payeur: f, regle: f }); });
      if (sortie.plein && bidons.length) { applyPrelevement(planPrelevement(sortie.bidonsPlein, sortie.pleinF), sortie.pleinF, "pour le plein", true); lastPlein = todayFr(); msg = "Session et plein enregistrés."; }
      lastLevel = sortie.plein ? 16 : sortie.jaugeFin; lastLevelDate = todayFr();
      sortie = { active: false, compteurDeb: endC, tours: [], participants: [] }; save(3); toast(savedMsg(msg)); return render();
    }
    if (b.id === "gapCancel") { ui.gapf = false; return render(); }
    if (ds.grat) { gap.rat = ds.grat; return render(); }
    if (b.id === "gapSave") {
      var gpp = findGaps().filter(function (x) { return x.key === gap.key; })[0]; ui.gapf = false;
      if (!gpp) { toast("Ce trou a déjà été traité."); return render(); }
      if (gap.rat === "search") { gpp.from.gapRech = gpp.to.id; gap.rat = "auto"; toast(savedMsg("Trou noté « à rechercher ».")); return render(); }
      var c1 = parseNum(document.getElementById("gC1").value), c2 = parseNum(document.getElementById("gC2").value), mm = parseNum(document.getElementById("gM").value) || Math.round((c2 - c1) * 60), gf = gapFam(gpp.from), fm = { YC: Math.round(mm * gf.YC * 10) / 10, OC: Math.round(mm * gf.OC * 10) / 10 };
      gpp.from.gapOk = gpp.to.id; delete gpp.from.gapRech; gap.rat = "auto";
      sessionsArr.push({ id: uid(), mode: "rattrapage", gapKey: gpp.key, bateau: gpp.from.bateau || "", date: document.getElementById("gD").value || dkey(gpp.from), compteurDeb: c1, compteurFin: c2, engineMin: mm, famMin: fm, minutes: {}, commun: 0, meca: 0 });
      toast(savedMsg("Session rattrapée enregistrée.")); return render();
    }
    if (ds.ev === "achat" || ds.ev === "mise") { view.essence = ds.ev; return render(); }
    if (ds.ev === "cancel") { view.essence = null; achatForm.step = null; achatForm.f = ""; achatForm.verse = false; achatForm.L = 0; achatForm.P = 0; return render(); }
    if (ds.af) { achatForm.f = ds.af; return render(); }
    if (ds.mf) { miseForm.f = ds.mf; return render(); }
    if (ds.atog) { achatForm[ds.atog] = !achatForm[ds.atog]; return render(); }
    if (ds.mtog) { miseForm.plein = !miseForm.plein; b.setAttribute("aria-pressed", String(miseForm.plein)); return; }
    if (ds.astep) { achatForm.b = Math.max(1, Math.min(5, achatForm.b + Number(ds.astep))); return render(); }
    if (ds.mstep) { miseForm.n = Math.max(0.5, Math.min(stockCans(), miseForm.n + Number(ds.mstep))); return render(); }
    if (b.id === "saveAchat") {
      achatForm.L = parseNum(document.getElementById("aL").value); achatForm.P = parseNum(document.getElementById("aP").value);
      if (achatForm.L <= 0 || achatForm.P <= 0) return toast("Indiquez les litres et le prix."); if (!achatForm.f) return toast("Indiquez la famille qui a payé.");
      if (!bidons.length || achatForm.passe) return commitAchat();
      achatForm.step = "check"; achatForm.tfOpen = false; achatForm.tf = achatForm.f; achatForm.tn = Math.max(achatNeed(), 1); return render();
    }
    if (b.id === "achYes") { achatForm.tfOpen = true; return render(); }
    if (b.id === "achNo") return commitAchat();
    if (b.id === "achBack") { achatForm.step = null; return render(); }
    if (ds.tf) { achatForm.tf = ds.tf; return render(); }
    if (ds.tnstep) { achatForm.tn = Math.max(Math.max(achatNeed(), 1), Math.min(bidons.length, achatForm.tn + Number(ds.tnstep))); return render(); }
    if (b.id === "resetGo") {
      if (!ui.resetAsk) { ui.resetAsk = true; return render(); } // deuxième appui pour confirmer
      ui.resetAsk = false; var rn = bidons.length, rl = stockL();
      bidons = []; lastLevel = 0; lastLevelDate = "remise à zéro du " + todayFr(); startJauge = 0;
      moves.unshift({ type: "reset", at: stamp(), date: todayIso(), d: todayFr(), t: "Remise à zéro : réservoir vide, stock de bidons vidé", v: rn + " bidon(s) retiré(s) · " + int0.format(rl) + " L", who: (person(CONF.moi) || {}).name || "" });
      save(2); toast(savedMsg("Remise à zéro faite : réservoir vide, stock vidé.")); return render();
    }
    if (b.id === "corrOpen") { view.essence = "corr"; corrForm.sel = {}; corrForm.ach = ""; corrForm.motif = "erreur"; return render(); }
    if (ds.cach) { corrForm.ach = corrForm.ach === ds.cach ? "" : ds.cach; return render(); }
    if (b.id === "extSave") {
      var em = moves.filter(function (x) { return x.id === corrForm.ach && isAchat(x); })[0]; if (!em) return toast("Choisissez l’achat à extourner.");
      var eidx = extCans(em), ef = em.f === "OC" ? "OC" : "YC", eP = Number(em.prix) || 0, eL = Number(em.litres) || 0, eB = Number(em.bidons) || 0;
      bidons = bidons.filter(function (x, i) { return eidx.indexOf(i) < 0; });
      em.annule = todayFr(); // l'achat d'origine reste visible, marqué extourné, et ne compte plus
      moves.unshift({ type: "extourne", ref: em.id, at: stamp(), date: todayIso(), d: todayFr(), t: "Extourne d’un achat (saisie erronée ou en double)", v: "− " + eB + " bidon(s) · − " + int0.format(eL) + " L · − " + eur.format(eP), who: FAM[ef].n + " · achat du " + (em.d || isoToFr(em.date)) });
      depenses.unshift({ d: todayFr(), lib: "Extourne essence " + int0.format(eL) + " L (achat du " + (em.d || isoToFr(em.date)) + ", saisie erronée ou en double)", cat: "Essence", m: -eP, payeur: ef, regle: "payeur", isNew: true });
      view.essence = null; corrForm.ach = ""; save(2); toast(savedMsg("Achat extourné : dépense inverse créée" + (eidx.length ? ", " + eidx.length + " bidon(s) retiré(s) du stock." : "."))); return render();
    }
    if (ds.cpick) { corrForm.sel[ds.cpick] = !corrForm.sel[ds.cpick]; corrForm.qty = null; return render(); }
    if (ds.cunit) { corrForm.unit = ds.cunit; corrForm.qty = null; return render(); }
    if (ds.cqstep) { var nsel = corrSel().length, q0 = corrForm.qty != null ? corrForm.qty : nsel; corrForm.qty = Math.max(0.5, Math.min(nsel, q0 + Number(ds.cqstep))); return render(); }
    if (ds.cmotif) { corrForm.motif = ds.cmotif; corrForm.vf = ""; corrForm.vfL = null; return render(); }
    if (ds.cvf) { corrForm.vf = corrForm.vf === ds.cvf ? "" : ds.cvf; corrForm.vfL = null; return render(); }
    if (b.id === "vfSave") {
      var vm = moves.filter(function (x) { return x.id === corrForm.vf && x.type === "verse" && !x.annule; })[0]; if (!vm) return toast("Choisissez le versement à annuler.");
      var vL0 = Number(vm.litres) || 0, vi = document.getElementById("vfL"), vq = Math.max(0, Math.min(vL0, vi ? parseNum(vi.value) : vL0)); if (!(vq > 0)) return toast("Indiquez les litres à retirer.");
      var vk = vL0 > 0 ? (vL0 - vq) / vL0 : 0;
      ["YC", "OC"].forEach(function (f) { if (vm.paye) vm.paye[f] = Math.round((Number(vm.paye[f]) || 0) * vk * 100) / 100; });
      vm.cout = Math.round((Number(vm.cout) || 0) * vk * 100) / 100; vm.litres = Math.round((vL0 - vq) * 10) / 10;
      if (vm.litres <= 0.05) vm.annule = todayFr(); else vm.corrige = todayFr();
      moves.unshift({ type: "vfictif", ref: vm.id, at: stamp(), date: todayIso(), d: todayFr(), t: "Versement fictif annulé", v: "− " + int0.format(vq) + " L", who: "versement du " + (vm.d || isoToFr(vm.date)) });
      view.essence = null; corrForm.vf = ""; corrForm.vfL = null; save(2); toast(savedMsg("Versement corrigé : " + int0.format(vq) + " L retirés de la balance essence.")); return render();
    }
    if (ds.cusage) { corrForm.usage = ds.cusage; return render(); }
    if (ds.caff) { corrForm.aff = ds.caff; return render(); }
    if (b.id === "corrSave") {
      var sel = corrSel(); if (!sel.length) return toast("Touchez les bidons à retirer du stock.");
      var cq = document.getElementById("cQty"); if (cq) corrForm.qty = Math.max(0, parseNum(cq.value));
      var tk = corrTakes(sel); if (!tk.length) return toast("Indiquez la quantité retirée du stock.");
      var eff = corrEffects(tk), lab = corrForm.motif === "autre" ? corrForm.usage.toLowerCase() : corrForm.motif, nC = 0;
      eff.lines.forEach(function (l) { l.d = todayFr(); l.isNew = true; depenses.unshift(l); });
      eff.red.forEach(function (r) { // autre usage : l'achat d'origine est réduit (dépense et mouvement) ; à zéro, la dépense sort de la liste
        var nm = Math.round((Number(r.dep.m) - r.g.E) * 100) / 100, note = dec1.format(r.g.L) + " L sortis le " + todayFr() + " (" + lab + ")";
        if (nm < 0.005) depenses = depenses.filter(function (x) { return x !== r.dep; }); else { r.dep.m = nm; r.dep.lib = r.dep.lib + " · " + note; }
        if (r.mv) { r.mv.litres = Math.max(0, Math.round((Number(r.mv.litres) - r.g.L) * 10) / 10); r.mv.prix = Math.max(0, Math.round((Number(r.mv.prix) - r.g.E) * 100) / 100); r.mv.cout = r.mv.prix; r.mv.v = (r.mv.bidons || "?") + " bidon(s) · " + int0.format(r.mv.litres) + " L · " + eur.format(r.mv.prix) + " (après sortie)"; r.mv.retire = (r.mv.retire ? r.mv.retire + " ; " : "") + note; }
      });
      eff.dettes.forEach(function (d) { dettes.push(d); });
      tk.forEach(function (t) { var b0 = bidons[t.i], c0 = Number(b0.cap) || SPEC.bidon; nC += t.litres >= b0.litres - 0.01 ? Math.ceil(b0.litres / c0 * 2 - 0.02) / 2 : Math.round(t.litres / c0 * 2) / 2; b0.litres -= t.litres; });
      bidons = bidons.filter(function (x) { return x.litres > 0.01; });
      if (corrForm.unit === "litres") nC = 0; // retrait en litres : on l'indique en litres seulement
      moves.unshift({ d: todayFr(), t: "Correction du stock (" + lab + ")", v: (nC ? half(nC) + " bidon(s) · " : "") + dec1.format(eff.lit) + " L", who: person(corrForm.who).name + " · " + (corrForm.aff === "5050" ? "commun" : FAM[corrForm.aff].s) });
      view.essence = null; corrForm.sel = {}; corrForm.qty = null; save(2); toast(savedMsg(corrForm.motif === "autre" ? "Correction enregistrée : l’essence sort des dépenses du bateau." : "Correction du stock enregistrée.")); return render();
    }
    if (b.id === "achBoth") {
      var pl = planPrelevement(achatForm.tn, achatForm.tf), left = cansAfter(pl);
      if (left + achatForm.b > 5) return toast("Il resterait " + left + " bidon(s) plein(s) : impossible d’en remplir " + achatForm.b + " de plus. Augmentez le nombre de bidons versés.");
      applyPrelevement(pl, achatForm.tf, "oublié, noté à l’achat", false); return commitAchat();
    }
    if (b.id === "saveMise") { var mp0 = planPrelevement(miseForm.n, miseForm.f); if (mp0.manque > 0.01) return toast("Il n’y a que " + half(stockCans()) + " bidon(s) en stock : impossible d’en verser " + half(miseForm.n) + "."); applyPrelevement(planPrelevement(miseForm.n, miseForm.f), miseForm.f, "", miseForm.plein); if (miseForm.plein) lastPlein = todayFr(); view.essence = null; save(1); toast(savedMsg("Versement enregistré.")); return render(); }
    if (b.id === "dNew") { view.dep = true; return render(); }
    if (ds.bip) { balForm = balForm || {}; balForm.payeur = ds.bip; return render(); }
    // v1.9.6 : règlement des dépenses communes (montant, date, motif, qui a payé qui)
    if (b.id === "reglOpen") { var rb0 = balance(), rv0 = (rb0.net.YC - rb0.net.OC) / 2; reglForm = { p: rv0 >= 0 ? "OC" : "YC", m: Math.round(Math.abs(rv0) * 100) / 100, d: todayIso(), l: "Équilibrage des dépenses communes" }; return render(); }
    if (b.id === "reglCancel") { reglForm = null; return render(); }
    if (ds.reglp) { reglForm.m = parseNum(document.getElementById("rgM").value); reglForm.d = document.getElementById("rgD").value || todayIso(); reglForm.l = document.getElementById("rgL").value; reglForm.p = ds.reglp; return render(); }
    if (b.id === "reglSave") {
      if (!canValidate()) return toast("Réservé à Yann et Olivier.");
      var rgm = Math.round(parseNum(document.getElementById("rgM").value) * 100) / 100, rgd = document.getElementById("rgD").value || todayIso(), rgl = (document.getElementById("rgL").value || "").trim() || "Équilibrage des dépenses communes";
      if (!(rgm > 0)) return toast("Indiquez le montant réglé.");
      var rgp = reglForm.p;
      depenses.unshift({ id: uid(), d: isoToFr(rgd), lib: rgl + " (" + FAM[rgp].s + " → " + FAM[rgp === "OC" ? "YC" : "OC"].s + ")", cat: REGL, m: rgm, payeur: rgp, regle: "regl", isNew: true });
      reglForm = null; save(1); toast(savedMsg("Règlement de " + eur.format(rgm) + " enregistré.")); return render();
    }
    if (ds.baldir) { var ba0 = document.getElementById("balAmt"); if (ba0) ui.balAmt = Math.max(0, parseNum(ba0.value)); ui.balDir = ds.baldir; return render(); }
    if (b.id === "balReset") { ui.balAmt = null; ui.balDir = ""; return render(); }
    if (b.id === "balValider") {
      if (!reserveOk()) return;
      var RB = computeBalEss(), ai = document.getElementById("balAmt"), amt = Math.round(Math.max(0, ai ? parseNum(ai.value) : RB.amount) * 100) / 100, dir = ui.balDir || RB.from;
      var fin = RB.ready ? RB.end : stamp(), nS = RB.S.length, adj = Math.abs(amt - RB.amount) > 0.005 || dir !== RB.from;
      // écriture d'équilibrage : comptée dans la balance des comptes (dette déjà intégrée, pas de virement séparé)
      dettes.push({ id: uid(), kind: "essence", v: 2, from: dir, to: dir === "OC" ? "YC" : "OC", eur: amt, calc: RB.amount, calcFrom: RB.from, d: todayFr(), date: todayIso(), debut: RB.start, fin: fin, regle: true,
        note: "Équilibrage essence du " + keyFr(RB.start) + " au " + (RB.ready ? keyFr(RB.end) : todayFr()) + " (" + nS + " session" + (nS > 1 ? "s" : "") + ", " + dec1.format(RB.litres) + " L" + (adj ? ", calculé " + eur.format(RB.amount) + ", ajusté" : "") + ")",
        detail: { reste: RB.reste, litres: Math.round(RB.litres * 10) / 10, cout: Math.round(RB.cout * 100) / 100, yForO: Math.round(RB.yForO * 100) / 100, oForY: Math.round(RB.oForY * 100) / 100 } });
      ui.balAmt = null; ui.balDir = ""; save(1); toast(savedMsg("Équilibrage validé : " + (amt >= 0.5 ? FAM[dir].s + " doit " + eur.format(amt) + " à " + FAM[dir === "OC" ? "YC" : "OC"].s + ", ajouté à la balance des comptes." : "rien à ajouter."))); return render();
    }
    if (ds.balregle) {
      if (!reserveOk()) return;
      var dr = dettes.filter(function (x) { return x.id === ds.balregle; })[0]; if (!dr) return;
      depenses.unshift({ id: uid(), d: todayFr(), lib: "Virement balance essence (" + FAM[dr.from].s + " → " + FAM[dr.to].s + ")", cat: REGL, m: Number(dr.eur), payeur: dr.from, regle: "regl", isNew: true });
      dr.regle = true; save(1); toast(savedMsg("Virement noté dans les dépenses.")); return render();
    }
    if (ds.depnew) { finView = "dep"; view.dep = true; return goTab("activite"); }
    if (b.id === "dCancel") { view.dep = false; return render(); }
    if (ds.dpay) { depForm.payeur = ds.dpay; return render(); }
    if (ds.r) { depForm.regle = ds.r; return render(); }
    if (b.id === "dSave") { var m = parseNum(document.getElementById("dM").value); if (!m) return toast("Indiquez un montant."); if (depForm.cat === "Essence") return toast("L’essence se saisit dans l’onglet Essence (achat de bidons), pour que la balance reste juste."); depenses.unshift({ d: todayFr(), lib: document.getElementById("dLib").value || "Dépense", cat: depForm.cat, m: m, payeur: depForm.payeur, regle: depForm.regle, pct: depForm.pct, isNew: true }); view.dep = false; save(1); toast(savedMsg("Dépense enregistrée.")); return render(); }
    if (ds.year) { bilanYear = ds.year; bilanYearUser = true; return render(); }
    if (ds.boat) { bilanBoat = ds.boat; bilanYearUser = false; return render(); }
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
    if (el.id === "cpExt") { cpUi.ext = el.value; return; } // v2.0 : camping, saisie libre sans redessiner
    if (el.id === "edlTxt") { edlForm.txt = el.value; return; } // v2.0 : état des lieux, sans redessiner
    if (el.id === "cQty") { corrForm.qty = Math.max(0, parseNum(el.value)); var ce = document.getElementById("corrEff"), cs = document.getElementById("corrSave"), tk0 = corrTakes(corrSel()); if (ce) ce.innerHTML = corrEffText(tk0); if (cs) cs.disabled = !tk0.length; return; } // litres retirés du stock (correction)
    if (el.dataset.f && el.tagName === "INPUT") { findTour(Number(el.dataset.id))[el.dataset.f] = el.value.replace(/\D/g, ""); return; }
    if (el.dataset.spec) { var key = el.dataset.spec; SPEC[key] = el.classList.contains("txt") ? el.value : parseNum(el.value); return; }
    if (el.id === "cDeb") { sortie.compteurDeb = parseNum(el.value); sortie.debEdited = true; var wd = document.getElementById("cDebWarn"); if (wd) wd.innerHTML = startWarnHtml(parseNum(el.value)); return; }
    if (el.id === "balAmt") { ui.balAmt = Math.max(0, parseNum(el.value)); var be0 = document.getElementById("balEff"), Rb = computeBalEss(); if (be0) be0.innerHTML = balEffHtml(Rb, ui.balAmt, ui.balDir || Rb.from); var rs0 = document.getElementById("balReset"); if (!rs0) { var bx = el.parentNode; bx.insertAdjacentHTML("beforeend", '<button class="btn link" id="balReset">Revenir au calcul (' + eur.format(Rb.amount) + ")</button>"); } return; }
    if (el.closest && el.closest(".man-form") && el.tagName === "INPUT") { manRead(); var ms = document.getElementById("mSum"); if (ms) ms.innerHTML = manSumHtml(); return; }
    if (el.id === "cFin") { sortie.compteurFin = parseNum(el.value); document.getElementById("recapCard").innerHTML = recapHtml(Date.now()); }
    if (el.id === "dM" || el.id === "dPct") depPreview();
    if (el.id === "aL" || el.id === "aP") { achatForm[el.id === "aL" ? "L" : "P"] = parseNum(el.value); achatPreview(); }
  });
  screen.addEventListener("change", function (e) {
    var el = e.target;
    if (el.id === "edlVideo" && el.files && el.files[0]) { var et1 = document.getElementById("edlTxt"); if (et1) edlForm.txt = et1.value; edlForm.video = el.files[0]; return render(); } // v2.0c
    if (el.id === "edlPhoto" && el.files && el.files[0]) { edlForm.busy = true; render(); shrinkMeter(el.files[0]).then(function (ph) { edlForm.photo = ph; edlForm.busy = false; render(); }).catch(function () { edlForm.busy = false; toast("Photo illisible."); render(); }); return; } // v2.0 : état des lieux
    if (el.id === "cpExt") { cpUi.ext = el.value; return render(); } // v2.0 : camping, autres personnes
    if (el.id === "cpFrom" || el.id === "cpTo") { cpUi[el.id === "cpFrom" ? "from" : "to"] = el.value; if (el.id === "cpFrom" && cpUi.to <= el.value) { var nd = cpDi(el.value) + 7; cpUi.to = cpIso(Math.min(nd, CP_N)); } return render(); } // v1.9.9 : camping
    if (el.dataset.res && resInput(el)) return;
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
    if ((el.id === "nPhoto" || el.id === "nVideo") && el.files && el.files[0]) {
      var tx1 = document.getElementById("nTxt"); if (tx1) noteForm.txt = tx1.value;
      if (el.id === "nVideo") { noteForm.video = el.files[0]; return render(); }
      shrinkMeter(el.files[0]).then(function (ph) { noteForm.photo = ph; render(); }).catch(function (er) { toast(er.message); });
      return;
    }
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
    if (el.id === "balAmt") { ui.balAmt = Math.max(0, parseNum(el.value)); var be = document.getElementById("balEff"); if (be) be.innerHTML = balEffHtml(computeBalEss(), ui.balAmt, ui.balDir || computeBalEss().from); return; }
    if (el.id === "biL" || el.id === "biP") { balForm = balForm || {}; balForm[el.id === "biL" ? "litres" : "prixL"] = parseNum(el.value); return render(); }
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
      if (!reserveOk()) { el.value = ""; return; }
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
    var rd = screen.querySelector('[data-gread="' + key + '"]'); if (rd) rd.innerHTML = gaugeRead(v, key === "start");
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
    startJauge = lastLevel; // la jauge de départ part du niveau estimé (réservoir vide après l'hivernage)
  })();
  if (CONF.moi) { startPilote = CONF.moi; corrForm.who = CONF.moi; }
  if (!CONF.url || !CONF.code) annCampAdd(); // v2.0 : appli non connectée, pas d'annuaire partagé à écraser
  /* ---------- Écran d'ouverture (v1.9.8) : logo en plein écran, bouton « Entrer » ----------
     Au toucher : moteur V8 (son fabriqué par le code, aucun fichier), demande du GPS (un vrai geste de l'utilisateur,
     sinon le téléphone peut bloquer la question en silence), le bateau du logo traverse l'Accueil, l'appli s'ouvre aussitôt. */
  var AC = null, V8BUF = null;
  function v8Buffer(c) {
    if (V8BUF) return V8BUF;
    var sr = 24000, dur = 3.4, n = Math.floor(sr * dur), buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0), TAU = 6.2832;
    var R = [[0, 0], [0.06, 260], [0.38, 300], [0.5, 1000], [0.62, 900], [0.98, 5400], [1.12, 5000], [1.7, 1250], [2.2, 820], [3.4, 800]]; // démarreur, coup de gaz, ralenti
    function rpm(t) { for (var i = 1; i < R.length; i++) if (t <= R[i][0]) { var a = R[i - 1], b = R[i], k = (t - a[0]) / (b[0] - a[0]); k = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * k; } return R[R.length - 1][1]; }
    // V8 « croisé » : explosions d'intensité irrégulière (le gargouillis typique), 4 par tour de vilebrequin
    var pat = [1, 0.58, 0.92, 0.5, 0.97, 0.66, 0.8, 0.55], ph = 0, cyl = 0, P = [], kn = Math.exp(-1 / (0.0018 * sr));
    for (var i = 0; i < n; i++) {
      var t = i / sr, r = rpm(t), crank = t < 0.46;
      ph += (r / 60) * 4 / sr;
      if (ph >= 1) {
        ph -= 1;
        var dd = crank ? 0.018 : Math.max(0.0045, 0.016 - r / 450000), fq = 62 + Math.random() * 18 + r / 70;
        P.push({ e: (crank ? 0.28 : 1) * pat[cyl % 8] * (0.85 + Math.random() * 0.3), k: Math.exp(-1 / (dd * sr)), en: 1, w: TAU * fq / sr, p: 0 });
        cyl++;
      }
      var s = 0;
      for (var j = P.length - 1; j >= 0; j--) {
        var q = P[j];
        s += q.e * (Math.sin(q.p) + 0.45 * Math.sin(q.p * 2.03) + (Math.random() * 2 - 1) * 0.5 * q.en);
        q.p += q.w; q.e *= q.k; q.en *= kn; if (q.e < 0.003) P.splice(j, 1);
      }
      if (crank) s += 0.1 * Math.sin(TAU * (38 + t * 30) * t) * (0.55 + 0.45 * Math.sin(TAU * 11 * t)); // démarreur
      var env = t < 0.02 ? t / 0.02 : t > 2.9 ? Math.max(0, (3.4 - t) / 0.5) : 1;
      d[i] = s * env * 0.42;
    }
    return (V8BUF = buf);
  }
  /* v2.0c : chant de cigales (fabriqué par le code, aucun fichier) au toucher de « Réservation camping », environ 3,5 s.
     Trois cigales : un sifflement aigu haché par des pulsations rapides, qui gonfle puis s'éteint. */
  var CIGBUF = null;
  function cigBuffer(c) {
    if (CIGBUF) return CIGBUF;
    var sr = c.sampleRate, dur = 3.6, n = Math.floor(sr * dur), buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0), TAU = 6.2832;
    var V = [{ f: 5200, pr: 52, tr: 2.6, a: 1, del: 0 }, { f: 6100, pr: 61, tr: 3.4, a: 0.7, del: 0.35 }, { f: 4700, pr: 46, tr: 1.9, a: 0.55, del: 0.8 }];
    for (var i = 0; i < n; i++) {
      var t = i / sr, s = 0, fade = t > dur - 0.9 ? Math.max(0, (dur - t) / 0.9) : 1;
      for (var k = 0; k < V.length; k++) {
        var v = V[k], tt = t - v.del; if (tt < 0) continue;
        var env = Math.min(1, tt / 0.5) * fade, trem = Math.pow(0.5 + 0.5 * Math.sin(TAU * v.tr * tt), 1.5), pulse = Math.pow(0.5 + 0.5 * Math.sin(TAU * v.pr * tt), 6);
        s += v.a * env * (0.35 + 0.65 * trem) * pulse * (Math.sin(TAU * v.f * tt + 3 * Math.sin(TAU * 230 * tt)) + 0.6 * (Math.random() * 2 - 1));
      }
      d[i] = s * 0.3;
    }
    return (CIGBUF = buf);
  }
  function cigales() {
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    var c = AC; if (c.state === "suspended" && c.resume) c.resume();
    var src = c.createBufferSource(); src.buffer = cigBuffer(c);
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5300; bp.Q.value = 1.1;
    var out = c.createGain(); out.gain.value = 0.5;
    src.connect(bp); bp.connect(out); out.connect(c.destination); src.start();
  }
  function vroom() {
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    var c = AC; if (c.state === "suspended" && c.resume) c.resume();
    var src = c.createBufferSource(); src.buffer = v8Buffer(c);
    // échappement : saturation douce, résonance du pot (retard court réinjecté), graves renforcés, aigus coupés
    var sh = c.createWaveShaper(), cv = new Float32Array(2048); for (var i = 0; i < 2048; i++) { var x = i / 1024 - 1; cv[i] = Math.tanh(x * 2.2); } sh.curve = cv;
    var dl = c.createDelay(0.05), fb = c.createGain(), fbl = c.createBiquadFilter(); dl.delayTime.value = 0.0042; fb.gain.value = 0.38; fbl.type = "lowpass"; fbl.frequency.value = 900;
    var bass = c.createBiquadFilter(); bass.type = "peaking"; bass.frequency.value = 95; bass.Q.value = 0.9; bass.gain.value = 7;
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = 0.5;
    var hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 28;
    var out = c.createGain(); out.gain.value = 0.9;
    src.connect(sh); sh.connect(bass); bass.connect(dl); dl.connect(fbl); fbl.connect(fb); fb.connect(dl);
    bass.connect(lp); dl.connect(lp); lp.connect(hp); hp.connect(out); out.connect(c.destination);
    src.start();
  }
  function introShow() {
    var old = document.getElementById("introV"); if (old) old.remove();
    var src = document.querySelector("#hVis .nk-logo"), tmpL = null;
    if (!src) { // v2.0 : page sans le logo dans l'en-tête (espace camping) : on le dessine à part, hors de l'écran
      tmpL = document.createElement("span"); tmpL.className = "nk-wrap"; tmpL.style.cssText = "position:fixed;left:-9999px;top:0"; tmpL.innerHTML = NK_SVG; document.body.appendChild(tmpL);
      src = tmpL.querySelector(".nk-logo"); try { nkLayout(src); } catch (e) { /* police pas encore prête */ }
    }
    var v = document.createElement("div"); v.id = "introV";
    v.innerHTML = '<div class="iv-ski" aria-hidden="true"><svg class="iv-waves" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 60 Q50 40 100 60 T200 60 T300 60 T400 60 V120 H0Z" fill="#14b5c8" opacity=".18"/>' +
      '<path d="M0 78 Q50 62 100 78 T200 78 T300 78 T400 78 V120 H0Z" fill="#0f6f86" opacity=".35"/>' +
      '<path d="M0 96 Q50 84 100 96 T200 96 T300 96 T400 96 V120 H0Z" fill="#0a3a48" opacity=".7"/></svg></div>' + /* v2.0b : zone ski nautique délimitée, coins arrondis */
      // v2.0 : le premier tiers de l'écran ouvre l'espace camping ; le reste reste la partie ski nautique
      '<div class="iv-camp"><button class="iv-campbtn" id="ivCamp">' + CP_ICON.tent + '<span><b>Réservation camping</b><small>Les petits Pellegrins</small></span></button></div>' +
      '<div class="iv-logo"></div><button class="iv-start rbtn-red" aria-label="Entrer dans l’application">Entrer</button><div class="iv-hint">Touchez Entrer pour démarrer le moteur</div>';
    var logo = src.cloneNode(true); logo.removeAttribute("class"); if (tmpL) tmpL.remove();
    v.querySelector(".iv-logo").appendChild(logo); v.querySelector(".iv-logo").insertAdjacentHTML("beforeend", '<span class="iv-shine"></span>');
    document.body.appendChild(v);
    requestAnimationFrame(function () { v.classList.add("in"); });
    var tr = logo.querySelector(".nk-trace"); if (tr && tr.getTotalLength) tr.style.setProperty("--len", Math.ceil(tr.getTotalLength()) + "px");
    [].forEach.call(logo.querySelectorAll(".nk-buoys circle"), function (c, i) { c.style.animationDelay = (1.35 + i * 0.2) + "s"; });
    // le son est préparé pendant que le logo arrive : au toucher d'« Entrer », il part sans délai
    setTimeout(function () { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); v8Buffer(AC); cigBuffer(AC); } catch (e) { /* son indisponible */ } }, 1500);
    function go() {
      if (v.classList.contains("go")) return finish();
      v.classList.add("go"); vroom(); gpsAsk(); boatCross();
      if (/^camp/.test(tab)) goTab("accueil"); // v2.0 : « Entrer » mène toujours au ski nautique
      var lb = v.querySelector(".nk-boat"); if (lb) lb.style.visibility = "hidden"; // le bateau du logo part : c'est lui qui traverse l'Accueil
      setTimeout(finish, 120); // ouverture instantanée : le moteur continue de tourner sur l'Accueil
    }
    function finish() { if (v.classList.contains("out")) return; v.classList.add("out"); setTimeout(function () { v.remove(); }, 320); }
    v.querySelector(".iv-start").addEventListener("click", function (e) { e.stopPropagation(); go(); });
    v.querySelector("#ivCamp").addEventListener("click", function (e) { e.stopPropagation(); cigales(); finish(); goTab("camphub"); }); // espace camping : cigales, sans moteur ni GPS
    v.addEventListener("click", function () { if (v.classList.contains("go")) finish(); });
  }
  /* Le bateau du logo traverse l'Accueil, à la même taille et à la même hauteur que sur l'écran d'ouverture, écume derrière. */
  function boatCross() {
    var o = document.getElementById("boatX"); if (o) o.remove();
    var b = document.createElement("div"); b.id = "boatX";
    b.innerHTML = '<svg viewBox="-250 -34 340 72" aria-hidden="true"><g transform="skewX(-8)"><defs><linearGradient id="bxF" x1="1" x2="0"><stop offset="0" stop-color="#7fdcea" stop-opacity=".95"/><stop offset="1" stop-color="#7fdcea" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M88 -7 Q-60 -13 -250 -9 L-250 13 Q-60 17 88 9 Z" fill="url(#bxF)" opacity=".35"/><path d="M2 -2 C-40 -6 -120 -12 -240 -10 C-120 -2 -60 3 2 4 Z" fill="url(#bxF)"/>' +
      '<path d="M2 -6 L46 -7 Q66 -6.5 82 -4 L66 2 Q32 3.6 6 3 L2 1 Z" fill="#ffffff" stroke="#0f2a36" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<path d="M-4 1.4 L4 1.4" stroke="#d9e7ee" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M6 -3 L58 -4.2 Q66 -4 72 -4.6 Q64 -2.2 56 -1.2 L8 -0.6 Z" fill="#3b5561"/>' +
      '<path d="M10 0.8 L54 0.2" stroke="#f4c542" stroke-width="1.2" stroke-linecap="round"/>' +
      '<path d="M42 -7 L50 -12.5 L57 -12 L63 -6.4 Z" fill="#9fe7f0" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round"/>' +
      '<path d="M19 -6.6 L28 -22 M25 -6.8 L34 -22" stroke="#5b7380" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M18 -23 Q20 -26.5 30 -26.5 L42 -26 Q46 -25.5 44 -22.5 L20 -22 Z" fill="#d9e7ee" stroke="#0f2a36" stroke-width=".9"/>' +
      '<path d="M-6 6 Q30 9 80 4" fill="none" stroke="#14b5c8" stroke-width="1.6" stroke-linecap="round" opacity=".85"/></g></svg>';
    var hull = document.querySelector("#introV .nk-boat path"), r = hull && hull.getBoundingClientRect(), u, hullTop;
    if (r && r.width > 4) { u = r.width / 81; hullTop = r.top; } // coque : 80 unités de dessin
    else { var LW = Math.min(innerWidth * 0.94, 620); u = LW / 365; hullTop = innerHeight / 2 - 52 * u + 78.5 * u; }
    b.style.width = (340 * u) + "px"; b.style.top = (hullTop - 27 * u) + "px";
    document.body.appendChild(b);
    if (b.animate) b.animate([{ transform: "translateX(" + (-332 * u) + "px)" }, { transform: "translateX(" + (innerWidth - 244 * u + 10) + "px)" }], { duration: 1300, easing: "cubic-bezier(.45,.05,.6,.9)", fill: "forwards" });
    setTimeout(function () { b.remove(); }, 1400);
  }
  /* Démarrage d'une session : le cadre de tout l'écran scintille une petite seconde (par-dessus la nouvelle page). */
  function frameSparkle() {
    ["sesFrame", "sesGlow"].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    var fr = document.createElement("div"); fr.id = "sesFrame";
    var gl = document.createElement("div"); gl.id = "sesGlow";
    for (var i = 0; i < 18; i++) { // étincelles réparties sur le pourtour
      var s = document.createElement("i"), p = i / 18 * 4, side = Math.floor(p), f = p - side;
      var x = side === 0 ? f : side === 1 ? 1 : side === 2 ? 1 - f : 0, y = side === 0 ? 0 : side === 1 ? f : side === 2 ? 1 : 1 - f;
      s.style.left = (x * 100) + "%"; s.style.top = (y * 100) + "%"; s.style.animationDelay = (0.1 + Math.random() * 0.5) + "s";
      gl.appendChild(s);
    }
    document.body.appendChild(gl); document.body.appendChild(fr);
    setTimeout(function () { fr.remove(); gl.remove(); }, 1100);
  }
  // au lancement : écran d'ouverture ; si une session est déjà en cours, on retourne directement au chrono (GPS demandé comme avant)
  if (sortie.active) gpsAsk(); else introShow();
  // v2.0 : bouton de l'en-tête, sur chaque page, pour revenir à la page de lancement (ski nautique ou camping)
  var lb0 = document.getElementById("launchBtn"); if (lb0) lb0.addEventListener("click", function () { introShow(); });
  window.addEventListener("online", function () { updateNet(); Sync.run(); });
  window.addEventListener("offline", updateNet);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") Sync.run(); });
  setInterval(function () { Sync.run(); }, 120000);

  /* Mises à jour de l'app : le service worker télécharge la nouvelle version.
     v2.0.2 : recherche automatique à l'ouverture et à chaque retour sur l'app (au plus toutes les 5 min) ;
     la nouvelle version s'installe seule si personne n'est en train de saisir et qu'aucune session ne tourne, sinon le bandeau « Mettre à jour » s'affiche. */
  var swReg = null, swAutoAt = Date.now(), swLastCheck = 0;
  function showUpdate() { var bar = document.getElementById("updBar"); if (bar) bar.hidden = false; }
  function updIdle() {
    if (sortie && sortie.active) return false; // jamais pendant une session
    var ae = document.activeElement; if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return false; // saisie en cours
    return !!document.getElementById("introV") || Date.now() - swAutoAt < 60000; // à l'ouverture ou juste au retour sur l'app
  }
  function onUpdateReady() { if (!swReg || !swReg.waiting) return; if (updIdle()) swReg.waiting.postMessage("skipWaiting"); else showUpdate(); }
  function autoCheck() {
    if (!swReg || !navigator.onLine || Date.now() - swLastCheck < 300000) return;
    swLastCheck = Date.now(); swAutoAt = Date.now();
    swReg.update().then(onUpdateReady).catch(function () { /* pas de réseau : on réessaiera au prochain retour */ });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") autoCheck(); });
  function checkUpdate(manual) {
    if (!swReg) { if (manual) toast("Version " + APP_VERSION + ". Mise à jour automatique indisponible ici."); return; }
    swReg.update().then(function () { if (swReg.waiting) showUpdate(); else if (manual) toast("Vous avez la dernière version (" + APP_VERSION + ")."); }).catch(function () { if (manual) toast("Pas de réseau : réessayez plus tard."); });
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
      swReg = reg; if (reg.waiting) onUpdateReady();
      reg.addEventListener("updatefound", function () { var w = reg.installing; if (w) w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) onUpdateReady(); }); });
      autoCheck();
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
    updateTheo(); updateBig();
  }, 500);

  /* Pas de zoom dans l'app (pincement ou double appui) : la page garde sa taille, comme une application */
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("dblclick", function (e) { e.preventDefault(); }, { passive: false });
  updateNet();
  render();
  Sync.run();
})();
