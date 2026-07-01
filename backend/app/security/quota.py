"""Per-IP usage ledger.

No user auth exists, so the only identity worth enforcing a quota against is
the requesting IP — a copied/shared JWT doesn't get a fresh allowance,
because the ledger key is the real connecting IP, not anything the token
claims. Each IP gets QUOTA_SECONDS of chat "talk time" per rolling
QUOTA_WINDOW_HOURS window.
"""

import sqlite3
import threading
from datetime import datetime, timezone

from fastapi import HTTPException

from .. import config

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    config.QUOTA_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.QUOTA_DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ip_usage (
            ip TEXT PRIMARY KEY,
            window_start REAL NOT NULL,
            seconds_used REAL NOT NULL,
            last_seen REAL NOT NULL
        )
        """
    )
    return conn


def remaining_seconds(ip: str) -> float:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT window_start, seconds_used FROM ip_usage WHERE ip = ?", (ip,)).fetchone()
        if row is None:
            return float(config.QUOTA_SECONDS)
        window_start, seconds_used = row
        now = datetime.now(timezone.utc).timestamp()
        if now - window_start > config.QUOTA_WINDOW_HOURS * 3600:
            return float(config.QUOTA_SECONDS)
        return max(0.0, config.QUOTA_SECONDS - seconds_used)


def charge(ip: str, seconds: float = config.CHAT_TURN_COST_SECONDS) -> float:
    """Deduct `seconds` from the IP's remaining quota, resetting the window
    if it has rolled over. Raises HTTPException(429) if the IP is already at
    or over its limit. Returns the remaining seconds after charging."""
    now = datetime.now(timezone.utc).timestamp()
    with _lock, _connect() as conn:
        row = conn.execute("SELECT window_start, seconds_used FROM ip_usage WHERE ip = ?", (ip,)).fetchone()

        if row is None or now - row[0] > config.QUOTA_WINDOW_HOURS * 3600:
            window_start, seconds_used = now, 0.0
        else:
            window_start, seconds_used = row

        if seconds_used >= config.QUOTA_SECONDS:
            reset_in_minutes = int((config.QUOTA_WINDOW_HOURS * 3600 - (now - window_start)) / 60) + 1
            raise HTTPException(
                status_code=429,
                detail=f"You've used your {config.QUOTA_SECONDS // 60}-minute session limit. "
                f"Try again in about {reset_in_minutes} minutes.",
            )

        seconds_used += seconds
        conn.execute(
            """
            INSERT INTO ip_usage (ip, window_start, seconds_used, last_seen)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(ip) DO UPDATE SET
                window_start = excluded.window_start,
                seconds_used = excluded.seconds_used,
                last_seen = excluded.last_seen
            """,
            (ip, window_start, seconds_used, now),
        )
        conn.commit()
        return max(0.0, config.QUOTA_SECONDS - seconds_used)
