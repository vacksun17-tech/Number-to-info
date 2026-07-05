from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="yeulin-numbertoinfo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPSTREAM_URL = "https://num-to-info.sauravsingh2111.workers.dev/lookup"

# Fields to remove from upstream response (credit/channel info)
REMOVE_FIELDS = {"credit", "credits", "channel", "source", "author", "powered_by", "by", "dev", "developer"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "yeulin-numbertoinfo"}

@app.get("/lookup/{number}")
async def lookup(number: str):
    if not number.isdigit() or len(number) < 10:
        raise HTTPException(status_code=400, detail="Invalid number format")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(f"{UPSTREAM_URL}/{number}")
            response.raise_for_status()
            data = response.json()

            # Remove any credit/channel fields
            if isinstance(data, dict):
                for field in REMOVE_FIELDS:
                    data.pop(field, None)
                    data.pop(field.upper(), None)
                    data.pop(field.capitalize(), None)

                # Inject owner info
                data["owner"] = "@kihoerack"
                data["admin"] = "@YeuIin"

            return data

        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="Upstream error")
        except Exception:
            raise HTTPException(status_code=500, detail="Service unavailable")
