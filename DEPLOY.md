# 🚀 Fake News Detector — Complete Netlify Deployment Guide

## 📁 Final Project Structure

```
fake-news-detector/
│
├── index.html                        ← Main webpage (static, served by Netlify)
├── app.py                            ← Flask backend (for local testing)
├── train_model.py                    ← Run this FIRST to train the model
├── netlify.toml                      ← Netlify config (routing + build)
├── requirements.txt                  ← Python packages
├── runtime.txt                       ← Python 3.9
├── Procfile                          ← For Gunicorn (Render/Heroku fallback)
├── .gitignore
│
├── model/                            ← Auto-created by train_model.py
│   ├── fake_news_model.pkl
│   ├── tfidf_vectorizer.pkl
│   └── metadata.json
│
├── static/
│   ├── css/style.css                 ← All styling
│   └── js/main.js                    ← API calls + UI logic
│
├── templates/
│   └── index.html                    ← Same as root index.html (Flask uses this)
│
└── netlify/
    └── functions/
        └── api.py                    ← Serverless function (wraps ML model)
```

---

## ✅ Step 0 — Prerequisites (install once)

```bash
# Install Python 3.9+
python --version     # should print Python 3.9.x or higher

# Install Node.js (needed for Netlify CLI)
node --version       # should print v16 or higher

# Install Git
git --version

# Install Netlify CLI globally
npm install -g netlify-cli

# Verify
netlify --version
```

---

## ✅ Step 1 — Get the Dataset

Download the **Fake and Real News Dataset** from Kaggle:

👉 https://www.kaggle.com/clmentbisaillon/fake-and-real-news-dataset

Place `Fake.csv` and `True.csv` in the **root** of your project folder.

> **Don't have a Kaggle account?**
> Skip this step — `train_model.py` will auto-generate a small demo
> dataset so you can test the full pipeline immediately.

---

## ✅ Step 2 — Set Up Local Environment

```bash
# Navigate to your project folder
cd fake-news-detector

# Create a virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt
```

---

## ✅ Step 3 — Train the Model (CRITICAL — do this first!)

```bash
python train_model.py
```

**What this does:**
1. Loads `Fake.csv` and `True.csv` (or generates demo data)
2. Cleans and preprocesses all text
3. Converts to TF-IDF features (50,000 terms + bigrams)
4. Trains 4 classifiers (Logistic Regression, PAC, Naive Bayes, Random Forest)
5. Picks the best model
6. Saves `model/fake_news_model.pkl`
7. Saves `model/tfidf_vectorizer.pkl`
8. Saves `model/metadata.json`

Expected output:
```
[1/5] Loading dataset …      Total: 44,000+
[2/5] Cleaning text …        Records: 44,000+
[3/5] Vectorising …          Features: 50,000
[4/5] Training …
      Logistic Regression     98.7%
      Passive Aggressive      99.1%
      Naive Bayes             95.8%
      Random Forest           98.9%
      🏆 Best: Passive Aggressive (99.1%)
[5/5] Saving … ✅
```

---

## ✅ Step 4 — Test Locally with Flask

```bash
# Run the Flask development server
python app.py
```

Open your browser at: **http://127.0.0.1:5000**

Test a few articles to make sure predictions work correctly.
Press `Ctrl+C` to stop the server when done.

---

## ✅ Step 5 — Initialize Git Repository

```bash
# Initialize git (skip if already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Fake News Detector"
```

---

## ✅ Step 6 — Push to GitHub

1. Go to **https://github.com/new**
2. Create a new repository named `fake-news-detector`
3. Do NOT add README or .gitignore (you already have them)
4. Copy the remote URL shown on GitHub, then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/fake-news-detector.git
git branch -M main
git push -u origin main
```

> Make sure `model/` folder (with .pkl files) IS committed and pushed.
> The .gitignore only excludes Fake.csv/True.csv, not the model files.

```bash
# Verify model files are tracked
git ls-files model/
# Should show:
# model/fake_news_model.pkl
# model/tfidf_vectorizer.pkl
# model/metadata.json
```

---

## ✅ Step 7 — Deploy to Netlify (3 methods)

### Method A — Netlify Website (Easiest) ⭐ RECOMMENDED

1. Go to **https://app.netlify.com**
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select your `fake-news-detector` repository
6. Configure build settings:

```
Branch to deploy:   main
Base directory:     (leave empty)
Build command:      pip install -r requirements.txt && python train_model.py
Publish directory:  .
Functions directory: netlify/functions
```

7. Click **"Deploy site"**
8. Wait 2–5 minutes for the build to complete
9. Netlify gives you a URL like: `https://amazing-name-123.netlify.app`

---

### Method B — Netlify CLI (Command Line)

```bash
# Log in to Netlify
netlify login

# Link your project (first time)
netlify init

# Choose: "Create & configure a new site"
# Team: your team name
# Site name: fake-news-detector (or any name)

# Deploy a preview first
netlify deploy

# If preview looks good, deploy to production
netlify deploy --prod
```

---

### Method C — Drag & Drop (No GitHub needed)

1. Go to **https://app.netlify.com/drop**
2. Drag your entire `fake-news-detector/` folder into the browser
3. Netlify auto-deploys it
4. Get your live URL instantly

> Note: Method C won't run `train_model.py` automatically.
> You must include the pre-trained `model/` files in the folder you drag.

---

## ✅ Step 8 — Verify the Deployment

After deployment, test these URLs:

```
https://your-site.netlify.app/              → Should show the web interface
https://your-site.netlify.app/health        → Should return JSON with model info
https://your-site.netlify.app/.netlify/functions/api   → Function health check
```

Test the predictor:
```bash
curl -X POST https://your-site.netlify.app/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Scientists confirm new vaccine shows 95% efficacy in trials."}'
```

Expected response:
```json
{
  "prediction": "REAL",
  "label": 1,
  "confidence": 97.3,
  "fake_prob": 2.7,
  "real_prob": 97.3,
  "word_count": 10
}
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `model/ files not found` | Run `python train_model.py` and commit the model/ folder |
| `Build failed: pip not found` | Add `runtime.txt` with content `3.9` |
| `Function timeout` | Model pkl files are too large — use demo data for now |
| `CORS error in browser` | Check netlify.toml headers section |
| `Port 5000 in use` | Change port: `app.run(port=5001)` |
| Low accuracy | Use the real Kaggle dataset (44K articles) |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |

---

## 🌐 Alternative: Deploy Backend to Render (Free)

If Netlify Python Functions give issues, deploy Flask to **Render.com** (free):

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Build Command:** `pip install -r requirements.txt && python train_model.py`
   - **Start Command:** `gunicorn app:app`
   - **Environment:** Python 3
4. Deploy → get URL like `https://fake-news-xyz.onrender.com`
5. Update `main.js` line:
   ```js
   const API_URL = IS_NETLIFY
     ? 'https://fake-news-xyz.onrender.com/predict'
     : '/predict';
   ```
6. Keep index.html on Netlify (static hosting) — it calls Render for predictions

---

## 🔗 How All Files Connect

```
train_model.py          trains model → saves model/*.pkl
      │
      ▼
model/                  pkl files loaded by both:
  ├── fake_news_model.pkl   → app.py (local Flask)
  ├── tfidf_vectorizer.pkl  → netlify/functions/api.py (Netlify)
  └── metadata.json

index.html              served as static file by Netlify
      │ fetch POST /predict
      ▼
netlify/functions/api.py  ← serverless function (loads pkl, predicts)
      │
      ▼
JSON response → main.js renders result in browser
```

---

## 📊 Expected Performance (Kaggle Dataset)

| Metric | Value |
|---|---|
| Training articles | 44,000+ |
| Test accuracy | 98.7–99.1% |
| F1 Score (Fake) | 0.99 |
| F1 Score (Real) | 0.99 |
| Inference time | < 50ms |
| Model file size | ~15 MB |
