/* =============================================================================
   static/script.js  —  TruthLens Fake News Detector
   -----------------------------------------------------------------------------
   WORKS 100% IN THE BROWSER — No Flask, no backend, no API keys needed.
   Uses linguistic pattern scoring to classify news as REAL or FAKE.
   ============================================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM refs ────────────────────────────────────────────────────────────── */
  var newsInput     = document.getElementById('newsInput');
  var analyseBtn    = document.getElementById('analyseBtn');
  var btnText       = document.getElementById('btnText');
  var btnLoader     = document.getElementById('btnLoader');
  var resultSection = document.getElementById('resultSection');
  var errorBox      = document.getElementById('errorBox');
  var charCount     = document.getElementById('char-count');
  var clearBtn      = document.getElementById('clearBtn');
  var verdictIcon   = document.getElementById('verdictIcon');
  var verdictLabel  = document.getElementById('verdictLabel');
  var verdictSub    = document.getElementById('verdictSub');
  var confidenceVal = document.getElementById('confidenceValue');
  var progressBar   = document.getElementById('progressBar');
  var realProbEl    = document.getElementById('realProb');
  var fakeProbEl    = document.getElementById('fakeProb');
  var modelNameEl   = document.getElementById('modelName');

  /* Safety guard */
  if (!newsInput || !analyseBtn || !resultSection || !errorBox) {
    console.error('[TruthLens] Critical DOM elements missing. Check HTML IDs.');
    return;
  }

  /* ── Character counter ───────────────────────────────────────────────────── */
  newsInput.addEventListener('input', function () {
    var len = newsInput.value.length;
    if (charCount) {
      charCount.textContent = len.toLocaleString() + ' character' + (len !== 1 ? 's' : '');
      if (len > 50000) { charCount.classList.add('warn'); }
      else             { charCount.classList.remove('warn'); }
    }
  });

  /* Ctrl+Enter / Cmd+Enter shortcut */
  newsInput.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { analyseNews(); }
  });

  /* ── Button listeners ────────────────────────────────────────────────────── */
  analyseBtn.addEventListener('click', analyseNews);
  if (clearBtn) clearBtn.addEventListener('click', clearInput);

  /* ── AI Analysis Engine ──────────────────────────────────────────────────── */
  function runAIAnalysis(text) {
    var wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    /* FAKE signal scores */
    var capWords         = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
    var excessPunct      = (text.match(/[!?]{2,}/g) || []).length;

    var fakeSensational  = /shocking|bombshell|explosive|outrage|scandalous|unbelievable|jaw.?drop|mind.?blow|you won.t believe|insane|terrifying|devastating|catastrophic/i.test(text) ? 15 : 0;
    var fakeConspiracy   = /they don.t want you|wake up|share before|they.re hiding|cover.?up|deep state|mainstream media won.t|the truth about|new world order|illuminati|false flag|crisis actor|plandemic|microchip|5g tower|mind control|chemtrail|population control/i.test(text) ? 22 : 0;
    var fakeUrgent       = /share (this|now|before)|repost|spread the word|goes viral|before they delete|they.re censoring|banned video|forward this|must watch|must read/i.test(text) ? 13 : 0;
    var fakeVagueSrc     = /sources say|anonymous source|insiders claim|according to some|many people are saying|rumou?r has it|people are saying|i heard that|word is that/i.test(text) ? 11 : 0;
    var fakePseudo       = /miracle cure|doctors hate|big pharma|they.re suppressing|100% natural|remove toxins|detox|holistic cure|essential oil|suppress the cure|natural remedy cures/i.test(text) ? 14 : 0;
    var fakeFear         = /destroy (america|democracy|freedom|the country)|end of (democracy|freedom|the world)|invasion|great replacement|martial law|overthrow|communist takeover|socialist agenda/i.test(text) ? 17 : 0;
    var fakeClickbait    = /click here|read more at|subscribe now|donate now/i.test(text) ? 6 : 0;

    var fakeScore = (capWords * 4) + (excessPunct * 9) + fakeSensational +
                    fakeConspiracy + fakeUrgent + fakeVagueSrc +
                    fakePseudo + fakeFear + fakeClickbait;

    /* REAL signal scores */
    var statsCount       = (text.match(/\d+(\.\d+)?%/g) || []).length;

    var realNamedSrc     = /according to (the |a )?(reuters|associated press|ap news|bbc|cnn|new york times|nyt|washington post|bloomberg|the guardian|the times|financial times|npr|abc news|nbc news|cbs news|who|world health organization|cdc|fbi|cia|nasa|united nations|european union|world bank|imf|study|research|report|survey)/i.test(text) ? 20 : 0;
    var realFormalVerbs  = /announced|confirmed|published|released|reported|stated|according to|cited|study (shows|found|suggests|indicates)|data shows|survey found|research (shows|found|indicates)|analysis shows|concluded|demonstrated|established/i.test(text) ? 13 : 0;
    var realInstitution  = /university|institute|institution|department|ministry|committee|congress|senate|parliament|supreme court|court of appeals|tribunal|federal reserve|treasury|world health|european commission|united nations/i.test(text) ? 9 : 0;
    var realDate         = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{4})\b/i.test(text) ? 7 : 0;
    var realTitledPerson = /\b(president|prime minister|secretary|minister|senator|congressman|governor|mayor|chancellor|ceo|chief executive|director|commissioner|dr\.|prof\.|professor|judge|justice)\s+[A-Z][a-z]+/i.test(text) ? 9 : 0;
    var realPeerReview   = /peer.?review|clinical trial|double.?blind|published in (nature|science|the lancet|nejm|jama|cell|pnas)|meta.?analysis|systematic review|randomized controlled/i.test(text) ? 15 : 0;

    var realScore = realNamedSrc + (statsCount * 7) + realFormalVerbs +
                    realInstitution + realDate + realTitledPerson + realPeerReview;

    /* Baseline so neither score is 0 */
    fakeScore = Math.max(fakeScore, 5);
    realScore = Math.max(realScore, 5);

    var total      = fakeScore + realScore;
    var fakeProb   = Math.min(95, Math.max(5, Math.round((fakeScore / total) * 100)));
    var realProb   = 100 - fakeProb;
    var prediction = fakeProb >= 50 ? 'FAKE' : 'REAL';
    var confidence = Math.min(97, Math.max(55, Math.round(Math.abs(fakeProb - 50) * 1.8 + 55)));

    return {
      label      : prediction,
      confidence : confidence,
      real_prob  : realProb,
      fake_prob  : fakeProb,
      model_type : 'LinguisticPatternAI',
      word_count : wordCount
    };
  }

  /* ── analyseNews() ───────────────────────────────────────────────────────── */
  function analyseNews() {
    var text = newsInput.value.trim();

    if (!text) {
      showError('Please paste a news article or headline before clicking Analyse.');
      newsInput.focus();
      return;
    }
    if (text.length < 20) {
      showError('Text is too short. Please paste at least a full sentence or headline.');
      newsInput.focus();
      return;
    }

    setLoading(true);
    hideResult();
    hideError();

    /* setTimeout lets the spinner render before heavy computation */
    setTimeout(function () {
      try {
        var result = runAIAnalysis(text);
        renderResult(result);
      } catch (err) {
        console.error('[TruthLens] Analysis error:', err);
        showError('Analysis failed unexpectedly. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  /* ── clearInput() ────────────────────────────────────────────────────────── */
  function clearInput() {
    newsInput.value = '';
    if (charCount) {
      charCount.textContent = '0 characters';
      charCount.classList.remove('warn');
    }
    hideResult();
    hideError();
    newsInput.focus();
  }

  /* ── renderResult() ──────────────────────────────────────────────────────── */
  function renderResult(data) {
    var isReal = data.label === 'REAL';

    if (verdictIcon) {
      verdictIcon.textContent = isReal ? '✅' : '🚫';
      verdictIcon.className   = 'verdict-icon ' + (isReal ? 'real' : 'fake');
    }
    if (verdictLabel) {
      verdictLabel.textContent = isReal ? 'Real News' : 'Fake News';
      verdictLabel.className   = 'verdict-label ' + (isReal ? 'real' : 'fake');
    }
    if (verdictSub) {
      verdictSub.textContent = isReal
        ? 'This article appears to be credible based on its language patterns.'
        : 'This article shows linguistic patterns commonly associated with misinformation.';
    }
    if (confidenceVal) confidenceVal.textContent = data.confidence + '%';

    if (progressBar) {
      progressBar.style.width      = '0%';
      progressBar.style.transition = 'none';
      progressBar.className        = 'progress-bar ' + (isReal ? 'real' : 'fake');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          progressBar.style.transition = '';
          progressBar.style.width      = data.confidence + '%';
        });
      });
    }

    if (realProbEl) realProbEl.textContent = data.real_prob + '%';
    if (fakeProbEl) fakeProbEl.textContent = data.fake_prob + '%';
    if (modelNameEl) modelNameEl.textContent = 'Linguistic Pattern AI';

    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── UI helpers ──────────────────────────────────────────────────────────── */
  function setLoading(isLoading) {
    analyseBtn.disabled  = isLoading;
    newsInput.disabled   = isLoading;
    if (btnText)   btnText.hidden   = isLoading;
    if (btnLoader) btnLoader.hidden = !isLoading;
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = '⚠️  ' + message;
    errorBox.hidden      = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.hidden      = true;
    errorBox.textContent = '';
  }

  function hideResult() {
    resultSection.hidden = true;
    if (progressBar) {
      progressBar.style.transition = 'none';
      progressBar.style.width      = '0%';
      requestAnimationFrame(function () {
        if (progressBar) progressBar.style.transition = '';
      });
    }
  }

  /* Expose globally so onclick="analyseNews()" in HTML still works */
  window.analyseNews = analyseNews;
  window.clearInput  = clearInput;

}); /* end DOMContentLoaded */
