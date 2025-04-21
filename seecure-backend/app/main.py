from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes.audio import router as audio_router

load_dotenv()  # Load .env on startup

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this in production to your frontend's origin (e.g., ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include your router
app.include_router(audio_router, prefix="/api/audio", tags=["Audio"])
