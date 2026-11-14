/* All MCQ 360 — homepage progress. Reads each subject's saved practice
   progress (mcq360-progress-<slug>) and shows "Answered X/N" on its card.
   Totals come from the card's own count pill, never a hardcoded number. */
(function () {
  var cards = document.querySelectorAll("#subjects .card");
  if (!cards.length) return;
  cards.forEach(function (card) {
    var slug = card.getAttribute("data-subject");
    var countEl = card.querySelector(".count");
    var progEl = card.querySelector(".prog");
    if (!slug || !progEl) return;
    var total = 0;
    if (countEl) {
      var m = /([\d,]+)/.exec(countEl.textContent || "");
      if (m) total = parseInt(m[1].replace(/,/g, ""), 10) || 0;
    }
    var n = 0;
    try {
      var raw = localStorage.getItem("mcq360-progress-" + slug);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.ans) n = Object.keys(p.ans).length;
      }
    } catch (e) {}
    if (n > 0 && total > 0) {
      progEl.textContent = "Answered " + n + "/" + total;
      progEl.classList.add("show");
    }
  });
})();
