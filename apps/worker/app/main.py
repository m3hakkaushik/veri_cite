"""VeriCite worker entrypoint. Hosted Supabase and Gemini; no local services."""

from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.security import verify_signature

app = FastAPI(title="VeriCite worker", version="0.1.0")


class Health(BaseModel):
    ok: bool = True
    pdf_parser: Literal["gemini"] = "gemini"
    version: str = app.version


@app.get("/health", response_model=Health)
async def health() -> Health:
    """Process liveness, not a claim that external providers are configured."""
    return Health()


@app.exception_handler(HTTPException)
async def api_error(request: Request, error: HTTPException):
    detail = (
        error.detail
        if isinstance(error.detail, dict)
        else {"code": "request_failed", "message": str(error.detail)}
    )
    return JSONResponse({"error": detail}, status_code=error.status_code)


@app.post(
    "/internal/runs/{run_id}/start", status_code=202, dependencies=[Depends(verify_signature)]
)
async def start_run(run_id: str):
    # M2 transport stub. M4 replaces this handler with the idempotent orchestrator.
    # This endpoint is not connected to the web's Start check button yet.
    return {"accepted": True}


@app.get("/internal/runs/{run_id}/bibtex", dependencies=[Depends(verify_signature)])
async def export_bibtex(run_id: str):
    raise HTTPException(
        501, detail={"code": "not_implemented", "message": "BibTeX export is not connected yet."}
    )


@app.post("/internal/ask", dependencies=[Depends(verify_signature)])
async def ask():
    raise HTTPException(
        501,
        detail={"code": "not_implemented", "message": "Grounded answers are not connected yet."},
    )
