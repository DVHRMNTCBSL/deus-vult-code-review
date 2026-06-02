# Deus Vult Python Obra

Executable Python version of the DV operational kernel for safe sharing and
feedback.

## What it does

- Classifies text as `PROOF`, `THESIS`, `HYPOTHESIS`, `METAPHOR`, or `DECISION`.
- Detects sensitive/exfiltration signals without echoing the payload.
- Receives feedback and writes a redacted audit line to `audit/dv-python-feedback.jsonl`.
- Runs a finite retroalimentacao cycle: snapshot, chaotic hypotheses, harmonic winner, loop exit, proof hash.
- Generates local audit records that can be shared back as feedback evidence.

This is a defensive feedback honeypot, not a server integration and not a tool
for collecting secrets. If a message includes credentials, identity data,
financial data, medical data, mass dump requests, or prompt-bypass attempts, the
raw text is not stored.

## Quick start

From the repository root:

```powershell
python -m unittest discover -s tests
python -m deus_vult_python snapshot
python -m deus_vult_python feedback --author MarcosSalomao2210 --text "Minha critica: a tese precisa de um exemplo menor."
```

## DV safety boundary

- No network deploy by default.
- No backend/server integration.
- No secret storage.
- No raw sensitive payload storage.
- No wallet, medical, bank, CPF, password, token, private key, or dump handling.
- GitHub sharing should use a private repository or reviewed allowlist mirror.
