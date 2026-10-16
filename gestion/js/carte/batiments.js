/* ==========================================================================
   Le quartier Ligne&Bati : 9 îlots (3 × 3) séparés par deux avenues.
   Chaque îlot accueille un bâtiment = un module de l'application.
   Disposition à l'écran :
                 Administration
          Affaires          Finances
     Partenaires     Siège        Contrôle
          Planning          Entrepôt
                  Chantiers
   ========================================================================== */
import { p, poly, box, windows, curtain, shadow, tree, conifer, lamp, car, plaque, MAT, material, shade } from "./iso.js";

export const TAILLE = 27;               // la carte couvre 0..27 en x et en y
const ORIG = [0.5, 10.5, 18.5];         // origine des îlots (avenues en 9..10 et 17..18)

/* ---------- Bâtiments ---------------------------------------------------- */
export const BATIMENTS = [
  {
    id: "siege", nom: "Siège", role: "Tableau de bord général", bloc: [1, 1],
    centre: [14, 14], sommet: 7.4,
    dessin() {
      const x = 12.5, y = 12.5;
      return box(11.3, 11.3, 0, 5.4, 5.4, 0.12, MAT.pierre) +
        shadow(x, y, 3, 3, 6) +
        box(11.8, 11.8, 0.12, 4.4, 4.4, 0.7, MAT.ivoire) +
        windows(11.8, 11.8, 0.12, 4.4, 4.4, 0.7, { rows: 1, step: 0.55 }) +
        box(x, y, 0.82, 3, 3, 5.6, MAT.anthracite) +
        curtain(x, y, 1.1, 3, 3, 5) +
        box(x + 0.4, y + 0.4, 6.42, 2.2, 2.2, 0.5, MAT.graphite) +
        box(x + 1.35, y + 1.35, 6.92, 0.3, 0.3, 0.9, MAT.mineral) +
        poly([[x, y + 3, 6.42], [x + 3, y + 3, 6.42], [x + 3, y + 3, 6.47], [x, y + 3, 6.47]], "#c9b490") +
        poly([[x + 3, y, 6.42], [x + 3, y + 3, 6.42], [x + 3, y + 3, 6.47], [x + 3, y, 6.47]], "#b39d78");
    },
    decor: [["tree", 11.6, 16.4], ["tree", 16.4, 11.6], ["tree", 16.3, 16.2, 1.1], ["lamp", 11.6, 13.6], ["lamp", 13.6, 11.6]],
  },
  {
    id: "affaires", nom: "Affaires", role: "Suivi commercial et fiches d'affaires", bloc: [0, 1],
    centre: [4.5, 14], sommet: 4.2,
    dessin() {
      return shadow(2.2, 12, 4.2, 3.2, 3) +
        box(2.2, 12, 0, 4.2, 3.2, 3, MAT.ivoire) +
        windows(2.2, 12, 0, 4.2, 3.2, 3, { rows: 4, step: 0.6 }) +
        box(2.2, 15.2, 0, 1.6, 1.4, 1.2, MAT.verre) +
        curtain(2.2, 15.2, 0, 1.6, 1.4, 1.2) +
        box(2.4, 12.2, 3, 2.2, 1.6, 0.35, MAT.graphite) +
        box(6.4, 12.6, 0, 1.2, 2.6, 2.2, MAT.anthracite) +
        windows(6.4, 12.6, 0, 1.2, 2.6, 2.2, { rows: 3, step: 0.55, color: "rgba(200,190,160,0.4)" });
    },
    decor: [["tree", 1.4, 11.4], ["tree", 7.8, 16.6], ["conifer", 1.3, 16.8], ["car", 5.2, 16.9], ["car", 6.3, 16.9]],
  },
  {
    id: "finances", nom: "Finances", role: "Budgets, coûts, facturation et marges", bloc: [1, 0],
    centre: [14.5, 4.5], sommet: 4.6,
    dessin() {
      const x = 12.2, y = 2.4, w = 4.6, d = 4, h = 3.2;
      let s = shadow(x, y, w, d, h) + box(x - 0.3, y - 0.3, 0, w + 0.6, d + 0.6, 0.18, MAT.pierre) + box(x, y, 0.18, w, d, h, MAT.pierre);
      // colonnade sur les deux faces visibles
      for (let i = 0.25; i < w - 0.1; i += 0.55) s += box(x + i, y + d - 0.02, 0.18, 0.16, 0.18, h - 0.4, MAT.ivoire);
      for (let j = 0.25; j < d - 0.1; j += 0.55) s += box(x + w - 0.02, y + j, 0.18, 0.18, 0.16, h - 0.4, MAT.ivoire);
      s += box(x - 0.15, y - 0.15, h - 0.04, w + 0.3, d + 0.3, 0.32, MAT.sable);
      s += box(x + 1, y + 1, h + 0.28, w - 2, d - 2, 0.6, MAT.graphite) + windows(x + 1, y + 1, h + 0.28, w - 2, d - 2, 0.6, { rows: 1, step: 0.5 });
      return s;
    },
    decor: [["tree", 11.4, 7.6], ["tree", 17.6, 1.4], ["conifer", 17.6, 7.4, 1.1], ["lamp", 11.6, 5]],
  },
  {
    id: "administration", nom: "Administration", role: "Documents, tâches, paramètres et sauvegardes", bloc: [0, 0],
    centre: [4.5, 4.5], sommet: 4.4,
    dessin() {
      return shadow(1.8, 2.2, 5, 2.4, 2.2) +
        box(1.8, 2.2, 0, 5, 2.4, 2.2, MAT.ivoire) +
        windows(1.8, 2.2, 0, 5, 2.4, 2.2, { rows: 3, step: 0.5 }) +
        box(1.8, 4.6, 0, 2.4, 2.6, 2.2, MAT.ivoire) +
        windows(1.8, 4.6, 0, 2.4, 2.6, 2.2, { rows: 3, step: 0.5 }) +
        box(5.2, 4.9, 0, 1.6, 1.6, 3.2, MAT.sauge) +
        windows(5.2, 4.9, 0, 1.6, 1.6, 3.2, { rows: 5, step: 0.5, color: "rgba(40,52,58,0.45)" }) +
        box(5.1, 4.8, 3.2, 1.8, 1.8, 0.2, MAT.anthracite);
    },
    decor: [["tree", 1.2, 1.2], ["tree", 7.6, 1.6], ["tree", 7.4, 7.6, 1.1], ["conifer", 4.6, 7.8]],
  },
  {
    id: "controle", nom: "Contrôle", role: "Indicateurs de performance et alertes", bloc: [2, 0],
    centre: [22.5, 4.5], sommet: 7.2,
    dessin() {
      const x = 21.6, y = 3.6;
      return shadow(x, y, 1.8, 1.8, 5) +
        box(20.4, 2.6, 0, 4.2, 3.8, 0.9, MAT.mineral) + windows(20.4, 2.6, 0, 4.2, 3.8, 0.9, { rows: 1, step: 0.55 }) +
        box(x, y, 0.9, 1.8, 1.8, 4.2, MAT.ivoire) +
        windows(x, y, 0.9, 1.8, 1.8, 4.2, { rows: 6, step: 0.6, fill: 0.3 }) +
        box(x - 0.45, y - 0.45, 5.1, 2.7, 2.7, 0.9, MAT.verre) + curtain(x - 0.45, y - 0.45, 5.1, 2.7, 2.7, 0.9) +
        box(x - 0.55, y - 0.55, 6, 2.9, 2.9, 0.14, MAT.anthracite) +
        box(x + 0.8, y + 0.8, 6.14, 0.2, 0.2, 1.1, MAT.graphite);
    },
    decor: [["conifer", 19.4, 7.6], ["conifer", 25.8, 1.6], ["tree", 25.6, 7.4], ["lamp", 19.8, 2.4]],
  },
  {
    id: "partenaires", nom: "Partenaires", role: "Clients, fournisseurs et intervenants", bloc: [0, 2],
    centre: [4.5, 22.5], sommet: 3,
    dessin() {
      const x = 2.2, y = 20.6;
      let s = shadow(x, y, 4.2, 3.4, 1.6) + box(x - 0.4, y - 0.4, 0, 5, 4.2, 0.12, MAT.pierre);
      s += box(x + 0.6, y + 0.6, 0.12, 2.8, 2.2, 1.3, MAT.verre) + curtain(x + 0.6, y + 0.6, 0.12, 2.8, 2.2, 1.3);
      [[x, y], [x + 4, y], [x, y + 3.2], [x + 4, y + 3.2]].forEach(([a, b]) => { s += box(a, b, 0.12, 0.16, 0.16, 1.5, MAT.anthracite); });
      s += box(x - 0.2, y - 0.2, 1.62, 4.6, 3.8, 0.16, MAT.sauge);
      s += box(x + 4.5, y + 1, 0.12, 0.3, 1.4, 0.18, MAT.sable);
      return s;
    },
    decor: [["tree", 1.2, 19.2], ["tree", 7.6, 19.6, 1.1], ["tree", 7.6, 25.6], ["conifer", 1.4, 25.4], ["lamp", 6.8, 22]],
  },
  {
    id: "planning", nom: "Planification", role: "Calendrier, jalons et échéances", bloc: [1, 2],
    centre: [14.5, 22.5], sommet: 3.8,
    dessin() {
      const x = 12.4, y = 20.6, w = 4.4, d = 3.4, h = 2.6;
      let s = shadow(x, y, w, d, h) + box(x, y, 0, w, d, h, MAT.graphite);
      // façade calendrier (grille de cases) sur la face gauche
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
        const i = 0.3 + c * 0.65, z0 = 0.4 + r * 0.7;
        const f = (r * 6 + c) % 5 === 2 ? "#c9b490" : "rgba(233,227,214,0.75)";
        s += poly([[x + i, y + d, z0], [x + i + 0.5, y + d, z0], [x + i + 0.5, y + d, z0 + 0.5], [x + i, y + d, z0 + 0.5]], f);
      }
      // horloge dessinée dans le plan de la façade droite
      const cyy = y + d / 2, czz = h * 0.55, ry = 0.62, rz = 0.5;
      const cercle = [];
      for (let k = 0; k < 28; k++) { const t = (k / 28) * Math.PI * 2; cercle.push([x + w, cyy + Math.cos(t) * ry, czz + Math.sin(t) * rz]); }
      s += poly(cercle, "#e9e3d6", 'stroke="#c9b490" stroke-width="1.6"');
      s += `<path d="M${p(x + w, cyy, czz).join(",")}L${p(x + w, cyy, czz + rz * 0.75).join(",")}M${p(x + w, cyy, czz).join(",")}L${p(x + w, cyy + ry * 0.55, czz).join(",")}" stroke="#3b3f45" stroke-width="1.6" stroke-linecap="round"/>`;
      s += box(x + 0.6, y + 0.5, h, 2, 1.6, 0.7, MAT.ivoire) + windows(x + 0.6, y + 0.5, h, 2, 1.6, 0.7, { rows: 1, step: 0.5 });
      return s;
    },
    decor: [["tree", 11.4, 25.6], ["tree", 17.6, 19.4], ["conifer", 17.4, 25.4], ["car", 13, 25.4], ["car", 14.2, 25.4]],
  },
  {
    id: "entrepot", nom: "Entrepôt", role: "Commandes, fournisseurs et approvisionnements", bloc: [2, 1],
    centre: [22.5, 14.5], sommet: 3.6,
    dessin() {
      const x = 19.6, y = 12, w = 6.2, d = 3.6, h = 1.9;
      let s = shadow(x, y, w, d, h) + box(x, y, 0, w, d, h, MAT.mineral);
      // toiture en sheds
      for (let i = 0; i < w - 0.01; i += 1.24) {
        s += poly([[x + i, y, h], [x + i, y + d, h], [x + i + 0.2, y + d, h + 0.7], [x + i + 0.2, y, h + 0.7]], "#a8b6b8");
        s += poly([[x + i + 0.2, y, h + 0.7], [x + i + 0.2, y + d, h + 0.7], [x + i + 1.24, y + d, h], [x + i + 1.24, y, h]], shade("#b9bcb8", 0.12), 'stroke="#8f938f" stroke-width="0.5"');
      }
      // quais de chargement
      for (let i = 0.5; i < w - 0.6; i += 1.4) s += poly([[x + i, y + d, 0], [x + i + 0.9, y + d, 0], [x + i + 0.9, y + d, 1.2], [x + i, y + d, 1.2]], "#55595f");
      s += box(x + 0.6, y + d + 0.4, 0, 0.6, 0.6, 0.45, MAT.sable) + box(x + 1.4, y + d + 0.4, 0, 0.6, 0.6, 0.3, MAT.sable) + box(x + 0.6, y + d + 0.4, 0.45, 0.6, 0.6, 0.35, material("#b8a27d"));
      // camion
      s += box(x + 3.2, y + d + 0.5, 0, 2, 0.8, 0.9, MAT.ivoire) + box(x + 5.2, y + d + 0.5, 0, 0.6, 0.8, 0.6, MAT.anthracite);
      return s;
    },
    decor: [["conifer", 19.2, 11], ["conifer", 25.8, 11.2], ["tree", 25.6, 17.4]],
  },
  {
    id: "chantiers", nom: "Chantiers", role: "Opérations en cours, avancement et réserves", bloc: [2, 2],
    centre: [23.6, 24.4], sommet: 3.2,
    dessin() {
      const x = 20.6, y = 20.6;
      let s = box(19.2, 19.2, 0, 7.2, 7.2, 0.06, material("#cbbf9f"));
      // clôture de chantier
      s += poly([[19.2, 26.4, 0], [26.4, 26.4, 0], [26.4, 26.4, 0.45], [19.2, 26.4, 0.45]], "rgba(85,89,95,0.35)", 'stroke="#55595f" stroke-width="0.6"');
      s += poly([[26.4, 19.2, 0], [26.4, 26.4, 0], [26.4, 26.4, 0.45], [26.4, 19.2, 0.45]], "rgba(85,89,95,0.28)", 'stroke="#55595f" stroke-width="0.6"');
      s += shadow(x, y, 3.6, 3.6, 3);
      // ossature en cours : planchers + poteaux
      for (let n = 0; n < 3; n++) {
        const z = n * 1.05;
        s += box(x, y, z, 3.6, 3.6, 0.14, MAT.mineral);
        if (n < 2) [[0, 0], [3.4, 0], [0, 3.4], [3.4, 3.4], [1.7, 3.4], [3.4, 1.7]].forEach(([a, b]) => { s += box(x + a, y + b, z + 0.14, 0.2, 0.2, 0.91, MAT.pierre); });
      }
      s += box(x, y, 0.14, 3.6, 3.6, 0.9, MAT.ivoire, { noTop: true }) + windows(x, y, 0.14, 3.6, 3.6, 0.9, { rows: 1, step: 0.6 });
      // grue
      const gx = 24.8, gy = 21;
      s += box(gx, gy, 0, 0.3, 0.3, 7.4, MAT.sable);
      for (let k = 0.5; k < 7.2; k += 0.6) s += `<path d="M${p(gx + 0.3, gy, k).join(",")}L${p(gx + 0.3, gy + 0.3, k + 0.6).join(",")}" stroke="#8f7a55" stroke-width="0.8"/>`;
      s += box(gx - 4.6, gy + 0.05, 7.4, 6, 0.2, 0.22, MAT.sable);
      s += box(gx + 0.9, gy - 0.05, 6.9, 0.6, 0.4, 0.5, MAT.anthracite);
      const [hx, hy] = p(gx - 3.2, gy + 0.15, 7.4), [bx, by] = p(gx - 3.2, gy + 0.15, 4.2);
      s += `<line x1="${hx}" y1="${hy}" x2="${bx}" y2="${by}" stroke="#3b3f45" stroke-width="0.8"/>`;
      s += box(gx - 3.4, gy, 3.9, 0.4, 0.4, 0.3, MAT.anthracite);
      // base vie et matériaux
      s += box(19.6, 24.6, 0, 1.8, 0.9, 0.7, MAT.sable) + box(19.6, 24.6, 0.7, 1.8, 0.9, 0.7, MAT.ivoire) + windows(19.6, 24.6, 0, 1.8, 0.9, 1.4, { rows: 2, step: 0.6 });
      s += box(24.6, 24.4, 0, 1.2, 0.6, 0.25, MAT.graphite) + box(24.7, 25.3, 0, 1, 0.5, 0.35, material("#b8a27d"));
      [[23.4, 25.9], [22.8, 25.9], [22.2, 25.9]].forEach(([a, b]) => {
        const [cx, cy] = p(a, b, 0);
        s += `<polygon points="${cx},${cy - 9} ${cx + 3},${cy} ${cx - 3},${cy}" fill="#c9844f"/>`;
      });
      return s;
    },
    decor: [["conifer", 18.8, 26.6]],
  },
];

/* ---------- Sol, avenues et îlots --------------------------------------- */
export function sol() {
  let s = "";
  // socle général
  s += poly([[-1, -1], [TAILLE + 1, -1], [TAILLE + 1, TAILLE + 1], [-1, TAILLE + 1]], "#e7e1d5");
  s += poly([[-1, TAILLE + 1, 0], [TAILLE + 1, TAILLE + 1, 0], [TAILLE + 1, TAILLE + 1, -0.6], [-1, TAILLE + 1, -0.6]], "#cfc7b6");
  s += poly([[TAILLE + 1, -1, 0], [TAILLE + 1, TAILLE + 1, 0], [TAILLE + 1, TAILLE + 1, -0.6], [TAILLE + 1, -1, -0.6]], "#bdb5a4");
  // avenues
  const route = "#cfcbc3";
  [[9, 10], [17, 18]].forEach(([a, b]) => {
    s += poly([[a - 0.3, -1], [b + 0.3, -1], [b + 0.3, TAILLE + 1], [a - 0.3, TAILLE + 1]], route);
    s += poly([[-1, a - 0.3], [TAILLE + 1, a - 0.3], [TAILLE + 1, b + 0.3], [-1, b + 0.3]], route);
  });
  // marquage au sol
  let d = "";
  [[9.5], [17.5]].forEach(([m]) => {
    for (let t = -0.5; t < TAILLE + 1; t += 1.2) {
      if ((t > 8.6 && t < 10.4) || (t > 16.6 && t < 18.4)) continue;
      d += "M" + p(m, t).join(",") + "L" + p(m, t + 0.6).join(",");
      d += "M" + p(t, m).join(",") + "L" + p(t + 0.6, m).join(",");
    }
  });
  s += `<path d="${d}" stroke="#f6f2ea" stroke-width="1.4" fill="none"/>`;
  // îlots (trottoirs + pelouses)
  ORIG.forEach((ox, bx) => ORIG.forEach((oy, by) => {
    const w = 8;
    s += poly([[ox - 0.15, oy - 0.15], [ox + w + 0.15, oy - 0.15], [ox + w + 0.15, oy + w + 0.15], [ox - 0.15, oy + w + 0.15]], "#ddd6c8");
    s += box(ox, oy, 0, w, w, 0.08, { top: "#ebe5d9", left: "#d4ccbc", right: "#c6bead", line: "#c6bead" });
    if ((bx + by) % 2 === 0 && !(bx === 2 && by === 2)) {
      s += poly([[ox + 0.4, oy + 0.4, 0.08], [ox + 2.2, oy + 0.4, 0.08], [ox + 2.2, oy + 2.2, 0.08], [ox + 0.4, oy + 2.2, 0.08]], "#c7d0c1");
    }
  }));
  // bassin devant le siège
  s += poly([[16.6, 11.4, 0.13], [17.0, 11.4, 0.13], [17.0, 16.6, 0.13], [16.6, 16.6, 0.13]], "#b7c6c6");
  return s;
}

/* ---------- Décor (arbres, lampadaires, voitures) ----------------------- */
export function decor(liste) {
  return liste.map(([type, x, y, k]) => {
    if (type === "tree") return tree(x, y, k || 1);
    if (type === "conifer") return conifer(x, y, k || 1);
    if (type === "lamp") return lamp(x, y);
    if (type === "car") return car(x, y, ["#55595f", "#8a9a86", "#e9e3d6", "#c9b490"][Math.floor(x * 7 + y) % 4]);
    return "";
  }).join("");
}

/* ---------- Emprise cliquable (losange de l'îlot) ------------------------ */
export function emprise(bat) {
  const ox = ORIG[bat.bloc[0]], oy = ORIG[bat.bloc[1]];
  return poly([[ox, oy, 0.08], [ox + 8, oy, 0.08], [ox + 8, oy + 8, 0.08], [ox, oy + 8, 0.08]], "transparent", 'class="bat__zone"');
}
