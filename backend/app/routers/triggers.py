from fastapi import APIRouter, Depends, Response

from .. import config
from ..security.deps import SessionContext, require_quota, require_session
from ..security.gpu_gate import gpu_slot
from ..services.triggers import run_trigger

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


@router.get("", dependencies=[Depends(require_session)])
def list_triggers():
    return [{"trigger_type": t, "user_id": u} for t, u in config.TRIGGER_USER_MAP.items()]


@router.post("/{trigger_type}")
async def fire_trigger(trigger_type: str, response: Response, ctx: SessionContext = Depends(require_quota)):
    async with gpu_slot():
        result = run_trigger(trigger_type)
    response.headers["X-Quota-Remaining-Seconds"] = str(int(ctx.quota_remaining_seconds or 0))
    return result
