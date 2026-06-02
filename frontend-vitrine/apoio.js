(function () {
  "use strict";

  const CONFIG_URLS = ["apoio-config.local.json", "apoio-config.json", "apoio-config.example.json"];

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

  function addPayButton(container, { url, className, label, primary }) {
    const a = document.createElement("a");
    a.className = `btn ${primary ? "btn-primary " : ""}${className}${primary ? " apoio-livre" : ""}`;
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    container.appendChild(a);
    return true;
  }

  const FORMA_LABELS = {
    cartao_credito: "Cartão de crédito",
    boleto: "Boleto bancário",
  };

  function renderFormasPagamento(root, mp) {
    const el = root.querySelector(".apoio-formas");
    if (!el) return;
    const fp = mp?.formas_pagamento;
    if (!fp?.aceitas?.length) {
      el.hidden = true;
      return;
    }
    const labels = fp.aceitas.map((k) => FORMA_LABELS[k] || k).join(" · ");
    const pixOff = fp.pix === false ? " · PIX não aceito" : "";
    el.textContent = fp.aviso_visitante || `Formas: ${labels}${pixOff}.`;
    el.hidden = false;
  }

  function renderMercadoPago(container, mp) {
    if (!mp || mp.habilitado === false) return false;
    let has = false;

    if (isMercadoPagoUrl(mp.link_livre)) {
      has = addPayButton(container, {
        url: mp.link_livre,
        className: "btn-mp",
        label: "Apoiar · valor livre",
        primary: true,
      });
    }

    (mp.links || []).forEach((item) => {
      if (!isMercadoPagoUrl(item.url)) return;
      const rotulo = item.rotulo || `R$ ${item.brl}`;
      const text = item.brl ? `${rotulo} · R$ ${item.brl}` : rotulo;
      has = addPayButton(container, { url: item.url, className: "btn-mp", label: text, primary: false }) || has;
    });

    return has;
  }

  function isPublicAddress(entry) {
    if (!entry?.endereco || entry.habilitado === false) return false;
    const a = entry.endereco.trim();
    if (/^(bc1|tb1)[a-z0-9]{25,90}$/i.test(a)) return true;
    if (/^0x[a-fA-F0-9]{40}$/.test(a)) return true;
    return false;
  }

  function renderCrypto(root, crypto) {
    const box = root.querySelector(".apoio-crypto");
    const list = root.querySelector(".apoio-crypto-list");
    if (!box || !list || !crypto?.habilitado) {
      if (box) box.hidden = true;
      return;
    }

    const entries = (crypto.enderecos || []).filter(isPublicAddress);
    list.innerHTML = "";
    if (!entries.length) {
      box.hidden = true;
      return;
    }

    box.hidden = false;
    const note = root.querySelector(".apoio-crypto-note");
    if (note) note.textContent = crypto.nota || "Endereço público de recebimento — nunca seed nem chave privada.";

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "apoio-crypto-row";
      const label = entry.rotulo || entry.rede || "Crypto";
      row.innerHTML = `<span class="apoio-crypto-label">${label}</span><code class="apoio-crypto-addr"></code>`;
      row.querySelector(".apoio-crypto-addr").textContent = entry.endereco;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-crypto";
      btn.textContent = "Copiar endereço";
      btn.addEventListener("click", () => {
        navigator.clipboard?.writeText(entry.endereco).then(
          () => {
            btn.textContent = "Copiado";
            setTimeout(() => {
              btn.textContent = "Copiar endereço";
            }, 2000);
          },
          () => {
            btn.textContent = "Copie manualmente";
          },
        );
      });
      row.appendChild(btn);

      if (entry.explorer) {
        const a = document.createElement("a");
        a.className = "apoio-crypto-explorer";
        a.href = entry.explorer;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Ver no explorer →";
        row.appendChild(a);
      }

      list.appendChild(row);
    });
  }

  function render(cfg) {
    const root = document.getElementById("apoioRoot");
    if (!root || !cfg) return;

    root.querySelector(".apoio-title").textContent = cfg.titulo || "Se quiser apoiar";
    root.querySelector(".apoio-sub").textContent =
      cfg.subtitulo || "Doação voluntária — só se fizer sentido para você.";

    const payBox = root.querySelector(".apoio-pay");
    const sug = root.querySelector(".apoio-sugestoes");
    sug.innerHTML = "";

    const hasLink = renderMercadoPago(sug, cfg.mercadopago);
    renderFormasPagamento(root, cfg.mercadopago);

    if (payBox) {
      payBox.hidden = !hasLink;
      const brand = root.querySelector(".apoio-pay-brand");
      if (brand) brand.textContent = cfg.mercadopago?.nome_exibicao || "DEUS VULT";
    }

    if (!hasLink) {
      const p = document.createElement("p");
      p.className = "apoio-pending";
      p.textContent = "Configure Mercado Pago em apoio-config.local.json — guia DEUS_VULT_MERCADOPAGO_APOIO.yaml";
      sug.appendChild(p);
    }

    const prod = root.querySelector(".apoio-produtos");
    prod.innerHTML = "";
    (cfg.produtos_futuros || []).forEach((item) => {
      const div = document.createElement("div");
      div.className = "apoio-prod";
      const status = item.status === "waitlist" ? "lista de espera" : "disponível";
      div.innerHTML = `<strong>${item.nome}</strong><span>R$ ${item.preco_brl} · ${status}</span>`;
      if (isMercadoPagoUrl(item.mercadopago_link)) {
        addPayButton(div, {
          url: item.mercadopago_link,
          className: "btn-mp",
          label: "Pagar · Mercado Pago →",
          primary: false,
        });
      }
      prod.appendChild(div);
    });

    if (cfg.nota_legal) root.querySelector(".apoio-legal").textContent = cfg.nota_legal;
    if (cfg.nota_privacidade) {
      const priv = root.querySelector(".apoio-privacy");
      if (priv) priv.textContent = cfg.nota_privacidade;
    }

    renderCrypto(root, cfg.crypto);
  }

  loadConfig().then((cfg) => {
    if (cfg) render(cfg);
  });
})();
