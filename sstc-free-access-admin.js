/* =========================================================
   SSTC ADMIN: FREE ACCESS BUTTON
   admin-page.html me </body> se pehle include karo
========================================================= */
(function () {
  "use strict";

  /* 👇 Apna Apps Script /exec URL yahan daalo
     (wahi jo admin-page.js / admin-login-snippet.js me hai) */
  var API_URL = "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE";

  /* Admin token kis key me save hota hai pata ho to yahan likho, warna auto-detect hoga */
  var TOKEN_KEY = "";

  function findToken() {
    var stores = [sessionStorage, localStorage];

    for (var s = 0; s < stores.length; s++) {
      try {
        if (TOKEN_KEY) {
          var direct = stores[s].getItem(TOKEN_KEY);
          if (direct) return direct.replace(/^"|"$/g, "");
        }
        for (var i = 0; i < stores[s].length; i++) {
          var k = stores[s].key(i);
          var v = stores[s].getItem(k) || "";
          if (/token/i.test(k)) {
            v = v.replace(/^"|"$/g, "");
            if (v.length >= 32 && v.length < 200) return v;
          }
          if (v.charAt(0) === "{") {
            try {
              var o = JSON.parse(v);
              if (o && typeof o.token === "string" && o.token.length >= 32) return o.token;
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
    return "";
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function api(params) {
    var token = findToken();
    if (!token) {
      return Promise.reject(new Error("Admin token nahi mila. Logout karke dobara admin login karein."));
    }
    var q = new URLSearchParams(params);
    q.set("adminToken", token);
    return fetch(API_URL + "?" + q.toString())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.success === false) throw new Error(d.message || "Error");
        return d;
      });
  }

  function idsFromChecked() {
    var out = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
      var el = cb.parentElement;
      for (var i = 0; i < 6 && el; i++) {
        var m = (el.textContent || "").match(/SSTC\d{10}/g);
        if (m) {
          if (m.length === 1 && out.indexOf(m[0]) === -1) out.push(m[0]);
          break;
        }
        el = el.parentElement;
      }
    });
    return out;
  }

  /* ---------- styles ---------- */
  var css = document.createElement("style");
  css.textContent =
    "#sfaBtn{position:fixed;right:18px;bottom:18px;z-index:99990;border:0;border-radius:999px;padding:12px 18px;" +
    "font:800 14px 'Nunito',sans-serif;color:#fff;cursor:pointer;background:linear-gradient(120deg,#16a34a,#0ea5e9,#7c3aed);" +
    "box-shadow:0 12px 26px rgba(14,165,233,.4);transition:transform .2s}" +
    "#sfaBtn:hover{transform:translateY(-3px)}" +
    "#sfaOverlay{position:fixed;inset:0;z-index:99995;background:rgba(9,36,75,.6);display:none;align-items:center;justify-content:center;padding:14px}" +
    "#sfaOverlay.open{display:flex}" +
    "#sfaBox{background:#fff;width:100%;max-width:620px;max-height:92vh;overflow:auto;border-radius:20px;padding:22px;" +
    "font-family:'Nunito',sans-serif;box-shadow:0 30px 70px rgba(0,0,0,.35)}" +
    "#sfaBox h3{margin:0 0 4px;font-weight:800;color:#09244b}" +
    "#sfaBox p.sub{margin:0 0 14px;color:#64748b;font-size:.85rem}" +
    "#sfaBox textarea{width:100%;min-height:90px;border:2px solid #e3e8f4;border-radius:12px;padding:10px;font-weight:700;font-size:.9rem}" +
    "#sfaBox select{border:2px solid #e3e8f4;border-radius:10px;padding:8px;font-weight:700}" +
    ".sfaRow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}" +
    ".sfaB{border:0;border-radius:10px;padding:9px 14px;font-weight:800;cursor:pointer;font-size:.85rem}" +
    ".sfaGreen{background:#16a34a;color:#fff}.sfaGrey{background:#eef2ff;color:#4338ca}.sfaRed{background:#fee2e2;color:#b91c1c}" +
    "#sfaMsg{margin:10px 0;font-weight:700;font-size:.85rem;white-space:pre-line}" +
    ".sfaOk{color:#15803d}.sfaErr{color:#b91c1c}" +
    "#sfaList .item{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;margin-top:6px;font-size:.82rem}" +
    "#sfaList small{color:#64748b}";
  document.head.appendChild(css);

  /* ---------- HTML ---------- */
  var btn = document.createElement("button");
  btn.id = "sfaBtn";
  btn.type = "button";
  btn.textContent = "🎁 Free Access";
  document.body.appendChild(btn);

  var overlay = document.createElement("div");
  overlay.id = "sfaOverlay";
  overlay.innerHTML =
    '<div id="sfaBox">' +
      "<h3>🎁 Special Free Access</h3>" +
      '<p class="sub">Jin bachchon ko saare subjects (Notes + Question Bank) free dene hain unki Student ID daalein.</p>' +
      '<textarea id="sfaIds" placeholder="SSTC2026404198, SSTC2026988944 ..."></textarea>' +
      '<div class="sfaRow">' +
        '<button type="button" class="sfaB sfaGrey" id="sfaPick">☑ Selected students lo</button>' +
        '<label style="font-weight:800;font-size:.85rem">Kitne mahine:</label>' +
        '<select id="sfaMonths"><option value="1">1</option><option value="3">3</option><option value="6">6</option><option value="12" selected>12</option></select>' +
      "</div>" +
      '<div class="sfaRow">' +
        '<button type="button" class="sfaB sfaGreen" id="sfaGrant">🎁 Free Access Do</button>' +
        '<button type="button" class="sfaB sfaRed" id="sfaRevoke">↩ Free Access Hatao</button>' +
        '<button type="button" class="sfaB sfaGrey" id="sfaClose">Band karo</button>' +
      "</div>" +
      '<div id="sfaMsg"></div>' +
      '<h4 style="margin:14px 0 0;font-size:.95rem;color:#09244b">Abhi free access wale students</h4>' +
      '<div id="sfaList"></div>' +
    "</div>";
  document.body.appendChild(overlay);

  var $ = function (id) { return document.getElementById(id); };

  function msg(text, ok) {
    var m = $("sfaMsg");
    m.className = ok ? "sfaOk" : "sfaErr";
    m.textContent = text;
  }

  function refreshMainPage() {
    var buttons = document.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      if (/refresh/i.test(buttons[i].textContent) && buttons[i].id !== "sfaBtn") {
        buttons[i].click();
        break;
      }
    }
  }

  function loadList() {
    $("sfaList").innerHTML = "<small>Load ho raha hai...</small>";
    api({ action: "listfreeaccess" }).then(function (d) {
      if (!d.list || !d.list.length) {
        $("sfaList").innerHTML = "<small>Abhi koi nahi.</small>";
        return;
      }
      $("sfaList").innerHTML = d.list.map(function (s) {
        var exp = s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("en-IN") : "-";
        return '<div class="item"><div><b>' + esc(s.studentId) + "</b> · " + esc(s.fullName) +
          "<br><small>Class " + esc(s.className) + " · " + s.subjects + " subjects · Expiry: " + exp +
          (s.expired ? " (Expired)" : "") + '</small></div><button type="button" class="sfaB sfaRed" data-id="' +
          esc(s.studentId) + '">Hatao</button></div>';
      }).join("");
    }).catch(function (e) {
      $("sfaList").innerHTML = '<small class="sfaErr">' + esc(e.message) + "</small>";
    });
  }

  btn.onclick = function () {
    var picked = idsFromChecked();
    if (picked.length) $("sfaIds").value = picked.join(", ");
    $("sfaMsg").textContent = "";
    overlay.classList.add("open");
    loadList();
  };

  $("sfaClose").onclick = function () { overlay.classList.remove("open"); };
  overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.classList.remove("open"); });

  $("sfaPick").onclick = function () {
    var picked = idsFromChecked();
    if (!picked.length) { msg("Pehle list me se students select (tick) karein.", false); return; }
    $("sfaIds").value = picked.join(", ");
    msg(picked.length + " student(s) le liye.", true);
  };

  $("sfaGrant").onclick = function () {
    var ids = $("sfaIds").value.trim();
    if (!ids) { msg("Student ID daalein.", false); return; }
    if (!confirm("In students ko saare subjects FREE de dein?")) return;

    msg("Please wait...", true);
    api({ action: "grantfreeaccess", studentIds: ids, months: $("sfaMonths").value }).then(function (d) {
      var t = "✅ " + d.message;
      if (d.notFound && d.notFound.length) t += "\n⚠️ Ye ID nahi mili: " + d.notFound.join(", ");
      msg(t, true);
      loadList();
      refreshMainPage();
    }).catch(function (e) { msg("❌ " + e.message, false); });
  };

  $("sfaRevoke").onclick = function () {
    var ids = $("sfaIds").value.trim();
    if (!ids) { msg("Student ID daalein.", false); return; }
    if (!confirm("In students ka free access hata dein?")) return;

    msg("Please wait...", true);
    api({ action: "revokefreeaccess", studentIds: ids }).then(function (d) {
      msg("✅ " + d.message, true);
      loadList();
      refreshMainPage();
    }).catch(function (e) { msg("❌ " + e.message, false); });
  };

  $("sfaList").addEventListener("click", function (e) {
    var id = e.target && e.target.getAttribute("data-id");
    if (!id) return;
    if (!confirm(id + " ka free access hata dein?")) return;
    api({ action: "revokefreeaccess", studentIds: id }).then(function (d) {
      msg("✅ " + d.message, true);
      loadList();
      refreshMainPage();
    }).catch(function (err) { msg("❌ " + err.message, false); });
  });
})();
