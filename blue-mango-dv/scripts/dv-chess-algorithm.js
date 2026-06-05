#!/usr/bin/env node
"use strict";

/*
 * DV chess algorithm core.
 *
 * This does not claim to solve the full initial chess position. It implements
 * the exact object that a proof would need: legal state expansion, branch
 * perturbation, bounded minimax/alpha-beta, and perft validation.
 */

const fs = require("fs");
const path = require("path");

const START_FEN = "rn1qkbnr/pppbpppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1";
const CLASSIC_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MATE_SCORE = 1000000;
const INF = 1000000000;

const PIECE_VALUE = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function cloneBoard(board) {
  return board.slice();
}

function colorOf(piece) {
  if (!piece || piece === ".") return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

function other(color) {
  return color === "w" ? "b" : "w";
}

function rowOf(i) {
  return Math.floor(i / 8);
}

function fileOf(i) {
  return i & 7;
}

function inside(row, file) {
  return row >= 0 && row < 8 && file >= 0 && file < 8;
}

function idx(row, file) {
  return row * 8 + file;
}

function squareToIndex(square) {
  if (square === "-") return -1;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return idx(8 - rank, file);
}

function indexToSquare(i) {
  return `${String.fromCharCode(97 + fileOf(i))}${8 - rowOf(i)}`;
}

function parseFen(fen) {
  if (fen === "startpos") fen = CLASSIC_START_FEN;
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) throw new Error(`Invalid FEN: ${fen}`);

  const board = new Array(64).fill(".");
  let cursor = 0;
  for (const ch of parts[0]) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) {
      cursor += Number(ch);
    } else {
      board[cursor++] = ch;
    }
  }
  if (cursor !== 64) throw new Error(`Invalid FEN board: ${fen}`);

  return {
    board,
    turn: parts[1],
    castling: parts[2] === "-" ? "" : parts[2],
    ep: parts[3] === "-" ? -1 : squareToIndex(parts[3]),
    halfmove: Number(parts[4] || 0),
    fullmove: Number(parts[5] || 1),
  };
}

function boardToFenPlacement(board) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = board[idx(r, f)];
      if (p === ".") empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        row += p;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join("/");
}

function stateToFen(state) {
  return [
    boardToFenPlacement(state.board),
    state.turn,
    state.castling || "-",
    state.ep >= 0 ? indexToSquare(state.ep) : "-",
    state.halfmove,
    state.fullmove,
  ].join(" ");
}

function moveToUci(move) {
  return `${indexToSquare(move.from)}${indexToSquare(move.to)}${move.promotion ? move.promotion.toLowerCase() : ""}`;
}

function pieceAt(state, square) {
  return state.board[squareToIndex(square)];
}

function findKing(state, color) {
  const king = color === "w" ? "K" : "k";
  return state.board.indexOf(king);
}

function isSquareAttacked(state, square, byColor) {
  const board = state.board;
  const targetRow = rowOf(square);
  const targetFile = fileOf(square);

  const pawn = byColor === "w" ? "P" : "p";
  const pawnSources = byColor === "w"
    ? [[targetRow + 1, targetFile - 1], [targetRow + 1, targetFile + 1]]
    : [[targetRow - 1, targetFile - 1], [targetRow - 1, targetFile + 1]];
  for (const [r, f] of pawnSources) {
    if (inside(r, f) && board[idx(r, f)] === pawn) return true;
  }

  const knight = byColor === "w" ? "N" : "n";
  for (const [dr, df] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
    const r = targetRow + dr;
    const f = targetFile + df;
    if (inside(r, f) && board[idx(r, f)] === knight) return true;
  }

  const bishop = byColor === "w" ? "B" : "b";
  const rook = byColor === "w" ? "R" : "r";
  const queen = byColor === "w" ? "Q" : "q";
  const king = byColor === "w" ? "K" : "k";

  for (const [dr, df] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    let r = targetRow + dr;
    let f = targetFile + df;
    let dist = 1;
    while (inside(r, f)) {
      const p = board[idx(r, f)];
      if (p !== ".") {
        if (p === bishop || p === queen || (dist === 1 && p === king)) return true;
        break;
      }
      r += dr;
      f += df;
      dist++;
    }
  }

  for (const [dr, df] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let r = targetRow + dr;
    let f = targetFile + df;
    let dist = 1;
    while (inside(r, f)) {
      const p = board[idx(r, f)];
      if (p !== ".") {
        if (p === rook || p === queen || (dist === 1 && p === king)) return true;
        break;
      }
      r += dr;
      f += df;
      dist++;
    }
  }

  return false;
}

function inCheck(state, color) {
  const king = findKing(state, color);
  if (king < 0) return true;
  return isSquareAttacked(state, king, other(color));
}

function pushMove(moves, state, from, to, extra = {}) {
  const piece = state.board[from];
  const target = state.board[to];
  if (target !== "." && colorOf(target) === colorOf(piece)) return;
  moves.push({ from, to, piece, capture: target !== "." ? target : null, ...extra });
}

function generatePseudoMoves(state) {
  const moves = [];
  const us = state.turn;
  const board = state.board;
  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (piece === "." || colorOf(piece) !== us) continue;

    const lower = piece.toLowerCase();
    const r = rowOf(from);
    const f = fileOf(from);

    if (lower === "p") {
      const dir = us === "w" ? -1 : 1;
      const startRow = us === "w" ? 6 : 1;
      const promotionRow = us === "w" ? 0 : 7;
      const oneRow = r + dir;
      if (inside(oneRow, f) && board[idx(oneRow, f)] === ".") {
        const to = idx(oneRow, f);
        if (oneRow === promotionRow) {
          for (const promo of ["q", "r", "b", "n"]) pushMove(moves, state, from, to, { promotion: us === "w" ? promo.toUpperCase() : promo });
        } else {
          pushMove(moves, state, from, to);
          const twoRow = r + dir * 2;
          if (r === startRow && board[idx(twoRow, f)] === ".") {
            pushMove(moves, state, from, idx(twoRow, f), { doublePawn: true });
          }
        }
      }
      for (const df of [-1, 1]) {
        const cr = r + dir;
        const cf = f + df;
        if (!inside(cr, cf)) continue;
        const to = idx(cr, cf);
        const target = board[to];
        if (target !== "." && colorOf(target) === other(us)) {
          if (cr === promotionRow) {
            for (const promo of ["q", "r", "b", "n"]) pushMove(moves, state, from, to, { promotion: us === "w" ? promo.toUpperCase() : promo });
          } else {
            pushMove(moves, state, from, to);
          }
        }
        if (to === state.ep) {
          pushMove(moves, state, from, to, { enPassant: true, capture: us === "w" ? "p" : "P" });
        }
      }
      continue;
    }

    if (lower === "n") {
      for (const [dr, df] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const tr = r + dr;
        const tf = f + df;
        if (inside(tr, tf)) pushMove(moves, state, from, idx(tr, tf));
      }
      continue;
    }

    if (lower === "b" || lower === "r" || lower === "q") {
      const dirs = [];
      if (lower === "b" || lower === "q") dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      if (lower === "r" || lower === "q") dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      for (const [dr, df] of dirs) {
        let tr = r + dr;
        let tf = f + df;
        while (inside(tr, tf)) {
          const to = idx(tr, tf);
          const target = board[to];
          if (target === ".") {
            pushMove(moves, state, from, to);
          } else {
            if (colorOf(target) === other(us)) pushMove(moves, state, from, to);
            break;
          }
          tr += dr;
          tf += df;
        }
      }
      continue;
    }

    if (lower === "k") {
      for (const [dr, df] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        const tr = r + dr;
        const tf = f + df;
        if (inside(tr, tf)) pushMove(moves, state, from, idx(tr, tf));
      }

      if (us === "w" && from === squareToIndex("e1") && !inCheck(state, "w")) {
        if (state.castling.includes("K") && board[squareToIndex("f1")] === "." && board[squareToIndex("g1")] === "." &&
          !isSquareAttacked(state, squareToIndex("f1"), "b") && !isSquareAttacked(state, squareToIndex("g1"), "b")) {
          pushMove(moves, state, from, squareToIndex("g1"), { castle: "K" });
        }
        if (state.castling.includes("Q") && board[squareToIndex("d1")] === "." && board[squareToIndex("c1")] === "." && board[squareToIndex("b1")] === "." &&
          !isSquareAttacked(state, squareToIndex("d1"), "b") && !isSquareAttacked(state, squareToIndex("c1"), "b")) {
          pushMove(moves, state, from, squareToIndex("c1"), { castle: "Q" });
        }
      }
      if (us === "b" && from === squareToIndex("e8") && !inCheck(state, "b")) {
        if (state.castling.includes("k") && board[squareToIndex("f8")] === "." && board[squareToIndex("g8")] === "." &&
          !isSquareAttacked(state, squareToIndex("f8"), "w") && !isSquareAttacked(state, squareToIndex("g8"), "w")) {
          pushMove(moves, state, from, squareToIndex("g8"), { castle: "k" });
        }
        if (state.castling.includes("q") && board[squareToIndex("d8")] === "." && board[squareToIndex("c8")] === "." && board[squareToIndex("b8")] === "." &&
          !isSquareAttacked(state, squareToIndex("d8"), "w") && !isSquareAttacked(state, squareToIndex("c8"), "w")) {
          pushMove(moves, state, from, squareToIndex("c8"), { castle: "q" });
        }
      }
    }
  }
  return moves;
}

function removeCastlingRight(castling, chars) {
  let out = castling;
  for (const ch of chars) out = out.replace(ch, "");
  return out;
}

function makeMove(state, move) {
  const board = cloneBoard(state.board);
  const us = state.turn;
  const them = other(us);
  const piece = board[move.from];
  const captured = move.enPassant
    ? (us === "w" ? "p" : "P")
    : board[move.to];

  board[move.from] = ".";
  if (move.enPassant) {
    const capSq = us === "w" ? move.to + 8 : move.to - 8;
    board[capSq] = ".";
  }

  board[move.to] = move.promotion || piece;

  if (move.castle) {
    if (move.castle === "K") {
      board[squareToIndex("h1")] = ".";
      board[squareToIndex("f1")] = "R";
    } else if (move.castle === "Q") {
      board[squareToIndex("a1")] = ".";
      board[squareToIndex("d1")] = "R";
    } else if (move.castle === "k") {
      board[squareToIndex("h8")] = ".";
      board[squareToIndex("f8")] = "r";
    } else if (move.castle === "q") {
      board[squareToIndex("a8")] = ".";
      board[squareToIndex("d8")] = "r";
    }
  }

  let castling = state.castling;
  if (piece === "K") castling = removeCastlingRight(castling, "KQ");
  if (piece === "k") castling = removeCastlingRight(castling, "kq");
  if (move.from === squareToIndex("h1") || move.to === squareToIndex("h1")) castling = removeCastlingRight(castling, "K");
  if (move.from === squareToIndex("a1") || move.to === squareToIndex("a1")) castling = removeCastlingRight(castling, "Q");
  if (move.from === squareToIndex("h8") || move.to === squareToIndex("h8")) castling = removeCastlingRight(castling, "k");
  if (move.from === squareToIndex("a8") || move.to === squareToIndex("a8")) castling = removeCastlingRight(castling, "q");

  const ep = move.doublePawn ? (us === "w" ? move.from - 8 : move.from + 8) : -1;
  const halfmove = piece.toLowerCase() === "p" || captured !== "." ? 0 : state.halfmove + 1;
  const fullmove = us === "b" ? state.fullmove + 1 : state.fullmove;

  return { board, turn: them, castling, ep, halfmove, fullmove };
}

function generateLegalMoves(state) {
  const us = state.turn;
  return generatePseudoMoves(state).filter((move) => !inCheck(makeMove(state, move), us));
}

function materialEval(state) {
  let score = 0;
  for (const piece of state.board) {
    if (piece === ".") continue;
    const value = PIECE_VALUE[piece.toLowerCase()];
    score += colorOf(piece) === "w" ? value : -value;
  }
  return score;
}

function centralityBonus(index) {
  const r = rowOf(index);
  const f = fileOf(index);
  const dr = Math.abs(r - 3.5);
  const df = Math.abs(f - 3.5);
  return Math.round(14 - (dr + df) * 4);
}

function positionalEval(state) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const piece = state.board[i];
    if (piece === ".") continue;
    const color = colorOf(piece);
    const sign = color === "w" ? 1 : -1;
    const lower = piece.toLowerCase();
    const r = rowOf(i);
    const f = fileOf(i);
    const homeRow = color === "w" ? 7 : 0;
    const pawnStart = color === "w" ? 6 : 1;

    if (lower === "p") {
      const advance = color === "w" ? pawnStart - r : r - pawnStart;
      score += sign * advance * 5;
      if ((f === 3 || f === 4) && advance > 0) score += sign * 18;
      if ((i === squareToIndex("d4") || i === squareToIndex("e4"))) score += 20;
      if ((i === squareToIndex("d5") || i === squareToIndex("e5"))) score -= 20;
    }

    if (lower === "n" || lower === "b") {
      score += sign * centralityBonus(i);
      if (r !== homeRow) score += sign * 14;
    }

    if (lower === "q") {
      score += sign * Math.round(centralityBonus(i) / 3);
      if (Math.abs(r - homeRow) > 1) score -= sign * 8;
    }

    if (lower === "r") {
      const startRank = color === "w" ? 7 : 0;
      if (r !== startRank) score += sign * 6;
      if (f === 3 || f === 4) score += sign * 4;
    }

    if (lower === "k") {
      const kingHome = color === "w" ? squareToIndex("e1") : squareToIndex("e8");
      if (i !== kingHome && state.castling.includes(color === "w" ? "K" : "k")) score -= sign * 6;
    }
  }

  for (const sq of ["d4", "e4", "d5", "e5"]) {
    const index = squareToIndex(sq);
    if (isSquareAttacked(state, index, "w")) score += 4;
    if (isSquareAttacked(state, index, "b")) score -= 4;
  }

  return score;
}

function evaluateForSideToMove(state) {
  const abs = materialEval(state) + positionalEval(state);
  return state.turn === "w" ? abs : -abs;
}

function orderMoves(state, moves) {
  return moves.slice().sort((a, b) => {
    const capA = a.capture && a.capture !== "." ? PIECE_VALUE[a.capture.toLowerCase()] - PIECE_VALUE[a.piece.toLowerCase()] / 10 : 0;
    const capB = b.capture && b.capture !== "." ? PIECE_VALUE[b.capture.toLowerCase()] - PIECE_VALUE[b.piece.toLowerCase()] / 10 : 0;
    const promoA = a.promotion ? PIECE_VALUE[a.promotion.toLowerCase()] : 0;
    const promoB = b.promotion ? PIECE_VALUE[b.promotion.toLowerCase()] : 0;
    return (capB + promoB) - (capA + promoA);
  });
}

function negamax(state, depth, alpha, beta, ply, table, stats) {
  stats.nodes++;
  const key = `${stateToFen(state)}|d${depth}`;
  const cached = table.get(key);
  if (cached && cached.depth >= depth) return cached;

  const legal = generateLegalMoves(state);
  if (legal.length === 0) {
    const value = inCheck(state, state.turn) ? -MATE_SCORE + ply : 0;
    return { value, depth, bestMove: null, pv: [] };
  }
  if (state.halfmove >= 150) return { value: 0, depth, bestMove: null, pv: [] };
  if (depth === 0) return { value: evaluateForSideToMove(state), depth, bestMove: null, pv: [] };

  let bestValue = -INF;
  let bestMove = null;
  let bestPv = [];
  const originalAlpha = alpha;
  for (const move of orderMoves(state, legal)) {
    const child = makeMove(state, move);
    const result = negamax(child, depth - 1, -beta, -alpha, ply + 1, table, stats);
    const value = -result.value;
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
      bestPv = [moveToUci(move), ...(result.pv || [])];
    }
    alpha = Math.max(alpha, value);
    if (alpha >= beta) {
      stats.cutoffs++;
      break;
    }
  }

  const out = { value: bestValue, depth, bestMove, pv: bestPv };
  if (bestValue <= originalAlpha) out.bound = "upper";
  else if (bestValue >= beta) out.bound = "lower";
  else out.bound = "exact";
  table.set(key, out);
  return out;
}

function perft(state, depth) {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const move of generateLegalMoves(state)) {
    nodes += perft(makeMove(state, move), depth - 1);
  }
  return nodes;
}

function divide(state, depth) {
  const rows = [];
  let total = 0;
  for (const move of generateLegalMoves(state)) {
    const count = perft(makeMove(state, move), depth - 1);
    rows.push({ move: moveToUci(move), nodes: count });
    total += count;
  }
  rows.sort((a, b) => a.move.localeCompare(b.move));
  return { total, rows };
}

function formatScore(value) {
  if (Math.abs(value) > MATE_SCORE - 1000) {
    const plies = MATE_SCORE - Math.abs(value);
    return value > 0 ? `mate_in_${Math.ceil(plies / 2)}` : `mated_in_${Math.ceil(plies / 2)}`;
  }
  return `${value}cp`;
}

function perturbRoot(state, depth) {
  const moves = orderMoves(state, generateLegalMoves(state));
  const table = new Map();
  const rows = [];
  for (const move of moves) {
    const stats = { nodes: 0, cutoffs: 0 };
    const result = negamax(makeMove(state, move), Math.max(0, depth - 1), -INF, INF, 1, table, stats);
    rows.push({
      move: moveToUci(move),
      value: -result.value,
      score: formatScore(-result.value),
      response_pv: [moveToUci(move), ...(result.pv || [])],
      nodes: stats.nodes,
    });
  }
  rows.sort((a, b) => b.value - a.value || a.move.localeCompare(b.move));
  return rows;
}

function runSearch(fen, depth) {
  const state = parseFen(fen);
  const table = new Map();
  const stats = { nodes: 0, cutoffs: 0 };
  const result = negamax(state, depth, -INF, INF, 0, table, stats);
  const legal = generateLegalMoves(state);
  return {
    protocol: "dv_chess_algorithm_v1",
    classification: {
      proof: "legal move expansion + bounded alpha-beta result for this snapshot",
      thesis: "full chess solution requires the same policy object at unbounded/exhaustive scale",
      hypothesis: "initial chess value remains unknown without exhaustive proof",
      decision: "no network, no engine, no publication",
    },
    fen: stateToFen(state),
    depth,
    legal_moves: legal.length,
    best_move: result.bestMove ? moveToUci(result.bestMove) : null,
    score: formatScore(result.value),
    raw_value: result.value,
    pv: result.pv,
    nodes: stats.nodes,
    cutoffs: stats.cutoffs,
    transposition_entries: table.size,
    perturbations: perturbRoot(state, Math.min(depth, 2)).slice(0, 12),
  };
}

function selfTest() {
  const tests = [
    { name: "start_depth_1", fen: CLASSIC_START_FEN, depth: 1, expected: 20 },
    { name: "start_depth_2", fen: CLASSIC_START_FEN, depth: 2, expected: 400 },
    { name: "start_depth_3", fen: CLASSIC_START_FEN, depth: 3, expected: 8902 },
    {
      name: "clean_castling_depth_1",
      fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
      depth: 1,
      expected: 26,
    },
    {
      name: "promotion_depth_1",
      fen: "8/P7/8/8/8/8/8/k6K w - - 0 1",
      depth: 1,
      expected: 7,
    },
    {
      name: "en_passant_depth_1",
      fen: "8/8/8/3pP3/8/8/8/k6K w - d6 0 1",
      depth: 1,
      expected: 5,
    },
  ];
  const results = tests.map((t) => {
    const actual = perft(parseFen(t.fen), t.depth);
    return { ...t, actual, ok: actual === t.expected };
  });
  return {
    protocol: "dv_chess_algorithm_self_test_v1",
    tests: results,
    ok: results.every((r) => r.ok),
  };
}

function getArg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function writeAudit(record) {
  const root = path.join(__dirname, "..");
  const outPath = path.join(root, "audit", "dv-chess-algorithm-latest.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify({ timestamp: new Date().toISOString(), ...record }, null, 2)}\n`, "utf8");
  return outPath;
}

function main() {
  const depth = Number(getArg("depth", "3"));
  const fen = getArg("fen", hasFlag("classic-start") ? CLASSIC_START_FEN : START_FEN);

  let output;
  if (hasFlag("self-test")) {
    output = selfTest();
  } else if (hasFlag("perft")) {
    const state = parseFen(fen);
    output = {
      protocol: "dv_chess_perft_v1",
      fen: stateToFen(state),
      depth,
      legal_moves: generateLegalMoves(state).length,
      nodes: perft(state, depth),
      divide: hasFlag("divide") ? divide(state, depth).rows : undefined,
    };
  } else {
    output = runSearch(fen, depth);
  }

  if (hasFlag("write-audit")) output.audit_path = writeAudit(output);
  console.log(JSON.stringify(output, null, 2));
  if (output.ok === false) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  CLASSIC_START_FEN,
  START_FEN,
  parseFen,
  stateToFen,
  generateLegalMoves,
  makeMove,
  perft,
  divide,
  runSearch,
  selfTest,
};
