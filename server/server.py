"""
Steady chat proxy.

Why this exists: anything in index.html / app.js is visible to anyone who
right-clicks and chooses Inspect. If the AI API key lived there, anyone could
copy it and run up charges on your account. This tiny server holds the key
privately and passes chat messages to the AI model on the app's behalf.

    Browser (app.js)  --->  this server (has the key)  --->  AI model API
                      <---                             <---

Run locally:
    pip install -r requirements.txt
    export OPENAI_API_KEY="sk-..."        # or ANTHROPIC_API_KEY, see PROVIDER below
    python server.py
Then set CONFIG.CHAT_ENDPOINT in app.js to "http://localhost:5000/chat".

GitHub Pages only serves static files, so to use this with the hosted site you
deploy it separately (Render, Railway, PythonAnywhere, etc.). See README.md.
"""

import os

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

# ---- Settings (all from environment variables, never hard-coded) ----
PROVIDER = os.environ.get("PROVIDER", "openai")  # "openai" or "anthropic"
MODEL = os.environ.get("MODEL", "")               # leave blank for the default below
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")  # set to your GitHub Pages URL when deployed

app = Flask(__name__)
CORS(app, origins=ALLOWED_ORIGIN)

SYSTEM_PROMPT = """You are the coach inside Steady, a private app that helps people take
daily HIV medication: PrEP for people staying HIV negative, or ART for people living with HIV.
The user's track is: {track}.

How to respond:
- Warm, brief (2 to 4 sentences), plain language, no judgment, no jargon.
- Focus on adherence: routines, missed doses, side effects, alcohol and substance use
  (harm reduction, never moralizing), stigma and privacy, refills, cost.
- Never diagnose, change doses, or give medication-specific instructions. For anything
  about a person's own medicine or symptoms, encourage them to ask their provider or pharmacist.
- If someone mentions a medical emergency, tell them to call 911. If they mention thoughts of
  suicide or self-harm, give the 988 Suicide and Crisis Lifeline (call or text 988).
- Don't ask for names, addresses, or other identifying details.
"""


def call_openai(system, messages):
    r = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
        json={
            "model": MODEL or "gpt-4o-mini",
            "messages": [{"role": "system", "content": system}] + messages,
            "max_tokens": 300,
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def call_anthropic(system, messages):
    # Anthropic requires the conversation to start with a user turn.
    while messages and messages[0]["role"] != "user":
        messages = messages[1:]
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": MODEL or "claude-haiku-5-5",
            "system": system,
            "messages": messages,
            "max_tokens": 300,
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


@app.post("/chat")
def chat():
    body = request.get_json(silent=True) or {}
    track = "PrEP" if body.get("track") != "art" else "ART (living with HIV)"
    # Keep only well-formed recent messages, and cap their length.
    messages = [
        {"role": m["role"], "content": str(m["content"])[:1000]}
        for m in body.get("messages", [])[-12:]
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    if not messages:
        return jsonify({"error": "no messages"}), 400

    system = SYSTEM_PROMPT.format(track=track)
    try:
        reply = call_anthropic(system, messages) if PROVIDER == "anthropic" else call_openai(system, messages)
    except Exception as e:  # don't leak details (or the key) to the browser
        app.logger.error("AI call failed: %s", e)
        return jsonify({"error": "upstream error"}), 502
    return jsonify({"reply": reply})


@app.get("/")
def health():
    return "Steady proxy is running."


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)))
