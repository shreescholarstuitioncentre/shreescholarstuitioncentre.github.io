/* =========================================================
   SSTC: FREE ACCESS PREMIUM BANNER (student page)
   Free access wale student ko banner + welcome popup dikhata hai.
   CSS isi file ke andar hai, alag CSS file ya version nahi chahiye.
========================================================= */
(function () {
  "use strict";

  var API_URL = "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";

  if (sessionStorage.getItem("sstcStudentLoggedIn") !== "true") return;

  var student = null;
  try { student = JSON.parse(sessionStorage.getItem("sstcStudentData") || "null"); } catch (e) {}
  if (!student || !student.studentId || !student.password) return;

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function daysLeft(iso) {
    var d = new Date(iso);
    return isNaN(d) ? 0 : Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
  }

  function injectStyles() {
    if (document.getElementById("sfbStyles")) return;
    var css = document.createElement("style");
    css.id = "sfbStyles";
    css.textContent =
      ".sfb-banner{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;flex-wrap:wrap;" +
      "margin:0 0 16px;padding:16px 18px;border-radius:18px;color:#fff;" +
      "background:linear-gradient(120deg,#7c3aed,#2563eb 55%,#0ea5e9);" +
      "box-shadow:0 14px 30px rgba(37,99,235,.28);border:2px solid rgba(255,215,0,.75)}" +
      ".sfb-banner::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;" +
      "background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);" +
      "transform:skewX(-20deg);animation:sfbShine 4.5s ease-in-out infinite}" +
      "@keyframes sfbShine{0%{left:-60%}60%,100%{left:130%}}" +
      ".sfb-crown{font-size:2.1rem;line-height:1;animation:sfbFloat 2.4s ease-in-out infinite}" +
      "@keyframes sfbFloat{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-5px) rotate(6deg)}}" +
      ".sfb-text{flex:1;min-width:230px;position:relative;z-index:1}" +
      ".sfb-title{font-weight:800;font-size:1.05rem;line-height:1.3}" +
      ".sfb-sub{margin-top:4px;font-size:.86rem;opacity:.95;line-height:1.45}" +
      ".sfb-chip{position:relative;z-index:1;background:#ffd700;color:#5b3a00;font-weight:800;font-size:.8rem;" +
      "padding:7px 13px;border-radius:999px;white-space:nowrap;box-shadow:0 6px 14px rgba(0,0,0,.18)}" +
      "#sfbOverlay{position:fixed;inset:0;z-index:100000;background:rgba(9,36,75,.65);display:flex;" +
      "align-items:center;justify-content:center;padding:16px;animation:sfbFade .25s ease}" +
      "@keyframes sfbFade{from{opacity:0}to{opacity:1}}" +
      "#sfbCard{position:relative;overflow:hidden;width:100%;max-width:440px;text-align:center;background:#fff;" +
      "border-radius:24px;padding:28px 22px 22px;box-shadow:0 30px 70px rgba(0,0,0,.4);" +
      "border-top:6px solid #ffd700;animation:sfbPop .35s cubic-bezier(.2,1.4,.4,1)}" +
      "@keyframes sfbPop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}" +
      "#sfbCard .big{font-size:3rem;animation:sfbFloat 2.4s ease-in-out infinite}" +
      "#sfbCard h3{margin:6px 0 6px;color:#09244b;font-weight:800;font-size:1.25rem}" +
      "#sfbCard p{margin:0 0 10px;color:#475569;font-size:.92rem;line-height:1.5}" +
      "#sfbCard .meta{display:inline-block;margin:4px 0 14px;padding:7px 14px;border-radius:12px;" +
      "background:#eef2ff;color:#4338ca;font-weight:700;font-size:.82rem}" +
      "#sfbCard button{border:0;cursor:pointer;color:#fff;font-weight:800;font-size:.95rem;padding:12px 22px;" +
      "border-radius:14px;background:linear-gradient(120deg,#16a34a,#0ea5e9);box-shadow:0 10px 22px rgba(14,165,233,.35)}" +
      ".sfb-rain{position:absolute;top:-30px;font-size:1.1rem;pointer-events:none;animation:sfbRain 3.2s linear infinite}" +
      "@keyframes sfbRain{to{transform:translateY(420px) rotate(240deg);opacity:0}}" +
      "@media (prefers-reduced-motion:reduce){.sfb-banner::after,.sfb-crown,#sfbCard .big,.sfb-rain{animation:none}}";
    document.head.appendChild(css);
  }

  function firstNameOf(d) {
    var full = String((d && d.studentName) || student.fullName || "Student").trim();
    return full.split(/\s+/)[0] || "Student";
  }

  function insertBanner(d) {
    if (document.getElementById("sstcFreeBanner")) return;

    var name = firstNameOf(d);
    var left = daysLeft(d.expiryDate);

    var el = document.createElement("div");
    el.id = "sstcFreeBanner";
    el.className = "sfb-banner";
    el.innerHTML =
      '<div class="sfb-crown">👑</div>' +
      '<div class="sfb-text">' +
        '<div class="sfb-title">Congratulations, ' + esc(name) + '! Aap SSTC ke Specially Selected Premium Student hain 🌟</div>' +
        '<div class="sfb-sub">Aapke <b>saare subjects</b> ke <b>Notes</b> aur <b>Question Banks</b> bilkul <b>FREE</b> hain. ' +
        'Dil lagakar padhein aur topper banein!</div>' +
      '</div>' +
      '<div class="sfb-chip">🎁 FREE · ' + left + ' din baaki</div>';

    var target = document.querySelector("main.student-page") || document.querySelector("main");

    if (target) {
      target.insertBefore(el, target.firstChild);
    } else {
      var header = document.querySelector("header");
      if (header && header.parentNode) header.parentNode.insertBefore(el, header.nextSibling);
      else document.body.insertBefore(el, document.body.firstChild);
    }
  }

  function showWelcomePopup(d) {
    var key = "sstcFreeWelcome_" + (sessionStorage.getItem("sstcStudentLoginTime") || student.studentId);
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    var name = firstNameOf(d);
    var rain = "";
    var icons = ["🎉", "⭐", "✨", "🎊", "🌟", "📚"];
    for (var i = 0; i < 14; i++) {
      rain += '<span class="sfb-rain" style="left:' + (Math.random() * 94).toFixed(0) + '%;' +
              'animation-delay:' + (Math.random() * 2.5).toFixed(2) + 's">' + icons[i % icons.length] + "</span>";
    }

    var ov = document.createElement("div");
    ov.id = "sfbOverlay";
    ov.innerHTML =
      '<div id="sfbCard">' + rain +
        '<div class="big">👑</div>' +
        "<h3>Congratulations, " + esc(name) + "! 🎉</h3>" +
        "<p>Aap SSTC ke <b>Specially Selected Premium Student</b> hain.<br>" +
        "Aapka <b>sab kuch FREE</b> hai: saare subjects ke Notes aur Question Banks.</p>" +
        '<div class="meta">🎁 ' + (d.subjects || 0) + " subjects · Valid till " + esc(fmtDate(d.expiryDate)) + "</div><br>" +
        '<button type="button" id="sfbOk">Shukriya! Padhai shuru karein 🚀</button>' +
      "</div>";
    document.body.appendChild(ov);

    function close() {
      document.removeEventListener("keydown", onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    document.getElementById("sfbOk").onclick = close;
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", onKey);
  }

  function start() {
    var url = API_URL + "?action=getfreeaccess" +
      "&studentId=" + encodeURIComponent(student.studentId) +
      "&password=" + encodeURIComponent(student.password) +
      "&_=" + Date.now();

    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var d;
        try { d = JSON.parse(txt); } catch (e) { return; }
        if (!d || d.success !== true || d.isFree !== true) return;

        injectStyles();
        insertBanner(d);
        showWelcomePopup(d);
      })
      .catch(function (err) { console.warn("SSTC free banner:", err); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
