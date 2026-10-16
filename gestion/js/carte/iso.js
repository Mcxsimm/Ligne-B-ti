/* ==========================================================================
   Moteur isométrique SVG — Ligne&Bati Gestion
   Repère : x vers la droite-bas, y vers la gauche-bas, z vers le haut.
   Une unité de grille = une dalle de TW × TH pixels (rapport 2:1).
   Toutes les fonctions renvoient des chaînes SVG (assemblées une seule fois).
   ========================================================================== */

export const TW = 64;          // largeur d'une dalle
export const TH = 32;          // hauteur d'une dalle
export const HZ = 34;          // hauteur d'un niveau (z = 1)

/** Projection d'un point de la grille vers l'écran. */
export function p(x, y, z = 0) {
  return [(x - y) * (TW / 2), (x + y) * (TH / 2) - z * HZ];
}

const pt = (x, y, z) => p(x, y, z).map((v) => Math.round(v * 10) / 10).join(",");

export function poly(points, fill, extra = "") {
  return `<polygon points="${points.map((a) => pt(a[0], a[1], a[2] || 0)).join(" ")}" fill="${fill}" ${extra}/>`;
}

/* ---------- Couleurs : un matériau = trois teintes (dessus, gauche, droite) */
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
export function shade(c, f) {
  const [r, g, b] = hex(c);
  return f >= 0 ? toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : toHex(r * (1 + f), g * (1 + f), b * (1 + f));
}
export function material(base) {
  return { top: shade(base, 0.18), left: base, right: shade(base, -0.16), line: shade(base, -0.32) };
}

export const MAT = {
  anthracite: material("#3b3f45"),
  graphite: material("#55595f"),
  mineral: material("#b9bcb8"),
  ivoire: material("#e9e3d6"),
  pierre: material("#d8d0c1"),
  sauge: material("#8a9a86"),
  sable: material("#c9b490"),
  verre: { top: "#cfdcdc", left: "#a9bdbf", right: "#8ea4a7", line: "#6f8689" },
};

/* ---------- Ombre portée (projection simple vers la gauche-bas) */
export function shadow(x, y, w, d, h) {
  const k = Math.min(h, 6) * 0.55;
  return poly([[x, y + d], [x + w, y + d], [x + w + 0.01, y + d + k], [x + k * 0.2, y + d + k]], "rgba(35,38,42,0.10)") +
    poly([[x + w, y], [x + w + k, y + k * 0.4], [x + w + k, y + d + k], [x + w, y + d]], "rgba(35,38,42,0.08)");
}

/* ---------- Pavé : volume de base de tous les bâtiments */
export function box(x, y, z, w, d, h, m, opts = {}) {
  const t = z + h;
  let s = "";
  // face droite (plan x = x + w)
  s += poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, t], [x + w, y, t]], m.right, `stroke="${m.line}" stroke-width="0.6" stroke-linejoin="round"`);
  // face gauche (plan y = y + d)
  s += poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, t], [x, y + d, t]], m.left, `stroke="${m.line}" stroke-width="0.6" stroke-linejoin="round"`);
  // dessus
  if (!opts.noTop) s += poly([[x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t]], m.top, `stroke="${m.line}" stroke-width="0.6" stroke-linejoin="round"`);
  return s;
}

/* ---------- Fenêtres en bandes sur les deux faces visibles */
export function windows(x, y, z, w, d, h, opts = {}) {
  const color = opts.color || "rgba(40,52,58,0.55)";
  const lit = opts.lit || "rgba(232,214,170,0.85)";
  const rows = opts.rows || Math.max(1, Math.floor(h * 1.6));
  const step = opts.step || 0.5;
  const fill = opts.fill || 0.55;
  let s = "";
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const z0 = z + (h / rows) * r + (h / rows) * 0.28;
    const z1 = z0 + (h / rows) * fill;
    // face droite : le long de y
    for (let j = step * 0.35; j + step * 0.6 <= d; j += step) {
      const c = (k++ * 7) % 11 === 0 ? lit : color;
      s += poly([[x + w, y + j, z0], [x + w, y + j + step * 0.6, z0], [x + w, y + j + step * 0.6, z1], [x + w, y + j, z1]], c);
    }
    // face gauche : le long de x
    for (let i = step * 0.35; i + step * 0.6 <= w; i += step) {
      const c = (k++ * 5) % 13 === 0 ? lit : color;
      s += poly([[x + i, y + d, z0], [x + i + step * 0.6, y + d, z0], [x + i + step * 0.6, y + d, z1], [x + i, y + d, z1]], c);
    }
  }
  return s;
}

/* ---------- Façade vitrée continue (mur-rideau) avec meneaux */
export function curtain(x, y, z, w, d, h) {
  let s = "";
  s += poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], "rgba(120,146,150,0.55)");
  s += poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], "rgba(150,172,174,0.55)");
  const lines = [];
  for (let j = 0.5; j < d; j += 0.5) lines.push([[x + w, y + j, z], [x + w, y + j, z + h]]);
  for (let i = 0.5; i < w; i += 0.5) lines.push([[x + i, y + d, z], [x + i, y + d, z + h]]);
  for (let k = 1; k < h * 2; k++) {
    const zz = z + k * 0.5;
    lines.push([[x + w, y, zz], [x + w, y + d, zz]]);
    lines.push([[x, y + d, zz], [x + w, y + d, zz]]);
  }
  s += `<path d="${lines.map((l) => "M" + pt(...l[0]) + "L" + pt(...l[1])).join("")}" stroke="rgba(255,255,255,0.35)" stroke-width="0.7" fill="none"/>`;
  // reflet diagonal
  s += poly([[x + w, y + d * 0.15, z + h * 0.15], [x + w, y + d * 0.35, z + h * 0.15], [x + w, y + d * 0.65, z + h * 0.85], [x + w, y + d * 0.45, z + h * 0.85]], "rgba(255,255,255,0.16)");
  return s;
}

/* ---------- Petits éléments de décor */
export function tree(x, y, size = 1) {
  const [cx, cy] = p(x, y, 0);
  const r = 9 * size;
  return `<g class="tree">
    <ellipse cx="${cx + 3}" cy="${cy + 2}" rx="${r * 0.9}" ry="${r * 0.42}" fill="rgba(35,38,42,0.10)"/>
    <rect x="${cx - 1.2}" y="${cy - r * 1.1}" width="2.4" height="${r * 1.1}" fill="#6b5a45"/>
    <circle cx="${cx}" cy="${cy - r * 1.55}" r="${r}" fill="#7f9179"/>
    <circle cx="${cx - r * 0.3}" cy="${cy - r * 1.8}" r="${r * 0.55}" fill="#93a48d"/>
  </g>`;
}

export function conifer(x, y, size = 1) {
  const [cx, cy] = p(x, y, 0);
  const h = 26 * size, w = 9 * size;
  return `<g class="tree">
    <ellipse cx="${cx + 3}" cy="${cy + 2}" rx="${w}" ry="${w * 0.45}" fill="rgba(35,38,42,0.10)"/>
    <polygon points="${cx},${cy - h} ${cx + w},${cy - 3} ${cx - w},${cy - 3}" fill="#6f8169"/>
    <polygon points="${cx},${cy - h} ${cx + w},${cy - 3} ${cx},${cy - 1}" fill="#5f7059"/>
  </g>`;
}

export function lamp(x, y) {
  const [cx, cy] = p(x, y, 0);
  return `<g><rect x="${cx - 0.7}" y="${cy - 22}" width="1.4" height="22" fill="#55595f"/><circle cx="${cx}" cy="${cy - 23}" r="2.6" fill="#f1e2bf"/></g>`;
}

export function car(x, y, color = "#55595f", rot = false) {
  return rot ? box(x, y, 0, 0.42, 0.8, 0.28, material(color)) : box(x, y, 0, 0.8, 0.42, 0.28, material(color));
}

/** Plaque de signalétique posée au sol devant un bâtiment. */
export function plaque(x, y, z = 0.05) {
  return box(x, y, z, 0.9, 0.08, 0.32, MAT.anthracite);
}
