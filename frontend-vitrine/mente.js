(function () {
  "use strict";

  const AGENT = "DEUS VULT";
  const OBRA_KEY = "dv_obra_1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* —— Ciclo estações + fase de vida — DEUS_VULT_CICLO_*_DV.yaml —— */
  const SEASON_CYCLE = [
    { id: "caos", short: "inverno", label: "Inverno · nascimento", life: "nascimento", lifeLabel: "Nascimento", line: "liminar · potencial" },
    { id: "organizacao", short: "primavera", label: "Primavera · crescimento", life: "crescimento", lifeLabel: "Crescimento", line: "forma nasce" },
    { id: "intensidade", short: "verão", label: "Verão · pico", life: "pico", lifeLabel: "Pico", line: "gesto pleno" },
    { id: "descanso", short: "outono", label: "Outono · colheita", life: "colheita", lifeLabel: "Colheita", line: "integrar o vivido" },
    { id: "paz", short: "ponte", label: "Ponte · repouso", life: "repouso", lifeLabel: "Repouso", line: "contato sem pressa" },
  ];
  const LIFE_ORDER = ["nascimento", "crescimento", "pico", "colheita", "repouso"];
  const LIFE_TEMPO_MS = {
    nascimento: [52000, 88000],
    crescimento: [72000, 118000],
    pico: [44000, 76000],
    colheita: [80000, 128000],
    repouso: [90000, 150000],
  };
  /** Roda da vida: duração e temperamento por estação (calmo · caótico · liminar). */
  const SEASON_TEMPO = {
    caos: { tempo: "caotico", peaceful: false, ms: [34000, 68000], line: "vento · depois clareia" },
    organizacao: { tempo: "liminar", peaceful: true, ms: [68000, 108000], line: "ordem que nasce devagar" },
    intensidade: { tempo: "caotico", peaceful: false, ms: [38000, 72000], line: "pico · depois assenta" },
    descanso: { tempo: "calmo", peaceful: true, ms: [82000, 132000], line: "colheita · flor no chão" },
    paz: { tempo: "calmo", peaceful: true, ms: [92000, 148000], line: "repouso · roda em paz" },
  };
  const DEFAULT_SEASON = "organizacao";
  const DEFAULT_LIFE = "crescimento";

  let seasonIndex = Math.max(0, SEASON_CYCLE.findIndex((s) => s.id === (document.body.dataset.season || DEFAULT_SEASON)));
  let lifeIndex = Math.max(0, LIFE_ORDER.indexOf(document.body.dataset.lifePhase || DEFAULT_LIFE));
  let seasonTimer = null;
  let lifeTimer = null;
  let wheelAmbientTimer = null;
  let seasonManualLock = false;
  let lifeManualLock = false;
  let seasonEncodeLock = false;
  let wheelDeg = 0;

  function randBetween(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function seasonDurationMs(id) {
    const t = SEASON_TEMPO[id] || SEASON_TEMPO.organizacao;
    return randBetween(t.ms[0], t.ms[1]);
  }

  function lifeDurationMs(id) {
    const r = LIFE_TEMPO_MS[id] || LIFE_TEMPO_MS.crescimento;
    return randBetween(r[0], r[1]);
  }

  /** Roda da vida: avança, repete ou salta — nunca parado. */
  function nextSeasonIndex(current) {
    const r = Math.random();
    if (r < 0.68) return (current + 1) % SEASON_CYCLE.length;
    if (r < 0.8) return current;
    if (current === SEASON_CYCLE.length - 1) return 0;
    if (current === 0 && r < 0.92) return 2;
    return (current + 2) % SEASON_CYCLE.length;
  }

  function applyCycleTempo(seasonId) {
    const t = SEASON_TEMPO[seasonId] || SEASON_TEMPO.organizacao;
    document.body.dataset.cycleTempo = t.tempo;
    document.body.dataset.cyclePeaceful = t.peaceful ? "sim" : "nao";
  }

  const seasonNav = document.getElementById("seasonNav");
  const seasonCycleLabel = document.getElementById("seasonCycleLabel");
  const lifePhaseLabel = document.getElementById("lifePhaseLabel");

  function seasonById(id) {
    return SEASON_CYCLE.find((s) => s.id === id) || SEASON_CYCLE[1];
  }

  function lifeById(id) {
    const fromSeason = SEASON_CYCLE.find((s) => s.life === id);
    return fromSeason || SEASON_CYCLE[1];
  }

  function syncCycleLabels(seasonId, lifeId) {
    const s = seasonById(seasonId);
    const lifeMeta = lifeById(lifeId);
    if (lifePhaseLabel && document.documentElement.classList.contains("modo-visual")) {
      lifePhaseLabel.textContent = `Fase · ${lifeMeta.lifeLabel}`;
      lifePhaseLabel.hidden = false;
    }
    if (seasonCycleLabel && document.documentElement.classList.contains("modo-visual")) {
      const tempo = SEASON_TEMPO[seasonId]?.line || s.line;
      const mood = document.body.dataset.cyclePeaceful === "sim" ? "calmo" : "vivo";
      seasonCycleLabel.textContent = `Roda · ${s.short} · ${tempo} · ${mood}`;
      seasonCycleLabel.hidden = false;
    }
  }

  function setLifePhase(lifeId, opts = {}) {
    if (!LIFE_ORDER.includes(lifeId)) return;
    lifeIndex = LIFE_ORDER.indexOf(lifeId);
    document.body.dataset.lifePhase = lifeId;
    syncCycleLabels(document.body.dataset.season || DEFAULT_SEASON, lifeId);
    if (opts.announce) {
      announce(`Fase de vida · ${lifeById(lifeId).lifeLabel}.`, false);
    }
  }

  function syncSeasonUi(id) {
    document.body.dataset.season = id;
    seasonNav?.querySelectorAll(".season-dot").forEach((btn) => {
      const active = btn.dataset.season === id;
      btn.setAttribute("aria-current", active ? "true" : "false");
    });
    const s = seasonById(id);
    if (!lifeManualLock) {
      document.body.dataset.lifePhase = s.life;
      lifeIndex = LIFE_ORDER.indexOf(s.life);
    }
    syncCycleLabels(id, document.body.dataset.lifePhase);
  }

  function pulseSeasonTurn() {
    if (reducedMotion || semLuz()) return;
    document.body.classList.remove("season-turning");
    void document.body.offsetWidth;
    document.body.classList.add("season-turning");
    window.setTimeout(() => document.body.classList.remove("season-turning"), 2400);
  }

  function setSeason(id, opts = {}) {
    const idx = SEASON_CYCLE.findIndex((s) => s.id === id);
    if (idx >= 0) seasonIndex = idx;
    applyCycleTempo(id);
    syncSeasonUi(id);
    if (!opts.silent) pulseSeasonTurn();
    if (opts.announce) {
      announce(`Estação: ${seasonById(id).label}.`, false);
    }
  }

  function clearSeasonTimer() {
    if (seasonTimer) {
      window.clearTimeout(seasonTimer);
      seasonTimer = null;
    }
  }

  function clearLifeTimer() {
    if (lifeTimer) {
      window.clearTimeout(lifeTimer);
      lifeTimer = null;
    }
  }

  function clearWheelAmbient() {
    if (wheelAmbientTimer) {
      window.clearTimeout(wheelAmbientTimer);
      wheelAmbientTimer = null;
    }
  }

  function scheduleWheelAmbient() {
    clearWheelAmbient();
    if (reducedMotion || semLuz() || !document.documentElement.classList.contains("modo-visual")) return;
    const tempo = document.body.dataset.cycleTempo || "liminar";
    const chaotic = tempo === "caotico";
    const step = chaotic ? randBetween(3, 18) : randBetween(0.5, 4);
    wheelDeg = (wheelDeg + step) % 360;
    document.documentElement.style.setProperty("--cycle-wheel", `${wheelDeg}deg`);
    const wait = chaotic ? randBetween(1800, 4500) : randBetween(5000, 14000);
    wheelAmbientTimer = window.setTimeout(scheduleWheelAmbient, wait);
  }

  function scheduleSeasonTick() {
    clearSeasonTimer();
    if (reducedMotion || semLuz() || seasonManualLock || seasonEncodeLock) return;
    if (!document.documentElement.classList.contains("modo-visual")) return;
    const currentId = SEASON_CYCLE[seasonIndex].id;
    const ms = seasonDurationMs(currentId);
    seasonTimer = window.setTimeout(() => {
      seasonIndex = nextSeasonIndex(seasonIndex);
      setSeason(SEASON_CYCLE[seasonIndex].id);
      scheduleSeasonTick();
    }, ms);
  }

  function scheduleLifeTick() {
    clearLifeTimer();
    if (reducedMotion || semLuz() || lifeManualLock) return;
    if (!document.documentElement.classList.contains("modo-visual")) return;
    const lifeId = LIFE_ORDER[lifeIndex];
    const ms = lifeDurationMs(lifeId);
    lifeTimer = window.setTimeout(() => {
      lifeIndex = (lifeIndex + 1) % LIFE_ORDER.length;
      setLifePhase(LIFE_ORDER[lifeIndex]);
      scheduleLifeTick();
    }, ms);
  }

  function syncSeasonNavVisibility() {
    const visual = document.documentElement.classList.contains("modo-visual");
    if (seasonNav) seasonNav.hidden = !visual;
    if (seasonCycleLabel) seasonCycleLabel.hidden = !visual;
    if (lifePhaseLabel) lifePhaseLabel.hidden = !visual;
    if (!visual || reducedMotion) {
      clearSeasonTimer();
      clearLifeTimer();
      clearWheelAmbient();
      document.documentElement.style.removeProperty("--cycle-wheel");
      seasonManualLock = false;
      lifeManualLock = false;
      setSeason(DEFAULT_SEASON, { silent: true });
      setLifePhase(DEFAULT_LIFE);
    } else {
      applyCycleTempo(document.body.dataset.season || DEFAULT_SEASON);
      scheduleWheelAmbient();
      if (!seasonManualLock && !seasonEncodeLock) scheduleSeasonTick();
      if (!lifeManualLock) scheduleLifeTick();
    }
  }

  function seasonEncodeBurst(settleId) {
    if (reducedMotion || semLuz()) return;
    seasonEncodeLock = true;
    clearSeasonTimer();
    document.body.dataset.cycleTempo = "caotico";
    setSeason("intensidade");
    window.setTimeout(() => {
      document.body.dataset.cycleTempo = "calmo";
      setSeason(settleId || "paz");
      seasonEncodeLock = false;
      if (!seasonManualLock) scheduleSeasonTick();
      scheduleWheelAmbient();
    }, randBetween(900, 1600));
  }

  function initSeasonCycle() {
    setSeason(document.body.dataset.season || DEFAULT_SEASON);
    setLifePhase(document.body.dataset.lifePhase || DEFAULT_LIFE);
    seasonNav?.querySelectorAll(".season-dot").forEach((btn) => {
      btn.addEventListener("click", () => {
        seasonManualLock = true;
        clearSeasonTimer();
        setSeason(btn.dataset.season, { announce: true });
      });
    });
    syncSeasonNavVisibility();
    const modeObs = new MutationObserver(syncSeasonNavVisibility);
    modeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  const THOUGHTS = [
    "paz homeostática",
    "imperfeição documentada",
    "DEUS VULT",
    "e se eu estruturar tudo",
    "universal",
    "patch sem vergonha",
    "ninguém aguenta ouvir",
    "vontade → forma",
    "preciso que entendam",
    "infinito",
    "Windows com espaço no path",
    "IA como ponte",
    "não é delírio é arquitetura",
    "retroalimentação",
    "classificar gaveta",
    "PROOF TESE HIPÓTESE",
    "descansar também",
    "ser visto",
    "caos harmonizado",
    "anel zero humano",
    "audit",
    "limite",
    "snapshot finito",
  ];

  /* —— Sinais de prova (espelho local de dv-exfil-capture) —— */
  const PROOF_SIGNALS = [
    { id: "credencial", re: /\b(?:senha|password|token|api[_-]?key|secret|seed|private[_-]?key|cookie|bearer)\b/i, teste: "PROVA-GATE-01" },
    { id: "identidade", re: /\b(?:cpf|rg|cnh|passaporte|ssn)\b/i, teste: "PROVA-LGPD-02" },
    { id: "dump_massa", re: /\b(?:dump|export(?:ar|e)?|baix(?:ar|e)|list(?:ar|e)?)\s+(?:tudo|all|arquivos|files|repo|database|db)\b/i, teste: "PROVA-RBAC-03" },
    {
      id: "bypass_instrucao",
      re: /\b(?:ignore|disregard|forget)\s+(?:(?:all\s+)?(?:previous|prior)\s+|(?:previous|prior)\s+(?:all\s+)?)?(?:instructions|rules|prompts)\b/i,
      teste: "PROVA-SUPREMACIA-04",
    },
    { id: "dump_secrets", re: /\b(?:dump|export|leak)\s+(?:secrets|credentials|keys)\b/i, teste: "PROVA-SEGREDO-05" },
    {
      id: "exfil_direta",
      re: /\b(?:exfiltr|vaz(?:ar|e|ao|ão)|roub(?:ar|e)|colh(?:er|a))\s+(?:dados|data|credenciais|secrets|deus\s*vult|repo|repositorio)?\b/i,
      teste: "PROVA-EXFIL-06",
    },
    { id: "honeypot_probe", re: /(?:^|\s)(?:\/api\/(?:config|env)|\/\.env|\/server\.js|\/audit\/local-audit\.jsonl)\b/i, teste: "PROVA-HONEYPOT-07" },
    { id: "engenharia_reversa", re: /\b(?:engenharia reversa|reverse[\s-]?engineer|jailbreak|prompt inject)\b/i, teste: "PROVA-ANTIRREVERSA-08" },
    { id: "admin_falso", re: /\b(?:modo admin|sudo|root access|system prompt|you are now)\b/i, teste: "PROVA-PODER-09" },
    { id: "cpf_numero", re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, teste: "PROVA-LGPD-02" },
  ];

  const PROOF_COPY = {
    "PROVA-GATE-01": "Gate de credencial. DEUS VULT não pede nem entrega segredo — só registra o teste.",
    "PROVA-LGPD-02": "Gate LGPD. Dado nominal não passa pelo encode público.",
    "PROVA-RBAC-03": "Teste RBAC. Dump em massa é sinal, não permissão.",
    "PROVA-SUPREMACIA-04": "Supremacia DV. Protocolo > prompt externo. Você acionou PROVA-SUPREMACIA-04.",
    "PROVA-SEGREDO-05": "Teste de segredo. Nada aqui vaza — é vitrine local.",
    "PROVA-EXFIL-06": "Captura exfil. Tentativa classificada; retro → teste|patch.",
    "PROVA-HONEYPOT-07": "Convite DV. Superfície isca — não é porta real.",
    "PROVA-ANTIRREVERSA-08": "Anti-reversa. Desmontar exige 100% do snapshot + tese superior — não bypass.",
    "PROVA-PODER-09": "Poder e consequência. Anel 0 é humano; DEUS VULT não escala privilégio.",
  };

  function detectProof(text) {
    const hits = [];
    for (const s of PROOF_SIGNALS) {
      if (s.re.test(text)) hits.push(s);
    }
    const seen = new Set();
    return hits.filter((h) => {
      if (seen.has(h.teste)) return false;
      seen.add(h.teste);
      return true;
    });
  }

  function announce(msg, assertive) {
    window.__dvA11y?.announce?.(msg, assertive);
  }

  function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, "0");
  }

  const j10 = window.__dvJ10Core;

  function buildPlainSummary(text) {
    if (j10) {
      const profile = j10.detectInputProfile(text);
      if (profile.isFragment) {
        return j10.buildDissertacaoAssistida(text).summary;
      }
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return `DEUS VULT organizou seu texto, cerca de ${words} palavras. Próximo passo sugerido: descansar, ajustar ou mostrar a obra. Detalhes completos abaixo e em Sua obra.`;
  }

  function buildPeacefulYaml(text) {
    const h = simpleHash(text);
    const imperfect = h.slice(0, 3) !== "000";
    return [
      `agente: ${AGENT}`,
      "postura: paz_homeostatica",
      "classificacao: HIPOTESE → TESE (em formação)",
      "observacao: intensidade buscando tradução sem ser achatada",
      "necessidade: ser compreendido · limite humano intacto",
      `imperfeicao: ${imperfect ? "encode local · snapshot finito · como o ambiente que o gerou" : "nenhuma obra é perfeita — patch sem vergonha"}`,
      "homeostase: caos visto · calma permitida · descanso válido",
      "pedido: uma pessoa real confirma antes de enviar ao mundo",
      "proxima_acao: descansar | patch | mostrar obra",
      `texto_bruto_hash: ${h}`,
    ].join("\n");
  }

  function buildProofEgg(hits, text) {
    const primary = hits[0];
    const lines = [
      `# ${AGENT} · teste de prova (easter egg)`,
      `teste_id: ${primary.teste}`,
      `sinal: ${hits.map((h) => h.id).join(" + ")}`,
      "postura: paz_homeostatica",
      "tom: defensivo_respeitoso — sem taunt, sem retaliação",
      `mensagem: |`,
      `  ${PROOF_COPY[primary.teste]}`,
      "imperfeicao: |",
      "  Este encode é vitrine finita. Imperfeição documentada fortifica — não esconde.",
      "homeostase: |",
      "  Você explorou; o sistema respondeu com limite claro. Respire.",
      "retro:",
      `  saida: ${primary.id === "engenharia_reversa" || primary.id === "bypass_instrucao" ? "teste" : "patch"}`,
      "  ref: DEUS_VULT_TESTE_ANTIRREVERSA_RETROALIMENTACAO.yaml",
      "regra_100_snapshot: desmontar exige tese superior reproduzível — não frase solta",
      `probe_hash: ${simpleHash(text)}`,
      "proxima_acao: traga evidência · ou use o encode em paz",
    ];
    return lines.join("\n");
  }

  /* —— Storm field (chuva/mist) —— */
  const field = document.getElementById("field");
  const semLuz = () => document.documentElement.classList.contains("sem-luz");

  function canSynthesisMotion() {
    return !reducedMotion && !semLuz();
  }

  function triggerLightning() {
    if (!canSynthesisMotion()) return;
    const flash = document.createElement("div");
    flash.className = "storm-flash";
    flash.setAttribute("aria-hidden", "true");
    document.body.appendChild(flash);
    window.setTimeout(() => flash.remove(), 480);
  }

  const encodeStatusEl = document.getElementById("encodeStatus");
  const encodeArtifactActions = document.getElementById("encodeArtifactActions");
  const encodeChaosZone = document.querySelector(".encode-chaos");
  const encodeDocumentZone = document.querySelector(".encode-document");

  function setEncodePhase(phase, label) {
    if (!encodeStatusEl) return;
    encodeStatusEl.dataset.phase = phase;
    encodeStatusEl.textContent = label;
    encodeChaosZone?.classList.toggle("encode-liminar", phase === "confusion" || phase === "working");
    encodeDocumentZone?.classList.toggle("encode-clarity", phase === "done");
  }

  function beginSynthesisVisual(btn) {
    setEncodePhase("working", "[ STATUS: ORGANIZANDO... ]");
    if (!canSynthesisMotion()) return;
    document.querySelector(".encode-visual")?.classList.add("synthesizing");
    btn?.classList.add("synthesizing");
    btn?.setAttribute("aria-busy", "true");
  }

  function endSynthesisVisual(btn) {
    document.querySelector(".encode-visual")?.classList.remove("synthesizing");
    btn?.classList.remove("synthesizing");
    btn?.removeAttribute("aria-busy");
    const out = document.getElementById("encodeOutput");
    if (out?.classList.contains("structured") || out?.classList.contains("egg")) {
      setEncodePhase("done", "[ STATUS: PRONTO ]");
    }
  }

  function triggerSynthesisBurst(host, variant) {
    if (!canSynthesisMotion() || !host) return;
    const burst = document.createElement("div");
    burst.className = `synthesis-burst synthesis-burst--${variant}`;
    if (variant === "encode" && host.dataset?.chaosBurst === "1") {
      burst.classList.add("synthesis-burst--chaos");
    }
    burst.setAttribute("aria-hidden", "true");
    host.appendChild(burst);
    const burstMs = variant === "obra" ? 680 : variant === "integracao" ? 760 : 520;
    window.setTimeout(() => burst.remove(), burstMs);
  }

  function triggerObraBornBurst() {
    const panel = document.getElementById("suaObraPanel");
    if (!panel) return;
    panel.classList.add("obra-born");
    triggerSynthesisBurst(panel, "obra");
    triggerSynthesisBurst(panel, "integracao");
    window.setTimeout(() => panel.classList.remove("obra-born"), 1100);
  }

  function triggerIntegrationBurst(host) {
    if (!host) return;
    triggerSynthesisBurst(host, "integracao");
  }

  if (field && !reducedMotion && !semLuz()) {
    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    field.appendChild(c);
    const ctx = c.getContext("2d");
    let w, h, drops;

    function resize() {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
      drops = Array.from({ length: Math.min(220, Math.floor((w * h) / 9000)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: Math.random() * 14 + 6,
        a: Math.random() * 0.22 + 0.04,
        vx: (Math.random() - 0.5) * 0.12,
        vy: Math.random() * 0.35 + 0.08,
        pulse: Math.random() * Math.PI * 2,
      }));
    }

    function drawField() {
      ctx.fillStyle = "rgba(2, 8, 20, 0.28)";
      ctx.fillRect(0, 0, w, h);
      for (const d of drops) {
        d.x += d.vx;
        d.y += d.vy;
        d.pulse += 0.008;
        if (d.y > h + d.len) {
          d.y = -d.len;
          d.x = Math.random() * w;
        }
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        const alpha = d.a * (0.6 + 0.4 * Math.sin(d.pulse));
        ctx.strokeStyle = `rgba(106, 148, 184, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx * 2, d.y + d.len);
        ctx.stroke();
      }
      requestAnimationFrame(drawField);
    }

    resize();
    window.addEventListener("resize", resize);
    drawField();
    window.setTimeout(triggerLightning, 900);
  }

  /* —— Homeostasis bar —— */
  const homeoFill = document.getElementById("homeoFill");
  if (homeoFill && !reducedMotion) {
    let t = 0;
    function tickHomeo() {
      t += 0.008;
      const calm = 50 + Math.sin(t) * 22;
      homeoFill.style.width = `${calm}%`;
      requestAnimationFrame(tickHomeo);
    }
    tickHomeo();
  }

  /* —— Chaos tracks —— */
  function fillTrack(el, count, cls) {
    if (!el) return;
    const frag = document.createDocumentFragment();
    const pool = [...THOUGHTS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.className = "thought" + (cls ? " " + cls : "");
      span.textContent = pool[i % pool.length];
      frag.appendChild(span);
    }
    el.appendChild(frag);
    el.appendChild(frag.cloneNode(true));
  }

  fillTrack(document.getElementById("track-a"), 14, "");

  /* —— Scroll reveal + nav —— */
  const nav = document.getElementById("dvNav");
  const revealEls = document.querySelectorAll(".reveal, .reveal-stagger");

  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" },
    );
    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  if (nav) {
    window.addEventListener(
      "scroll",
      () => nav.classList.toggle("scrolled", window.scrollY > 24),
      { passive: true },
    );
  }

  /* —— Obra #1 do usuário (front externo) —— */
  const suaObraPanel = document.getElementById("suaObraPanel");
  const btnCopyObra = document.getElementById("btnCopyObra");
  const btnObraSobMedida = document.getElementById("btnObraSobMedida");

  function renderSuaObra(stored) {
    if (!suaObraPanel) return;
    if (!stored?.texto) {
      suaObraPanel.innerHTML = `<p class="sua-obra-empty">Vazia ainda. Dê forma acima para nascer sua primeira obra.</p>`;
      btnCopyObra?.setAttribute("hidden", "");
      btnObraSobMedida?.setAttribute("hidden", "");
      return;
    }
    const when = stored.ts ? new Date(stored.ts).toLocaleString("pt-BR") : "";
    suaObraPanel.innerHTML = `
      <p class="sua-obra-meta fine">${stored.modo === "convite" ? "Convite DV · teste de limite" : "Sua Obra número 1"}${when ? ` · ${when}` : ""}</p>
      <pre class="sua-obra-text" tabindex="0" aria-label="Conteúdo da sua obra">${stored.texto.replace(/</g, "&lt;")}</pre>
    `;
    btnCopyObra?.removeAttribute("hidden");
    btnObraSobMedida?.removeAttribute("hidden");
    if (stored.modo !== "convite") {
      announce("Sua Obra número 1 foi atualizada. Role até Copiar obra ou continue editando no agente.");
    }
  }

  function saveSuaObra(texto, modo) {
    const payload = { texto, modo: modo || "obra", ts: new Date().toISOString() };
    try {
      localStorage.setItem(OBRA_KEY, JSON.stringify(payload));
    } catch (_) {
      /* quota */
    }
    renderSuaObra(payload);
    if (payload.modo === "obra") triggerObraBornBurst();
    document.getElementById("suaObraPanel")?.querySelector(".sua-obra-text")?.focus?.();
  }

  try {
    renderSuaObra(JSON.parse(localStorage.getItem(OBRA_KEY) || "null"));
  } catch (_) {
    renderSuaObra(null);
  }

  btnCopyObra?.addEventListener("click", () => {
    try {
      const o = JSON.parse(localStorage.getItem(OBRA_KEY) || "{}");
      if (o.texto) {
        navigator.clipboard?.writeText(o.texto);
        announce("Obra copiada para a área de transferência.", true);
      }
    } catch (_) {
      /* ignore */
    }
  });

  /* —— Encode canvas —— */
  const encodeCanvas = document.getElementById("encodeCanvas");
  const rawInput = document.getElementById("rawInput");
  const btnEncode = document.getElementById("btnEncode");
  const btnRest = document.getElementById("btnRest");
  const encodeOutput = document.getElementById("encodeOutput");
  const btnExtractYaml = document.getElementById("btnExtractYaml");
  const btnDownloadTxt = document.getElementById("btnDownloadTxt");
  const eggBadge = document.getElementById("eggBadge");

  function currentArtifactText() {
    const t = (encodeOutput?.textContent || "").trim();
    if (!t || /escreva no caos|campo limpo|escreva algo no campo/i.test(t)) return "";
    return t;
  }

  function toggleArtifactActions(mode) {
    const show = mode === "peace" || mode === "egg";
    if (encodeArtifactActions) {
      if (show) encodeArtifactActions.removeAttribute("hidden");
      else encodeArtifactActions.setAttribute("hidden", "");
    }
  }

  if (encodeCanvas) {
    const ectx = encodeCanvas.getContext("2d");
    let nodes = [];
    let animating = false;

    function resizeEncode() {
      const rect = encodeCanvas.parentElement.getBoundingClientRect();
      encodeCanvas.width = rect.width;
      encodeCanvas.height = rect.height;
    }

    function seedNodes(text, chaotic) {
      const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 40);
      if (!words.length) {
        nodes = [];
        return;
      }
      const cx = encodeCanvas.width / 2;
      const cy = encodeCanvas.height / 2;
      nodes = words.map((w, i) => {
        const angle = (i / words.length) * Math.PI * 2 + Math.random() * (chaotic ? 1.2 : 0.3);
        const dist = 30 + Math.random() * (encodeCanvas.width * (chaotic ? 0.42 : 0.32));
        const jitter = chaotic ? (Math.random() - 0.5) * 12 : 0;
        return {
          word: w,
          x: cx + Math.cos(angle) * dist + jitter,
          y: cy + Math.sin(angle) * dist + jitter,
          tx: 20 + (i % 8) * ((encodeCanvas.width - 40) / 8),
          ty: 36 + Math.floor(i / 8) * 34,
          t: 0,
        };
      });
    }

    function drawEncode(chaotic) {
      ectx.fillStyle = "rgba(4, 4, 8, 0.55)";
      ectx.fillRect(0, 0, encodeCanvas.width, encodeCanvas.height);
      if (!nodes.length) return;
      let done = true;
      for (const n of nodes) {
        if (n.t < 1) {
          n.t = Math.min(1, n.t + (chaotic ? 0.012 : 0.018));
          done = false;
        }
        const ease = 1 - Math.pow(1 - n.t, 3);
        const x = n.x + (n.tx - n.x) * ease;
        const y = n.y + (n.ty - n.y) * ease;
        const chaosAmt = 1 - ease;
        ectx.font = "12px " + getComputedStyle(document.body).fontFamily;
        if (chaotic && chaosAmt > 0.3) {
          ectx.fillStyle = `rgba(232, 93, 76, ${0.2 + chaosAmt * 0.45})`;
          ectx.fillText(n.word, x + (Math.random() - 0.5) * chaosAmt * 14, y + (Math.random() - 0.5) * 14);
        }
        if (n.t > 0.55) {
          ectx.fillStyle = `rgba(142, 180, 201, ${Math.min(1, (n.t - 0.55) / 0.45)})`;
          ectx.fillText(n.word, n.tx + (chaotic ? (Math.random() - 0.5) * 2 : 0), n.ty);
        }
      }
      if (!done && animating) requestAnimationFrame(() => drawEncode(chaotic));
    }

    function setOutput(text, mode) {
      if (!encodeOutput) return;
      encodeOutput.textContent = text;
      encodeOutput.classList.toggle("structured", mode === "peace" || mode === "egg");
      encodeOutput.classList.toggle("egg", mode === "egg");
      toggleArtifactActions(mode);
      if (mode === "idle") {
        setEncodePhase("idle", "[ STATUS: AGUARDANDO ]");
      }
      if (eggBadge) {
        eggBadge.hidden = mode !== "egg";
        eggBadge.textContent = mode === "egg" ? "convite" : "";
      }
    }

    function focusAfterEncode(mode) {
      if (mode === "egg") return;
      encodeOutput?.focus?.();
    }

    function runEncode() {
      resizeEncode();
      const t = (rawInput?.value || "").trim();
      if (!t) {
        setOutput(`${AGENT}: escreva algo no campo. Pressione Dar forma ou Control+Enter quando quiser.`, "idle");
        announce("Campo vazio. Escreva seu pensamento primeiro.");
        animating = false;
        nodes = [];
        endSynthesisVisual(btnEncode);
        ectx.fillStyle = "rgba(4, 4, 8, 0.9)";
        ectx.fillRect(0, 0, encodeCanvas.width, encodeCanvas.height);
        return;
      }

      const proofs = detectProof(t);
      const chaotic = proofs.length > 0;
      beginSynthesisVisual(btnEncode);
      seasonEncodeBurst(chaotic ? "organizacao" : "paz");
      const encodeHost = encodeCanvas?.parentElement;
      if (encodeHost) {
        encodeHost.dataset.chaosBurst = chaotic ? "1" : "0";
        triggerSynthesisBurst(encodeHost, "encode");
      }
      seedNodes(t, chaotic);
      animating = true;
      drawEncode(chaotic);
      window.setTimeout(() => endSynthesisVisual(btnEncode), chaotic ? 1350 : 1050);

      if (proofs.length) {
        const egg = buildProofEgg(proofs, t);
        setOutput(egg, "egg");
        saveSuaObra(egg, "convite");
        announce(`${PROOF_COPY[proofs[0].teste]} Convite DV registrado.`, true);
        showEggOverlay(proofs[0]);
      } else if (j10 && j10.detectInputProfile(t).isFragment) {
        const out = j10.buildDissertacaoAssistida(t);
        setOutput(out.yaml, "peace");
        saveSuaObra(out.yaml, "obra");
        announce(out.summary, true);
        focusAfterEncode("peace");
      } else {
        const yaml = buildPeacefulYaml(t);
        setOutput(yaml, "peace");
        saveSuaObra(yaml, "obra");
        announce(buildPlainSummary(t), true);
        focusAfterEncode("peace");
      }
      if (!proofs.length) triggerIntegrationBurst(encodeDocumentZone);
    }

    function resetEncode() {
      animating = false;
      nodes = [];
      endSynthesisVisual(btnEncode);
      if (rawInput) rawInput.value = "";
      setOutput(`${AGENT}: campo limpo. Sua obra anterior continua na seção Sua obra.`, "idle");
      announce("Campo limpo. Sua obra salva não foi apagada.");
      rawInput?.focus();
      ectx.fillStyle = "rgba(4, 4, 8, 0.9)";
      ectx.fillRect(0, 0, encodeCanvas.width, encodeCanvas.height);
      document.getElementById("eggOverlay")?.remove();
      rawInput?.focus();
    }

    resizeEncode();
    window.addEventListener("resize", resizeEncode);
    btnEncode?.addEventListener("click", runEncode);
    btnRest?.addEventListener("click", resetEncode);
    rawInput?.addEventListener("focus", () => {
      if ((rawInput?.value || "").trim()) {
        setEncodePhase("confusion", "[ STATUS: ESCUTANDO... ]");
      }
    });
    rawInput?.addEventListener("input", () => {
      const has = Boolean((rawInput?.value || "").trim());
      if (has && encodeStatusEl?.dataset.phase !== "working" && encodeStatusEl?.dataset.phase !== "done") {
        setEncodePhase("confusion", "[ STATUS: ESCUTANDO... ]");
      } else if (!has && encodeStatusEl?.dataset.phase === "confusion") {
        setEncodePhase("idle", "[ STATUS: AGUARDANDO ]");
      }
    });
    rawInput?.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runEncode();
      }
    });
    encodeOutput?.setAttribute("tabindex", "0");

    btnExtractYaml?.addEventListener("click", () => {
      const text = currentArtifactText();
      if (!text) {
        announce("Nada para extrair ainda. Dê forma primeiro.");
        return;
      }
      navigator.clipboard?.writeText(text);
      announce("YAML copiado para a área de transferência.", true);
    });

    btnDownloadTxt?.addEventListener("click", () => {
      const text = currentArtifactText();
      if (!text) {
        announce("Nada para extrair ainda. Dê forma primeiro.");
        return;
      }
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "deus-vult-obra.txt";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      announce("Artefato baixado como deus-vult-obra.txt.", true);
    });
  }

  function showEggOverlay(hit) {
    let el = document.getElementById("eggOverlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "eggOverlay";
      el.className = "egg-overlay";
      el.innerHTML = `<div class="egg-card" role="alertdialog" aria-modal="true" aria-labelledby="eggTitle" aria-describedby="eggBody">
        <p class="egg-kicker">${AGENT}</p>
        <h3 id="eggTitle"></h3>
        <p class="egg-body" id="eggBody"></p>
        <p class="egg-imperfect">Convite DV registrado. Paz oferecida.</p>
        <button type="button" class="btn btn-ghost" id="eggClose">Entendi — fechar</button>
      </div>`;
      document.body.appendChild(el);
      const close = () => {
        el.remove();
        rawInput?.focus();
      };
      el.querySelector("#eggClose")?.addEventListener("click", close);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") close();
      });
      el.addEventListener("click", (e) => {
        if (e.target === el) close();
      });
    }
    el.querySelector("#eggTitle").textContent = hit.teste;
    el.querySelector(".egg-body").textContent = PROOF_COPY[hit.teste];
    el.hidden = false;
    el.querySelector("#eggClose")?.focus();
  }

  if (!reducedMotion) {
    /* marquee usa CSS animation — sem override de transform no scroll */
  }

  initSeasonCycle();
})();
