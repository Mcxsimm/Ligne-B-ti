/* ==========================================================================
   Utilitaires d'interface : création d'éléments (sans innerHTML pour les
   données saisies), formats, tableaux, exports, notifications.
   ========================================================================== */

export function el(tag, attrs, enfants) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, "");
    else n.setAttribute(k, String(v));
  }
  (Array.isArray(enfants) ? enfants : enfants !== undefined ? [enfants] : []).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    n.append(typeof c === "string" || typeof c === "number" ? String(c) : c);
  });
  return n;
}
export const vider = (n) => { n.replaceChildren(); return n; };

/* ---------- Formats -------------------------------------------------------- */
const fmtEur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtEurRond = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
/** Centimes → « 12 345,67 € » ; suffixe HT/TTC explicite. */
export function eur(cents, suffixe = "HT", rond = false) {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "—";
  return (rond ? fmtEurRond : fmtEur).format(cents / 100) + (suffixe ? " " + suffixe : "");
}
export function eurSigne(cents, suffixe = "HT") {
  const s = eur(cents, suffixe);
  return cents > 0 ? "+" + s : s;
}
export function pct(v) { return v === null || v === undefined ? "—" : String(v).replace(".", ",") + " %"; }
export function date(iso) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function dateLongue(iso) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
export function aujourdhui() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export const centsVersSaisie = (c) => (c === null || c === undefined ? "" : (c / 100).toFixed(2));

/* ---------- Puces et barres ---------------------------------------------- */
export function puce(texte, ton = "") { return el("span", { class: "puce" + (ton ? " puce--" + ton : ""), text: texte }); }
export function barre(valeur, alerte = false) {
  const v = Math.max(0, Math.min(100, Math.round(valeur || 0)));
  const b = el("span", { class: "progress__val" + (alerte ? " progress__val--alerte" : "") });
  b.style.width = v + "%";
  return el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(v), "aria-label": "Avancement " + v + " %" }, b);
}
export function kpi(lbl, val, sous, ton) {
  return el("div", { class: "kpi" + (ton ? " kpi--" + ton : "") }, [
    el("span", { class: "kpi__lbl", text: lbl }), el("span", { class: "kpi__val", text: val }), sous ? el("span", { class: "kpi__sous", text: sous }) : null,
  ]);
}

/* ---------- Tableau générique ---------------------------------------------
   colonnes : [{ titre, valeur(ligne) → texte|Node, num, csv(ligne) }]        */
export function tableau(colonnes, lignes, options = {}) {
  if (!lignes.length) return el("p", { class: "vide", text: options.vide || "Aucun élément." });
  const thead = el("thead", {}, el("tr", {}, colonnes.map((c) => el("th", { scope: "col", class: c.num ? "num" : null, text: c.titre }))));
  const tbody = el("tbody", {}, lignes.map((l) => {
    const tr = el("tr", { class: options.onClic ? "is-cliquable" : null });
    colonnes.forEach((c, i) => {
      const v = c.valeur(l);
      const td = el("td", { class: [c.num ? "num" : "", c.texte ? "texte" : ""].join(" ").trim() || null });
      if (i === 0 && options.onClic) td.append(el("a", { href: options.lien ? options.lien(l) : "#", class: "lien-ligne", onclick: (e) => { e.preventDefault(); options.onClic(l); } }, v instanceof Node ? v : String(v ?? "—")));
      else td.append(v instanceof Node ? v : String(v ?? "—"));
      tr.append(td);
    });
    return tr;
  }));
  const t = el("table", { class: "table" }, [thead, tbody]);
  if (options.pied) t.append(el("tfoot", {}, el("tr", {}, options.pied.map((v, i) => el("td", { class: colonnes[i] && colonnes[i].num ? "num" : null, text: v ?? "" })))));
  return el("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": options.label || "Tableau" }, t);
}

/* ---------- Exports CSV (séparateur ;, décimales à virgule, BOM pour Excel) */
export function csv(colonnes, lignes) {
  const echap = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const entete = colonnes.map((c) => echap(c.titre)).join(";");
  const corps = lignes.map((l) => colonnes.map((c) => echap(c.csv ? c.csv(l) : c.valeur(l))).join(";"));
  return "﻿" + [entete, ...corps].join("\r\n");
}
export const nombreCsv = (cents) => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ","));
export function telecharger(nom, contenu, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = el("a", { href: url, download: nom });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Notification --------------------------------------------------- */
let minuteur;
export function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.hidden = false;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- Onglets accessibles ------------------------------------------- */
export function onglets(liste, actif, onChange) {
  const nav = el("div", { class: "onglets", role: "tablist" });
  liste.forEach(([cle, lib, compte]) => {
    const b = el("button", { type: "button", class: "onglet", role: "tab", "aria-selected": cle === actif ? "true" : "false", tabindex: cle === actif ? "0" : "-1" },
      [lib, compte !== undefined ? el("span", { class: "puce", text: String(compte) }) : null]);
    b.addEventListener("click", () => onChange(cle));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const bs = [...nav.querySelectorAll(".onglet")];
      const i = bs.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1);
      const cible = bs[(i + bs.length) % bs.length];
      cible.focus();
      cible.click();
    });
    nav.append(b);
  });
  return nav;
}
