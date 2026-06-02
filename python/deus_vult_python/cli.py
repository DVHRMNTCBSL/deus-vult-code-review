"""Command line interface for the Python DV kernel."""

from __future__ import annotations

import argparse
from pathlib import Path

from .core import build_snapshot, classify_text, detect_sensitive_signal, process_feedback, run_retro_cycle, to_json


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m deus_vult_python")
    parser.add_argument("--root", default=".", help="Workspace root for audit writes and snapshots.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_classify = sub.add_parser("classify", help="Classify a text into DV drawers.")
    p_classify.add_argument("text")

    p_detect = sub.add_parser("detect", help="Detect sensitive/exfil signals without echoing payloads.")
    p_detect.add_argument("text")
    p_detect.add_argument("--channel", default="feedback")

    p_feedback = sub.add_parser("feedback", help="Audit safe feedback with defensive redaction.")
    p_feedback.add_argument("--text", required=True)
    p_feedback.add_argument("--author", default="anonymous")
    p_feedback.add_argument("--channel", default="feedback")

    p_retro = sub.add_parser("retro", help="Run a finite DV retro cycle.")
    p_retro.add_argument("--scope", default="deus_vult_python")
    p_retro.add_argument("--detail", default="python obra feedback kernel")

    sub.add_parser("snapshot", help="Hash canonical DV files for current snapshot proof.")

    args = parser.parse_args(argv)
    root = Path(args.root)

    if args.command == "classify":
        print(to_json({"classification": classify_text(args.text).value}))
        return 0
    if args.command == "detect":
        signal = detect_sensitive_signal(args.text, channel=args.channel)
        print(to_json(signal or {"detected": False, "signals": [], "severity": "baixa"}))
        return 0
    if args.command == "feedback":
        print(to_json(process_feedback(args.text, author=args.author, channel=args.channel, root=root)))
        return 0
    if args.command == "retro":
        print(to_json(run_retro_cycle(args.scope, args.detail)))
        return 0
    if args.command == "snapshot":
        print(to_json(build_snapshot(root=root)))
        return 0
    return 2
