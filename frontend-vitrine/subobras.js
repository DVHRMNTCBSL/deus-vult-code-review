(function () {
  "use strict";

  const CONFIG_URLS = ["apoio-config.local.json", "apoio-config.json", "apoio-config.example.json"];

  const STATUS_LABEL = {
    disponivel: "Disponível",
    waitlist: "Lista de espera",
    sob_consulta: "Sob consulta",
  };

  const PRE_TRIAGEM = {
    tensao: {
      label: "O que pesa mais agora?",
      options: [
        { v: "dinheiro", l: "Dinheiro ou imposto" },
        { v: "prazo", l: "Prazo ou urgência" },
        { v: "decisao", l: "Decisão travada" },
        { v: "caos", l: "Tudo ao mesmo tempo" },
      ],
    },
    urgencia: {
      label: "Quando precisa de clareza?",
      options: [
        { v: "hoje", l: "Hoje — não posso esperar" },
        { v: "semana", l: "Esta semana" },
        { v: "calma", l: "Posso esperar 7+ dias" },
      ],
    },
    dominio: {
      label: "O caos é sobre…",
      options: [
        { v: "fiscal", l: "Imposto / IR / MEI" },
        { v: "pessoa", l: "Relação ou conversa difícil" },
        { v: "ferramenta", l: "Organizar sistema ou fluxo" },
        { v: "outro", l: "Outro — ainda sem nome" },
      ],
    },
  };

  const PROXIMO_PASSO = {
    dinheiro: {
      fiscal: "Abra #sua-obra e anote 1 pergunta fiscal — só essa. Depois peça ajuda humana se precisar.",
      pessoa: "Escreva quanto isso custa em tempo ou energia, sem julgar.",
      ferramenta: "Liste 3 ferramentas que você já usa. Circule a que mais te irrita.",
      outro: "Nomeie o valor em jogo em uma frase — dinheiro, tempo ou reputação.",
    },
    prazo: {
      fiscal: "Anote a data limite. Só ela. Leve ao agente.",
      pessoa: "Escreva a data da conversa ou do prazo. Uma linha.",
      ferramenta: "Defina a data de entrega mínima viável — não a ideal.",
      outro: "Uma data. Só uma. No agente abaixo.",
    },
    decisao: {
      fiscal: "Formule a decisão em uma pergunta sim/não. Leve ao agente.",
      pessoa: "Nomeie o que você evita dizer. Uma frase honesta.",
      ferramenta: "Escolha: consertar o que existe ou começar do zero?",
      outro: "Complete: Se eu decidir X, perco ___ e ganho ___.",
    },
    caos: {
      fiscal: "Puxe 1 fio: imposto. Três linhas no agente — só desse fio.",
      pessoa: "Puxe 1 fio: a conversa. Três linhas no agente.",
      ferramenta: "Puxe 1 fio: o fluxo que trava todo dia.",
      outro: "Feche os olhos 10s. Qual palavra veio? Escreva só ela e expanda 2 linhas.",
    },
  };

  const SUGESTAO_PAGA = {
    fiscal: { id: "triagem-pro", nome: "Triagem Pro" },
    pessoa: { id: "sessao-ponte", nome: "Sessão Ponte" },
    ferramenta: { id: "snapshot-dv", nome: "Snapshot DV" },
    outro: { id: "triagem-pro", nome: "Triagem Pro" },
  };

  function loadConfig() {
    return (async () => {
      const inline = document.getElementById("apoio-config-inline");
      if (inline?.textContent?.trim()) {
        try {
          return JSON.parse(inline.textContent);
        } catch (_) {
          /* fall through */
        }
      }
      for (const url of CONFIG_URLS) {
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (r.ok) return r.json();
        } catch (_) {
          /* try next */
        }
      }
      return null;
    })();
  }

  function isMercadoPagoUrl(url) {
    return (
      typeof url === "string" &&
      /^https:\/\/(mpago\.la|link\.mercadopago(?:\.com\.br)?|www\.mercadopago)/i.test(url)
    );
  }

  function formatBrl(n) {
    if (n === 0 || n === "0") return "Grátis";
    return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function solicitarHref(item) {
    const subject = encodeURIComponent(`Subobra DEUS VULT · ${item.nome}`);
    const body = encodeURIComponent(
      `Olá,\n\nTenho interesse na subobra: ${item.nome} (${item.id})\n\nMeu caos / pedido:\n\n\n---\nEnviado pela vitrine DEUS VULT`,
    );
    return `mailto:?subject=${subject}&body=${body}`;
  }

  function renderEscada(root, escada) {
    const nav = root.querySelector(".subobras-escada");
    if (!nav || !escada?.length) return;
    nav.innerHTML = escada
      .map(
        (step, i) =>
          `<a class="subobras-escada-step" href="${i === 0 ? "#subobras-gratis" : i === 1 ? "#apoio" : "#subobras-pagas"}"><span class="subobras-escada-idx">${i + 1}</span>${step}</a>`,
      )
      .join("");
  }

  function renderFreeCard(item, lp) {
    const card = document.createElement("article");
    card.className = "subobra-card subobra-card-gratis reveal";
    card.setAttribute("role", "listitem");
    card.id = item.id === "pre-triagem-dv" ? "subobras-gratis" : item.anchor_id || "";
    card.dataset.id = item.id || "";

    const tag = lp ? "" : item.tag ? `<span class="subobra-tag">${item.tag}</span>` : `<span class="subobra-tag">grátis</span>`;

    card.innerHTML = `
      <div class="subobra-head">
        ${tag}
        <h3 class="subobra-name">${item.nome}</h3>
        <p class="subobra-price subobra-price-gratis">${formatBrl(item.preco_brl ?? 0)}</p>
      </div>
      <p class="subobra-desc">${item.descricao || ""}</p>
      ${!lp && item.nota ? `<p class="subobra-price-note fine">${item.nota}</p>` : ""}
      <div class="subobra-actions"></div>
    `;

    const actions = card.querySelector(".subobra-actions");
    if (item.cta_tipo === "inline") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary";
      btn.textContent = item.cta_label || "Iniciar";
      btn.addEventListener("click", () => {
        const panel = document.getElementById("preTriagemDv");
        if (panel) {
          panel.hidden = false;
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          const first = panel.querySelector("input, select, textarea, button");
          first?.focus();
        }
      });
      actions.appendChild(btn);
    } else if (item.cta_href) {
      const link = document.createElement("a");
      link.className = item.cta_primario === false ? "btn btn-ghost" : "btn btn-primary";
      link.href = item.cta_href;
      if (/^https?:\/\//i.test(item.cta_href)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      link.textContent = item.cta_label || "Abrir";
      actions.appendChild(link);
    }

    return card;
  }

  function renderPaidCard(item, lp) {
    const card = document.createElement("article");
    card.className = "subobra-card subobra-card-paga reveal";
    card.setAttribute("role", "listitem");
    card.dataset.id = item.id || "";

    const status = item.status || "disponivel";
    const statusLabel = STATUS_LABEL[status] || status;
    const tag = lp ? "" : item.tag ? `<span class="subobra-tag">${item.tag}</span>` : "";

    const escopo =
      !lp && (item.escopo || []).length > 0
        ? `<ul class="subobra-escopo">${item.escopo.map((e) => `<li>${e}</li>`).join("")}</ul>`
        : "";

    card.innerHTML = `
      <div class="subobra-head">
        ${tag}
        <h3 class="subobra-name">${item.nome}</h3>
        <p class="subobra-price">${status === "sob_consulta" ? `a partir de ${formatBrl(item.preco_brl)}` : formatBrl(item.preco_brl)}</p>
      </div>
      <p class="subobra-desc">${item.descricao || ""}</p>
      ${!lp && item.personalizacao ? `<p class="subobra-personal">${item.personalizacao}</p>` : ""}
      ${escopo}
      ${lp ? "" : `<div class="subobra-meta"><span>${item.prazo || ""}</span><span class="subobra-status" data-status="${status}">${statusLabel}</span></div>`}
      <div class="subobra-actions"></div>
    `;

    const actions = card.querySelector(".subobra-actions");
    if (isMercadoPagoUrl(item.mercadopago_link)) {
      const pay = document.createElement("a");
      pay.className = "btn btn-primary";
      pay.href = item.mercadopago_link;
      pay.target = "_blank";
      pay.rel = "noopener noreferrer";
      pay.textContent = "Pagar · Mercado Pago";
      actions.appendChild(pay);
    } else if (status !== "waitlist") {
      const req = document.createElement("a");
      req.className = status === "sob_consulta" ? "btn btn-ghost" : "btn btn-primary";
      req.href = solicitarHref(item);
      req.textContent = status === "sob_consulta" ? "Pedir orçamento" : lp ? "Pedir" : "Solicitar subobra";
      actions.appendChild(req);
    }

    if (item.preco_nota && !lp) {
      const note = document.createElement("p");
      note.className = "subobra-price-note fine";
      note.textContent = item.preco_nota;
      actions.appendChild(note);
    }

    return card;
  }

  function buildPreTriagem(cfg) {
    const root = document.getElementById("preTriagemDv");
    const item = cfg?.subobras?.gratis?.pre_triagem;
    const lp = cfg?.subobras?.modo === "lp";
    if (!root || !item?.habilitado) return;

    root.hidden = lp;
    root.innerHTML = `
      <div class="pre-triagem-inner">
        ${item.kicker ? `<p class="pre-triagem-kicker">${item.kicker}</p>` : ""}
        <h4 class="pre-triagem-title">${item.titulo || "Qual seu próximo passo?"}</h4>
        <p class="pre-triagem-lead fine">${item.intro || "Local · sem enviar dados · não é parecer fiscal."}</p>
        <form class="pre-triagem-form" id="preTriagemForm">
          <fieldset class="pre-triagem-field">
            <legend>${PRE_TRIAGEM.tensao.label}</legend>
            ${PRE_TRIAGEM.tensao.options.map((o) => `<label class="pre-triagem-opt"><input type="radio" name="tensao" value="${o.v}" required /> ${o.l}</label>`).join("")}
          </fieldset>
          <fieldset class="pre-triagem-field">
            <legend>${PRE_TRIAGEM.urgencia.label}</legend>
            ${PRE_TRIAGEM.urgencia.options.map((o) => `<label class="pre-triagem-opt"><input type="radio" name="urgencia" value="${o.v}" required /> ${o.l}</label>`).join("")}
          </fieldset>
          <fieldset class="pre-triagem-field">
            <legend>${PRE_TRIAGEM.dominio.label}</legend>
            ${PRE_TRIAGEM.dominio.options.map((o) => `<label class="pre-triagem-opt"><input type="radio" name="dominio" value="${o.v}" required /> ${o.l}</label>`).join("")}
          </fieldset>
          <label class="pre-triagem-field" for="preTriagemCaos">Uma frase do caos (opcional)</label>
          <textarea id="preTriagemCaos" name="caos" rows="2" placeholder="Tudo ao mesmo tempo…"></textarea>
          <div class="pre-triagem-actions">
            <button type="submit" class="btn btn-primary">Ver próximo passo</button>
            <button type="reset" class="btn btn-ghost">Limpar</button>
          </div>
        </form>
        <output class="pre-triagem-output" id="preTriagemOutput" for="preTriagemForm" hidden></output>
      </div>
    `;

    const form = root.querySelector("#preTriagemForm");
    const output = root.querySelector("#preTriagemOutput");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const tensao = fd.get("tensao");
      const urgencia = fd.get("urgencia");
      const dominio = fd.get("dominio");
      const caos = String(fd.get("caos") || "").trim();

      const passo = PROXIMO_PASSO[tensao]?.[dominio] || "Escreva três linhas no agente — só o que não pode esperar.";
      const sug = SUGESTAO_PAGA[dominio] || SUGESTAO_PAGA.outro;
      const urgLabel = PRE_TRIAGEM.urgencia.options.find((o) => o.v === urgencia)?.l || urgencia;
      const date = new Date().toISOString().slice(0, 10);

      const texto = [
        `# Pré-triagem DV · ${date}`,
        `urgência: ${urgLabel}`,
        caos ? `caos: ${caos}` : null,
        "",
        "Próximo passo único (não é parecer):",
        `→ ${passo}`,
        "",
        urgencia === "hoje" && dominio === "fiscal"
          ? "→ Se for imposto: peça Triagem Pro ou use ferramenta fiscal (back · controlador)"
          : null,
        "",
        `Se precisar de mapa escrito por humano: ${sug.nome} · #subobras-pagas`,
      ]
        .filter(Boolean)
        .join("\n");

      output.hidden = false;
      output.innerHTML = "";
      const textEl = document.createElement("span");
      textEl.className = "pre-triagem-text";
      textEl.textContent = texto;
      output.appendChild(textEl);

      const actions = document.createElement("div");
      actions.className = "pre-triagem-result-actions";
      actions.innerHTML = `
        <button type="button" class="btn btn-ghost" data-copy>Copiar</button>
        <a class="btn btn-primary" href="#comece">Levar ao agente</a>
        <a class="btn btn-ghost" href="#precos" data-sug="${sug.id}">Ver ${sug.nome}</a>
      `;
      output.appendChild(actions);

      const encodeInput = document.getElementById("rawInput");
      if (encodeInput && caos) encodeInput.value = caos;

      actions.querySelector("[data-copy]").addEventListener("click", () => {
        navigator.clipboard?.writeText(texto);
      });

      output.scrollIntoView({ behavior: "smooth", block: "nearest" });
      window.__dvA11y?.announce?.(`Próximo passo: ${passo}`, true);
    });

    form.addEventListener("reset", () => {
      output.hidden = true;
      output.innerHTML = "";
    });
  }

  function render(cfg) {
    const root = document.getElementById("subobrasRoot");
    if (!root) return;

    const sb = cfg?.subobras;
    if (!sb?.habilitado) {
      root.closest(".block-subobras")?.setAttribute("hidden", "");
      return;
    }

    const lp = sb.modo === "lp";
    if (lp) root.classList.add("lp-mode");

    const title = root.querySelector(".subobras-title");
    const intro = root.querySelector(".subobras-intro");
    if (title) title.textContent = sb.titulo || "Preços";
    if (intro) intro.textContent = sb.intro || "";

    if (!lp) renderEscada(root, sb.escada || ["Grátis", "Apoio", "Personalizado"]);

    const zonaGratis = root.querySelector(".subobras-zona-gratis");
    const zonaPaga = root.querySelector(".subobras-zona-paga");
    const gridGratis = root.querySelector(".subobras-grid-gratis");
    const gridPagas = root.querySelector(".subobras-grid-pagas");

    const g = sb.gratis || {};
    if (zonaGratis) {
      const gt = zonaGratis.querySelector(".subobras-zona-title");
      const gi = zonaGratis.querySelector(".subobras-zona-intro");
      if (gt) gt.textContent = g.titulo || (lp ? "Grátis" : "Comece aqui");
      if (gi) {
        gi.textContent = g.intro || "";
        gi.hidden = lp && !g.intro;
      }
      zonaGratis.hidden = g.habilitado === false;
    }

    if (gridGratis) {
      gridGratis.innerHTML = "";
      (g.itens || []).forEach((item) => {
        if (item.cta_tipo === "inline") return;
        gridGratis.appendChild(renderFreeCard(item, lp));
      });
    }

    buildPreTriagem(cfg);
    const preItem = (g.itens || []).find((i) => i.cta_tipo === "inline");
    if (preItem && gridGratis) {
      gridGratis.insertBefore(renderFreeCard(preItem, lp), gridGratis.firstChild);
    }

    const p = sb.personalizado || {};
    if (zonaPaga) {
      zonaPaga.id = "precos-pagos";
      const pt = zonaPaga.querySelector(".subobras-zona-title");
      const pi = zonaPaga.querySelector(".subobras-zona-intro");
      const nota = zonaPaga.querySelector(".subobras-nota");
      if (pt) pt.textContent = p.titulo || (lp ? "Sob medida" : "Feito para você");
      if (pi) {
        pi.textContent = p.intro || "";
        pi.hidden = lp && !p.intro;
      }
      if (nota) {
        nota.textContent = sb.nota_precificacao || "";
        nota.hidden = lp || !sb.nota_precificacao;
      }
    }

    if (gridPagas) {
      gridPagas.innerHTML = "";
      (sb.itens || []).forEach((item) => gridPagas.appendChild(renderPaidCard(item, lp)));
    }
  }

  loadConfig().then((cfg) => {
    if (cfg) render(cfg);
  });
})();
