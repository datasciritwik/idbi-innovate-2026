"""Per-session conversation memory, so multi-turn chat isn't stateless.

Keyed by the anonymous session_id (see security/sessions.py) rather than
user_id — the demo lets one browser session flip between users (e.g. life
event triggers jump to a different account), and each browser session's own
conversational thread is what should carry forward, not per-user history.
"""

import sqlite3
import threading
from datetime import datetime, timezone

from .. import config

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    config.MEMORY_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.MEMORY_DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS conversation_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at REAL NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_conversation_turns_session ON conversation_turns(session_id, id)")
    return conn


def record_turn(session_id: str, role: str, content: str) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO conversation_turns (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, content, datetime.now(timezone.utc).timestamp()),
        )
        conn.commit()


def get_recent_turns(session_id: str, limit: int = config.MEMORY_TURN_LIMIT) -> list[dict]:
    """Returns up to `limit` most recent turns for this session, oldest first."""
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT role, content FROM conversation_turns WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    return [{"role": role, "content": content} for role, content in reversed(rows)]
