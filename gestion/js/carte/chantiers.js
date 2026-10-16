/* ==========================================================================
   Parc des chantiers : chaque affaire en phase d'exécution occupe une
   parcelle en bordure du quartier. La construction monte avec l'avancement,
   une grue signale un chantier en cours, une bâche un chantier à l'arrêt.
   Couche redessinée à chaque modification des données.
   ========================================================================== */
import { p, poly, box, windows, MAT, material } from "./iso.js";

export const STATUTS_SUR_CARTE = ["gagnee", "en_preparation", "en_cours", "en_attente"];

// Parcelles : bande avant-gauche (y 28.5..32.5) puis avant-droite (x 28.5..32.5), puis l'angle
export const PARCELLES = [
  ...[1, 6, 11, 16, 21].map((x) => [x, 28.6]),
  ...[1, 6, 11, 16, 21].map((y) => [28.6, y]),
  [28.6, 28.6],
].map(([x, y]) => ({ x, y, w: 3.8, d: 3.8 }));

/** Sol du parc : avenue périphérique et parcelles vides (dessiné une fois). */
export function solParc() {
  let s = "";
  s += poly([[-1, 27.4], [34, 27.4], [34, 34], [-1, 34]], "#e2dccf");
  s += poly([[27.4, -1], [34, -1], [34, 27.4], [27.4, 27.4]], "#e2dccf");
  s += poly([[-1, 34, 0], [34, 34, 0], [34, 34, -0.6], [-1, 34, -0.6]], "#cfc7b6");
  s += poly([[34, -1, 0], [34, 34, 0], [34, 34, -0.6], [34, -1, -0.6]], "#bdb5a4");
  // avenue périphérique
  s += poly([[-1, 27.3], [28.3, 27.3], [28.3, 28.3], [-1, 28.3]], "#cfcbc3");
  s += poly([[27.3, -1], [28.3, -1], [28.3, 28.3], [27.3, 28.3]], "#cfcbc3");
  PARCELLES.forEach((l) => {
    s += poly([[l.x, l.y, 0.02], [l.x + l.w, l.y, 0.02], [l.x + l.w, l.y + l.d, 0.02], [l.x, l.y + l.d, 0.02]], "#d9d2c3", 'stroke="#c4bcab" stroke-width="0.8" stroke-dasharray="4 3"');
  });
  return s;
}

/** Construction d'une parcelle selon l'état du chantier. */
export function construction(l, ch) {
  const { x, y, w, d } = l;
  const av = Math.max(0, Math.min(100, ch.avancement || 0));
  const niveaux = ch.statut === "en_preparation" || ch.statut === "gagnee" ? 0 : 1 + Math.floor(av / 30);
  const bx = x + 0.6, by = y + 0.6, bw = 2.2, bd = 2.2;
  let s = "";
  // emprise de chantier (sol terrassé) et clôture
  s += poly([[x + 0.1, y + 0.1, 0.03], [x + w - 0.1, y + 0.1, 0.03], [x + w - 0.1, y + d - 0.1, 0.03], [x + 0.1, y + d - 0.1, 0.03]], "#cbbf9f");
  s += poly([[x + 0.1, y + d - 0.1, 0], [x + w - 0.1, y + d - 0.1, 0], [x + w - 0.1, y + d - 0.1, 0.35], [x + 0.1, y + d - 0.1, 0.35]], "rgba(85,89,95,0.28)", 'stroke="#55595f" stroke-width="0.5"');
  s += poly([[x + w - 0.1, y + 0.1, 0], [x + w - 0.1, y + d - 0.1, 0], [x + w - 0.1, y + d - 0.1, 0.35], [x + w - 0.1, y + 0.1, 0.35]], "rgba(85,89,95,0.22)", 'stroke="#55595f" stroke-width="0.5"');
  // base vie
  s += box(x + 2.9, y + 0.3, 0, 0.7, 1.3, 0.55, MAT.sable);
  if (niveaux === 0) {
    // préparation : implantation au sol et matériaux livrés
    s += poly([[bx, by, 0.05], [bx + bw, by, 0.05], [bx + bw, by + bd, 0.05], [bx, by + bd, 0.05]], "none", 'stroke="#9c8259" stroke-width="1.2" stroke-dasharray="5 4"');
    s += box(bx + 0.3, by + 0.3, 0.03, 0.6, 0.6, 0.3, material("#b8a27d")) + box(bx + 1.1, by + 0.4, 0.03, 0.5, 0.8, 0.22, MAT.mineral);
  } else {
    for (let n = 0; n < niveaux; n++) {
      const z = n * 0.75;
      const dernier = n === niveaux - 1;
      s += box(bx, by, z, bw, bd, 0.1, MAT.mineral);
      if (!dernier || av >= 100) s += box(bx, by, z + 0.1, bw, bd, 0.65, MAT.ivoire, { noTop: true }) + windows(bx, by, z + 0.1, bw, bd, 0.65, { rows: 1, step: 0.55 });
      else [[0, 0], [bw - 0.14, 0], [0, bd - 0.14], [bw - 0.14, bd - 0.14]].forEach(([a, b2]) => { s += box(bx + a, by + b2, z + 0.1, 0.14, 0.14, 0.65, MAT.pierre); });
    }
    if (av >= 100) s += box(bx - 0.05, by - 0.05, niveaux * 0.75, bw + 0.1, bd + 0.1, 0.12, MAT.anthracite);
  }
  if (ch.statut === "en_attente") {
    s += box(bx - 0.1, by - 0.1, 0, bw + 0.2, bd + 0.2, Math.max(0.6, niveaux * 0.75), material("#8a8f92"));
  }
  // grue pour un chantier en cours
  if (ch.statut === "en_cours") {
    const gx = x + 3.1, gy = y + 2.6, h = 4.4;
    s += box(gx, gy, 0, 0.18, 0.18, h, MAT.sable);
    s += box(gx - 2.8, gy + 0.02, h, 3.6, 0.14, 0.14, MAT.sable);
    const [hx, hy] = p(gx - 1.6, gy + 0.08, h), [kx, ky] = p(gx - 1.6, gy + 0.08, h - 1.6);
    s += `<line x1="${hx}" y1="${hy}" x2="${kx}" y2="${ky}" stroke="#3b3f45" stroke-width="0.7"/>`;
  }
  // panneau de chantier
  s += box(x + 0.25, y + d - 0.35, 0, 0.9, 0.06, 0.55, ch.alerte ? material("#b8655a") : MAT.anthracite);
  return s;
}

/** Point d'ancrage de l'étiquette d'un chantier. */
export function ancre(l, ch) {
  const niveaux = ch.statut === "en_cours" ? 6 : 2.4;
  return p(l.x + l.w / 2, l.y + l.d / 2, niveaux);
}
