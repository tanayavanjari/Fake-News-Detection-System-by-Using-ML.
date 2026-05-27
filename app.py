"""
app.py  —  Fake News Detection System · Flask Backend
======================================================
Run locally:   python app.py
Deploy:        Netlify Functions (see netlify/functions/api.py)

Routes
------
GET  /          → index.html (main web interface)
POST /predict   → JSON prediction  { text: "..." }
GET  /health    → JSON health check
"""

import os, re, json

from flask import Flask, render_template, request, jsonify
import joblib
import nltk
nltk.download('stopwords', quiet=True)
from nltk.corpus import stopwords

# ─── Setup ───────────────────────────────────────────────────────────────────
STOP_WORDS = set(stopwords.words('english'))
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR  = os.path.join(BASE_DIR, 'model')

app = Flask(__name__, template_folder='templates', static_folder='static')

# ─── Load artefacts at startup ───────────────────────────────────────────────
try:
    model      = joblib.load(os.path.join(MODEL_DIR, 'fake_news_model.pkl'))
    vectorizer = joblib.load(os.path.join(MODEL_DIR, 'tfidf_vectorizer.pkl'))
    with open(os.path.join(MODEL_DIR, 'metadata.json')) as f:
        metadata = json.load(f)
    print(f"✅  Model loaded  →  {metadata['model_name']}  ({metadata['accuracy']}% acc.)")
except FileNotFoundError as e:
    raise SystemExit(
        f"\n❌  {e}\n"
        "   Run  python train_model.py  first to generate model files.\n"
    )

# ─── Text cleaning (must match train_model.py exactly) ───────────────────────
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ''
    text = text.lower()
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return ' '.join(t for t in text.split() if t not in STOP_WORDS and len(t) > 2)

# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route('/')
def home():
    return render_template('index.html', metadata=metadata)


@app.route('/predict', methods=['POST'])
def predict():
    """
    Accepts  POST  { "text": "article text here" }
    Returns  JSON  { prediction, label, confidence, fake_prob, real_prob, word_count }
    """
    data = request.get_json(force=True, silent=True) or {}
    text = data.get('text', '').strip()

    if not text:
        return jsonify({'error': 'Please provide some text.'}), 400
    if len(text.split()) < 3:
        return jsonify({'error': 'Text too short — enter at least one sentence.'}), 400

    cleaned  = clean_text(text)
    if not cleaned:
        return jsonify({'error': 'No usable words found after cleaning.'}), 400

    features   = vectorizer.transform([cleaned])
    pred_label = int(model.predict(features)[0])

    if hasattr(model, 'predict_proba'):
        proba      = model.predict_proba(features)[0]
        fake_prob  = round(float(proba[0]) * 100, 1)
        real_prob  = round(float(proba[1]) * 100, 1)
        confidence = round(float(max(proba)) * 100, 1)
    else:
        # Fallback for models without probability (e.g. PAC)
        fake_prob  = 0.0   if pred_label == 1 else 100.0
        real_prob  = 100.0 if pred_label == 1 else 0.0
        confidence = 100.0

    return jsonify({
        'prediction' : 'REAL' if pred_label == 1 else 'FAKE',
        'label'      : pred_label,
        'confidence' : confidence,
        'fake_prob'  : fake_prob,
        'real_prob'  : real_prob,
        'word_count' : len(text.split()),
    })


@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'model': metadata['model_name'],
                    'accuracy': metadata['accuracy']})


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n🚀  Fake News Detector running →  http://127.0.0.1:{port}\n")
    app.run(debug=True, host='0.0.0.0', port=port)
