/**
 * J10 core — fragmento → dissertação assistida (browser + gate Node)
 * @see DEUS_VULT_PROVA_PERSONA_J10_DISSERTAR.yaml
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.__dvJ10Core = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const AGENT = "DEUS VULT";

  function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, "0");
  }

  function splitFragments(text) {
    return text
      .split(/\n|[,;·•]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function detectInputProfile(text) {
    const trimmed = text.trim();
    const lines = splitFragments(trimmed);
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const avgLineLen = lines.length
      ? lines.reduce((a, l) => a + l.split(/\s+/).filter(Boolean).length, 0) / lines.length
      : wordCount;
    const shortLines = lines.length >= 2 && lines.every((l) => l.split(/\s+/).filter(Boolean).length <= 4);
    const isFragment =
      wordCount <= 8 ||
      shortLines ||
      (wordCount <= 15 && !/[.!?]$/.test(trimmed) && avgLineLen <= 3);
    return {
      id: isFragment ? "j10_fragmento" : "adulto_fluido",
      isFragment,
      dificuldade_dissertativa: isFragment ? "alta" : "baixa",
      wordCount,
      fragmentCount: lines.length,
    };
  }

  function inferTema(fragment) {
    const lower = fragment.toLowerCase();
    if (/medo|ansied|pânico|panico|trav/.test(lower)) return "medo_e_limite";
    if (/prova|teste|prazo|escola/.test(lower)) return "prova_e_tempo";
    if (/quero|desejo|vontade/.test(lower)) return "desejo";
    if (/nao sei|não sei|ajuda|help/.test(lower)) return "incerteza_e_ajuda";
    if (/∞|infinit|ideia/.test(lower)) return "ideia_infinita";
    return "pensamento_bruto";
  }

  function expandFragment(g) {
    const templates = {
      medo_e_limite: `Sobre «${g.fragmento}»: há medo ou limite no ar. Nomear já é passo — não precisa estar bonito.`,
      prova_e_tempo: `Sobre «${g.fragmento}»: algo pressiona tempo ou avaliação. O sistema guarda isso sem julgar.`,
      desejo: `Sobre «${g.fragmento}»: há vontade. Vale registrar antes de organizar.`,
      incerteza_e_ajuda: `Sobre «${g.fragmento}»: incerteza legítima. Pedir ajuda não é falha.`,
      ideia_infinita: `Sobre «${g.fragmento}»: ideia grande demais para caber numa frase — gaveta aberta.`,
      pensamento_bruto: `Sobre «${g.fragmento}»: pensamento bruto aceito. Forma vem depois.`,
    };
    return templates[g.tema] || templates.pensamento_bruto;
  }

  function buildDissertacaoYaml(text, profile, gavetas, dissertacao) {
    const h = simpleHash(text);
    const gavetaLines = gavetas.flatMap((g) => [
      "  - fragmento: " + JSON.stringify(g.fragmento),
      "    tema: " + g.tema,
    ]);
    return [
      `agente: ${AGENT}`,
      "postura: paz_homeostatica",
      `perfil_entrada: ${profile.id}`,
      `dificuldade_dissertativa: ${profile.dificuldade_dissertativa}`,
      "usuario_nao_precisou_dissertar: true",
      "classificacao: HIPOTESE → TESE (dissertacao_assistida)",
      "gavetas:",
      ...gavetaLines,
      "dissertacao_assistida: |",
      ...dissertacao.split("\n").map((line) => "  " + line),
      "homeostase: fragmento aceito · forma escrita pelo sistema · limite humano intacto",
      "pedido: uma pessoa real confirma antes de enviar ao mundo",
      "proxima_acao: descansar | patch | mostrar obra",
      `texto_bruto_hash: ${h}`,
    ].join("\n");
  }

  function buildDissertacaoAssistida(text) {
    const profile = detectInputProfile(text);
    const frags = splitFragments(text);
    const gavetas = frags.map((f, i) => ({
      idx: i + 1,
      fragmento: f,
      tema: inferTema(f),
    }));
    const dissertacao = gavetas.map((g) => expandFragment(g)).join("\n\n");
    const yaml = buildDissertacaoYaml(text, profile, gavetas, dissertacao);
    const summary = profile.isFragment
      ? `${AGENT} ouviu ${gavetas.length} fragmento(s). Você não precisou escrever ensaio — a dissertação assistida está abaixo e em Sua obra.`
      : `${AGENT} organizou seu texto. Detalhes abaixo e em Sua obra.`;
    return { yaml, summary, profile, gavetas };
  }

  return {
    splitFragments,
    detectInputProfile,
    inferTema,
    expandFragment,
    buildDissertacaoAssistida,
    buildDissertacaoYaml,
    simpleHash,
  };
});
