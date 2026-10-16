/* ==========================================================================
   Carte interactive : rendu SVG, déplacement, zoom, sélection des bâtiments.
   - Souris : glisser pour se déplacer, molette pour zoomer, clic pour entrer.
   - Tactile : un doigt pour se déplacer, deux doigts pour zoomer.
   - Clavier : Tab parcourt les bâtiments, Entrée ouvre ; flèches déplacent,
     + / − zooment, 0 recentre (lorsque la carte a le focus).
   La caméra est un viewBox (cx, cy, largeur) : le rendu reste vectoriel.
   ========================================================================== */
import { p } from "./iso.js";
import { BATIMENTS, sol, decor, emprise } from "./batiments.js";
import { PARCELLES, solParc, construction, ancre } from "./chantiers.js";

const NS = "http://www.w3.org/2000/svg";
const VUE_INITIALE = { cx: 0, cy: 360, w: 2050 };
const LIMITES = { minW: 480, maxW: 2900, minX: -1150, maxX: 1150, minY: -250, maxY: 1100 };
const reduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Sur petit écran, on cadre plus serré pour garder les bâtiments lisibles
const vueInitiale = () => (window.innerWidth < 760 ? { cx: 0, cy: 380, w: 1150 } : { ...VUE_INITIALE });

export function creerCarte(conteneur, options) {
  const { onOpen, indicateurs, chantiers = () => [], onOpenChantier = () => {} } = options;
  let vue = vueInitiale();
  let anim = null;

  /* ---------- Construction du SVG (une seule fois) ---------------------- */
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "carte__svg");
  svg.setAttribute("role", "application");
  svg.setAttribute("aria-label", "Carte de l'entreprise. Utilisez Tab pour parcourir les bâtiments, Entrée pour ouvrir un module, les flèches pour vous déplacer et + ou − pour zoomer.");
  svg.setAttribute("tabindex", "0");

  const tri = [...BATIMENTS].sort((a, b) => (a.bloc[0] + a.bloc[1]) - (b.bloc[0] + b.bloc[1]) || a.bloc[0] - b.bloc[0]);
  let html = `<defs>
      <radialGradient id="halo" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fffdf8" stop-opacity="0.9"/><stop offset="1" stop-color="#fffdf8" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="0" cy="420" rx="1200" ry="700" fill="url(#halo)"/>
    <g class="carte__sol">${solParc()}${sol()}</g>`;
  tri.forEach((b) => {
    html += `<g class="bat" data-module="${b.id}" tabindex="0" role="button" aria-label="${b.nom} : ${b.role}">
      ${emprise(b)}
      <g class="bat__corps">${b.dessin()}</g>
    </g>`;
    html += `<g class="carte__decor" aria-hidden="true">${decor(b.decor || [])}</g>`;
  });
  html += `<g class="carte__parc" id="parc-chantiers"></g>`;
  svg.innerHTML = html;
  conteneur.appendChild(svg);
  const coucheParc = svg.querySelector("#parc-chantiers");

  // Étiquettes HTML : taille constante quel que soit le zoom
  const calque = document.createElement("div");
  calque.className = "carte__etiquettes";
  calque.setAttribute("aria-hidden", "true");
  const etiquettes = {};
  BATIMENTS.forEach((b) => {
    const e = document.createElement("div");
    e.className = "etiquette";
    e.dataset.module = b.id;
    e.innerHTML = `<span class="etiquette__nom"></span><span class="etiquette__badge" hidden></span>`;
    e.querySelector(".etiquette__nom").textContent = b.nom;
    e.addEventListener("click", () => ouvrir(b.id));
    calque.appendChild(e);
    etiquettes[b.id] = e;
  });
  // nom du parc des chantiers (repère fixe)
  const nomParc = document.createElement("div");
  nomParc.className = "etiquette-zone";
  nomParc.textContent = "Parc des chantiers";
  calque.appendChild(nomParc);
  conteneur.appendChild(calque);
  let epingles = [];   // étiquettes des chantiers : { el, x, y }

  // Infobulle de survol
  const bulle = document.createElement("div");
  bulle.className = "bulle";
  bulle.setAttribute("role", "status");
  bulle.hidden = true;
  conteneur.appendChild(bulle);

  /* ---------- Caméra ---------------------------------------------------- */
  function dims() {
    const r = svg.getBoundingClientRect();
    return { W: r.width || 1, H: r.height || 1, r };
  }
  function borner(v) {
    const w = Math.min(LIMITES.maxW, Math.max(LIMITES.minW, v.w));
    return {
      w,
      cx: Math.min(LIMITES.maxX, Math.max(LIMITES.minX, v.cx)),
      cy: Math.min(LIMITES.maxY, Math.max(LIMITES.minY, v.cy)),
    };
  }
  function appliquer() {
    const { W, H } = dims();
    const h = vue.w * (H / W);
    svg.setAttribute("viewBox", `${vue.cx - vue.w / 2} ${vue.cy - h / 2} ${vue.w} ${h}`);
    placerEtiquettes();
    conteneur.dataset.zoom = vue.w < 1100 ? "proche" : vue.w > 2400 ? "loin" : "moyen";
  }
  // conversion écran → monde
  function versMonde(clientX, clientY) {
    const { W, H, r } = dims();
    const k = vue.w / W;
    return [vue.cx + (clientX - r.left - W / 2) * k, vue.cy + (clientY - r.top - H / 2) * k];
  }
  function versEcran(wx, wy) {
    const { W, H } = dims();
    const k = W / vue.w;
    return [(wx - vue.cx) * k + W / 2, (wy - vue.cy) * k + H / 2];
  }
  function zoomer(facteur, clientX, clientY) {
    const { r } = dims();
    const cxp = clientX ?? r.left + r.width / 2, cyp = clientY ?? r.top + r.height / 2;
    const [mx, my] = versMonde(cxp, cyp);
    const w = Math.min(LIMITES.maxW, Math.max(LIMITES.minW, vue.w * facteur));
    const f = w / vue.w;
    vue = borner({ w, cx: mx + (vue.cx - mx) * f, cy: my + (vue.cy - my) * f });
    appliquer();
  }
  function animerVers(cible, duree = 520) {
    cancelAnimationFrame(anim);
    cible = borner(cible);
    if (reduit()) { vue = cible; appliquer(); return Promise.resolve(); }
    const depart = { ...vue }, t0 = performance.now();
    return new Promise((res) => {
      const pas = (t) => {
        const u = Math.min(1, (t - t0) / duree);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        vue = { cx: depart.cx + (cible.cx - depart.cx) * e, cy: depart.cy + (cible.cy - depart.cy) * e, w: depart.w + (cible.w - depart.w) * e };
        appliquer();
        if (u < 1) anim = requestAnimationFrame(pas); else res();
      };
      anim = requestAnimationFrame(pas);
    });
  }

  /* ---------- Étiquettes et indicateurs --------------------------------- */
  function placerEtiquettes() {
    BATIMENTS.forEach((b) => {
      const [wx, wy] = p(b.centre[0], b.centre[1], b.sommet + 0.6);
      const [sx, sy] = versEcran(wx, wy);
      etiquettes[b.id].style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    });
    {
      const [zx, zy] = versEcran(...p(13.5, 33.4, 0));
      nomParc.style.transform = `translate(${Math.round(zx)}px, ${Math.round(zy)}px) translate(-50%, -50%) rotate(26.57deg)`;
    }
    epingles.forEach((e) => {
      const [sx, sy] = versEcran(e.x, e.y);
      e.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    });
  }

  /* ---------- Parc des chantiers (couche dynamique) --------------------- */
  function dessinerParc() {
    const liste = chantiers().slice(0, PARCELLES.length);
    let h = "";
    liste.forEach((ch, i) => {
      const l = PARCELLES[i];
      h += `<g class="bat bat--chantier" data-chantier="${ch.id}" tabindex="0" role="button" aria-label="Chantier ${ch.nom.replace(/"/g, "&quot;")} : avancement ${ch.avancement} %${ch.alerte ? ", alerte" : ""}">
        ${poly4(l)}<g class="bat__corps">${construction(l, ch)}</g></g>`;
    });
    coucheParc.innerHTML = h;
    epingles.forEach((e) => e.el.remove());
    epingles = liste.map((ch, i) => {
      const el = document.createElement("div");
      el.className = "epingle" + (ch.alerte ? " epingle--alerte" : "");
      el.dataset.chantier = ch.id;
      const nom = document.createElement("span"); nom.className = "epingle__nom"; nom.textContent = ch.court || ch.nom;
      const pct = document.createElement("span"); pct.className = "epingle__pct"; pct.textContent = ch.avancement + " %";
      el.append(nom, pct);
      el.addEventListener("click", () => ouvrirChantier(ch.id));
      calque.appendChild(el);
      const [x, y] = ancre(PARCELLES[i], ch);
      return { el, x, y, ch };
    });
    placerEtiquettes();
  }
  function poly4(l) {
    const pts = [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.d], [l.x, l.y + l.d]].map(([a, b2]) => p(a, b2, 0.03).join(",")).join(" ");
    return `<polygon class="bat__zone" points="${pts}" fill="transparent"/>`;
  }
  async function ouvrirChantier(id) {
    const e = epingles.find((x) => x.ch.id === id);
    cacherBulle();
    vueAvantOuverture = { ...vue };
    if (e) await animerVers({ cx: e.x, cy: e.y + 60, w: 560 }, 420);
    onOpenChantier(id);
  }
  function rafraichir() {
    dessinerParc();
    BATIMENTS.forEach((b) => {
      const ind = indicateurs(b.id) || {};
      const badge = etiquettes[b.id].querySelector(".etiquette__badge");
      if (ind.badge) {
        badge.hidden = false;
        badge.textContent = ind.badge.texte;
        badge.className = "etiquette__badge etiquette__badge--" + (ind.badge.niveau || "info");
        badge.title = ind.badge.titre || "";
      } else badge.hidden = true;
      const g = svg.querySelector(`.bat[data-module="${b.id}"]`);
      g.setAttribute("aria-label", `${b.nom} : ${b.role}${ind.resume ? ". " + ind.resume : ""}`);
      g.classList.toggle("bat--alerte", !!(ind.badge && ind.badge.niveau === "alerte"));
    });
  }

  function montrerBulle(id, ancrePt) {
    const b = BATIMENTS.find((x) => x.id === id);
    const ind = indicateurs(id) || {};
    remplirBulle(b.nom, b.role, ind.lignes || [], "Cliquer pour ouvrir →");
    positionnerBulle(ancrePt, etiquettes[id]);
    Object.values(etiquettes).forEach((el) => el.classList.toggle("is-active", el.dataset.module === id));
  }
  function montrerBulleChantier(id, ancrePt) {
    const e = epingles.find((x) => x.ch.id === id);
    if (!e) return;
    remplirBulle(e.ch.nom, "Chantier · " + e.ch.statutLibelle, e.ch.lignes || [], "Cliquer pour ouvrir le suivi →");
    positionnerBulle(ancrePt, e.el);
    Object.values(etiquettes).forEach((el) => el.classList.remove("is-active"));
  }
  function remplirBulle(titre, role, lignes, action) {
    bulle.innerHTML = "";
    const h = document.createElement("p"); h.className = "bulle__titre"; h.textContent = titre;
    const r = document.createElement("p"); r.className = "bulle__role"; r.textContent = role;
    bulle.append(h, r);
    if (lignes.length) {
      const dl = document.createElement("dl");
      lignes.forEach(([k, v]) => { const dt = document.createElement("dt"); dt.textContent = k; const dd = document.createElement("dd"); dd.textContent = v; dl.append(dt, dd); });
      bulle.appendChild(dl);
    }
    const a = document.createElement("p"); a.className = "bulle__action"; a.textContent = action;
    bulle.appendChild(a);
    bulle.hidden = false;
  }
  function positionnerBulle(ancrePt, el) {
    const { r: rect } = dims();
    const e = el.getBoundingClientRect();
    const x = (ancrePt ? ancrePt[0] : e.left + e.width / 2) - rect.left;
    const y = (ancrePt ? ancrePt[1] : e.top) - rect.top;
    const bw = bulle.offsetWidth, bh = bulle.offsetHeight;
    bulle.style.left = Math.max(8, Math.min(rect.width - bw - 8, x + 16)) + "px";
    bulle.style.top = Math.max(8, Math.min(rect.height - bh - 8, y - bh / 2)) + "px";
  }
  function cacherBulle() {
    bulle.hidden = true;
    Object.values(etiquettes).forEach((el) => el.classList.remove("is-active"));
  }

  /* ---------- Ouverture d'un module ------------------------------------- */
  let vueAvantOuverture = null;
  async function ouvrir(id) {
    const b = BATIMENTS.find((x) => x.id === id);
    if (!b) return;
    cacherBulle();
    vueAvantOuverture = { ...vue };
    const [wx, wy] = p(b.centre[0], b.centre[1], b.sommet / 2);
    conteneur.classList.add("is-entering");
    await animerVers({ cx: wx, cy: wy, w: 620 }, 480);
    conteneur.classList.remove("is-entering");
    onOpen(id);
  }

  /* ---------- Événements pointeur --------------------------------------- */
  const pointeurs = new Map();
  let glisse = null, pince = null, aBouge = false;

  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    svg.setPointerCapture(e.pointerId);
    pointeurs.set(e.pointerId, [e.clientX, e.clientY]);
    aBouge = false;
    cancelAnimationFrame(anim);
    if (pointeurs.size === 1) glisse = { x: e.clientX, y: e.clientY, vue: { ...vue }, cible: e.target.closest(".bat") };
    if (pointeurs.size === 2) {
      const [a, b] = [...pointeurs.values()];
      pince = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), w: vue.w };
      glisse = null;
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pointeurs.has(e.pointerId)) {
      // survol simple
      const g = e.target.closest && e.target.closest(".bat");
      if (g && g.dataset.chantier && e.pointerType === "mouse") montrerBulleChantier(g.dataset.chantier, [e.clientX, e.clientY]);
      else if (g && e.pointerType === "mouse") montrerBulle(g.dataset.module, [e.clientX, e.clientY]);
      else if (e.pointerType === "mouse") cacherBulle();
      return;
    }
    pointeurs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pince && pointeurs.size === 2) {
      const [a, b] = [...pointeurs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const cible = pince.w * (pince.dist / Math.max(d, 1));
      zoomer(cible / vue.w, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      aBouge = true;
      return;
    }
    if (glisse) {
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) { aBouge = true; cacherBulle(); conteneur.classList.add("is-dragging"); }
      if (aBouge) {
        const k = glisse.vue.w / dims().W;
        vue = borner({ ...glisse.vue, cx: glisse.vue.cx - dx * k, cy: glisse.vue.cy - dy * k });
        appliquer();
      }
    }
  });
  const fin = (e) => {
    const etaitClic = pointeurs.size === 1 && glisse && !aBouge;
    const cible = glisse && glisse.cible;
    pointeurs.delete(e.pointerId);
    if (pointeurs.size < 2) pince = null;
    if (pointeurs.size === 0) { glisse = null; conteneur.classList.remove("is-dragging"); }
    if (etaitClic && cible && e.type === "pointerup") { if (cible.dataset.chantier) ouvrirChantier(cible.dataset.chantier); else ouvrir(cible.dataset.module); }
  };
  svg.addEventListener("pointerup", fin);
  svg.addEventListener("pointercancel", fin);
  svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pointeurs.size) cacherBulle(); });

  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    cacherBulle();
    zoomer(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), e.clientX, e.clientY);
  }, { passive: false });

  /* ---------- Clavier --------------------------------------------------- */
  svg.addEventListener("keydown", (e) => {
    const g = e.target.closest && e.target.closest(".bat");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); if (g.dataset.chantier) ouvrirChantier(g.dataset.chantier); else ouvrir(g.dataset.module); return; }
    const pasPx = vue.w * 0.08;
    const actions = {
      ArrowLeft: () => animerVers({ ...vue, cx: vue.cx - pasPx }, 160),
      ArrowRight: () => animerVers({ ...vue, cx: vue.cx + pasPx }, 160),
      ArrowUp: () => animerVers({ ...vue, cy: vue.cy - pasPx }, 160),
      ArrowDown: () => animerVers({ ...vue, cy: vue.cy + pasPx }, 160),
      "+": () => animerVers({ ...vue, w: vue.w / 1.25 }, 180),
      "=": () => animerVers({ ...vue, w: vue.w / 1.25 }, 180),
      "-": () => animerVers({ ...vue, w: vue.w * 1.25 }, 180),
      "0": () => animerVers(vueInitiale()),
    };
    if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
  });
  svg.addEventListener("focusin", (e) => {
    const g = e.target.closest && e.target.closest(".bat");
    if (g && g.dataset.chantier) montrerBulleChantier(g.dataset.chantier);
    else if (g) montrerBulle(g.dataset.module);
  });
  svg.addEventListener("focusout", cacherBulle);

  /* ---------- Taille ---------------------------------------------------- */
  new ResizeObserver(() => appliquer()).observe(conteneur);
  appliquer();
  rafraichir();

  return {
    rafraichir,
    zoomer: (f) => animerVers({ ...vue, w: vue.w * f }, 220),
    recentrer: () => animerVers(vueInitiale()),
    ouvrir,
    ouvrirChantier,
    retour() {
      // revient au cadrage d'avant l'ouverture, sans perdre le contexte
      if (vueAvantOuverture) { const v = vueAvantOuverture; vueAvantOuverture = null; return animerVers(v, 420); }
      return Promise.resolve();
    },
    vue: () => ({ ...vue }),
    focusBatiment(id) { const g = svg.querySelector(`.bat[data-module="${id}"]`); if (g) g.focus(); },
  };
}
