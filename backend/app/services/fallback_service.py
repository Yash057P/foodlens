import base64
import json
import logging

import requests

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

PROMPT = (
    "You are a food recognition assistant. Analyze this image.\n\n"
    "Rules:\n"
    "- If the image clearly shows food, return JSON: "
    '{"has_food": true, "food_name": "<name>", "description": "<short description>"}\n'
    "- If the image does NOT clearly show food, return JSON: "
    '{"has_food": false, "food_name": null, "description": "<what you see>"}\n\n'
    "Return ONLY valid JSON. No extra text, no markdown fences."
)


class GroqVisionFallback:
    """Uses Groq's hosted vision model to identify food when the primary
    classifier has low confidence. Gives the user a clear answer instead
    of a random guess."""

    def __init__(self, api_key: str, model: str = "llama-3.2-11b-vision-preview", timeout: int = 30):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self._session = requests.Session()

    def analyze(self, image_bytes: bytes, mime: str = "image/jpeg") -> dict:
        """Call Groq vision API and return structured result.

        Returns dict with keys: has_food, food_name, description
        On any failure returns a safe fallback instead of raising.
        """
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime};base64,{b64}"

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            "temperature": 0.1,
            "max_tokens": 256,
        }

        text = ""
        try:
            resp = self._session.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self.timeout,
            )
            if resp.status_code != 200:
                logger.error("Groq API error %d: %s", resp.status_code, resp.text[:200])
                return self._fallback("AI service is temporarily unavailable")
            text = resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as exc:  # network / malformed response
            logger.error("Groq request failed: %s", exc)
            return self._fallback("AI service is temporarily unavailable")

        try:
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text.rsplit("```", 1)[0]
            text = text.strip()

            result = json.loads(text)
            return {
                "has_food": bool(result.get("has_food", False)),
                "food_name": result.get("food_name"),
                "description": str(result.get("description", "")),
            }
        except (json.JSONDecodeError, ValueError):
            logger.warning("Groq returned non-JSON content: %s", text[:200])
            return self._fallback("Could not parse AI response")

    @staticmethod
    def _fallback(description: str) -> dict:
        return {"has_food": False, "food_name": None, "description": description}

    def close(self):
        self._session.close()