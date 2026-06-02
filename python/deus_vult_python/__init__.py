"""Executable Python kernel for Project Deus Vult.

The package is intentionally small: it turns the canonical DV rules into
deterministic code for classification, safety gates, feedback intake, and
retroalimentacao audit.
"""

from .core import (
    CANONICAL_SNAPSHOT_FILES,
    OBRA_SNAPSHOT_FILES,
    ClaimClass,
    LoopExit,
    build_snapshot,
    classify_text,
    detect_sensitive_signal,
    process_feedback,
    run_retro_cycle,
)

__all__ = [
    "CANONICAL_SNAPSHOT_FILES",
    "OBRA_SNAPSHOT_FILES",
    "ClaimClass",
    "LoopExit",
    "build_snapshot",
    "classify_text",
    "detect_sensitive_signal",
    "process_feedback",
    "run_retro_cycle",
]
