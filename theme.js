/* All MCQ 360 — shared dark-mode toggle. Theme is applied before first paint by a tiny
   inline script in <head>; this file only wires the toggle button. Key: mcq360-theme. */
(function () {
  var btn = document.getElementById("themeToggle");
  if (!btn) return;
  function label() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.textContent = dark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  btn.addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    try {
      if (dark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("mcq360-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("mcq360-theme", "dark");
      }
    } catch (e) {
      if (dark) { document.documentElement.removeAttribute("data-theme"); }
      else { document.documentElement.setAttribute("data-theme", "dark"); }
    }
    label();
  });
  label();
})();
