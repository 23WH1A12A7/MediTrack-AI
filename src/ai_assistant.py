from __future__ import annotations

import os


SYSTEM_PROMPT = """You are a cautious personal health assistant for a student Track A project.
Give general wellness and medication-adherence guidance only.
Do not diagnose, prescribe, change doses, or replace a clinician.
Always recommend urgent professional help for red-flag symptoms."""


def generate_health_answer(question: str, context: str = "") -> str:
    if not question.strip():
        return "Ask a health or medication-tracking question to get started."

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if groq_key:
        try:
            return _ask_groq(question, context, groq_key)
        except Exception as exc:  # noqa: BLE001
            return _fallback_answer(question, f"Groq request failed: {exc}")

    if gemini_key:
        try:
            return _ask_gemini(question, context, gemini_key)
        except Exception as exc:  # noqa: BLE001
            return _fallback_answer(question, f"Gemini request failed: {exc}")

    return _fallback_answer(question, "No LLM API key found.")


def _ask_groq(question: str, context: str, api_key: str) -> str:
    from groq import Groq

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion:\n{question}"},
        ],
        temperature=0.2,
    )
    return completion.choices[0].message.content or ""


def _ask_gemini(question: str, context: str, api_key: str) -> str:
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    response = model.generate_content(f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion:\n{question}")
    return response.text or ""


def _fallback_answer(question: str, reason: str) -> str:
    return (
        f"{reason}\n\n"
        "Here is a safe offline response: track medicines exactly as prescribed, keep a daily log, "
        "watch for unusual symptoms, and contact a qualified clinician or pharmacist for medication-specific advice. "
        f"For your question, '{question}', use the Medical Lookup tab for reliable sources and avoid making treatment changes on your own."
    )
