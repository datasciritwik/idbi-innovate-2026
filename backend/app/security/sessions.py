"""Anonymous session tokens.

There is no user login in this app. A JWT here proves "this client went
through POST /api/session" rather than identifying a real user — it exists
to keep the API from being called directly by arbitrary scripts, not to
authorize any particular person. Real usage limiting is IP-based and lives
in quota.py, independent of anything the token claims.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException

from .. import config


def create_session_token() -> tuple[str, str]:
    """Returns (token, session_id)."""
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": session_id,
        "iat": now,
        "exp": now + timedelta(minutes=config.SESSION_TOKEN_TTL_MINUTES),
    }
    token = jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)
    return token, session_id


def decode_session_token(token: str) -> str:
    """Returns the session_id, or raises HTTPException(401)."""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — request a new one from POST /api/session.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    return payload["sub"]
