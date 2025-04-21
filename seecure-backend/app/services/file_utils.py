import os
import tempfile
from fastapi import UploadFile, HTTPException
import shutil
from pathlib import Path

async def save_temp_file(audio: UploadFile):
    try:
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, audio.filename)
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)
        return temp_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

async def delete_file(file_path: str):
    try:
        path = Path(file_path).resolve()
        if path.exists():
            path.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")