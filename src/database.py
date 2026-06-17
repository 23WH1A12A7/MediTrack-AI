from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import pandas as pd


DB_PATH = Path("data/health_monitor.db")


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                frequency TEXT NOT NULL,
                time_of_day TEXT NOT NULL,
                start_date TEXT NOT NULL,
                notes TEXT DEFAULT '',
                active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS medication_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                medication_id INTEGER NOT NULL,
                taken_at TEXT NOT NULL,
                status TEXT NOT NULL,
                notes TEXT DEFAULT '',
                FOREIGN KEY (medication_id) REFERENCES medications(id)
            );

            CREATE TABLE IF NOT EXISTS fitness_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_date TEXT NOT NULL,
                steps INTEGER DEFAULT 0,
                calories INTEGER DEFAULT 0,
                sleep_hours REAL DEFAULT 0,
                water_liters REAL DEFAULT 0,
                mood TEXT DEFAULT '',
                notes TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS health_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                target_value REAL NOT NULL,
                current_value REAL DEFAULT 0,
                unit TEXT NOT NULL,
                due_date TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )


def add_medication(name: str, dosage: str, frequency: str, time_of_day: str, start_date: str, notes: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO medications (name, dosage, frequency, time_of_day, start_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name.strip(), dosage.strip(), frequency.strip(), time_of_day, start_date, notes.strip()),
        )


def list_medications(active_only: bool = True) -> pd.DataFrame:
    query = "SELECT * FROM medications"
    params: tuple[int, ...] = ()
    if active_only:
        query += " WHERE active = ?"
        params = (1,)
    query += " ORDER BY time_of_day, name"
    with get_connection() as conn:
        return pd.read_sql_query(query, conn, params=params)


def deactivate_medication(medication_id: int) -> None:
    with get_connection() as conn:
        conn.execute("UPDATE medications SET active = 0 WHERE id = ?", (medication_id,))


def log_medication(medication_id: int, taken_at: str, status: str, notes: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO medication_logs (medication_id, taken_at, status, notes)
            VALUES (?, ?, ?, ?)
            """,
            (medication_id, taken_at, status, notes.strip()),
        )


def medication_logs() -> pd.DataFrame:
    with get_connection() as conn:
        return pd.read_sql_query(
            """
            SELECT l.id, m.name, m.dosage, l.taken_at, l.status, l.notes
            FROM medication_logs l
            JOIN medications m ON m.id = l.medication_id
            ORDER BY l.taken_at DESC
            """,
            conn,
        )


def add_fitness_metric(
    metric_date: str,
    steps: int,
    calories: int,
    sleep_hours: float,
    water_liters: float,
    mood: str,
    notes: str,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO fitness_metrics
                (metric_date, steps, calories, sleep_hours, water_liters, mood, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (metric_date, steps, calories, sleep_hours, water_liters, mood, notes.strip()),
        )


def fitness_metrics() -> pd.DataFrame:
    with get_connection() as conn:
        return pd.read_sql_query(
            "SELECT * FROM fitness_metrics ORDER BY metric_date DESC, id DESC",
            conn,
        )


def add_goal(title: str, target_value: float, current_value: float, unit: str, due_date: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO health_goals (title, target_value, current_value, unit, due_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (title.strip(), target_value, current_value, unit.strip(), due_date),
        )


def update_goal_progress(goal_id: int, current_value: float) -> None:
    with get_connection() as conn:
        conn.execute("UPDATE health_goals SET current_value = ? WHERE id = ?", (current_value, goal_id))


def health_goals() -> pd.DataFrame:
    with get_connection() as conn:
        return pd.read_sql_query("SELECT * FROM health_goals ORDER BY due_date", conn)
