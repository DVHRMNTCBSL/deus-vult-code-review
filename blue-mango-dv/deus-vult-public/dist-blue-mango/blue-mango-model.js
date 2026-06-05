(function () {
  "use strict";

  window.BLUE_MANGO_MODEL = {
    name: "BLUE MANGO",
    status: "public_static_with_optional_external_engine",
    networkGate: "open_only_for_optional_stockfish_cdn_when_selected",
    sourcePolicy:
      "No hidden telemetry. Local engine, personas, timer, score, HUD, contrast mode, mobile dock, and coach run in browser. Optional Stockfish mode downloads a GPL Stockfish JS worker from cdnjs; board state is processed in the browser worker.",
    hypotheses: {
      h0a: {
        label: "H0-A",
        statement: "Existe pelo menos uma jogada otima a partir da posicao inicial.",
        classification: "PROOF",
        note:
          "Se o valor teorico do jogo existe e os lances iniciais sao finitos, ao menos um lance preserva o melhor valor.",
      },
      h0b: {
        label: "H0-B",
        statement: "A jogada perfeita concreta da posicao inicial e conhecida.",
        classification: "HYPOTHESIS",
        status: "not_proven",
        impasse:
          "Sem certificado publico completo cobrindo todos os desvios legais desde a posicao inicial.",
      },
      h1: {
        label: "H1",
        statement: "Entregar a melhor politica operacional sob busca limitada e auditada.",
        classification: "DECISION",
        candidateSet: ["g1f3", "e2e4", "d2d4"],
      },
    },
    resolverDV: {
      proof: "H0-A aceita por determinacao de jogos finitos de informacao perfeita.",
      impasse: "H0-B segue nao provada para a posicao inicial do xadrez.",
      partialSolution: "Tablebases resolvem subconjuntos de finais; BLUE MANGO mostra politica operacional e prova local, nao solucao total.",
      nextLayers: [
        "conectar tablebase por FEN quando houver poucas pecas",
        "adicionar transposition table",
        "adicionar proof-number search para arvores forcadas",
        "gerar certificados verificaveis por posicao",
      ],
      frontBackIntegration: {
        front: "blue-mango.html consulta tablebase sob demanda, tem demo K+Q vs K, e inclui Resolver posicao DV: tenta backend local /resolve e cai para busca local no navegador.",
        back: "deus-vult-public/scripts/blue-mango-tablebase-proxy.js oferece CLI/HTTP local em /tablebase e /resolve para prova por FEN ou politica operacional limitada.",
        invariant: "Se a posicao tem mais de 7 pecas, o sistema deve declarar que nao ha prova tablebase publica e retornar IMPASSE/HYPOTHESIS com busca limitada, nunca PROOF total.",
      },
    },
    tools: [
      {
        id: "blue-mango-html",
        kind: "public_ui",
        path: "deus-vult-public/blue-mango.html",
        role: "Playable board, persona modes, integrated play HUD, mobile action dock, timer, post-game report, and technical UCI training tool.",
      },
      {
        id: "dv-chess-algorithm",
        kind: "local_algorithm",
        path: "scripts/dv-chess-algorithm.js",
        role: "Reference implementation for legal move expansion, perft, alpha-beta, and audit.",
      },
      {
        id: "h0-h1-data-model",
        kind: "public_model",
        path: "deus-vult-public/content/articles/xadrez-h0-h1-dv.yaml",
        role: "DV hypothesis model for H0/H1, source limits, perturbation, and conclusion.",
      },
      {
        id: "dv-chess-audit",
        kind: "local_audit",
        path: "audit/dv-chess-algorithm-latest.json",
        role: "Latest local algorithm validation snapshot.",
      },
      {
        id: "stockfish-cdnjs",
        kind: "optional_external_engine",
        url: "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
        role: "Optional stronger UCI engine mode loaded as browser Worker.",
        license: "GPL-3.0",
      },
      {
        id: "blue-mango-tablebase-proxy",
        kind: "backend_adapter",
        path: "deus-vult-public/scripts/blue-mango-tablebase-proxy.js",
        role: "Local CLI/HTTP backend adapter for FEN tablebase proof.",
        routes: ["/tablebase?fen=...", "/resolve?fen=...&depth=2", "/health"],
      },
    ],
    integration: {
      uxPrinciples: {
        classification: "DECISION",
        applied:
          "Mobile-first board flow, visible status near the board, large repeated action targets, contrast choice for pieces, progressive disclosure for technical tools, and short coach feedback during play.",
        evidenceSources: [
          "WCAG 2.2 target-size guidance",
          "Nielsen Norman Group usability heuristics: visibility, recognition over recall, user control, minimalist design",
        ],
      },
      uiModes: ["human_vs_persona", "human_vs_human", "technical_uci_training"],
      aiModes: [
        "local_alpha_beta_depth_1_to_4",
        "quiescence_search",
        "positional_evaluation",
        "persona_opening_book",
        "optional_stockfish_online_worker",
      ],
      personas: [
        "Mango Bullet Pai",
        "Professor Calmo",
        "Atacante Tatico",
        "Defensor Solido",
        "Carlsen Tecnico",
        "Kasparov Pressao",
        "Karpov Controle",
        "Stockfish Mentor",
      ],
      externalBridge: {
        input: "FEN copied from UI",
        output: "UCI move pasted back into UI",
        examples: ["e2e4", "g1f3", "e7e8q"],
      },
      browserEngine:
        "Self-contained legal move generation and bounded alpha-beta inside BLUE MANGO HTML.",
      optionalExternalEngine:
        "Stockfish UCI worker loaded from cdnjs only when Stockfish online is selected.",
      externalSources: [
        "https://official-stockfish.github.io/docs/stockfish-wiki/",
        "https://github.com/official-stockfish",
        "https://cdnjs.com/libraries/stockfish.js",
        "https://www.w3.org/TR/WCAG22/",
        "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
        "https://www.nngroup.com/articles/ten-usability-heuristics/",
        "https://tablebase.lichess.ovh/",
        "https://github.com/lichess-org/lila-tablebase",
      ],
    },
  };
})();
