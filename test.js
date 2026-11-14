/* All MCQ 360 — Timed Test Mode (subject pages).
   "Take a test" (whole subject) or "▶ Test" on a sub-category card:
   20 random questions from that scope (fewer if the scope is smaller),
   1 minute per question on the countdown, question palette, submit ->
   result screen with score + per-question review (correct / wrong /
   skipped + explanations). Test answers never touch practice progress.
   Exposes window.__mcq360_startTest(subName|null). */
(function () {
  var QUESTIONS = window.QUESTIONS;
  if (!QUESTIONS || !QUESTIONS.length) return;
  var overlay = document.getElementById("testOverlay");
  if (!overlay) return;
  var titleEl = document.getElementById("testTitle");
  var timerEl = document.getElementById("testTimer");
  var paletteEl = document.getElementById("testPalette");
  var qEl = document.getElementById("testQ");
  var prevBtn = document.getElementById("testPrev");
  var nextBtn = document.getElementById("testNext");
  var submitBtn = document.getElementById("testSubmit");
  var confirmBox = document.getElementById("testConfirm");
  var confirmText = document.getElementById("testConfirmText");
  var confirmYes = document.getElementById("testConfirmYes");
  var confirmNo = document.getElementById("testConfirmNo");
  var resultEl = document.getElementById("testResult");
  var closeBtn = document.getElementById("testClose");
  var navEl = document.querySelector(".test-nav");
  var scopeName = "All topics";
  var order = [], cur = 0, picks = {}, timerId = null, remaining = 0, total = 0;
  var subj = "All MCQ 360";
  var crumb = document.querySelector(".crumb b");
  if (crumb) subj = crumb.textContent.trim();

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtTime(s) {
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (ss < 10 ? "0" : "") + ss;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function startTest(sub) {
    scopeName = sub || "All topics";
    var pool = [];
    for (var i = 0; i < QUESTIONS.length; i++) {
      if (!sub || QUESTIONS[i].sub === sub) pool.push(i);
    }
    if (!pool.length) return;
    order = shuffle(pool.slice()).slice(0, Math.min(20, pool.length));
    cur = 0; picks = {};
    total = order.length;
    remaining = total * 60; /* 1 minute per question */
    titleEl.textContent = subj + " — Test: " + scopeName + " (" + total + " questions)";
    resultEl.hidden = true;
    resultEl.innerHTML = "";
    confirmBox.hidden = true;
    if (navEl) navEl.style.display = "";
    if (paletteEl) paletteEl.style.display = "";
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    renderPalette();
    renderQ();
    startTimer();
    overlay.scrollTop = 0;
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }
  function startTimer() {
    stopTimer();
    timerEl.textContent = fmtTime(remaining);
    timerEl.classList.remove("low");
    timerId = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        remaining = 0;
        timerEl.textContent = fmtTime(0);
        submit(true);
        return;
      }
      timerEl.textContent = fmtTime(remaining);
      if (remaining <= 120) timerEl.classList.add("low");
    }, 1000);
  }
  function renderPalette() {
    paletteEl.innerHTML = "";
    order.forEach(function (_, pos) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pal" + (pos === cur ? " current" : "") + (pos in picks ? " done" : "");
      b.textContent = pos + 1;
      b.setAttribute("aria-label", "Question " + (pos + 1));
      b.addEventListener("click", function () { cur = pos; renderPalette(); renderQ(); });
      paletteEl.appendChild(b);
    });
  }
  function renderQ() {
    var qi = order[cur];
    var item = QUESTIONS[qi];
    var html = '<div class="test-qnum">Question ' + (cur + 1) + ' of ' + total + '</div>'
      + '<h3>' + esc(item.q) + '</h3>';
    item.opts.forEach(function (opt, j) {
      html += '<button class="opt test-opt' + (picks[cur] === j ? " picked" : "") + '" data-o="' + j + '">' + esc(opt) + '</button>';
    });
    qEl.innerHTML = html;
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === total - 1;
    submitBtn.style.display = "";
  }
  qEl.addEventListener("click", function (e) {
    var b = e.target.closest(".test-opt");
    if (!b) return;
    picks[cur] = +b.getAttribute("data-o");
    renderPalette();
    renderQ();
  });
  prevBtn.addEventListener("click", function () {
    if (cur > 0) { cur--; renderPalette(); renderQ(); }
  });
  nextBtn.addEventListener("click", function () {
    if (cur < total - 1) { cur++; renderPalette(); renderQ(); }
  });
  function answeredN() { return Object.keys(picks).length; }
  submitBtn.addEventListener("click", function () {
    var left = total - answeredN();
    if (left > 0) {
      confirmText.textContent = "You still have " + left + (left === 1 ? " question" : " questions") + " unanswered. Submit anyway?";
      confirmBox.hidden = false;
    } else {
      submit(false);
    }
  });
  confirmYes.addEventListener("click", function () { submit(false); });
  confirmNo.addEventListener("click", function () { confirmBox.hidden = true; });
  function submit(auto) {
    stopTimer();
    confirmBox.hidden = true;
    var score = 0;
    var rows = [];
    order.forEach(function (qi, pos) {
      var item = QUESTIONS[qi];
      var picked = picks[pos];
      var ok = picked === item.ans;
      if (ok) score++;
      var state = picked == null ? "Skipped" : (ok ? "Correct" : "Wrong");
      rows.push('<div class="review ' + state.toLowerCase() + '">'
        + '<div class="review-head"><b>Q' + (pos + 1) + '</b> <span class="review-badge">' + state + '</span></div>'
        + '<p class="review-q">' + esc(item.q) + '</p>'
        + '<p class="review-a">Your answer: <b>' + (picked == null ? "— skipped —" : esc(item.opts[picked])) + '</b></p>'
        + (ok ? "" : '<p class="review-a">Correct answer: <b>' + esc(item.opts[item.ans]) + '</b></p>')
        + '<p class="review-why">' + esc(item.why) + '</p></div>');
    });
    var pct = Math.round(score / total * 100);
    resultEl.innerHTML = '<h3>' + (auto ? "Time's up! " : "") + 'You scored ' + score + ' / ' + total + ' (' + pct + '%)</h3>'
      + '<p>' + (pct >= 80 ? "Excellent — test-ready." : pct >= 50 ? "Good start — review the explanations below." : "Keep practising — review the explanations below.") + '</p>'
      + '<div class="test-result-actions"><button id="testRetake" type="button">Retake test</button>'
      + '<button id="testBack" type="button">Back to practice</button></div>'
      + rows.join("");
    resultEl.hidden = false;
    if (navEl) navEl.style.display = "none";
    if (paletteEl) paletteEl.style.display = "none";
    qEl.innerHTML = "";
    timerEl.textContent = fmtTime(remaining);
    overlay.scrollTop = 0;
    document.getElementById("testRetake").addEventListener("click", function () { startTest(scopeName === "All topics" ? null : scopeName); });
    document.getElementById("testBack").addEventListener("click", closeTest);
  }
  function closeTest() {
    stopTimer();
    overlay.hidden = true;
    document.body.style.overflow = "";
  }
  closeBtn.addEventListener("click", closeTest);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeTest();
  });
  window.__mcq360_startTest = startTest;
})();
