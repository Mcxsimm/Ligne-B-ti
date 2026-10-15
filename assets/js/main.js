/* ==========================================================================
   Ligne&Bati — scripts du site
   JavaScript natif, sans dépendance. Le site reste utilisable sans JS :
   menu affiché en clair, FAQ native (<details>), formulaire envoyé en POST.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  /* ------------------------------------------------------------------------
     1. Apparition douce des blocs au défilement
     Les éléments déjà visibles au chargement sont affichés immédiatement
     pour éviter tout clignotement.
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var viewport = window.innerHeight || document.documentElement.clientHeight;
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

  /* ------------------------------------------------------------------------
     2. Navigation mobile
     ------------------------------------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("menu-principal");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".nav-toggle__text").textContent = open ? "Fermer" : "Menu";
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

  /* ------------------------------------------------------------------------
     3. En-tête : filet discret après défilement
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     4. Année courante dans le pied de page
     ------------------------------------------------------------------------ */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------------------
     5. Formulaire de contact
     Envoi réel vers le service Web3Forms (offre gratuite) via fetch.
     - Si la clé d'accès n'est pas encore renseignée, aucun envoi n'est
       simulé : un message l'indique et propose l'e-mail, s'il est configuré.
     - Aucune donnée n'est stockée dans le dépôt GitHub ni dans le navigateur.
     ------------------------------------------------------------------------ */
  var MESSAGES = {
    valueMissing: "Ce champ est obligatoire.",
    email: "Indiquez une adresse e-mail valide, par exemple nom@exemple.fr.",
    tel: "Indiquez un numéro de téléphone valide (10 chiffres).",
    tooShort: function (min) {
      return "Merci de détailler un peu plus votre projet (" + min + " caractères minimum).";
    },
    consent: "Merci de confirmer que vous avez pris connaissance de l'information sur vos données.",
    select: "Merci de choisir une option."
  };

  function fieldError(input) {
    var v = input.validity;
    if (input.type === "checkbox" && v.valueMissing) return MESSAGES.consent;
    if (input.tagName === "SELECT" && v.valueMissing) return MESSAGES.select;
    if (v.valueMissing) return MESSAGES.valueMissing;
    if (input.type === "email" && (v.typeMismatch || v.patternMismatch)) return MESSAGES.email;
    if (input.type === "tel" && v.patternMismatch) return MESSAGES.tel;
    if (v.tooShort) return MESSAGES.tooShort(input.minLength);
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
    // Normalise les espaces avant contrôle (sauf case à cocher)
    if (input.type !== "checkbox" && typeof input.value === "string" && input.tagName !== "SELECT") {
      if (input.value.trim() === "" && input.value !== "") input.value = "";
    }
    var message = fieldError(input);
    showFieldError(input, message);
    return !message;
  }

  function isConfigured(form) {
    var key = form.querySelector('input[name="access_key"]');
    return key && key.value && key.value.indexOf("A_COMPLETER") === -1;
  }

  function buildMailto(form) {
    var email = form.getAttribute("data-fallback-email");
    if (!email || email.indexOf("@") === -1) return "";
    var data = new FormData(form);
    var lines = [
      "Nom : " + (data.get("nom") || ""),
      "E-mail : " + (data.get("email") || ""),
      "Téléphone : " + (data.get("telephone") || "non renseigné"),
      "Commune du projet : " + (data.get("commune") || ""),
      "Type de bien : " + (data.get("type_de_bien") || ""),
      "Nature du projet : " + (data.get("nature_du_projet") || ""),
      "Budget indicatif : " + (data.get("budget") || "non renseigné"),
      "Calendrier : " + (data.get("calendrier") || "non renseigné"),
      "",
      "Description :",
      data.get("description") || ""
    ];
    return "mailto:" + email +
      "?subject=" + encodeURIComponent("Demande de contact — projet à " + (data.get("commune") || "")) +
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

    // Avertissement immédiat si le service d'envoi n'est pas encore configuré
    if (!isConfigured(form)) {
      var mail = form.getAttribute("data-fallback-email");
      setStatus(status, "info",
        "<p><strong>Le formulaire n'est pas encore activé.</strong> " +
        (mail && mail.indexOf("@") !== -1
          ? "En attendant, le bouton ouvrira votre messagerie avec votre demande pré-remplie, adressée à " + mail + "."
          : "Il le sera dès la mise en service du site. Merci d'utiliser les coordonnées indiquées sur cette page.") +
        "</p>");
    }

    // Validation au fil de la saisie (après le premier passage dans le champ)
    fields.forEach(function (input) {
      input.addEventListener("blur", function () {
        if (input.value !== "" || input.dataset.touched) {
          input.dataset.touched = "1";
          validateField(input);
        }
      });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") validateField(input);
      });
      input.addEventListener("change", function () {
        if (input.getAttribute("aria-invalid") === "true") validateField(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // 1. Validation
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
          "<p>" + (errors > 1
            ? errors + " champs sont à corriger avant l'envoi."
            : "Un champ est à corriger avant l'envoi.") + "</p>");
        firstInvalid.focus();
        return;
      }

      // 2. Service non configuré : repli e-mail explicite, jamais d'envoi simulé
      if (!isConfigured(form)) {
        var mailto = buildMailto(form);
        if (mailto) {
          setStatus(status, "info",
            "<p>Votre messagerie va s'ouvrir avec votre demande pré-remplie. " +
            "<strong>Votre message ne sera envoyé que lorsque vous l'aurez validé dans votre messagerie.</strong></p>");
          window.location.href = mailto;
        } else {
          setStatus(status, "error",
            "<p><strong>Votre demande n'a pas été envoyée</strong> : le formulaire n'est pas encore activé. " +
            "Merci d'utiliser les coordonnées indiquées sur cette page.</p>");
        }
        return;
      }

      // 3. Envoi réel
      var payload = {};
      new FormData(form).forEach(function (value, key) { payload[key] = value; });
      payload.subject = "Nouvelle demande — " + (payload.nature_du_projet || "projet") + " à " + (payload.commune || "");
      payload.from_name = "Site Ligne&Bati";
      if (payload.email) payload.replyto = payload.email;

      submit.disabled = true;
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
          success.scrollIntoView({ block: "start" });
        })
        .catch(function () {
          var mail = form.getAttribute("data-fallback-email");
          setStatus(status, "error",
            "<p><strong>Votre demande n'a pas pu être envoyée.</strong> " +
            "Vérifiez votre connexion puis réessayez" +
            (mail && mail.indexOf("@") !== -1
              ? ', ou écrivez directement à <a href="mailto:' + mail + '">' + mail + "</a>."
              : ".") +
            " Les informations saisies ont été conservées dans le formulaire.</p>");
          status.focus();
        })
        .then(function () {
          if (timer) clearTimeout(timer);
          submit.disabled = false;
          submit.innerHTML = submitLabel;
        });
    });
  }

  initReveal();
  initNav();
  initHeader();
  initYear();
  initContactForm();
})();
