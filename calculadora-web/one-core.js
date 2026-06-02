/* Calculadora Tributária One — núcleo de simulação (cliente) */
(function (root) {
  function safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function money(value) {
    return Math.round(value * 100) / 100;
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
    const gross = taxableIncome + includedExemptIncome + includedExclusiveIncome + includedCapitalGains;
    const minimumBase = Math.max(0, gross - legalExclusions);
    const rate = minimumTaxRate(minimumBase);
    const theoreticalMinimumTax = money(minimumBase * rate);
    const credits = money(normalIrpfDue + dividendIrrf + otherCreditableTax);
    const additionalDue = money(Math.max(0, theoreticalMinimumTax - credits));
    const possibleExcessToReview = money(Math.max(0, credits - theoreticalMinimumTax));
    const viability =
      minimumBase <= 600000
        ? "sem_irpfm_pelo_limite_informado"
        : additionalDue > 0
          ? "ha_complemento_estimado_no_ajuste_anual"
          : "carga_minima_aparentemente_coberta_pelos_creditos_informados";
    return {
      minimumBase: money(minimumBase),
      effectiveMinimumRatePercent: money(rate * 100),
      theoreticalMinimumTax,
      credits,
      additionalDue,
      possibleExcessToReview,
      viability,
      clientPath: [
        "Conferir campos da declaração de IR.",
        "Separar dividendos por fonte e IRRF retido.",
        "Documentar exclusões legais na base.",
        "Revisar com contador antes de decidir.",
      ],
      caveat: "Modelo de triagem para IRPFM. Validar com dados oficiais da declaração.",
    };
  }

  function simulateLei15270(input) {
    const monthlyDividends = Math.max(0, safeNumber(input.monthlyDividends));
    const annualIncome = Math.max(0, safeNumber(input.annualIncome));
    const nonResident = Boolean(input.nonResident);
    const pre2025Approved = Boolean(input.pre2025Approved);
    const threshold = 50000;
    const residentBase = monthlyDividends > threshold ? monthlyDividends : 0;
    const withholdingBase = nonResident ? monthlyDividends : residentBase;
    const monthlyIrrf = money(withholdingBase * 0.1);
    const highIncomeFlag = annualIncome > 600000;
    return {
      monthlyIrrf,
      annualIrrfProjection: money(monthlyIrrf * 12),
      highIncomeFlag,
      transitionFlag: pre2025Approved
        ? "Lucros até 2025 aprovados: manter dossiê societário."
        : "Sem aprovação informada para lucros até 2025: revisar documentos.",
      riskLevel: highIncomeFlag || monthlyIrrf > 0 ? "alto" : "moderado",
      caveat: "Estimativa simplificada para triagem.",
    };
  }

  function simulateIbsCbsIs(input) {
    const monthlyRevenue = Math.max(0, safeNumber(input.monthlyRevenue));
    const currentRate = Math.max(0, safeNumber(input.currentRate)) / 100;
    const futureRate = Math.max(0, safeNumber(input.futureRate)) / 100;
    const creditRate = Math.max(0, safeNumber(input.creditRate)) / 100;
    const currentTax = money(monthlyRevenue * currentRate);
    const grossFuture = monthlyRevenue * futureRate;
    const credits = money(grossFuture * creditRate);
    const futureNetTax = money(Math.max(0, grossFuture - credits));
    const delta = money(futureNetTax - currentTax);
    return {
      currentTax,
      futureNetTax,
      credits,
      delta,
      riskLevel: delta > 0 ? "atencao" : "favoravel",
      caveat: "Modelo paramétrico de planejamento.",
    };
  }

  root.OneCalc = {
    safeNumber,
    money,
    simulateIrpfMinimo,
    simulateLei15270,
    simulateIbsCbsIs,
  };
})(typeof window !== "undefined" ? window : globalThis);
