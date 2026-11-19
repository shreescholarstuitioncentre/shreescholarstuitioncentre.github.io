/* =========================================================
   SSTC STUDENT: FREE ACCESS CONGRATULATIONS POPUP
   student-page.html me </body> se pehle include karo
========================================================= */
(function () {
  "use strict";

  /* 👇 Wahi Apps Script /exec URL */
  var API_URL = "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE";

  function findStudent() {
    var stores = [localStorage, sessionStorage];

    for (var s = 0; s < stores.length; s++) {
      try {
        for (var i = 0; i < stores[s].length; i++) {
          var raw = stores[s].getItem(stores[s].key(i)) || "";
          if (raw.charAt(0) !== "{") continue;
          var o = JSON.parse(raw);
          if (o && o.student) o = o.student;
          if (o && o.studentId && o.password) {
            return { id: o.studentId, pw: o.password };
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function addStyles() {
    var css = document.createElement("style");
    css.textContent =
      "#sfwOverlay{position:fixed;inset:0;z-index:99999;background:rgba(9,36,75,.65);display:flex;align-items:center;justify-content:center;padding:16px;animation:sfwFade .3s}" +
      "#sfwCard{position:relative;max-width:420px;width:100%;text-align:center;background:#fff;border-radius:26px;padding:34px 24px 26px;overflow:hidden;" +
      "font-family:'Nunito',sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.4);animation:sfwPop .6s cubic-bezier(.2,1.3,.4,1)}" +
      "#sfwCard::before{content:'';position:absolute;top:0;left:0;right:0;height:7px;background:linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed,#2563eb,#16a34a);background-size:300% 100%;animation:sfwBar 4s linear infinite}" +
      "#sfwCard .big{font-size:62px;animation:sfwBounce 1.6s ease-in-out infinite}" +
      "#sfwCard h2{margin:6px 0 8px;font-family:'Baloo 2',sans-serif;font-weight:800;font-size:1.6rem;background:linear-gradient(90deg,#09244b,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}" +
      "#sfwCard p{margin:0 0 14px;color:#334155;font-weight:700;line-height:1.55;font-size:.95rem}" +
      "#sfwCard .tag{display:inline-block;margin:0 0 16px;padding:6px 14px;border-radius:999px;background:#ecfdf5;color:#047857;font-weight:800;font-size:.8rem;border:1px solid #a7f3d0}" +
      "#sfwCard button{border:0;border-radius:14px;padding:12px 26px;font:800 1rem 'Baloo 2',sans-serif;color:#fff;cursor:pointer;background:linear-gradient(120deg,#16a34a,#0ea5e9,#7c3aed);box-shadow:0 12px 24px rgba(14,165,233,.4)}" +
      ".sfwConf{position:absolute;top:-20px;font-size:20px;animation:sfwFall linear infinite;pointer-events:none}" +
      "#sfwBadge{position:fixed;left:14px;bottom:14px;z-index:99990;border:0;border-radius:999px;padding:9px 14px;font:800 12px 'Nunito',sans-serif;color:#fff;background:linear-gradient(120deg,#16a34a,#0ea5e9);box-shadow:0 8px 18px rgba(14,165,233,.4);cursor:pointer}" +
      "@keyframes sfwFade{from{opacity:0}to{opacity:1}}" +
      "@keyframes sfwPop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}" +
      "@keyframes sfwBar{to{background-position:300% 0}}" +
      "@keyframes sfwBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}" +
      "@keyframes sfwFall{to{transform:translateY(520px) rotate(360deg);opacity:.2}}" +
      "@media (prefers-reduced-motion:reduce){.sfwConf,#sfwCard .big{animation:none!important}}";
    document.head.appendChild(css);
  }

  function showBadge(d) {
    if (document.getElementById("sfwBadge")) return;
    var b = document.createElement("button");
    b.id = "sfwBadge";
    b.type = "button";
    b.textContent = "🎁 Special Free Access";
    b.onclick = function () { showPopup(d); };
    document.body.appendChild(b);
  }

  function showPopup(d) {
    var old = document.getElementById("sfwOverlay");
    if (old) old.remove();

    var exp = d.expiryDate ? new Date(d.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

    var o = document.createElement("div");
    o.id = "sfwOverlay";

    var conf = "";
    var icons = ["🎉", "✨", "🎊", "⭐", "🌟"];
    for (var i = 0; i < 16; i++) {
      conf += '<span class="sfwConf" style="left:' + Math.round(Math.random() * 96) +
        "%;animation-duration:" + (3 + Math.random() * 3).toFixed(1) +
        "s;animation-delay:" + (Math.random() * 2).toFixed(1) + 's">' + icons[i % icons.length] + "</span>";
    }

    o.innerHTML =
      '<div id="sfwCard">' + conf +
        '<div class="big">🎁</div>' +
        "<h2>" + esc(d.title) + "</h2>" +
        "<p>" + esc(d.message) + "</p>" +
        '<div class="tag">✅ ' + (d.subjects || "Saare") + " subjects FREE" + (exp ? " · " + esc(exp) + " tak" : "") + "</div><br>" +
        '<button type="button" id="sfwOk">Shukriya SSTC! 🚀</button>' +
      "</div>";

    document.body.appendChild(o);

    document.getElementById("sfwOk").onclick = function () {
      o.remove();
      showBadge(d);
    };
  }

  function run(attempt) {
    var st = findStudent();

    if (!st) {
      if (attempt < 3) setTimeout(function () { run(attempt + 1); }, 1200);
      return;
    }

    var q = new URLSearchParams({ action: "getfreeaccess", studentId: st.id, password: st.pw });

    fetch(API_URL + "?" + q.toString())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success || !d.isFree) return;

        addStyles();

        var key = "sstcFreeWelcome_" + st.id;
        if (sessionStorage.getItem(key)) {
          showBadge(d);          /* is session me popup dikh chuka hai */
        } else {
          sessionStorage.setItem(key, "1");
          showPopup(d);
        }
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { run(0); });
  } else {
    run(0);
  }
})();
