from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routers import chat, portfolio, recommendations, session, triggers, users, warmup

app = FastAPI(title="Wren Personalization Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Quota-Remaining-Seconds", "Retry-After"],
)

app.include_router(session.router)
app.include_router(users.router)
app.include_router(portfolio.router)
app.include_router(recommendations.router)
app.include_router(chat.router)
app.include_router(triggers.router)
app.include_router(warmup.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/languages")
def list_languages():
    return [{"code": code, "name": name} for code, name in config.SUPPORTED_LANGUAGES.items()]
