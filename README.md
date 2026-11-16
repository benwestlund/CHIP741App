# Steady

A web prototype for CHIP 741: a private daily companion that helps people take PrEP or HIV treatment (ART) consistently.

**Target population:** people at risk for HIV (PrEP) and people living with HIV (ART).
**Goal:** reduce the burden of daily medication through reminders, simple tracking, education, and support.

## What's in it

| Screen | What it does |
|---|---|
| Onboarding | User picks PrEP or ART, sets a reminder time and their own private reminder wording |
| Today | One-tap "I took it," streak ring, week strip, rotating tip, daily check-in (mood, side effects, drinks) |
| History | Monthly calendar of taken/missed doses, 7- and 30-day adherence |
| Learn | Education cards filtered by track (PrEP effectiveness, U=U, alcohol and harm reduction, missed doses, privacy) plus resource links |
| Coach | Chat. Demo mode uses prewritten replies; can connect to a real AI model through the proxy server |
| Profile | Edit settings, browser alerts, add a daily calendar event, toggle sharing with care team, demo data |
| Care team view | Simulated provider dashboard: adherence, missed doses, check-in response rate, auto-flags (e.g., heavy drinking followed by missed doses) |

### Stigma and privacy design choices
- App name and reminders never mention HIV; user writes their own reminder wording.
- **Quick hide** button (or Esc key) instantly covers the screen with a neutral clock.
- Data stays in the browser (localStorage). Nothing leaves the device unless the AI coach is turned on.
- Sharing with a provider is off by default and opt-in.

## Files

```
index.html      page structure (all screens)
style.css       look and layout (mobile-first, centered column on desktop)
content.js      ALL text: education cards, resources, tips, demo coach replies. Edit here.
app.js          logic: saving, adherence math, reminders, chat, provider view
server/         optional Python proxy that keeps the AI API key secret
```

## Run it locally
Open `index.html` in a browser. That's it. For the full experience, go to Profile and tap **Load 30 days of sample data**, then look at History and **Preview what they see**.

## Host on GitHub Pages
1. Create a repo and upload `index.html`, `style.css`, `content.js`, `app.js` to the root.
2. Repo **Settings → Pages → Deploy from a branch → main / root → Save**.
3. Site appears at `https://<username>.github.io/<repo>/` in a minute or two.

## Adding a real AI coach (optional)
The instructor's point: anything in JavaScript is visible to anyone via right-click → Inspect, so an API key there would be exposed. The fix is a small "passthrough proxy" server that holds the key:

```
Browser (app.js) → server/server.py (holds key) → OpenAI or Anthropic API
```

**Local test:**
```bash
cd server
pip install -r requirements.txt
export OPENAI_API_KEY="sk-..."     # or: export PROVIDER=anthropic ANTHROPIC_API_KEY="..."
python server.py
```
Then in `app.js` set `CHAT_ENDPOINT: "http://localhost:5000/chat"` and open `index.html`.

**Deploy (so the GitHub Pages site can use it):** GitHub Pages can't run Python, so the server goes on a free host like Render:
1. New Web Service from the repo, root directory `server`.
2. Build command `pip install -r requirements.txt`, start command `gunicorn server:app`.
3. Environment variables: `OPENAI_API_KEY` (or `PROVIDER=anthropic` + `ANTHROPIC_API_KEY`), and `ALLOWED_ORIGIN=https://<username>.github.io`.
4. Put the Render URL + `/chat` into `CHAT_ENDPOINT` in `app.js`.

Never commit the key to GitHub. It goes only in the host's environment variable settings. The default model names in `server.py` may need updating; check your provider's current model list.

## Known limits (worth naming in the presentation)
- Reminders only fire while the page is open; the calendar event covers the closed-app case. A native app or installed PWA with push notifications would be the next step.
- The provider view is simulated. A real one needs consent flows, accounts, a secure database, and HIPAA compliance.
- Missed-dose guidance is general; real guidance depends on the specific medicine.
- Verify all health content against current CDC/NIH sources before presenting.
