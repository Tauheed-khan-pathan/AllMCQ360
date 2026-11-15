/* All MCQ 360 — shared quiz logic. Reads window.QUESTIONS + window.SUBS
   set by the page's tiny inline script.
   Pagination: 30 at a time ("Show more" + Prev/Next pages).
   Levels: questions are ordered Basic -> Intermediate -> Advanced inside
   each sub-category; level buttons jump to a level.
   Phase 2: sub-category filter cards, in-subject search, "Show answer"
   reveal (viewed, never scored), bookmarks + Bookmarked filter,
   progress saved per subject (Resume), share (native share sheet first,
   WhatsApp fallback — same as All Naat Lyrics). Sub-card "Take a test"
   starts a real timed test for that sub-category.
   Progress key: mcq360-progress-<slug> {ans:{qi:picked}, bm:[qi], viewed:[qi]} */
(function () {
  var QUESTIONS = window.QUESTIONS;
  if (!QUESTIONS || !QUESTIONS.length) return;
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  var TOTAL = QUESTIONS.length;
  var PAGE = 30;
  var SUBS = window.SUBS || [];
  var SLUG = (function () {
    var m = /subject\/([a-z0-9-]+)\.html/.exec(window.location.pathname || "");
    return m ? m[1] : "subject";
  })();
  var KEY = "mcq360-progress-" + SLUG;
  if ("scrollRestoration" in history) { try { history.scrollRestoration = "manual"; } catch (e) {} }

  /* ---------- saved progress ---------- */
  var store = { ans: {}, bm: [], viewed: [] };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var p = JSON.parse(raw); if (p && typeof p === "object") store = p; }
  } catch (e) {}
  var ansMap = {};
  Object.keys(store.ans || {}).forEach(function (k) { ansMap[+k] = store.ans[k]; });
  var bmSet = {}, viewedSet = {};
  (store.bm || []).forEach(function (i) { bmSet[+i] = true; });
  (store.viewed || []).forEach(function (i) { viewedSet[+i] = true; });
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        ans: ansMap,
        bm: Object.keys(bmSet).map(Number),
        viewed: Object.keys(viewedSet).map(Number)
      }));
    } catch (e) {}
  }
  function answeredCount() { return Object.keys(ansMap).length; }
  function correctCount() {
    var c = 0;
    Object.keys(ansMap).forEach(function (k) { if (ansMap[k] === QUESTIONS[+k].ans) c++; });
    return c;
  }

  var quizEl = document.getElementById("quiz");
  if (!quizEl) return;
  var LEVEL_LABEL = { basic: "Basic", intermediate: "Intermediate", advanced: "Advanced" };
  function levelOf(item) { return (item.level === "intermediate" || item.level === "advanced") ? item.level : "basic"; }
  var haystack = QUESTIONS.map(function (item) {
    return ((item.q || "") + " " + (item.opts || []).join(" ") + " " + (item.why || "") + " " + (item.sub || "")).toLowerCase();
  });

  /* ---------- build cards ---------- */
  QUESTIONS.forEach(function (item, i) {
    var lv = levelOf(item);
    var card = document.createElement("div");
    card.id = "q" + (i + 1);
    card.className = "qcard hidden";
    card.setAttribute("data-level", lv);
    card.setAttribute("data-sub", item.sub || "General");
    var html = '<div class="qcard-head"><a class="qnum lv-' + lv + '" href="#q' + (i + 1) + '">Q' + (i + 1) + ' <span class="lv-word">· ' + LEVEL_LABEL[lv] + '</span></a>'
      + '<span class="qcard-actions">'
      + '<button class="show-ans" type="button" data-q="' + i + '">Show answer</button>'
      + '<button class="bm' + (bmSet[i] ? " on" : "") + '" type="button" data-q="' + i + '" aria-label="Bookmark this question">' + (bmSet[i] ? "★" : "☆") + '</button>'
      + '<button class="share-q" type="button" data-q="' + i + '" aria-label="Share this question">Share</button>'
      + '</span></div>'
      + '<h2>' + esc(item.q) + '</h2>';
    item.opts.forEach(function (opt, j) {
      html += '<button class="opt" data-q="' + i + '" data-o="' + j + '">' + esc(opt) + '</button>';
    });
    html += '<div class="explain" id="ex-' + i + '"><b>Explanation:</b> ' + esc(item.why) + '</div>';
    card.innerHTML = html;
    quizEl.appendChild(card);
  });
  var cards = quizEl.querySelectorAll(".qcard");

  /* ---------- filters + pagination view ---------- */
  var activeSub = null, searchQ = "", bmOnly = false;
  var view = [], shown = Math.min(PAGE, TOTAL);
  function computeView() {
    view = [];
    for (var i = 0; i < TOTAL; i++) {
      if (activeSub && QUESTIONS[i].sub !== activeSub) continue;
      if (bmOnly && !bmSet[i]) continue;
      if (searchQ && haystack[i].indexOf(searchQ) === -1) continue;
      view.push(i);
    }
  }
  var moreBtn = document.getElementById("showMore");
  var prevBtn = document.getElementById("prevPage");
  var nextBtn = document.getElementById("nextPage");
  var pageLabel = document.getElementById("pageLabel");
  var pager = document.getElementById("pager");
  var noMatches = document.getElementById("noMatches");
  var noBookmarks = document.getElementById("noBookmarks");
  var matchInfo = document.getElementById("matchInfo");
  function applyView() {
    computeView();
    if (shown > view.length) shown = view.length;
    var vis = {};
    for (var k = 0; k < shown; k++) vis[view[k]] = true;
    for (var i = 0; i < TOTAL; i++) cards[i].classList.toggle("hidden", !vis[i]);
    var totalPages = Math.max(1, Math.ceil(view.length / PAGE));
    var curPage = view.length ? Math.min(Math.ceil(shown / PAGE) || 1, totalPages) : 0;
    if (pageLabel) pageLabel.textContent = view.length ? ("Page " + curPage + " of " + totalPages) : "No questions";
    if (prevBtn) prevBtn.disabled = curPage <= 1;
    if (nextBtn) nextBtn.disabled = shown >= view.length;
    if (pager) pager.style.display = view.length ? "" : "none";
    if (moreBtn) {
      if (shown >= view.length) { moreBtn.style.display = "none"; }
      else {
        moreBtn.style.display = "";
        moreBtn.textContent = "Show more (" + Math.min(PAGE, view.length - shown) + " more)";
      }
    }
    if (noMatches) noMatches.hidden = !(searchQ && view.length === 0);
    if (noBookmarks) noBookmarks.hidden = !(bmOnly && !searchQ && view.length === 0);
    if (matchInfo) {
      if (searchQ) {
        matchInfo.hidden = false;
        matchInfo.textContent = view.length + (view.length === 1 ? " match" : " matches") + ' for "' + searchQ + '"';
      } else if (activeSub) {
        matchInfo.hidden = false;
        matchInfo.textContent = view.length + " questions in " + activeSub;
      } else if (bmOnly) {
        matchInfo.hidden = false;
        matchInfo.textContent = view.length + (view.length === 1 ? " bookmarked question" : " bookmarked questions");
      } else {
        matchInfo.hidden = true;
      }
    }
  }
  function revealUpTo(n) {
    n = Math.min(n, view.length);
    if (n > shown) { shown = n; applyView(); }
  }
  function clearFilters() {
    var changed = activeSub || searchQ || bmOnly;
    activeSub = null; searchQ = ""; bmOnly = false;
    var si = document.getElementById("qSearch");
    if (si) si.value = "";
    var cs = document.getElementById("clearSearch");
    if (cs) cs.hidden = true;
    var bf = document.getElementById("bmFilter");
    if (bf) { bf.classList.remove("on"); bf.setAttribute("aria-pressed", "false"); bf.textContent = "☆ Bookmarked"; }
    var cl = document.getElementById("clearSub");
    if (cl) cl.hidden = true;
    document.querySelectorAll("#subGrid .sub-card").forEach(function (c) { c.classList.remove("active"); });
    if (changed) { shown = Math.min(PAGE, TOTAL); applyView(); }
  }
  function scrollToCard(idx, instant) {
    var y = cards[idx].getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: y, behavior: instant ? "auto" : "smooth" });
  }
  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      shown = Math.min(view.length, shown + PAGE);
      applyView();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (shown >= view.length) return;
      var firstNew = view[shown];
      shown = Math.min(view.length, shown + PAGE);
      applyView();
      if (firstNew != null) scrollToCard(firstNew, false);
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (shown <= PAGE) return;
      shown = Math.max(PAGE, shown - PAGE);
      applyView();
      var q = document.getElementById("quiz");
      if (q) q.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  applyView(); /* first paint of the list — must run before any deep-link jump */

  /* ---------- sub-category cards ---------- */
  var subGrid = document.getElementById("subGrid");
  var subSec = document.getElementById("subSec");
  if (subGrid && SUBS.length) {
    SUBS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sub-card";
      b.setAttribute("data-sub", s.name);
      b.innerHTML = '<span class="sub-name">' + esc(s.name) + '</span>'
        + '<span class="sub-count">' + s.count + (s.count === 1 ? " question" : " questions") + '</span>'
        + '<span class="sub-test-btn" data-sub="' + esc(s.name) + '">▶ Take a test</span>';
      b.addEventListener("click", function (e) {
        var t = e.target.closest(".sub-test-btn");
        if (t) {
          e.stopPropagation();
          if (window.__mcq360_startTest) window.__mcq360_startTest(t.getAttribute("data-sub"));
          return;
        }
        setActiveSub(activeSub === s.name ? null : s.name);
      });
      subGrid.appendChild(b);
    });
  } else if (subSec) {
    subSec.style.display = "none";
  }
  function setActiveSub(name) {
    activeSub = name;
    searchQ = ""; bmOnly = false;
    var si = document.getElementById("qSearch");
    if (si) si.value = "";
    var cs = document.getElementById("clearSearch");
    if (cs) cs.hidden = true;
    var bf = document.getElementById("bmFilter");
    if (bf) { bf.classList.remove("on"); bf.setAttribute("aria-pressed", "false"); bf.textContent = "☆ Bookmarked"; }
    document.querySelectorAll("#subGrid .sub-card").forEach(function (c) {
      c.classList.toggle("active", !!name && c.getAttribute("data-sub") === name);
    });
    var cl = document.getElementById("clearSub");
    if (cl) cl.hidden = !name;
    shown = Math.min(PAGE, TOTAL);
    applyView();
    var q = document.getElementById("quiz");
    if (q) q.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  var clearSubBtn = document.getElementById("clearSub");
  if (clearSubBtn) clearSubBtn.addEventListener("click", function () { setActiveSub(null); });

  /* ---------- in-subject search ---------- */
  var searchInput = document.getElementById("qSearch");
  var clearSearchBtn = document.getElementById("clearSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchQ = searchInput.value.trim().toLowerCase();
      if (clearSearchBtn) clearSearchBtn.hidden = !searchQ;
      shown = Math.min(PAGE, TOTAL);
      applyView();
    });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      searchQ = "";
      clearSearchBtn.hidden = true;
      shown = Math.min(PAGE, TOTAL);
      applyView();
      if (searchInput) searchInput.focus();
    });
  }

  /* ---------- bookmark filter ---------- */
  var bmFilterBtn = document.getElementById("bmFilter");
  if (bmFilterBtn) {
    bmFilterBtn.addEventListener("click", function () {
      bmOnly = !bmOnly;
      bmFilterBtn.classList.toggle("on", bmOnly);
      bmFilterBtn.setAttribute("aria-pressed", bmOnly ? "true" : "false");
      bmFilterBtn.textContent = bmOnly ? "★ Bookmarked" : "☆ Bookmarked";
      shown = Math.min(PAGE, TOTAL);
      applyView();
    });
  }

  /* ---------- scorebar ---------- */
  function updateScore() {
    document.getElementById("done").textContent = answeredCount() + " / " + TOTAL;
    document.getElementById("score").textContent = correctCount();
  }

  /* ---------- show answer (viewed, never scored) ---------- */
  function setRevealed(i, on) {
    var card = cards[i];
    var btn = card.querySelector(".show-ans");
    var opts = card.querySelectorAll(".opt");
    opts[QUESTIONS[i].ans].classList.toggle("revealed", on);
    document.getElementById("ex-" + i).classList.toggle("show", on);
    if (btn) btn.textContent = on ? "Hide answer" : "Show answer";
    if (on) viewedSet[i] = true; else delete viewedSet[i];
  }

  /* ---------- toast + share (native sheet first, WhatsApp fallback) ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2000);
  }
  /* Same behaviour as the All Naat Lyrics share button: try the system
     share sheet with title + text + link; if the browser has no share
     sheet, open WhatsApp with the same text + link. */
  function shareContent(title, text, url) {
    var data = { title: title, text: text, url: url };
    function viaWhatsApp() {
      window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + url), "_blank");
    }
    if (navigator.share) {
      try {
        navigator.share(data).then(function () { toast("Shared"); }, function (err) {
          if (err && err.name === "AbortError") return; /* user cancelled */
          viaWhatsApp();
        });
      } catch (e) { viaWhatsApp(); }
    } else {
      viaWhatsApp();
    }
  }
  function subjectName() {
    var crumb = document.querySelector(".crumb b");
    return crumb ? crumb.textContent.trim() : "All MCQ 360";
  }
  var shareSubjectBtn = document.getElementById("shareSubjectBtn");
  if (shareSubjectBtn) {
    shareSubjectBtn.addEventListener("click", function () {
      var subj = subjectName();
      shareContent(subj + " MCQs — All MCQ 360",
        "Practice " + subj + " MCQs on All MCQ 360",
        window.location.href.split("#")[0]);
    });
  }
  var testBtn = document.getElementById("testBtn");
  if (testBtn) {
    testBtn.addEventListener("click", function () {
      if (window.__mcq360_startTest) window.__mcq360_startTest(null);
    });
  }

  /* ---------- level buttons ---------- */
  var levelCounts = { basic: 0, intermediate: 0, advanced: 0 };
  QUESTIONS.forEach(function (item) { levelCounts[levelOf(item)]++; });
  document.querySelectorAll(".lv-btn").forEach(function (btn) {
    var lv = btn.getAttribute("data-level");
    if (!levelCounts[lv]) { btn.style.display = "none"; return; }
    btn.addEventListener("click", function () {
      hideDeepLinkLabel();
      clearFilters();
      var idx = -1;
      for (var i = 0; i < TOTAL; i++) { if (levelOf(QUESTIONS[i]) === lv) { idx = i; break; } }
      if (idx < 0) return;
      revealUpTo(Math.ceil((idx + 1) / PAGE) * PAGE);
      scrollToCard(idx, false);
    });
  });

  /* ---------- deep links ---------- */
  var hlTimer = null;
  var dlLabel = null;
  function showDeepLinkLabel(card, n) {
    hideDeepLinkLabel();
    var subj = "All MCQ 360";
    var crumb = document.querySelector(".crumb b");
    if (crumb) subj = crumb.textContent.trim();
    dlLabel = document.createElement("div");
    dlLabel.className = "deeplink-label";
    dlLabel.textContent = subj + " • Q" + n;
    card.insertBefore(dlLabel, card.firstChild);
  }
  function hideDeepLinkLabel() {
    if (dlLabel && dlLabel.parentNode) dlLabel.parentNode.removeChild(dlLabel);
    dlLabel = null;
  }
  function goToQuestion(n, highlight, instant) {
    if (!n || n < 1 || n > TOTAL) return false;
    var idx = n - 1;
    clearFilters();
    revealUpTo(Math.ceil((idx + 1) / PAGE) * PAGE);
    var card = cards[idx];
    scrollToCard(idx, instant);
    if (highlight) {
      card.classList.remove("deeplink");
      void card.offsetWidth;
      card.classList.add("deeplink");
      showDeepLinkLabel(card, n);
      if (hlTimer) clearTimeout(hlTimer);
      hlTimer = setTimeout(function () { card.classList.remove("deeplink"); }, 2800);
    }
    return true;
  }
  function hashQuestion() {
    var m = /^#q(\d+)$/.exec(window.location.hash || "");
    return m ? parseInt(m[1], 10) : 0;
  }
  /* Hash changes (back/forward, pasted #qN on the same page) land INSTANTLY
     like a fresh load: a smooth scroll over tens of thousands of px takes
     ~1.7s to converge and any mid-flight read looks wrong. Qn clicks and
     level jumps keep smooth scrolling (short distances). */
  window.addEventListener("hashchange", function () { goToQuestion(hashQuestion(), true, true); });
  var userScrolled = false;
  function markUserScroll() { userScrolled = true; }
  window.addEventListener("wheel", markUserScroll, { passive: true });
  window.addEventListener("touchmove", markUserScroll, { passive: true });
  var dlTarget = hashQuestion();
  if (dlTarget) { try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {} }
  goToQuestion(dlTarget, true, true);
  window.addEventListener("load", function () {
    if (!userScrolled) goToQuestion(dlTarget, true, true);
    if (dlTarget) { setTimeout(function () { try { history.replaceState(null, "", "#q" + dlTarget); } catch (e) {} }, 900); }
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (!userScrolled) goToQuestion(dlTarget, true, true); });
  }

  /* ---------- resume bar ---------- */
  var resumeBar = document.getElementById("resumeBar");
  var resumeText = document.getElementById("resumeText");
  var resumeBtn = document.getElementById("resumeBtn");
  var restartBtn = document.getElementById("restartBtn");
  function firstUnanswered() {
    for (var i = 0; i < TOTAL; i++) { if (!(i in ansMap)) return i; }
    return -1;
  }
  function refreshResume() {
    if (!resumeBar) return;
    var n = answeredCount();
    if (n > 0 && n < TOTAL) {
      resumeBar.hidden = false;
      if (resumeText) resumeText.textContent = "You answered " + n + " of " + TOTAL + " — pick up where you left off.";
    } else {
      resumeBar.hidden = true;
    }
  }
  if (resumeBtn) {
    resumeBtn.addEventListener("click", function () {
      var idx = firstUnanswered();
      if (idx < 0) idx = 0;
      clearFilters();
      revealUpTo(Math.ceil((idx + 1) / PAGE) * PAGE);
      scrollToCard(idx, false);
    });
  }
  function resetAnswers() {
    ansMap = {};
    viewedSet = {};
    for (var i = 0; i < TOTAL; i++) {
      var bts = cards[i].querySelectorAll(".opt");
      bts.forEach(function (b) { b.disabled = false; b.classList.remove("correct", "wrong", "revealed"); });
      document.getElementById("ex-" + i).classList.remove("show");
      var sa = cards[i].querySelector(".show-ans");
      if (sa) { sa.style.display = ""; sa.textContent = "Show answer"; }
    }
    updateScore();
    save();
    refreshResume();
  }
  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      hideDeepLinkLabel();
      clearFilters();
      resetAnswers();
      document.getElementById("result").classList.remove("show");
      shown = Math.min(PAGE, TOTAL);
      applyView();
      window.scrollTo(0, 0);
    });
  }

  /* ---------- Try Again ---------- */
  var tryBtn = document.getElementById("tryAgain");
  if (tryBtn) {
    tryBtn.addEventListener("click", function () {
      hideDeepLinkLabel();
      clearFilters();
      resetAnswers();
      document.getElementById("result").classList.remove("show");
      shown = Math.min(PAGE, TOTAL);
      applyView();
      window.scrollTo(0, 0);
    });
  }

  /* ---------- one delegated click handler for cards ---------- */
  quizEl.addEventListener("click", function (e) {
    var a = e.target.closest("a.qnum");
    if (a) {
      e.preventDefault();
      var n = parseInt(a.getAttribute("href").slice(2), 10);
      if (goToQuestion(n, true)) {
        try { history.replaceState(null, "", "#q" + n); } catch (err) {}
      }
      return;
    }
    var sa = e.target.closest(".show-ans");
    if (sa) {
      var qi = +sa.getAttribute("data-q");
      if (qi in ansMap) return;
      var on = !cards[qi].querySelector(".opt.revealed");
      setRevealed(qi, on);
      save();
      return;
    }
    var bm = e.target.closest(".bm");
    if (bm) {
      var bi = +bm.getAttribute("data-q");
      if (bmSet[bi]) { delete bmSet[bi]; bm.textContent = "☆"; bm.classList.remove("on"); }
      else { bmSet[bi] = true; bm.textContent = "★"; bm.classList.add("on"); }
      save();
      if (bmOnly) applyView();
      return;
    }
    var sq = e.target.closest(".share-q");
    if (sq) {
      var si = +sq.getAttribute("data-q");
      var url = window.location.origin + window.location.pathname + "#q" + (si + 1);
      shareContent(subjectName() + " — Q" + (si + 1) + " | All MCQ 360", QUESTIONS[si].q, url);
      return;
    }
    var btn = e.target.closest(".opt");
    if (!btn || btn.disabled) return;
    var oi = +btn.getAttribute("data-o");
    var qidx = +btn.getAttribute("data-q");
    var item = QUESTIONS[qidx];
    var card = btn.parentElement;
    var buttons = card.querySelectorAll(".opt");
    buttons.forEach(function (b) { b.disabled = true; });
    if (oi === item.ans) { btn.classList.add("correct"); }
    else { btn.classList.add("wrong"); buttons[item.ans].classList.add("correct"); }
    buttons[item.ans].classList.remove("revealed");
    var sab = card.querySelector(".show-ans");
    if (sab) sab.style.display = "none";
    delete viewedSet[qidx];
    document.getElementById("ex-" + qidx).classList.add("show");
    ansMap[qidx] = oi;
    save();
    updateScore();
    refreshResume();
    if (answeredCount() === TOTAL) {
      var r = document.getElementById("result");
      var c = correctCount();
      document.getElementById("resultTitle").textContent = "You scored " + c + " / " + TOTAL;
      var pct = Math.round(c / TOTAL * 100);
      document.getElementById("resultText").textContent = pct >= 80 ? "Excellent! You are ready for the next set." : pct >= 50 ? "Good start — read the explanations and try again." : "Keep practising — read each explanation, then retry.";
      r.classList.add("show");
      r.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  /* ---------- restore saved state, then show ---------- */
  Object.keys(ansMap).forEach(function (k) {
    var i = +k, picked = ansMap[i], item = QUESTIONS[i];
    var buttons = cards[i].querySelectorAll(".opt");
    buttons.forEach(function (b) { b.disabled = true; });
    if (picked === item.ans) { buttons[picked].classList.add("correct"); }
    else { buttons[picked].classList.add("wrong"); buttons[item.ans].classList.add("correct"); }
    document.getElementById("ex-" + i).classList.add("show");
    var sab = cards[i].querySelector(".show-ans");
    if (sab) sab.style.display = "none";
  });
  Object.keys(viewedSet).forEach(function (k) {
    var i = +k;
    if (i in ansMap) return;
    setRevealed(i, true);
  });
  updateScore();
  refreshResume();
  applyView();
})();
