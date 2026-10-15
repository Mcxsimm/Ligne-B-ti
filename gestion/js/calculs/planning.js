/* ==========================================================================
   Calculs de planning : avancement et écarts prévu / réel
   Fonctions pures (la date du jour est passée en paramètre).
   ========================================================================== */
import { joursEntre } from "./finances.js";

/** Durée prévue d'une opération en jours (1 jour minimum). */
export function dureePrevue(o) {
  if (!o.date_debut_prevue || !o.date_fin_prevue) return 1;
  return Math.max(1, joursEntre(o.date_debut_prevue, o.date_fin_prevue) + 1);
}

/** Avancement d'une affaire : moyenne des opérations pondérée par leur durée prévue. */
export function avancementAffaire(operations) {
  if (!operations.length) return 0;
  let total = 0, pondere = 0;
  operations.forEach((o) => {
    const d = dureePrevue(o);
    const av = o.statut === "terminee" ? 100 : Math.max(0, Math.min(100, Number(o.avancement) || 0));
    total += d;
    pondere += av * d;
  });
  return Math.round(pondere / total);
}

/**
 * Écarts d'une opération entre prévu et réel.
 * - retard_debut : jours de décalage du démarrage (réel ou, à défaut, constaté à ce jour)
 * - retard_fin : jours de décalage de la fin (réelle, ou projetée si la date prévue est dépassée)
 */
export function ecartsOperation(o, aujourdhui) {
  const r = { retard_debut: 0, retard_fin: 0, en_retard: false };
  if (o.date_debut_prevue) {
    if (o.date_debut_reelle) r.retard_debut = joursEntre(o.date_debut_prevue, o.date_debut_reelle);
    else if (o.statut === "a_venir" && o.date_debut_prevue < aujourdhui) r.retard_debut = joursEntre(o.date_debut_prevue, aujourdhui);
  }
  if (o.date_fin_prevue) {
    if (o.date_fin_reelle) r.retard_fin = joursEntre(o.date_fin_prevue, o.date_fin_reelle);
    else if (o.statut !== "terminee" && o.date_fin_prevue < aujourdhui) r.retard_fin = joursEntre(o.date_fin_prevue, aujourdhui);
  }
  // « en retard » ne concerne que les opérations non terminées ; l'écart reste visible après coup
  r.en_retard = o.statut !== "terminee" && (r.retard_fin > 0 || r.retard_debut > 0);
  return r;
}
