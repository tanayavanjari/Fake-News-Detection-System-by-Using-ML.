# TruthLens — Fake News Detector
## Final Year Project

A fully client-side AI fake news detector. Works 100% in the browser — no server, no API keys, no backend required.

---

## Files in This Project

```
├── index.html          ← Main webpage (open this in browser)
├── netlify.toml        ← Netlify deployment config
├── app.py              ← Optional: Flask server for local dev
├── static/
│   ├── script.js       ← All AI logic + button handlers
│   └── style.css       ← All styling
└── dataset/
    └── news_sample.csv ← Sample data (reference only)
```

---

## Deploy on Netlify (Recommended)

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop the entire project folder onto the Netlify page
4. Your site will be live instantly — **no build step needed**

That's it. ✅

---

## Run Locally (Optional)

**Option A — Just open the HTML file:**
- Double-click `index.html` in your file explorer
- Works immediately, no installation needed

**Option B — Using Flask:**
```bash
pip install flask
python app.py
```
Then open http://127.0.0.1:5000

---

## How the AI Works

The detector runs entirely in the browser using linguistic pattern scoring:

**FAKE signals detected:**
- ALL-CAPS words (sensationalism)
- Conspiracy phrases ("deep state", "cover-up", "wake up")
- Emotional manipulation ("SHOCKING", "you won't believe")
- Excessive `!!!` or `???` punctuation
- Urgent sharing language ("share before they delete")
- Vague sources ("sources say", "insiders claim")
- Pseudoscience terms ("miracle cure", "big pharma")

**REAL signals detected:**
- Named credible sources (Reuters, BBC, WHO, CDC, NASA…)
- Specific statistics and percentages
- Formal reporting verbs ("announced", "confirmed", "published")
- Institutional references (university, parliament, court…)
- Date/time specificity
- Titled people (President X, Dr. Y, Prof. Z)

---

## Fixes Applied (vs Original Broken Version)

| Problem | Fix |
|---|---|
| `index.html` used Flask Jinja2 `{% if %}` tags — broken on Netlify | Replaced with plain HTML |
| `script.js` called `fetch('/predict')` — no Flask server on Netlify | Replaced with browser-side AI engine |
| Buttons used `onclick=` without event listeners — could fail silently | Added `addEventListener` for both buttons |
| DOM accessed before page loaded — caused `null` errors | Wrapped everything in `DOMContentLoaded` |
| `loadSample` / global functions not on `window` — `onclick` in HTML couldn't find them | Exposed via `window.analyseNews` and `window.clearInput` |
| CSS `<link>` used Flask `url_for()` — broken outside Flask | Changed to plain `static/style.css` path |
