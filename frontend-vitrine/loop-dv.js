(function () {
  "use strict";

  const CONFIG_URLS = ["apoio-config.local.json", "apoio-config.json", "apoio-config.example.json"];

  function loadConfig() {
    return (async () => {
      const inline = document.getElementById("apoio-config-inline");
      if (inline?.textContent?.trim()) {
        try {
          const cfg = JSON.parse(inline.textContent);
          try {
            const r = await fetch("loop-public.json", { cache: "no-store" });
            if (r.ok) cfg.loop_public = await r.json();
          } catch (_) {
            /* optional */
          }
          return cfg;
        } catch (_) {
          /* fall through */
        }
      }
      let cfg = null;
      for (const url of ["apoio-config.local.json", "apoio-config.json", "apoio-config.example.json"]) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (r.ok) {
            cfg = await r.json();
            break;
          }
        } catch (_) {
          /* try next */
        }
      }
      try {
        const r = await fetch("loop-public.json", { cache: "no-store" });
        if (r.ok) {
          const loopPublic = await r.json();
          if (cfg) cfg.loop_public = loopPublic;
        }
      } catch (_) {
        /* optional */
      }
      return cfg;
    })();
  }

  function zonaClass(z) {
    if (z === "verde") return "loop-zona-verde";
    if (z === "amarelo") return "loop-zona-amarelo";
    return "loop-zona-vermelho";
  }

  function render(root, cfg) {
    const loop = cfg?.loop_dv;
    if (!loop?.habilitado) {
      root.closest(".block-loop-dv")?.setAttribute("hidden", "");
      return;
    }

    const pub = cfg?.loop_public || {};
    const title = root.querySelector(".loop-dv-title");
    const intro = root.querySelector(".loop-dv-intro");
    const coletor = root.querySelector(".loop-coletor-grid");
    const gates = root.querySelector(".loop-gates-list");
    const status = root.querySelector(".loop-status-panel");

    if (title) title.textContent = loop.titulo || "O Loop DV";
    if (intro) intro.textContent = loop.intro || "";

    if (coletor && loop.coletor) {
      coletor.innerHTML = "";
      (loop.coletor.registra || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        coletor.appendChild(li);
      });
      const never = root.querySelector(".loop-coletor-never");
      if (never && loop.coletor.nunca) {
        never.innerHTML = loop.coletor.nunca.map((n) => `<li>${n}</li>`).join("");
      }
    }

    if (gates && loop.gates) {
      gates.innerHTML = loop.gates.map((g) => `<li><strong>${g.nome}</strong> — ${g.acao}</li>`).join("");
    }

    if (status && (pub.zona || loop.status_fallback)) {
      const zona = pub.zona || loop.status_fallback?.zona || "calma";
      const media = pub.media != null ? pub.media : loop.status_fallback?.media;
      status.innerHTML = `
        <div class="loop-status-ring ${zonaClass(zona)}" aria-hidden="true"><span>○</span></div>
        <div class="loop-status-copy">
          <p class="loop-status-label">Homeostase · território DV</p>
          <p class="loop-status-value">${media != null ? `${media}/5 · ${zona}` : zona}</p>
          <p class="loop-status-note fine">${pub.nota || loop.status_fallback?.nota || "Loop regula — não apaga a tempestade."}</p>
        </div>
      `;
    }
  }

  loadConfig().then((cfg) => {
    const root = document.getElementById("loopDvRoot");
    if (cfg && root) render(root, cfg);
  });
})();
