/* Composants partagés entre modules */
import { el, eur, pct, tableau, csv, telecharger, nombreCsv, date } from "../ui/outils.js";

/** Les 12 indicateurs financiers d'une affaire, dans l'ordre du cahier des charges. */
export function blocFinancier(s, nature) {
  const ligne = (lib, sous, val, cls = "", fort = false) =>
    el("div", { class: "finance__ligne" + (fort ? " finance__ligne--fort" : "") }, [
      el("dt", {}, [lib, sous ? el("small", { text: sous }) : null]), el("dd", { class: cls, text: val }),
    ]);
  const signe = (v) => (v < 0 ? "neg" : v > 0 ? "pos" : "");
  return el("dl", { class: "finance" }, [
    ligne("1. Budget initial", "coûts prévus à la signature", eur(s.budget_initial)),
    ligne("2. Budget révisé", "après avenants de coûts", eur(s.budget_revise)),
    ligne(nature === "honoraires" ? "3. Honoraires contractuels" : "3. Montant vendu", "après avenants de vente", eur(s.vendu_revise), "", true),
    ligne("4. Commandes engagées", "commandes validées, sans double comptage", eur(s.engage)),
    ligne("5. Dépenses comptabilisées", "factures fournisseurs reçues", eur(s.realise)),
    ligne("6. Montant facturé", "factures clients émises", eur(s.facture_ht)),
    ligne("7. Montant encaissé", "règlements reçus", eur(s.encaisse_ttc, "TTC")),
    ligne("8. Reste à engager", "estimé ou saisi par poste", eur(s.reste_a_engager)),
    ligne("9. Coût à terminaison", "engagé + reste à engager", eur(s.cat), s.cat > s.budget_revise ? "neg" : "", true),
    ligne("10. Marge prévisionnelle", s.marge_prev_pct !== null ? pct(s.marge_prev_pct) + " du vendu" : "", eur(s.marge_prev), signe(s.marge_prev)),
    ligne("11. Marge à terminaison", s.marge_term_pct !== null ? pct(s.marge_term_pct) + " du vendu" : "", eur(s.marge_term), signe(s.marge_term), true),
    ligne("12. Écart budget / terminaison", "positif = favorable", eur(s.ecart_budget), signe(s.ecart_budget)),
    ligne("Reste dû par le client", s.echu_ttc ? "dont échu : " + eur(s.echu_ttc, "TTC") : "", eur(s.reste_du_ttc, "TTC"), s.echu_ttc ? "neg" : ""),
    ligne("Reste à facturer", "vendu − facturé", eur(s.reste_a_facturer_ht)),
    ligne("Dépenses payées", "factures fournisseurs réglées", eur(s.paye)),
  ]);
}

export function listeAlertes(alertes, ctx, vide = "Aucune alerte.") {
  if (!alertes.length) return el("p", { class: "vide", text: vide });
  const d = ctx.D();
  return el("ul", { class: "alertes" }, alertes.map((a) => {
    const aff = a.affaire_id ? d.affaires.find((x) => x.id === a.affaire_id) : null;
    const cible = a.cible && a.cible.operation_id ? `#/m/chantiers/${a.affaire_id}` : a.cible && a.cible.facture_fournisseur_id ? "#/m/finances?onglet=depenses" : aff ? `#/m/affaires/${aff.id}?onglet=${["facture_echue", "facture_echeance"].includes(a.type) ? "facturation" : "budget"}` : null;
    return el("li", { class: "alerte alerte--" + a.niveau }, [
      el("span", { class: "alerte__type", text: a.niveau === "alerte" ? "Alerte" : "À surveiller" }),
      el("span", {}, [a.message, aff ? el("small", { text: " — " + aff.reference + " · " + aff.nom }) : null]),
      cible ? el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => ctx.naviguer(cible) }, "Voir") : el("span"),
    ]);
  }));
}

export function boutonExport(libelle, nomFichier, colonnes, lignes) {
  return el("button", { type: "button", class: "bouton bouton--clair bouton--petit", onclick: () => telecharger(nomFichier, csv(colonnes, lignes())) }, libelle);
}

export const nomContact = (d, id) => (d.contacts.find((c) => c.id === id) || {}).nom || "—";
export const nomAffaire = (d, id) => { const a = d.affaires.find((x) => x.id === id); return a ? `${a.reference} · ${a.nom}` : "Non affectée"; };

export function tableHistorique(d, filtre) {
  const lignes = d.historique.filter(filtre).slice(0, 200);
  const details = (h) => Array.isArray(h.details)
    ? h.details.map((c) => `${c.champ} : ${fmtVal(c.champ, c.avant)} → ${fmtVal(c.champ, c.apres)}`).join(" ; ")
    : h.details || "";
  return tableau([
    { titre: "Date", valeur: (h) => new Date(h.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) },
    { titre: "Action", valeur: (h) => h.action },
    { titre: "Détail", valeur: details, texte: true },
    { titre: "Auteur", valeur: (h) => h.auteur || "—" },
  ], lignes, { vide: "Aucune modification enregistrée.", label: "Historique" });
}
function fmtVal(champ, v) {
  if (v === null || v === undefined || v === "") return "vide";
  if (/(montant|_ht|_ttc|pu_)/.test(champ) && typeof v === "number") return eur(v, "");
  if (/date|echeance/.test(champ)) return date(v);
  return String(v);
}

export { nombreCsv };
