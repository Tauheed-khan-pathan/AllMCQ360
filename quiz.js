/* All MCQ 360 — shared quiz logic. Reads window.QUESTIONS set by the page's tiny inline script. */
(function () {
  var QUESTIONS = window.QUESTIONS;
  if (!QUESTIONS || !QUESTIONS.length) return;
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var TOTAL = QUESTIONS.length;
  var answered = 0, correct = 0;
  var quizEl = document.getElementById("quiz");
  if (!quizEl) return;
  QUESTIONS.forEach(function (item, i) {
    var card = document.createElement("div");
    card.className = "qcard";
    var html = '<span class="qnum">Q' + (i + 1) + ' of ' + TOTAL + '</span><h2>' + esc(item.q) + '</h2>';
    item.opts.forEach(function (opt, j) {
      html += '<button class="opt" data-q="' + i + '" data-o="' + j + '">' + esc(opt) + '</button>';
    });
    html += '<div class="explain" id="ex-' + i + '"><b>Explanation:</b> ' + esc(item.why) + '</div>';
    card.innerHTML = html;
    quizEl.appendChild(card);
  });
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
