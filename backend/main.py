import json
import os
from datetime import datetime, timezone
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

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


class InterviewSpeech(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    interviewer: Literal[0, 1, 2]
    language: Literal["ar", "en"]


@app.post("/tts")
def interview_speech(
    speech: InterviewSpeech,
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
):
    if os.getenv("TALEEQ_TTS_LOCAL_TEST") != "1":
        if credentials is None:
            raise HTTPException(401, "Sign-in required")
        supabase_request("/auth/v1/user", credentials.credentials)
    key = os.getenv("ELEVENLABS_API_KEY")
    if not key:
        raise HTTPException(503, "Speech service is not configured")
    voices = ["pG78raDdMo3wMovvBZyC", "Ba3JsQQHj7eeXb9do3WO", "yj98XMKoIiQ9r3DGZiml"]
    body = json.dumps({"text": speech.text, "model_id": "eleven_multilingual_v2"}).encode()
    request = Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voices[speech.interviewer]}",
        data=body,
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            return Response(content=response.read(), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
    except (HTTPError, URLError, TimeoutError) as error:
        raise HTTPException(502, "Speech service unavailable") from error
