from fastapi import APIRouter, Request
from pydantic import BaseModel

from .. import config
from ..security import quota
from ..security.deps import get_client_ip
from ..security.sessions import create_session_token

router = APIRouter(prefix="/api/session", tags=["session"])


class SessionResponse(BaseModel):
    token: str
    expires_in_minutes: int
    quota_remaining_seconds: float
    quota_total_seconds: int


@router.post("", response_model=SessionResponse)
def create_session(request: Request):
    token, _session_id = create_session_token()
    ip = get_client_ip(request)
    return SessionResponse(
        token=token,
        expires_in_minutes=config.SESSION_TOKEN_TTL_MINUTES,
        quota_remaining_seconds=quota.remaining_seconds(ip),
        quota_total_seconds=config.QUOTA_SECONDS,
    )
