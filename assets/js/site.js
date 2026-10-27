/* ==========================================================================
   ChargéPro — scripts du site de vente
   JavaScript natif, sans dépendance. Le site reste utilisable sans JS :
   menu affiché en clair, FAQ native (<details>), formulaire envoyé en POST.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  /* 1. Apparition douce des blocs au défilement ---------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var viewport = window.innerHeight || root.clientHeight;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < viewport) {
        el.classList.add("is-visible");
      } else {
        observer.observe(el);
      }
    });
  }

  /* 2. Navigation mobile --------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("menu-principal");
    if (!toggle || !menu) return;
    var label = toggle.querySelector(".nav-toggle__text");

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      label.textContent = open ? "Fermer" : "Menu";
      menu.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" &&
          !menu.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    window.matchMedia("(min-width: 960px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* 3. En-tête : filet après défilement ------------------------------------ */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* 4. Année courante ------------------------------------------------------ */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* 5. Onglets des écrans (motif ARIA « tabs », activation manuelle au clic,
        flèches gauche/droite, Début et Fin). Sans JS, tous les panneaux s'affichent. */
  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (box) {
      var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
        });
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(tab, false); });
        tab.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === "Home") next = tabs[0];
          else if (e.key === "End") next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            select(next, true);
          }
        });
      });

      select(tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0], false);
    });
  }

  /* 6. Formulaire de demande de démo (Web3Forms) ----------------------------
     - Si la clé d'accès n'est pas renseignée, rien n'est simulé : le bouton
       ouvre la messagerie avec la demande pré-remplie (data-fallback-email).
     - Aucune donnée n'est stockée dans le dépôt ni dans le navigateur.
     ------------------------------------------------------------------------ */
  var MESSAGES = {
    valueMissing: "Ce champ est obligatoire.",
    email: "Indiquez une adresse e-mail valide, par exemple nom@entreprise.fr.",
    tel: "Indiquez un numéro de téléphone valide (10 chiffres).",
    consent: "Cochez cette case pour envoyer votre demande.",
    select: "Choisissez une option."
  };

  function fieldError(input) {
    var v = input.validity;
    if (input.type === "checkbox" && v.valueMissing) return MESSAGES.consent;
    if (input.tagName === "SELECT" && v.valueMissing) return MESSAGES.select;
    if (v.valueMissing) return MESSAGES.valueMissing;
    if (input.type === "email" && (v.typeMismatch || v.patternMismatch)) return MESSAGES.email;
    if (input.type === "tel" && v.patternMismatch) return MESSAGES.tel;
    return "";
  }

  function showFieldError(input, message) {
    var wrapper = input.closest(".field");
    var error = wrapper && wrapper.querySelector(".field__error");
    if (!wrapper || !error) return;
    error.textContent = message;
    wrapper.classList.toggle("has-error", Boolean(message));
    if (message) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function validateField(input) {
    if (input.type !== "checkbox" && input.tagName !== "SELECT" && input.value.trim() === "" && input.value !== "") {
      input.value = "";
    }
    var message = fieldError(input);
    showFieldError(input, message);
    return !message;
  }

  function isConfigured(form) {
    var key = form.querySelector('input[name="access_key"]');
    return key && key.value && key.value.indexOf("A_COMPLETER") === -1;
  }

  function labelFor(form, input) {
    var label = form.querySelector('label[for="' + input.id + '"]');
    return label ? label.textContent.replace(/\s*\*|\(facultatif\)/g, "").trim() : input.name;
  }

  function buildMailto(form) {
    var email = form.getAttribute("data-fallback-email");
    if (!email || email.indexOf("@") === -1) return "";
    var lines = [];
    form.querySelectorAll("input:not([type=hidden]):not([type=checkbox]), select, textarea").forEach(function (input) {
      lines.push(labelFor(form, input) + " : " + (input.value || "non renseigné"));
    });
    return "mailto:" + email +
      "?subject=" + encodeURIComponent("Demande de démo ChargéPro") +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function setStatus(box, type, html) {
    box.className = "form-status form-status--" + type;
    box.innerHTML = html;
    box.hidden = false;
  }

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = document.getElementById("form-status");
    var submit = form.querySelector('[type="submit"]');
    var submitLabel = submit.innerHTML;
    var success = document.getElementById("form-success");
    var fields = form.querySelectorAll("input:not([type=hidden]):not(.hp-input), select, textarea");

    form.setAttribute("novalidate", "");

    fields.forEach(function (input) {
      input.addEventListener("blur", function () {
        if (input.value !== "" || input.dataset.touched) {
          input.dataset.touched = "1";
          validateField(input);
        }
      });
      ["input", "change"].forEach(function (type) {
        input.addEventListener(type, function () {
          if (input.getAttribute("aria-invalid") === "true") validateField(input);
        });
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstInvalid = null;
      var errors = 0;
      fields.forEach(function (input) {
        input.dataset.touched = "1";
        if (!validateField(input)) {
          errors += 1;
          if (!firstInvalid) firstInvalid = input;
        }
      });
      if (firstInvalid) {
        setStatus(status, "error",
          "<p>" + (errors > 1 ? errors + " champs sont à corriger." : "Un champ est à corriger.") + "</p>");
        firstInvalid.focus();
        return;
      }

      if (!isConfigured(form)) {
        var mailto = buildMailto(form);
        if (mailto) {
          setStatus(status, "info",
            "<p>Votre messagerie s'ouvre avec la demande pré-remplie. " +
            "<strong>Elle ne part qu'une fois envoyée depuis votre messagerie.</strong></p>");
          window.location.href = mailto;
        } else {
          setStatus(status, "error",
            "<p><strong>Demande non envoyée</strong> : le formulaire n'est pas encore activé. " +
            "Écrivez-nous avec les coordonnées de cette page.</p>");
        }
        return;
      }

      var payload = {};
      new FormData(form).forEach(function (value, key) { payload[key] = value; });
      payload.subject = "Demande de démo ChargéPro — " + (payload.entreprise || payload.nom || "");
      payload.from_name = "Site ChargéPro";
      if (payload.email) payload.replyto = payload.email;

      submit.disabled = true;
      submit.classList.add("is-loading");
      submit.innerHTML = '<span class="spinner" aria-hidden="true"></span> Envoi en cours…';
      status.hidden = true;

      var controller = "AbortController" in window ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok || data.success === false) {
              throw new Error(data.message || "Erreur " + response.status);
            }
            return data;
          });
        })
        .then(function () {
          form.reset();
          form.hidden = true;
          status.hidden = true;
          success.hidden = false;
          success.focus();
        })
        .catch(function () {
          var mail = form.getAttribute("data-fallback-email");
          setStatus(status, "error",
            "<p><strong>Votre demande n'est pas partie.</strong> Vérifiez votre connexion puis réessayez" +
            (mail && mail.indexOf("@") !== -1
              ? ', ou écrivez à <a href="mailto:' + mail + '">' + mail + "</a>."
              : ".") +
            " Vos réponses sont conservées.</p>");
          status.focus();
        })
        .then(function () {
          if (timer) clearTimeout(timer);
          submit.disabled = false;
          submit.classList.remove("is-loading");
          submit.innerHTML = submitLabel;
        });
    });
  }

  initReveal();
  initNav();
  initHeader();
  initYear();
  initTabs();
  initContactForm();
})();
