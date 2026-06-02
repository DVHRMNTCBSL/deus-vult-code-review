(function () {
  "use strict";

  /** Vitrine pensada para leitor de tela e teclado — “ser sem luz”. */
  const STORAGE_KEY = "dv_modo_visual";

  function prefersSemLuz() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return false;
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  function applyModo() {
    const visual = !prefersSemLuz();
    document.documentElement.classList.toggle("sem-luz", !visual);
    document.documentElement.classList.toggle("modo-visual", visual);
    document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => el.classList.add("visible"));
  }

  function announcer() {
    let el = document.getElementById("srAnnouncer");
    if (!el) {
      el = document.createElement("div");
      el.id = "srAnnouncer";
      el.className = "sr-only";
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    return el;
  }

  function announce(msg, assertive) {
    const live = assertive ? "assertive" : "polite";
    let el = document.getElementById(assertive ? "srAnnouncerAssert" : "srAnnouncer");
    if (assertive && !el) {
      el = document.createElement("div");
      el.id = "srAnnouncerAssert";
      el.className = "sr-only";
      el.setAttribute("aria-live", "assertive");
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("role", "alert");
      document.body.appendChild(el);
    }
    if (!el) el = announcer();
    el.setAttribute("aria-live", live);
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = msg;
    });
  }

  function bindModoToggle() {
    const btn = document.getElementById("btnModoVisual");
    if (!btn) return;
    const sync = () => {
      const visual = document.documentElement.classList.contains("modo-visual");
      btn.setAttribute("aria-pressed", visual ? "true" : "false");
      btn.textContent = visual ? "Modo sem luz (ativo agora: visual)" : "Ativar modo visual (decoração)";
    };
    sync();
    btn.addEventListener("click", () => {
      const goingVisual = !document.documentElement.classList.contains("modo-visual");
      try {
        localStorage.setItem(STORAGE_KEY, goingVisual ? "1" : "0");
      } catch (_) {
        /* ignore */
      }
      applyModo();
      sync();
      announce(
        goingVisual
          ? "Modo visual ligado. Decoração e animações disponíveis."
          : "Modo sem luz. Site otimizado para leitor de tela e teclado.",
        true,
      );
    });
  }

  applyModo();
  document.addEventListener("DOMContentLoaded", bindModoToggle);

  window.__dvA11y = { announce, applyModo };
})();
