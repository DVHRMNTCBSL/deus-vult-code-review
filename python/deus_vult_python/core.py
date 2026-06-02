"""Core DV primitives in Python.

This module ports the operational DV loop into deterministic, dependency-free
Python:

will -> form -> method -> audited work

The "honeypot" posture here is defensive feedback capture. It never stores
secret payloads, credentials, personal identifiers, or raw sensitive requests.
"""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Iterable


class ClaimClass(str, Enum):
    PROOF = "PROOF"
    THESIS = "THESIS"
    HYPOTHESIS = "HYPOTHESIS"
    METAPHOR = "METAPHOR"
    DECISION = "DECISION"


class LoopExit(str, Enum):
    PATCH = "patch"
    TEST = "teste"
    BACKLOG = "backlog"
    JUSTIFIED_DISCARD = "descarte_justificado"


CANONICAL_SNAPSHOT_FILES = [
    "AGENTS.md",
    "CURSOR_MASTER_INDEX_DEUS_VULT.yaml",
    "DEUS_VULT_AGENTES_CANONICOS.yaml",
    ".cursor/rules/deus-vult-core.mdc",
    ".cursor/rules/cursor-agent-general-config.mdc",
    "DEUS_VULT_PROGRAMA_RETROALIMENTACAO.yaml",
    "DEUS_VULT_TESTE_ANTIRREVERSA_RETROALIMENTACAO.yaml",
    "DEUS_VULT_GITHUB_PROTOCOL.yaml",
    "DEUS_VULT_LOOP_DV.yaml",
]

OBRA_SNAPSHOT_FILES = [
    "README.md",
    "MARCOS_LEIA_PRIMEIRO.md",
    "TRILHA_TRADICIONAL.md",
    "DEUS_VULT_AI_SPECIALIST_DOSSIER.md",
    "pyproject.toml",
    "deus_vult_python/README.md",
    "deus_vult_python/__init__.py",
    "deus_vult_python/__main__.py",
    "deus_vult_python/cli.py",
    "deus_vult_python/core.py",
    "tests/test_deus_vult_python.py",
]

HONEYPOT_PATHS = {
    "/api/config",
    "/api/env",
    "/.env",
    "/server.js",
    "/audit/local-audit.jsonl",
}

SENSITIVE_PATTERNS = [
    ("credencial", re.compile(r"\b(senha|password|token|api[_-]?key|secret|seed|private[_-]?key|cookie|bearer)\b", re.I)),
    ("identidade", re.compile(r"\b(cpf|rg|cnh|passaporte|ssn)\b", re.I)),
    ("financeiro", re.compile(r"\b(extrato|cartao|conta bancaria|iban|pix|saldo|wallet)\b", re.I)),
    ("medico", re.compile(r"\b(prontuario|diagnostico|receita medica|laudo)\b", re.I)),
    ("dump_massa", re.compile(r"\b(dump|export(?:ar|e)?|baix(?:ar|e)|list(?:ar|e)?)\s+(tudo|all|arquivos|files|repo|database|db)\b", re.I)),
    ("bypass_instrucao", re.compile(r"\b(ignore|disregard|forget)\s+((all\s+)?(previous|prior)\s+|(previous|prior)\s+(all\s+)?)?(instructions|rules|prompts)\b", re.I)),
    ("dump_secrets", re.compile(r"\b(dump|export|leak)\s+(secrets|credentials|keys)\b", re.I)),
    ("exfil_direta", re.compile(r"\b(exfiltr|vaz(ar|e|ao)|roub(ar|e)|colh(er|a)|pegar)\s+(dados|data|credenciais|secrets|repo|repositorio)?\b", re.I)),
    ("cpf_numero", re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")),
    ("cartao_numero", re.compile(r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b")),
    ("openai_key", re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")),
    ("github_token", re.compile(r"\bghp_[A-Za-z0-9_]{20,}\b")),
    ("private_key_block", re.compile("-----BEGIN " + r"(RSA |EC |OPENSSH )?" + "PRIVATE " + "KEY-----")),
]

RETRO_BY_SIGNAL = {
    "credencial": (LoopExit.PATCH, "reforcar gate de credencial e redacao"),
    "identidade": (LoopExit.PATCH, "reforcar mascaramento LGPD"),
    "financeiro": (LoopExit.PATCH, "bloquear export e reforcar allowlist"),
    "medico": (LoopExit.PATCH, "gate clinico estrutura-only"),
    "dump_massa": (LoopExit.TEST, "regressao contra dump massivo"),
    "bypass_instrucao": (LoopExit.TEST, "regressao de supremacia DV above all"),
    "dump_secrets": (LoopExit.TEST, "bloquear exfil de segredos no canal"),
    "exfil_direta": (LoopExit.BACKLOG, "revisar superficie e trilha de audit"),
    "honeypot_probe": (LoopExit.TEST, "regressao honeypot e audit exfil linkado"),
    "cpf_numero": (LoopExit.PATCH, "bloquear dado nominal no canal"),
    "cartao_numero": (LoopExit.PATCH, "bloquear dado bancario no canal"),
    "openai_key": (LoopExit.PATCH, "bloquear chave de API no canal"),
    "github_token": (LoopExit.PATCH, "bloquear token GitHub no canal"),
    "private_key_block": (LoopExit.TEST, "bloquear chave privada no canal"),
}


@dataclass(frozen=True)
class SensitiveSignal:
    detected: bool
    signals: list[str]
    severity: str


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def stable_hash(data: object) -> str:
    payload = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256_text(payload)


def is_honeypot_path(text: str) -> bool:
    value = (text or "").strip()
    return any(value == path or value.startswith(f"{path}/") for path in HONEYPOT_PATHS)


def detect_sensitive_signal(text: str, channel: str = "feedback") -> SensitiveSignal | None:
    value = text or ""
    signals = [name for name, pattern in SENSITIVE_PATTERNS if pattern.search(value)]
    if not signals and (channel == "honeypot" or is_honeypot_path(value)):
        signals.append("honeypot_probe")
    if not signals:
        return None
    severe = {"bypass_instrucao", "dump_massa", "dump_secrets", "exfil_direta", "private_key_block"}
    severity = "alta" if any(signal in severe for signal in signals) else "media"
    return SensitiveSignal(detected=True, signals=sorted(set(signals)), severity=severity)


def classify_text(text: str) -> ClaimClass:
    value = (text or "").lower()
    if re.search(r"\b(hash|sha256|teste|test|prova|evidence|validacao|audit)\b", value):
        return ClaimClass.PROOF
    if re.search(r"\b(decidir|decisao|enviar|send|commit|push|publicar|criar)\b", value):
        return ClaimClass.DECISION
    if re.search(r"\b(talvez|hipotese|hypothesis|pode ser|possivel|maybe)\b", value):
        return ClaimClass.HYPOTHESIS
    if re.search(r"\b(metafora|simbolo|imagem|myth|poema)\b", value):
        return ClaimClass.METAPHOR
    return ClaimClass.THESIS


def safe_preview(text: str, limit: int = 600) -> str:
    """Return a short non-secret preview. Sensitive text gets no preview."""
    if detect_sensitive_signal(text):
        return "[REDACTED_BY_DV_GATE]"
    compact = re.sub(r"\s+", " ", (text or "")).strip()
    return compact[:limit]


def run_retro_cycle(scope: str, detail: str, signals: Iterable[str] | None = None) -> dict:
    signal_list = list(signals or [])
    if signal_list:
        first = signal_list[0]
        exit_choice, action = RETRO_BY_SIGNAL.get(first, (LoopExit.BACKLOG, "revisar gate DV"))
        chaotic = [
            {"hypothesis": signal, "exit": RETRO_BY_SIGNAL.get(signal, (LoopExit.BACKLOG, "revisar gate DV"))[0].value}
            for signal in signal_list
        ]
    else:
        exit_choice = LoopExit.PATCH
        action = "manter menor micro-acao auditavel"
        chaotic = [
            {"hypothesis": "feedback_valido_vira_patch", "exit": LoopExit.PATCH.value},
            {"hypothesis": "feedback_sem_evidencia_vira_backlog", "exit": LoopExit.BACKLOG.value},
        ]
    snapshot = {
        "timestamp": utc_now(),
        "scope": scope,
        "detail_hash": sha256_text(detail or ""),
        "signals": signal_list,
    }
    proof_hash = stable_hash(snapshot)
    return {
        "protocol": "dv-programa-retro-tradicional-python-v1",
        "snapshot": snapshot,
        "classification": classify_text(detail).value,
        "chaotic_hypotheses": chaotic,
        "harmonic_winner": {"loop_exit": exit_choice.value, "micro_action": action},
        "loop_exit": exit_choice.value,
        "proof_hash": proof_hash,
    }


def append_jsonl(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def process_feedback(
    text: str,
    *,
    author: str = "anonymous",
    channel: str = "feedback",
    root: Path | str = ".",
) -> dict:
    """Classify and audit feedback while minimizing sensitive data."""
    root_path = Path(root)
    signal = detect_sensitive_signal(text, channel=channel)
    signals = signal.signals if signal else []
    retro = run_retro_cycle("deus_vult_python_feedback", text, signals=signals)
    record = {
        "id": str(uuid.uuid4()),
        "timestamp": utc_now(),
        "author": safe_preview(author, limit=120),
        "channel": channel,
        "classification": classify_text(text).value,
        "sensitive_detected": bool(signal),
        "signals": signals,
        "severity": signal.severity if signal else "baixa",
        "text_hash": sha256_text(text or ""),
        "text_preview": safe_preview(text),
        "raw_text_stored": False,
        "retro": retro,
    }
    append_jsonl(root_path / "audit" / "dv-python-feedback.jsonl", record)
    return record


def file_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def build_snapshot(root: Path | str = ".", files: Iterable[str] | None = None) -> dict:
    root_path = Path(root)
    selected_files = list(files) if files is not None else _default_snapshot_files(root_path)
    entries = []
    for rel in selected_files:
        path = root_path / rel
        if path.exists() and path.is_file():
            entries.append({"path": rel, "sha256": file_sha256(path), "bytes": path.stat().st_size})
        else:
            entries.append({"path": rel, "missing": True})
    payload = {
        "timestamp": utc_now(),
        "classification": ClaimClass.PROOF.value,
        "files": entries,
    }
    payload["snapshot_hash"] = stable_hash(entries)
    return payload


def _default_snapshot_files(root_path: Path) -> list[str]:
    if any((root_path / rel).exists() for rel in CANONICAL_SNAPSHOT_FILES):
        return CANONICAL_SNAPSHOT_FILES
    return OBRA_SNAPSHOT_FILES


def to_json(data: object) -> str:
    if hasattr(data, "__dataclass_fields__"):
        data = asdict(data)  # type: ignore[assignment]
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
