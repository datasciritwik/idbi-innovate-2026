from fastapi import APIRouter

from .. import config
from ..services.triggers import run_trigger

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


@router.get("")
def list_triggers():
    return [{"trigger_type": t, "user_id": u} for t, u in config.TRIGGER_USER_MAP.items()]


@router.post("/{trigger_type}")
def fire_trigger(trigger_type: str):
    return run_trigger(trigger_type)
