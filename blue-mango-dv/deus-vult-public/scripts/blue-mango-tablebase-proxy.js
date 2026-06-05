#!/usr/bin/env node
"use strict";

/*
 * BLUE MANGO tablebase backend adapter.
 *
 * Front: blue-mango.html can query Lichess tablebase directly.
 * Back: this script gives the same proof path as CLI or local HTTP proxy.
 */

const http = require("http");
const {
  CLASSIC_START_FEN,
  parseFen,
  stateToFen,
  runSearch,
} = require("../../scripts/dv-chess-algorithm.js");

const TABLEBASE_URL = "https://tablebase.lichess.ovh/standard";
const DEFAULT_DEPTH = 2;
const MAX_DEPTH = 4;

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function pieceCountFromFen(fen) {
  const placement = String(fen || "").trim().split(/\s+/)[0] || "";
  return (placement.match(/[pnbrqkPNBRQK]/g) || []).length;
}

function normalizeFen(fen) {
  const normalized = String(fen || "").trim().replace(/_/g, " ");
  return normalized === "startpos" ? CLASSIC_START_FEN : normalized;
}

function normalizeDepth(value) {
  const depth = Number(value || DEFAULT_DEPTH);
  if (!Number.isFinite(depth)) return DEFAULT_DEPTH;
  return Math.max(1, Math.min(MAX_DEPTH, Math.floor(depth)));
}

function isClassicStart(fen) {
  try {
    return stateToFen(parseFen(fen)) === CLASSIC_START_FEN;
  } catch {
    return false;
  }
}

function categoryText(category) {
  const map = {
    win: "vitoria_forcada",
    "syzygy-win": "vitoria_forcada",
    "maybe-win": "vitoria_limitada",
    "cursed-win": "ganho_com_regra_50_lances",
    draw: "empate_forcado",
    loss: "derrota_forcada",
    "syzygy-loss": "derrota_forcada",
    "maybe-loss": "derrota_limitada",
    "blessed-loss": "perdido_mas_regra_50_lances_pode_salvar",
    unknown: "desconhecido",
  };
  return map[category] || category || "desconhecido";
}

async function probeFen(fen) {
  const normalized = normalizeFen(fen);
  const pieces = pieceCountFromFen(normalized);
  if (!normalized) {
    return { ok: false, code: "missing_fen", classification: "IMPASSE", message: "FEN ausente." };
  }
  if (pieces > 7) {
    return {
      ok: false,
      code: "outside_tablebase_scope",
      classification: "IMPASSE",
      pieces,
      message: "Posicao fora da tablebase publica; segue H1 operacional.",
    };
  }

  const url = `${TABLEBASE_URL}?fen=${encodeURIComponent(normalized)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return {
      ok: false,
      code: `tablebase_http_${response.status}`,
      classification: "IMPASSE",
      pieces,
      message: "Tablebase indisponivel ou posicao nao coberta.",
    };
  }
  const data = await response.json();
  const best = Array.isArray(data.moves) && data.moves.length ? data.moves[0] : null;
  return {
    ok: true,
    classification: "PROOF",
    protocol: "blue_mango_tablebase_proxy_v1",
    fen: normalized,
    pieces,
    category: data.category,
    categoryText: categoryText(data.category),
    dtz: Number.isFinite(data.dtz) ? data.dtz : null,
    bestMove: best ? {
      uci: best.uci,
      san: best.san,
      category: best.category,
      categoryText: categoryText(best.category),
      meaning: `preserva_${categoryText(data.category)}`,
    } : null,
    source: TABLEBASE_URL,
  };
}

function localPolicyFen(fen, depth = DEFAULT_DEPTH) {
  const normalized = normalizeFen(fen);
  const searchDepth = normalizeDepth(depth);
  const search = runSearch(normalized, searchDepth);
  const startPosition = isClassicStart(search.fen);
  return {
    ok: true,
    classification: startPosition ? "IMPASSE" : "HYPOTHESIS",
    protocol: "blue_mango_resolver_v1",
    proofStatus: startPosition ? "not_proven_for_initial_position" : "bounded_search_only",
    fen: search.fen,
    pieces: pieceCountFromFen(search.fen),
    depth: searchDepth,
    bestMove: search.best_move,
    score: search.score,
    legalMoves: search.legal_moves,
    pv: search.pv,
    nodes: search.nodes,
    cutoffs: search.cutoffs,
    perturbations: search.perturbations,
    message: startPosition
      ? "A posicao inicial segue sem certificado publico completo; isto e a melhor politica operacional limitada."
      : "Busca local limitada: boa para treino e comparacao, insuficiente para provar o xadrez inteiro.",
    source: "scripts/dv-chess-algorithm.js",
  };
}

async function resolveFen(fen, depth = DEFAULT_DEPTH) {
  const normalized = normalizeFen(fen);
  if (!normalized) {
    return { ok: false, classification: "IMPASSE", code: "missing_fen", message: "FEN ausente." };
  }
  try {
    parseFen(normalized);
  } catch (error) {
    return {
      ok: false,
      classification: "IMPASSE",
      code: "invalid_fen",
      message: String(error && error.message || error),
    };
  }

  const pieces = pieceCountFromFen(normalized);
  if (pieces <= 7) {
    try {
      return await probeFen(normalized);
    } catch (error) {
      const local = localPolicyFen(normalized, depth);
      return {
        ...local,
        classification: "HYPOTHESIS",
        tablebaseError: String(error && error.message || error),
        message: "Tablebase falhou; devolvendo politica local limitada.",
      };
    }
  }
  return localPolicyFen(normalized, depth);
}

function sendJson(res, status, body) {
  const payload = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  res.end(payload);
}

async function serve() {
  const port = Number(argValue("--port", "8787"));
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
      if (url.pathname === "/health") {
        return sendJson(res, 200, { ok: true, service: "blue_mango_resolver", routes: ["/tablebase?fen=...", "/resolve?fen=...&depth=2"] });
      }
      if (url.pathname === "/resolve") {
        const result = await resolveFen(url.searchParams.get("fen") || "", url.searchParams.get("depth") || DEFAULT_DEPTH);
        return sendJson(res, result.ok ? 200 : 422, result);
      }
      if (url.pathname !== "/tablebase") {
        return sendJson(res, 404, { ok: false, code: "not_found", routes: ["/tablebase?fen=...", "/resolve?fen=...&depth=2", "/health"] });
      }
      const result = await probeFen(url.searchParams.get("fen") || "");
      return sendJson(res, result.ok ? 200 : 422, result);
    } catch (error) {
      return sendJson(res, 500, { ok: false, code: "proxy_error", message: String(error && error.message || error) });
    }
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(JSON.stringify({ ok: true, service: "blue_mango_tablebase_proxy", url: `http://127.0.0.1:${port}/tablebase?fen=...` }, null, 2));
  });
}

async function main() {
  if (hasArg("--serve")) return serve();
  const fen = argValue("--fen", "");
  const result = hasArg("--resolve")
    ? await resolveFen(fen, argValue("--depth", DEFAULT_DEPTH))
    : await probeFen(fen);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok && !hasArg("--resolve")) process.exitCode = 1;
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, code: "fatal", message: String(error && error.message || error) }, null, 2));
  process.exit(1);
});

module.exports = {
  TABLEBASE_URL,
  categoryText,
  normalizeFen,
  pieceCountFromFen,
  probeFen,
  resolveFen,
};
