(function () {
  const { simulateIrpfMinimo, simulateLei15270, simulateIbsCbsIs } = window.OneCalc;

  const tabs = document.querySelectorAll(".tab");
  const panels = {
    dashboard: document.querySelector("#dashboardPanel"),
    irpf: document.querySelector("#irpfPanel"),
    lei: document.querySelector("#leiPanel"),
    ibs: document.querySelector("#ibsPanel"),
    inicio: document.querySelector("#inicioPanel"),
    feedback: document.querySelector("#feedbackPanel"),
  };

  function signal(a, b) {
    try {
      window.dispatchEvent(new CustomEvent("one:a", { detail: { a, b: b || null } }));
    } catch {
      /* noop */
    }
  }

  function brl(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function pct(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  function formToObject(form) {
    const data = new FormData(form);
    return Object.fromEntries([...data.entries()].map(([k, v]) => [k, v === "on" ? true : v]));
  }

  function renderHtml(element, html) {
    element.classList.add("result-card");
    element.innerHTML = html;
  }

  function riskPill(level) {
    if (level === "alto" || level === "atencao") return `<span class="pill pill-warn">Atenção</span>`;
    return "";
  }

  function formatIrpf(result) {
    const steps = (result.clientPath || []).map((line) => `<li>${line}</li>`).join("");
    return `
      <h3 class="result-title">Resultado — IRPF mínimo</h3>
      <dl class="result-dl">
        <dt>Base para mínimo</dt><dd>${brl(result.minimumBase)}</dd>
        <dt>Alíquota mínima efetiva</dt><dd>${pct(result.effectiveMinimumRatePercent)}</dd>
        <dt>Imposto mínimo teórico</dt><dd>${brl(result.theoreticalMinimumTax)}</dd>
        <dt>Créditos informados</dt><dd>${brl(result.credits)}</dd>
        <dt>Complemento estimado</dt><dd><strong>${brl(result.additionalDue)}</strong></dd>
        <dt>Excesso a revisar</dt><dd>${brl(result.possibleExcessToReview)}</dd>
        <dt>Viabilidade</dt><dd>${result.viability || "—"}</dd>
      </dl>
      <p class="result-note">${result.caveat || ""}</p>
      <h4>Próximos passos</h4>
      <ul class="result-list">${steps}</ul>
    `;
  }

  function formatLei(result) {
    const pill = riskPill(result.riskLevel);
    return `
      <h3 class="result-title">Resultado — Lei 15.270 ${pill}</h3>
      <dl class="result-dl">
        <dt>IRRF mensal estimado</dt><dd>${brl(result.monthlyIrrf)}</dd>
        <dt>Projeção anual de IRRF</dt><dd>${brl(result.annualIrrfProjection)}</dd>
        <dt>Alta renda</dt><dd>${result.highIncomeFlag ? "Sim" : "Não"}</dd>
        <dt>Nível de atenção</dt><dd>${result.riskLevel || "—"}</dd>
      </dl>
      <p class="result-note">${result.transitionFlag || ""}</p>
      <p class="result-note">${result.caveat || ""}</p>
    `;
  }

  function formatIbs(result) {
    const pill = riskPill(result.riskLevel);
    return `
      <h3 class="result-title">Resultado — IBS / CBS / IS ${pill}</h3>
      <dl class="result-dl">
        <dt>Carga atual (mês)</dt><dd>${brl(result.currentTax)}</dd>
        <dt>Carga futura líquida (mês)</dt><dd>${brl(result.futureNetTax)}</dd>
        <dt>Créditos estimados</dt><dd>${brl(result.credits)}</dd>
        <dt>Variação</dt><dd><strong>${brl(result.delta)}</strong></dd>
        <dt>Cenário</dt><dd>${result.riskLevel || "—"}</dd>
      </dl>
      <p class="result-note">${result.caveat || ""}</p>
    `;
  }

  function hasSensitivePattern(text) {
    return [
      /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
      /\b(?:senha|password|token|secret|cpf)\b/i,
    ].some((re) => re.test(text));
  }

  document.querySelector("#goIrpf")?.addEventListener("click", () => {
    const irpfTab = [...tabs].find((t) => t.dataset.tab === "irpf");
    irpfTab?.click();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.toggle("active", item === tab));
      Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("hidden", key !== tab.dataset.tab);
      });
      signal("tab", tab.dataset.tab);
    });
  });

  document.querySelector("#irpfForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const output = document.querySelector("#irpfOutput");
    output.textContent = "Calculando…";
    try {
      renderHtml(output, formatIrpf(simulateIrpfMinimo(formToObject(event.currentTarget))));
      signal("calc", "irpf");
    } catch (error) {
      output.textContent = error.message || "Não foi possível calcular.";
      signal("calc", "irpf_err");
    }
  });

  document.querySelector("#leiForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const output = document.querySelector("#leiOutput");
    output.textContent = "Calculando…";
    try {
      renderHtml(output, formatLei(simulateLei15270(formToObject(event.currentTarget))));
      signal("calc", "lei");
    } catch (error) {
      output.textContent = error.message || "Não foi possível simular.";
      signal("calc", "lei_err");
    }
  });

  document.querySelector("#ibsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const output = document.querySelector("#ibsOutput");
    output.textContent = "Calculando…";
    try {
      renderHtml(output, formatIbs(simulateIbsCbsIs(formToObject(event.currentTarget))));
      signal("calc", "ibs");
    } catch (error) {
      output.textContent = error.message || "Não foi possível simular.";
      signal("calc", "ibs_err");
    }
  });

  let feedbackCount = 0;
  document.querySelector("#feedbackForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const output = document.querySelector("#feedbackOutput");
    const body = formToObject(event.currentTarget);
    const text = `${body.message || ""}\n${body.practicalImpact || ""}`;
    if ((body.message || "").length < 8) {
      output.textContent = "Descreva com pelo menos 8 caracteres.";
      return;
    }
    if (hasSensitivePattern(text)) {
      output.textContent = "Remova CPF, senha ou token da mensagem.";
      signal("fb", "blocked");
      return;
    }
    if (feedbackCount >= 6) {
      output.textContent = "Limite desta sessão atingido. Tente mais tarde.";
      return;
    }
    feedbackCount += 1;
    output.textContent = "Enviando…";
    if (location.protocol.startsWith("http")) {
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (response.ok) {
          renderHtml(output, `<p class="result-ok">${result.message || "Obrigado pelo retorno."}</p>`);
          event.currentTarget.reset();
          signal("fb", "ok");
          return;
        }
      } catch {
        /* local */
      }
    }
    const id = crypto.randomUUID();
    const rows = JSON.parse(localStorage.getItem("cto_feedback_v1") || "[]");
    rows.push({ id, ts: new Date().toISOString(), ...body });
    localStorage.setItem("cto_feedback_v1", JSON.stringify(rows.slice(-50)));
    renderHtml(output, `<p class="result-ok">Obrigado pelo retorno.</p>`);
    signal("fb", "ok");
    event.currentTarget.reset();
  });

  signal("open", null);
})();
