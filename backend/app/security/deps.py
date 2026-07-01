from dataclasses import dataclass

from fastapi import Header, HTTPException, Request

from .. import config
from . import quota
from .sessions import decode_session_token


def get_client_ip(request: Request) -> str:
    if config.TRUST_PROXY_HEADERS:
        # Set by Cloudflare's edge itself (can't be spoofed by the client past
        # it), so prefer it over the more generic X-Forwarded-For.
        cf_ip = request.headers.get("cf-connecting-ip")
        if cf_ip:
            return cf_ip.strip()
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client is None:
        return "unknown"
    return request.client.host


def _extract_session_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing session token — call POST /api/session first.")
    token = authorization.split(" ", 1)[1].strip()
    return decode_session_token(token)


@dataclass
class SessionContext:
    session_id: str
    ip: str
    quota_remaining_seconds: float | None = None


def require_session(request: Request, authorization: str | None = Header(default=None)) -> SessionContext:
    """Verifies the anonymous session JWT. Applied to all read endpoints so
    the API isn't wide open, but doesn't touch quota — reads are free."""
    session_id = _extract_session_id(authorization)
    return SessionContext(session_id=session_id, ip=get_client_ip(request))


def require_quota(request: Request, authorization: str | None = Header(default=None)) -> SessionContext:
    """Same as require_session, plus deducts one turn's cost from the
    caller's IP-based quota. Use on GPU-bound endpoints (chat, triggers)."""
    ctx = require_session(request, authorization)
    ctx.quota_remaining_seconds = quota.charge(ctx.ip)
    return ctx
