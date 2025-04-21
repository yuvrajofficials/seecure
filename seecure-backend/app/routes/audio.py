from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.transcribe import transcribe_audio
from app.services.llama_check import check_fraud
from app.services.file_utils import save_temp_file, delete_file
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze")
async def analyze_audio(audio: UploadFile = File(...)):
    temp_path = await save_temp_file(audio)
    temp_wav_path = None

    try:
        logger.info("Received audio for analysis")

        transcript, temp_wav_path = transcribe_audio(temp_path)
        logger.info(f"Transcript: {transcript}")

        result = check_fraud(transcript)
        logger.info(f"Fraud Check Result: {result}")

        return {"transcript": transcript, "result": result}
    
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        await delete_file(temp_path)
        if temp_wav_path:
            await delete_file(str(temp_wav_path))
