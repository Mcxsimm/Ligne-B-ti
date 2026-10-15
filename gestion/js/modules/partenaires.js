/* Module 8 — Partenaires : clients, fournisseurs, sous-traitants et intervenants */
import { el, eur, date, puce, tableau, toast } from "../ui/outils.js";
import { ouvrirFormulaire, confirmer } from "../ui/formulaire.js";
import { TYPES_CONTACT, STATUTS_AFFAIRE, STATUTS_COMMANDE, libelle } from "../donnees/modele.js";
import { montantCommande } from "../calculs/finances.js";
import { boutonExport, tableHistorique } from "./commun.js";

let filtreType = "";

export default {
  titre: "Partenaires",
  rendre(ctx, route) {
    if (route.id) return fiche(ctx, route.id);
    const d = ctx.D();
    ctx.titre("Clients, fournisseurs et intervenants");
    ctx.outils(
      boutonExport("Exporter (CSV)", "contacts.csv", [{ titre: "Nom", valeur: (c) => c.nom }, { titre: "Type", valeur: (c) => libelle(TYPES_CONTACT, c.type) }, { titre: "Spécialité", valeur: (c) => c.specialite }, { titre: "E-mail", valeur: (c) => c.email }, { titre: "Téléphone", valeur: (c) => c.telephone }, { titre: "Commune", valeur: (c) => c.commune }, { titre: "SIRET", valeur: (c) => c.siret }], () => d.contacts),
      el("button", { type: "button", class: "bouton", onclick: () => editer(ctx) }, "+ Contact"),
    );
    const sel = el("select", { id: "f-type" }, [el("option", { value: "", text: "Tous" }), ...TYPES_CONTACT.map(([k, l]) => el("option", { value: k, text: l, selected: filtreType === k }))]);
    const zone = el("div");
    const maj = () => {
      filtreType = sel.value;
      zone.replaceChildren(tableau([
        { titre: "Nom", valeur: (c) => c.nom }, { titre: "Type", valeur: (c) => puce(libelle(TYPES_CONTACT, c.type), c.type === "client" ? "info" : "") },
        { titre: "Spécialité", valeur: (c) => c.specialite || "—" }, { titre: "Commune", valeur: (c) => c.commune || "—" },
        { titre: "Affaires", num: true, valeur: (c) => String(affairesDe(d, c).length) },
      ], d.contacts.filter((c) => !filtreType || c.type === filtreType).sort((a, b) => a.nom.localeCompare(b.nom)), { onClic: (c) => ctx.naviguer(`#/m/partenaires/${c.id}`), lien: (c) => `#/m/partenaires/${c.id}`, vide: "Aucun contact.", label: "Contacts" }));
    };
    sel.addEventListener("change", maj);
    ctx.corps.append(el("div", { class: "filtres" }, [el("label", { class: "champ", for: "f-type" }, ["Type", sel])]), zone,
      el("p", { class: "note", text: "Ne collectez que les informations professionnelles utiles à la gestion (coordonnées de l'entreprise, spécialité, SIRET)." }));
    maj();
  },
};

function affairesDe(d, c) {
  if (c.type === "client") return d.affaires.filter((a) => a.client_id === c.id);
  const ids = new Set([...d.commandes.filter((x) => x.fournisseur_id === c.id).map((x) => x.affaire_id), ...d.factures_fournisseurs.filter((x) => x.fournisseur_id === c.id).map((x) => x.affaire_id)]);
  return d.affaires.filter((a) => ids.has(a.id));
}

async function editer(ctx, c) {
  const v = await ouvrirFormulaire({ titre: c ? "Modifier le contact" : "Nouveau contact", type: "contact", valeurs: c || { type: "client" } });
  if (!v) return;
  if (c) ctx.store.modifier("contacts", c.id, v); else { const n = ctx.store.ajouter("contacts", v); ctx.naviguer(`#/m/partenaires/${n.id}`); }
  toast("Contact enregistré.");
}

function fiche(ctx, id) {
  const d = ctx.D();
  const c = d.contacts.find((x) => x.id === id);
  if (!c) { ctx.titre("Contact introuvable"); return; }
  ctx.titre(c.nom);
  ctx.fil([["Carte", "#/"], ["Partenaires", "#/m/partenaires"], [c.nom, null]]);
  const utilise = affairesDe(d, c).length || d.commandes.some((x) => x.fournisseur_id === id);
  ctx.outils(
    el("button", { type: "button", class: "bouton bouton--clair", onclick: () => editer(ctx, c) }, "Modifier"),
    el("button", { type: "button", class: "bouton bouton--danger", disabled: utilise, title: utilise ? "Contact lié à des affaires ou commandes" : null, onclick: async () => { if (await confirmer(`Supprimer « ${c.nom} » ?`)) { ctx.store.supprimer("contacts", id); ctx.naviguer("#/m/partenaires"); } } }, "Supprimer"),
  );
  ctx.corps.append(
    el("section", { class: "panneau" }, [el("dl", { class: "fiche-infos" }, [
      ["Type", libelle(TYPES_CONTACT, c.type)], ["Spécialité", c.specialite || "—"], ["E-mail", c.email || "—"], ["Téléphone", c.telephone || "—"],
      ["Commune", c.commune || "—"], ["SIRET", c.siret || "—"],
    ].flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })])), c.notes ? el("p", { class: "note", text: c.notes }) : null]),
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Affaires associées" }),
      tableau([{ titre: "Affaire", valeur: (a) => `${a.reference} · ${a.nom}` }, { titre: "Statut", valeur: (a) => libelle(STATUTS_AFFAIRE, a.statut) }], affairesDe(d, c), { onClic: (a) => ctx.naviguer(`#/m/affaires/${a.id}`), vide: "Aucune affaire.", label: "Affaires" })]),
    c.type !== "client" ? el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Commandes" }),
      tableau([{ titre: "Numéro", valeur: (x) => x.numero }, { titre: "Date", valeur: (x) => date(x.date) }, { titre: "Statut", valeur: (x) => libelle(STATUTS_COMMANDE, x.statut) }, { titre: "Montant", num: true, valeur: (x) => eur(montantCommande(x)) }],
        d.commandes.filter((x) => x.fournisseur_id === id), { onClic: (x) => ctx.naviguer(`#/m/entrepot?commande=${x.id}`), vide: "Aucune commande.", label: "Commandes" })]) : null,
    el("section", { class: "panneau" }, [el("h2", { class: "panneau__titre", text: "Historique des interactions" }), tableHistorique(d, (h) => h.entite_id === id)]),
  );
}
