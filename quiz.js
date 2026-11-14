/* All MCQ 360 — shared quiz logic. Reads window.QUESTIONS set by the page's tiny inline script.
   Pagination: shows 30 questions at a time ("Show more" reveals the next 30).
   Levels: questions are ordered Basic -> Intermediate -> Advanced; level buttons jump to a level. */
(function () {
  var QUESTIONS = window.QUESTIONS;
  if (!QUESTIONS || !QUESTIONS.length) return;
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var TOTAL = QUESTIONS.length;
  var PAGE = 30;
  var shown = Math.min(PAGE, TOTAL);
  var answered = 0, correct = 0;
  if ("scrollRestoration" in history) { try { history.scrollRestoration = "manual"; } catch (e) {} }
  var quizEl = document.getElementById("quiz");
  if (!quizEl) return;
  var LEVEL_LABEL = { basic: "Basic", intermediate: "Intermediate", advanced: "Advanced" };
  function levelOf(item) { return (item.level === "intermediate" || item.level === "advanced") ? item.level : "basic"; }
  QUESTIONS.forEach(function (item, i) {
    var lv = levelOf(item);
    var card = document.createElement("div");
    card.className = "qcard" + (i >= shown ? " hidden" : "");
    card.setAttribute("data-level", lv);
    var html = '<span class="qnum">Q' + (i + 1) + '</span> <span class="lv lv-' + lv + '">' + LEVEL_LABEL[lv] + '</span><h2>' + esc(item.q) + '</h2>';
    item.opts.forEach(function (opt, j) {
      html += '<button class="opt" data-q="' + i + '" data-o="' + j + '">' + esc(opt) + '</button>';
    });
    html += '<div class="explain" id="ex-' + i + '"><b>Explanation:</b> ' + esc(item.why) + '</div>';
    card.innerHTML = html;
    quizEl.appendChild(card);
  });
  var cards = quizEl.querySelectorAll(".qcard");
  var moreBtn = document.getElementById("showMore");
  function updateMoreBtn() {
    if (!moreBtn) return;
    if (shown >= TOTAL) { moreBtn.style.display = "none"; return; }
    moreBtn.style.display = "";
    var left = TOTAL - shown;
    moreBtn.textContent = "Show more (" + Math.min(PAGE, left) + " more)";
  }
  function revealUpTo(n) {
    n = Math.min(n, TOTAL);
    for (var k = shown; k < n; k++) cards[k].classList.remove("hidden");
    shown = n;
    updateMoreBtn();
  }
  if (moreBtn) {
    moreBtn.addEventListener("click", function () { revealUpTo(shown + PAGE); });
  }
  updateMoreBtn();
  /* Level buttons: jump to the first question of that level, revealing enough questions first. */
  var levelCounts = { basic: 0, intermediate: 0, advanced: 0 };
  QUESTIONS.forEach(function (item) { levelCounts[levelOf(item)]++; });
  document.querySelectorAll(".lv-btn").forEach(function (btn) {
    var lv = btn.getAttribute("data-level");
    if (!levelCounts[lv]) { btn.style.display = "none"; return; }
    btn.addEventListener("click", function () {
      var idx = -1;
      for (var i = 0; i < TOTAL; i++) { if (levelOf(QUESTIONS[i]) === lv) { idx = i; break; } }
      if (idx < 0) return;
      revealUpTo(Math.ceil((idx + 1) / PAGE) * PAGE);
      /* Land the question just below the sticky scorebar (~55px) so its top is visible. */
      var y = cards[idx].getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
  /* Try Again: reset in place (no reload, so scroll reliably returns to the top). */
  var tryBtn = document.getElementById("tryAgain");
  if (tryBtn) {
    tryBtn.addEventListener("click", function () {
      answered = 0; correct = 0;
      document.getElementById("done").textContent = "0 / " + TOTAL;
      document.getElementById("score").textContent = "0";
      document.getElementById("result").classList.remove("show");
      for (var i = 0; i < TOTAL; i++) {
        var bts = cards[i].querySelectorAll(".opt");
        bts.forEach(function (b) { b.disabled = false; b.classList.remove("correct", "wrong"); });
        document.getElementById("ex-" + i).classList.remove("show");
        if (i >= PAGE) cards[i].classList.add("hidden");
      }
      shown = Math.min(PAGE, TOTAL);
      updateMoreBtn();
      window.scrollTo(0, 0);
    });
  }
  quizEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".opt");
    if (!btn || btn.disabled) return;
    var qi = +btn.getAttribute("data-q"), oi = +btn.getAttribute("data-o");
    var item = QUESTIONS[qi];
    var card = btn.parentElement;
    var buttons = card.querySelectorAll(".opt");
    buttons.forEach(function (b) { b.disabled = true; });
    if (oi === item.ans) { btn.classList.add("correct"); correct++; }
    else { btn.classList.add("wrong"); buttons[item.ans].classList.add("correct"); }
    document.getElementById("ex-" + qi).classList.add("show");
    answered++;
    document.getElementById("done").textContent = answered + " / " + TOTAL;
    document.getElementById("score").textContent = correct;
    if (answered === TOTAL) {
      var r = document.getElementById("result");
      document.getElementById("resultTitle").textContent = "You scored " + correct + " / " + TOTAL;
      var pct = Math.round(correct / TOTAL * 100);
      document.getElementById("resultText").textContent = pct >= 80 ? "Excellent! You are ready for the next set." : pct >= 50 ? "Good start — read the explanations and try again." : "Keep practising — read each explanation, then retry.";
      r.classList.add("show");
      r.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
})();
