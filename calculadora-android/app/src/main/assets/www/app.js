const tabs = document.querySelectorAll(".tab");
const panels = {
  irpf: document.querySelector("#irpfPanel"),
  lei: document.querySelector("#leiPanel"),
  ibs: document.querySelector("#ibsPanel"),
  feedback: document.querySelector("#feedbackPanel"),
};

const state = { feedbackCount: 0 };

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

function formToObject(form) {
  const data = new FormData(form);
  return Object.fromEntries([...data.entries()].map(([key, value]) => [key, value === "on" ? true : value]));
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Math.round(value * 100) / 100;
}

function hasSensitivePattern(text) {
  return [
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
    /\b(?:senha|password|token|secret|seed|private key)\b/i,
  ].some((pattern) => pattern.test(text));
}

function minimumTaxRate(base) {
  if (base <= 600000) return 0;
  if (base >= 1200000) return 0.1;
  return Math.max(0, Math.min(0.1, base / 60000 / 100 - 0.1));
}

function simulateIrpfMinimo(input) {
  const taxableIncome = Math.max(0, safeNumber(input.taxableIncome));
  const includedExemptIncome = Math.max(0, safeNumber(input.includedExemptIncome));
  const includedExclusiveIncome = Math.max(0, safeNumber(input.includedExclusiveIncome));
  const includedCapitalGains = Math.max(0, safeNumber(input.includedCapitalGains));
  const legalExclusions = Math.max(0, safeNumber(input.legalExclusions));
  const normalIrpfDue = Math.max(0, safeNumber(input.normalIrpfDue));
  const dividendIrrf = Math.max(0, safeNumber(input.dividendIrrf));
  const otherCreditableTax = Math.max(0, safeNumber(input.otherCreditableTax));
  const grossIncomeForMinimum = taxableIncome + includedExemptIncome + includedExclusiveIncome + includedCapitalGains;
  const minimumBase = Math.max(0, grossIncomeForMinimum - legalExclusions);
  const rate = minimumTaxRate(minimumBase);
  const theoreticalMinimumTax = money(minimumBase * rate);
  const credits = money(normalIrpfDue + dividendIrrf + otherCreditableTax);
  const additionalDue = money(Math.max(0, theoreticalMinimumTax - credits));
  return {
    minimumBase: money(minimumBase),
    effectiveMinimumRatePercent: money(rate * 100),
    theoreticalMinimumTax,
    credits,
    additionalDue,
    viability: minimumBase <= 600000 ? "sem_irpfm_pelo_limite" : additionalDue > 0 ? "complemento_estimado" : "carga_minima_coberta",
    caveat: "Triagem. Validar com contador antes de decidir.",
  };
}

function simulateLei15270(input) {
  const monthlyDividends = Math.max(0, safeNumber(input.monthlyDividends));
  const annualIncome = Math.max(0, safeNumber(input.annualIncome));
  const withholdingBase = monthlyDividends > 50000 ? monthlyDividends : 0;
  const monthlyIrrf = money(withholdingBase * 0.1);
  return {
    monthlyIrrf,
    annualIrrfProjection: money(monthlyIrrf * 12),
    highIncomeFlag: annualIncome > 600000,
    caveat: "Estimativa simplificada para triagem.",
  };
}

function simulateIbsCbsIs(input) {
  const monthlyRevenue = Math.max(0, safeNumber(input.monthlyRevenue));
  const currentRate = Math.max(0, safeNumber(input.currentRate)) / 100;
  const futureRate = Math.max(0, safeNumber(input.futureRate)) / 100;
  const creditRate = Math.max(0, safeNumber(input.creditRate)) / 100;
  const currentTax = money(monthlyRevenue * currentRate);
  const grossFutureTax = monthlyRevenue * futureRate;
  const credits = grossFutureTax * creditRate;
  const futureNetTax = money(Math.max(0, grossFutureTax - credits));
  return { currentTax, futureNetTax, delta: money(futureNetTax - currentTax), caveat: "Modelo parametrico." };
}

function sanitizeFeedback(input) {
  const message = String(input.message || "").trim();
  const practicalImpact = String(input.practicalImpact || "").trim();
  if (message.length < 8) {
    const error = new Error("feedback_curto_demais");
    error.status = 400;
    throw error;
  }
  if (hasSensitivePattern(`${message}\n${practicalImpact}`)) {
    const error = new Error("feedback_contem_dado_sensivel");
    error.status = 400;
    throw error;
  }
  return {
    id: crypto.randomUUID(),
    message,
    practicalImpact,
    status: "recebido",
  };
}

async function api(path, options = {}) {
  const body = options.body ? JSON.parse(options.body) : {};
  if (path === "/api/simulate/irpf-minimo") return simulateIrpfMinimo(body);
  if (path === "/api/simulate/lei-15270") return simulateLei15270(body);
  if (path === "/api/simulate/ibs-cbs-is") return simulateIbsCbsIs(body);
  if (path === "/api/feedback") {
    if (state.feedbackCount >= 6) {
      const error = new Error("feedback_rate_limited");
      error.status = 429;
      throw error;
    }
    state.feedbackCount += 1;
    const feedback = sanitizeFeedback(body);
    return { ok: true, id: feedback.id, message: "Obrigado. Seu retorno foi registrado." };
  }
  const error = new Error("rota_nao_permitida");
  error.status = 403;
  throw error;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    Object.entries(panels).forEach(([key, panel]) => panel.classList.toggle("hidden", key !== tab.dataset.tab));
  });
});

function bindForm(selector, outputSelector, path) {
  document.querySelector(selector).addEventListener("submit", async (event) => {
    event.preventDefault();
    const output = document.querySelector(outputSelector);
    output.textContent = "Calculando...";
    try {
      output.textContent = formatJson(await api(path, { method: "POST", body: JSON.stringify(formToObject(event.currentTarget)) }));
    } catch (error) {
      output.textContent = formatJson({ error: error.message, status: error.status || "erro" });
    }
  });
}

bindForm("#irpfForm", "#irpfOutput", "/api/simulate/irpf-minimo");
bindForm("#leiForm", "#leiOutput", "/api/simulate/lei-15270");
bindForm("#ibsForm", "#ibsOutput", "/api/simulate/ibs-cbs-is");
bindForm("#feedbackForm", "#feedbackOutput", "/api/feedback");
