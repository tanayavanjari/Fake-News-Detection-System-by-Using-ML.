/**
 * main.js — FakeGuard AI Frontend Logic
 * =======================================
 * Handles:
 *  - Calling the Netlify Function API  /.netlify/functions/api/predict
 *  - Falling back to Flask             /predict  (local dev)
 *  - Rendering results, bars, meta
 *  - Word count, sample loading, toast
 */

// ─── API endpoint detection ───────────────────────────────────────────────────
// On Netlify → use the serverless function endpoint
// Locally     → use Flask directly on /predict
const IS_NETLIFY = window.location.hostname !== '127.0.0.1'
                && window.location.hostname !== 'localhost';

const API_URL = IS_NETLIFY
  ? '/.netlify/functions/api/predict'
  : '/predict';

console.log(`[FakeGuard] API endpoint: ${API_URL}`);

// ─── DOM refs ────────────────────────────────────────────────────────────────
const newsInput  = document.getElementById('newsInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const btnText    = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const clearBtn   = document.getElementById('clearBtn');
const charCount  = document.getElementById('charCount');
const resultBox  = document.getElementById('resultBox');
const toast      = document.getElementById('toast');

// ─── Word count updater ──────────────────────────────────────────────────────
newsInput.addEventListener('input', () => {
  const words = newsInput.value.trim().split(/\s+/).filter(Boolean).length;
  charCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
});

// ─── Keyboard shortcut: Ctrl+Enter / Cmd+Enter ───────────────────────────────
newsInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze();
});

// ─── Main analyze function ───────────────────────────────────────────────────
async function analyze() {
  const text = newsInput.value.trim();

  if (!text) {
    showToast('⚠️ Please enter some text first.');
    return;
  }
  if (text.split(/\s+/).length < 3) {
    showToast('⚠️ Please enter at least one full sentence.');
    return;
  }

  setLoading(true);
  resultBox.classList.add('hidden');

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      showToast(`❌ ${data.error || 'Server error. Please try again.'}`);
      return;
    }

    renderResult(data);

  } catch (err) {
    console.error('Fetch error:', err);
    showToast('❌ Could not reach the server. Is it running?');
  } finally {
    setLoading(false);
  }
}

// ─── Render result ───────────────────────────────────────────────────────────
function renderResult(d) {
  const isFake = d.prediction === 'FAKE';

  // Box class
  resultBox.className = 'result-box ' + (isFake ? 'is-fake' : 'is-real');

  // Verdict
  document.getElementById('verdictIcon').textContent = isFake ? '🚫' : '✅';
  const vt = document.getElementById('verdictText');
  vt.textContent  = isFake ? 'FAKE NEWS' : 'REAL NEWS';
  vt.className    = 'verdict-text ' + (isFake ? 'fake' : 'real');
  document.getElementById('verdictSub').textContent = isFake
    ? 'This article matches patterns commonly found in misinformation.'
    : 'This article matches patterns consistent with credible reporting.';

  // Probability bars (animate after brief delay for CSS transition)
  document.getElementById('fakeBar').style.width = '0%';
  document.getElementById('realBar').style.width = '0%';

  setTimeout(() => {
    document.getElementById('fakeBar').style.width = d.fake_prob + '%';
    document.getElementById('realBar').style.width = d.real_prob + '%';
  }, 50);

  document.getElementById('fakePct').textContent = d.fake_prob + '%';
  document.getElementById('realPct').textContent = d.real_prob + '%';

  // Meta pills
  document.getElementById('metaWords').textContent = `📝 Words: ${d.word_count}`;
  document.getElementById('metaConf').textContent  = `🎯 Confidence: ${d.confidence}%`;

  // Show
  resultBox.classList.remove('hidden');

  // Smooth scroll to result on mobile
  if (window.innerWidth < 768) {
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled     = on;
  btnText.classList.toggle('hidden', on);
  btnSpinner.classList.toggle('hidden', !on);
}

function clearAll() {
  newsInput.value = '';
  charCount.textContent = '0 words';
  resultBox.classList.add('hidden');
  newsInput.focus();
}

function loadSample(el) {
  const p = el.querySelector('p');
  if (!p) return;
  newsInput.value = p.textContent.trim();
  newsInput.dispatchEvent(new Event('input'));
  newsInput.focus();
  // Scroll to detector
  document.getElementById('detector').scrollIntoView({ behavior: 'smooth' });
}

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ─── Fetch and display live model metadata ────────────────────────────────────
(async function loadMetadata() {
  try {
    const healthUrl = IS_NETLIFY ? '/.netlify/functions/api' : '/health';
    const res  = await fetch(healthUrl);
    const data = await res.json();
    if (data.accuracy) {
      const el = document.getElementById('statAcc');
      if (el) el.textContent = data.accuracy + '%';
    }
    if (data.model) {
      const el = document.getElementById('metaModel');
      if (el) el.textContent = 'Model: ' + data.model.split(' ').slice(0, 2).join(' ');
    }
  } catch (_) {
    // Silently fail — static fallback values are already in HTML
  }
})();
