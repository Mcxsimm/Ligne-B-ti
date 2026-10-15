/* ==========================================================================
   Stockage des données — PROTOTYPE
   --------------------------------------------------------------------------
   ⚠ Les données sont enregistrées dans le stockage local du navigateur
   (localStorage). Ce n'est NI une sauvegarde, NI un système multi-utilisateur :
   vider le navigateur, changer d'appareil ou de navigateur fait perdre les
   données. Utilisez l'export JSON (Administration › Sauvegarde) et, pour un
   usage professionnel, la version hébergée prévue en phase 2/3.
   Toutes les écritures passent par ce module : c'est lui qu'on remplacera
   par un accès à la base de données (Supabase) sans toucher aux écrans.
   ========================================================================== */
import { baseVide, COLLECTIONS, VERSION_SCHEMA } from "./modele.js";

const CLE = "lb-gestion-v1";
const abonnes = new Set();
let etat = null;
let persistant = true;

// Champs dont toute modification est journalisée (montants, dates, statuts)
const SENSIBLE = /(montant|_ht|_ttc|pu_|quantite|date|echeance|statut|reste_a_engager|taux)/;
const LIBELLES_COLL = {
  affaires: "Affaire", operations: "Opération", postes: "Poste budgétaire", avenants: "Avenant",
  commandes: "Commande", factures_fournisseurs: "Facture fournisseur", factures_clients: "Facture client",
  paiements: "Encaissement", contacts: "Contact", evenements: "Événement", taches: "Tâche", documents: "Document",
};

export function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    etat = brut ? JSON.parse(brut) : null;
  } catch (e) {
    etat = null;
    persistant = false;
  }
  if (etat) etat = migrer(etat);
  return etat;
}

export function estPersistant() { return persistant; }
export function donnees() { return etat; }

export function initialiser(base) {
  etat = migrer(base);
  sauver();
  notifier();
}

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    persistant = true;
  } catch (e) {
    persistant = false;
  }
}

export function abonner(fn) { abonnes.add(fn); return () => abonnes.delete(fn); }
function notifier() { abonnes.forEach((fn) => fn(etat)); }

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2));
const maintenant = () => new Date().toISOString();

function journal(entite, entite_id, action, details) {
  etat.historique.unshift({ id: uid(), date: maintenant(), entite, entite_id, action, details: details || null, auteur: "Moi" });
  if (etat.historique.length > 2000) etat.historique.length = 2000;
}

function resume(coll, obj) {
  return obj.numero || obj.reference || obj.nom || obj.libelle || obj.titre || "";
}

export function ajouter(coll, obj) {
  const o = { id: uid(), cree_le: maintenant(), ...obj };
  etat[coll].push(o);
  journal(coll, o.id, "création", `${LIBELLES_COLL[coll] || coll} « ${resume(coll, o)} » créé(e)`);
  sauver();
  notifier();
  return o;
}

export function modifier(coll, id, patch) {
  const o = etat[coll].find((x) => x.id === id);
  if (!o) throw new Error("Élément introuvable");
  const changes = [];
  Object.keys(patch).forEach((k) => {
    const avant = o[k] ?? null, apres = patch[k] ?? null;
    if (JSON.stringify(avant) !== JSON.stringify(apres)) {
      if (SENSIBLE.test(k) || coll === "affaires") changes.push({ champ: k, avant, apres });
      o[k] = patch[k];
    }
  });
  o.modifie_le = maintenant();
  if (changes.length) journal(coll, id, "modification", changes);
  sauver();
  notifier();
  return o;
}

export function supprimer(coll, id) {
  const i = etat[coll].findIndex((x) => x.id === id);
  if (i < 0) return;
  const [o] = etat[coll].splice(i, 1);
  journal(coll, id, "suppression", `${LIBELLES_COLL[coll] || coll} « ${resume(coll, o)} » supprimé(e)`);
  sauver();
  notifier();
}

export function parametres(patch) {
  if (patch) {
    etat.parametres = { ...etat.parametres, ...patch };
    journal("parametres", null, "modification", Object.keys(patch).join(", "));
    sauver();
    notifier();
  }
  return etat.parametres;
}

/* ---------- Références lisibles et uniques ------------------------------ */
export function prochaineReference(prefixe, coll, champ = "reference") {
  const annee = new Date().getFullYear();
  const motif = new RegExp(`^${prefixe}-${annee}-(\\d+)$`);
  const max = etat[coll].reduce((m, x) => { const r = motif.exec(x[champ] || ""); return r ? Math.max(m, Number(r[1])) : m; }, 0);
  return `${prefixe}-${annee}-${String(max + 1).padStart(3, "0")}`;
}

/* ---------- Export / import ---------------------------------------------- */
export function exporterJSON() {
  return JSON.stringify({ ...etat, exporte_le: maintenant(), application: "Ligne&Bati Gestion" }, null, 2);
}

export function importerJSON(texte) {
  let d;
  try { d = JSON.parse(texte); } catch (e) { throw new Error("Le fichier n'est pas un JSON valide."); }
  if (!d || typeof d !== "object" || !d.version) throw new Error("Ce fichier n'est pas une sauvegarde Ligne&Bati Gestion.");
  if (d.version > VERSION_SCHEMA) throw new Error("Cette sauvegarde provient d'une version plus récente de l'application.");
  for (const c of COLLECTIONS) {
    if (d[c] !== undefined && !Array.isArray(d[c])) throw new Error(`Données invalides : « ${c} » doit être une liste.`);
  }
  initialiser(d);
  journal("base", null, "import", "Import d'une sauvegarde JSON");
  sauver();
}

function migrer(d) {
  const base = baseVide();
  const r = { ...base, ...d, parametres: { ...base.parametres, ...(d.parametres || {}) }, meta: { ...base.meta, ...(d.meta || {}) } };
  COLLECTIONS.forEach((c) => { if (!Array.isArray(r[c])) r[c] = []; });
  r.version = VERSION_SCHEMA;
  return r;
}
