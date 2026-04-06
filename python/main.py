"""ModelDeck local API service entrypoint."""

from __future__ import annotations

import argparse
import json
import os
from typing import Optional
from urllib import request
from urllib.error import HTTPError, URLError

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
import uvicorn

try:
	from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency fallback
	load_dotenv = None

if load_dotenv is not None:
	load_dotenv()

OLLAMA_BASE_URL = os.getenv("MODELDECK_OLLAMA_URL", "http://127.0.0.1:11434")


class GeneratePayload(BaseModel):
	prompt: str = Field(min_length=1)
	model: Optional[str] = None
	temperature: Optional[float] = None
	top_p: Optional[float] = None
	max_tokens: Optional[int] = None
	system_prompt: Optional[str] = None


def create_app(default_model: str) -> FastAPI:
	app = FastAPI(title="ModelDeck Local API", version="1.0.0")

	@app.middleware("http")
	async def enforce_local_only(request_obj: Request, call_next):
		client_host = request_obj.client.host if request_obj.client else ""
		if client_host not in ("127.0.0.1", "::1", "localhost"):
			raise HTTPException(status_code=403, detail="Local access only")

		return await call_next(request_obj)

	@app.get("/health")
	async def health() -> dict[str, str]:
		return {"status": "ok", "model": default_model}

	@app.post("/generate")
	async def generate(payload: GeneratePayload) -> dict[str, str]:
		model_id = payload.model or default_model
		request_body: dict[str, object] = {
			"model": model_id,
			"prompt": payload.prompt,
			"stream": False,
		}

		options: dict[str, object] = {}
		if payload.temperature is not None:
			options["temperature"] = payload.temperature
		if payload.top_p is not None:
			options["top_p"] = payload.top_p
		if payload.max_tokens is not None:
			options["num_predict"] = payload.max_tokens
		if options:
			request_body["options"] = options

		if payload.system_prompt:
			request_body["system"] = payload.system_prompt

		encoded = json.dumps(request_body).encode("utf-8")
		req = request.Request(
			f"{OLLAMA_BASE_URL}/api/generate",
			data=encoded,
			headers={"Content-Type": "application/json"},
			method="POST",
		)

		try:
			with request.urlopen(req, timeout=60) as response:
				data = json.loads(response.read().decode("utf-8"))
				text = str(data.get("response", ""))
				return {"text": text}
		except HTTPError as error:
			detail = error.read().decode("utf-8") if hasattr(error, "read") else str(error)
			raise HTTPException(status_code=error.code, detail=detail) from error
		except URLError as error:
			raise HTTPException(status_code=502, detail=f"Failed to reach Ollama: {error}") from error

	return app


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="ModelDeck local API service")
	parser.add_argument("--host", default="127.0.0.1")
	parser.add_argument("--port", type=int, default=int(os.getenv("MODELDECK_API_PORT", "8765")))
	parser.add_argument("--model", default=os.getenv("MODELDECK_API_DEFAULT_MODEL", "llama3.1:8b"))
	return parser.parse_args()


def main() -> None:
	args = parse_args()
	app = create_app(args.model)
	uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
	main()
