import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_ENDPOINT = os.getenv("GROQ_URL")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def check_fraud(transcript: str) -> str:
    if not GROQ_API_KEY or not GROQ_ENDPOINT:
        raise Exception("Missing GROQ API credentials")

    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {
                "role": "system",
                "content": """You are a fraud detection expert. Analyze calls for these red flags:
1. **Authority Impersonation**: Claims to be government officials, CEOs, or celebrities (e.g., "I’m Donald Trump").
2. **Financial Requests**: Asks for money transfers, gift cards, or cryptocurrency.
3. **Urgency/Threats**: Uses phrases like "act now or face arrest" or "your account will be closed."
4. **Sensitive Info**: Requests passwords, Social Security Numbers, or credit card details.
5. **Unrealistic Offers**: Promises visas, lottery wins, or huge rewards for small payments.
6. **Caller ID Spoofing**: Claims legitimacy via fake caller IDs like "IRS" or "Bank Security."
7. **Untraceable Payments**: Demands wire transfers, prepaid debit cards, or gift cards.

If ANY of these occur, classify as FRAUD. Ignore legal/typical financial discussions (e.g., bank confirming a transaction)."""
            },
            {
                "role": "user",
                "content": f"""Analyze this call transcript: "{transcript}"

Step 1: Check for authority impersonation (e.g., famous people/institutions).
Step 2: Identify urgent threats or too-good-to-be-true offers.
Step 3: Detect requests for money/sensitive info.
Step 4: Assess payment method legitimacy.

### Respond in this exact JSON format:
{{
  "classification": "fraud" or "normal",
  "explanation": "Short explanation about your decision."
}}
"""
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(GROQ_ENDPOINT, json=payload, headers=headers)


    if response.status_code == 200:
        try:
            message = response.json()["choices"][0]["message"]["content"]
            result = eval(message) if isinstance(message, str) else message
            return {
                "classification": result.get("classification", "unknown"),
                "explanation": result.get("explanation", "No explanation provided.")
            }
        except Exception as e:
            print("Parsing error:", e)
            return {
                "classification": "unknown",
                "explanation": "Failed to parse explanation."
            }
    else:
        raise Exception("Groq LLaMA API failed: " + response.text)