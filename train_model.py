"""
train_model.py
==============
Run this script ONCE locally before deploying to Netlify.
It trains the fake news classifier and saves:
  - model/fake_news_model.pkl
  - model/tfidf_vectorizer.pkl
  - model/metadata.json

Usage:
    python train_model.py
"""

import os, json, re, time
import numpy  as np
import pandas as pd
import joblib
import nltk
nltk.download('stopwords', quiet=True)
from nltk.corpus import stopwords
from sklearn.model_selection          import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model             import LogisticRegression, PassiveAggressiveClassifier
from sklearn.naive_bayes              import MultinomialNB
from sklearn.ensemble                 import RandomForestClassifier
from sklearn.metrics                  import accuracy_score, classification_report

STOP_WORDS = set(stopwords.words('english'))
os.makedirs('model', exist_ok=True)

print("=" * 55)
print("  FAKE NEWS DETECTION — MODEL TRAINING")
print("=" * 55)

# ─── STEP 1: Load Dataset ───────────────────────────────────────
print("\n[1/5] Loading dataset …")

if os.path.exists('Fake.csv') and os.path.exists('True.csv'):
    fake_df = pd.read_csv('Fake.csv')
    true_df = pd.read_csv('True.csv')
    print(f"      Loaded Fake.csv ({len(fake_df):,}) and True.csv ({len(true_df):,})")
else:
    print("      Fake.csv / True.csv not found — generating demo data (500 each)")
    rng = np.random.default_rng(42)

    FAKE_TEMPLATES = [
        "SHOCKING: {topic} discovered to be a government conspiracy!",
        "EXCLUSIVE: Secret documents reveal {topic} cover-up exposed!",
        "BREAKING: Scientists BANNED from revealing the truth about {topic}!",
        "Wake up! The mainstream media is hiding the truth about {topic}",
        "They don't want you to know about {topic} — share before deleted!",
        "BOMBSHELL: Deep state operatives caught manipulating {topic}",
        "Whistleblower reveals massive fraud in {topic} industry",
        "New leaked documents expose {topic} deception by elites",
        "The real reason they are afraid of the truth about {topic}",
        "ALERT: Major scandal involving {topic} suppressed by media",
    ]
    REAL_TEMPLATES = [
        "Federal officials release new report on {topic} policy changes",
        "Study published in peer-reviewed journal examines {topic} outcomes",
        "Government announces updated regulations concerning {topic}",
        "Experts weigh in on the implications of recent {topic} developments",
        "New research sheds light on the long-term effects of {topic}",
        "Officials confirm measures taken to address {topic} challenges",
        "Survey finds majority of citizens support reform in {topic} sector",
        "Report outlines economic impact of changes to {topic} framework",
        "Panel of researchers releases findings on {topic} trends",
        "Authorities respond to growing concerns about {topic} safety",
    ]
    TOPICS = ["healthcare", "climate policy", "technology", "finance",
              "education", "immigration", "trade agreements", "public safety"]

    n = 500
    fake_rows = [{"title": FAKE_TEMPLATES[i % 10].format(topic=TOPICS[i % 8]),
                  "text": ("This is a completely fabricated story shared widely on social media. "
                           "No credible sources have confirmed any part of this claim. "
                           "The article uses emotionally charged language designed to provoke outrage. "
                           f"Article index {i}. Share before they delete it! Wake up sheeple!"),
                  "subject": "politicsNews", "date": "2024-01-01"} for i in range(n)]
    real_rows = [{"title": REAL_TEMPLATES[i % 10].format(topic=TOPICS[i % 8]),
                  "text": ("According to official reports and expert analysis, new developments have "
                           "prompted a review of existing policies. Authorities have confirmed the "
                           "findings after thorough investigation. A full report is available on the "
                           f"official government website. Article index {i}."),
                  "subject": "worldnews", "date": "2024-01-01"} for i in range(n)]

    fake_df = pd.DataFrame(fake_rows)
    true_df = pd.DataFrame(real_rows)

fake_df['label'] = 0
true_df['label'] = 1
df = pd.concat([fake_df, true_df], ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
print(f"      Total: {len(df):,}  |  Fake: {(df.label==0).sum():,}  |  Real: {(df.label==1).sum():,}")

# ─── STEP 2: Clean Text ─────────────────────────────────────────
print("\n[2/5] Cleaning text …")

def clean_text(text):
    if not isinstance(text, str): return ''
    text = text.lower()
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return ' '.join(t for t in text.split() if t not in STOP_WORDS and len(t) > 2)

df['combined']   = df['title'].fillna('') + ' ' + df['text'].fillna('')
df['clean_text'] = df['combined'].apply(clean_text)
df = df[df['clean_text'].str.strip() != ''].reset_index(drop=True)
print(f"      Records after cleaning: {len(df):,}")

# ─── STEP 3: TF-IDF Features ────────────────────────────────────
print("\n[3/5] Vectorising with TF-IDF …")
X, y = df['clean_text'], df['label']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y)

tfidf = TfidfVectorizer(max_features=50_000, ngram_range=(1, 2),
                        min_df=2, sublinear_tf=True)
X_tr = tfidf.fit_transform(X_train)
X_te = tfidf.transform(X_test)
print(f"      Train: {X_tr.shape[0]:,} | Test: {X_te.shape[0]:,} | Features: {X_tr.shape[1]:,}")

# ─── STEP 4: Train & Evaluate ───────────────────────────────────
print("\n[4/5] Training classifiers …")
MODELS = {
    'Logistic Regression':            LogisticRegression(max_iter=1000, C=1.0, random_state=42),
    'Passive Aggressive Classifier':  PassiveAggressiveClassifier(max_iter=1000, random_state=42),
    'Multinomial Naive Bayes':        MultinomialNB(alpha=0.1),
    'Random Forest':                  RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=42),
}
results = {}
for name, m in MODELS.items():
    t0 = time.time()
    m.fit(X_tr, y_train)
    preds = m.predict(X_te)
    acc   = accuracy_score(y_test, preds)
    results[name] = {'model': m, 'acc': acc, 'preds': preds, 't': time.time()-t0}
    print(f"      {name:<38} {acc*100:.2f}%  ({time.time()-t0:.1f}s)")

best_name = max(results, key=lambda n: results[n]['acc'])
best      = results[best_name]
print(f"\n      🏆 Best: {best_name} ({best['acc']*100:.2f}%)")
print(classification_report(y_test, best['preds'], target_names=['Fake','Real']))

# ─── STEP 5: Save Artefacts ─────────────────────────────────────
print("[5/5] Saving artefacts …")
joblib.dump(best['model'], 'model/fake_news_model.pkl')
joblib.dump(tfidf,         'model/tfidf_vectorizer.pkl')
meta = {
    'model_name': best_name,
    'accuracy':   round(best['acc'] * 100, 2),
    'features':   int(X_tr.shape[1]),
    'train_size': int(X_tr.shape[0]),
    'test_size':  int(X_te.shape[0]),
}
with open('model/metadata.json', 'w') as f:
    json.dump(meta, f, indent=4)

print("      model/fake_news_model.pkl   ✅")
print("      model/tfidf_vectorizer.pkl  ✅")
print("      model/metadata.json         ✅")
print("\n" + "="*55)
print("  Training complete!  Now run:  python app.py")
print("  Then deploy to Netlify with:  netlify deploy")
print("="*55)
