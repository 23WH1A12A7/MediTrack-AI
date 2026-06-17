from __future__ import annotations

from datetime import date

import pandas as pd


def medication_adherence_summary(logs: pd.DataFrame) -> dict[str, float | int]:
    if logs.empty:
        return {"total": 0, "taken": 0, "missed": 0, "adherence_rate": 0.0}

    total = len(logs)
    taken = int((logs["status"] == "Taken").sum())
    missed = int((logs["status"] == "Missed").sum())
    return {
        "total": total,
        "taken": taken,
        "missed": missed,
        "adherence_rate": round((taken / total) * 100, 1) if total else 0.0,
    }


def build_export_report(medications: pd.DataFrame, logs: pd.DataFrame, fitness: pd.DataFrame, goals: pd.DataFrame) -> str:
    adherence = medication_adherence_summary(logs)
    avg_steps = int(fitness["steps"].mean()) if not fitness.empty else 0
    avg_sleep = round(float(fitness["sleep_hours"].mean()), 1) if not fitness.empty else 0.0

    lines = [
        "# Personal Health Monitoring Report",
        f"Generated: {date.today().isoformat()}",
        "",
        "## Safety Note",
        "This report is for personal tracking and educational use only. It is not medical advice.",
        "",
        "## Medication Summary",
        f"Active medications: {len(medications)}",
        f"Logged doses: {adherence['total']}",
        f"Adherence rate: {adherence['adherence_rate']}%",
        "",
        "## Fitness Summary",
        f"Average daily steps: {avg_steps}",
        f"Average sleep: {avg_sleep} hours",
        "",
        "## Goals",
    ]

    if goals.empty:
        lines.append("No health goals recorded.")
    else:
        for _, goal in goals.iterrows():
            progress = 0 if goal["target_value"] == 0 else min((goal["current_value"] / goal["target_value"]) * 100, 100)
            lines.append(f"- {goal['title']}: {goal['current_value']} / {goal['target_value']} {goal['unit']} ({progress:.1f}%)")

    return "\n".join(lines)
