from vosk import Model, KaldiRecognizer
import wave
import json
from pydub import AudioSegment
from pathlib import Path
import uuid
import os

# Load Vosk model
model_path = Path(__file__).resolve().parent.parent / "models" / "vosk-model-small-en-us"
model = Model(str(model_path))

# Temp folder inside current directory
TEMP_DIR = Path(__file__).resolve().parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)

def convert_to_wav(input_path: str) -> Path:
    input_file = Path(input_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Audio file not found: {input_file}")

    output_file = TEMP_DIR / f"{uuid.uuid4()}.wav"

    audio = AudioSegment.from_file(input_file)
    audio = audio.set_channels(1).set_frame_rate(16000)
    audio.export(output_file, format="wav")
    return output_file

def transcribe_audio(audio_path: str) -> tuple[str, Path]:
    # Convert to required WAV format
    wav_path = convert_to_wav(audio_path)
    wf = wave.open(str(wav_path), "rb")

    rec = KaldiRecognizer(model, wf.getframerate())
    text = ""

    while True:
        data = wf.readframes(4000)
        if not data:
            break
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            text += result.get("text", "") + " "

    final = json.loads(rec.FinalResult())
    text += final.get("text", "")
    wf.close()

    print(f"[✓] Transcription completed from: {wav_path.name}")
    return text.strip(), wav_path
