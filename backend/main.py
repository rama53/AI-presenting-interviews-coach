import json
import os
from datetime import datetime, timezone
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

app = FastAPI(title="Taleeq API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "TALEEQ_FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
bearer = HTTPBearer()


class PracticeSessionCreate(BaseModel):
    practice_type: Literal["interview", "presentation"]


def supabase_request(path: str, token: str, payload: dict | None = None, *, method: str | None = None):
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise HTTPException(503, "Supabase is not configured")

    headers = {"apikey": key, "Authorization": f"Bearer {token}"}
    body = None
    if payload is not None:
        headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
        body = json.dumps(payload).encode()

    try:
        with urlopen(Request(f"{url.rstrip('/')}{path}", data=body, headers=headers, method=method), timeout=10) as response:
            return json.load(response)
    except HTTPError as error:
        if error.code == 401:
            raise HTTPException(401, "Supabase sign-in could not be verified") from error
        if error.code == 403:
            raise HTTPException(403, "Supabase denied access") from error
        raise HTTPException(502, "Supabase could not complete the request") from error
    except (URLError, TimeoutError, ValueError) as error:
        raise HTTPException(502, "Supabase did not return a valid response") from error


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sessions", status_code=201)
def create_session(
    session: PracticeSessionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    token = credentials.credentials
    user = supabase_request("/auth/v1/user", token)
    rows = supabase_request("/rest/v1/practice_sessions", token, {
        "user_id": user["id"],
        "practice_type": session.practice_type,
    })
    return rows[0]


@app.get("/sessions")
def recent_sessions(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    return supabase_request(
        "/rest/v1/practice_sessions?select=id,practice_type,ended_at"
        "&ended_at=not.is.null&order=ended_at.desc,id.desc&limit=5",
        credentials.credentials,
    )


@app.post("/sessions/{session_id}/finish")
def finish_session(session_id: UUID, credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials
    path = f"/rest/v1/practice_sessions?id=eq.{session_id}"
    rows = supabase_request(
        f"{path}&ended_at=is.null",
        token,
        {"ended_at": datetime.now(timezone.utc).isoformat()},
        method="PATCH",
    )
    if not rows:
        rows = supabase_request(path, token)
    if not rows or rows[0]["ended_at"] is None:
        raise HTTPException(404, "Session not found or could not be finished")
    return rows[0]
