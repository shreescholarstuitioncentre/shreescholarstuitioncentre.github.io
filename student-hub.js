/* =====================================================
   SSTC STUDENT HUB  (admin-page.html ke saath chalta hai)
   Ek student = ek card: details + E-book rentals + Notes rentals
   Har row ke alag buttons + group buttons + bulk (multi-select) buttons
   Backend / Apps Script me koi change nahi chahiye.
===================================================== */
(function () {
  if (typeof T === 'undefined' || typeof api === 'undefined') return;

  var S = { q: '', f: '', open: new Set(), sel: new Set(), busy: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var U = function (s) { return String(s == null ? '' : s).trim().toUpperCase(); };
  var isP = function (x) { return x.status === 'Pending'; };

  /* ---------- CSS ---------- */
  var st = document.createElement('style');
  st.textContent =
    '#sec-students{overflow:visible}' +
    '.hb-tools{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px 0}' +
    '.hb-bulk{position:sticky;top:calc(var(--sh) + 4px);z-index:25;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 16px 0;padding:10px 14px;border:1.5px solid var(--blue);border-radius:16px;background:var(--glass);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:var(--shadow)}' +
    '.hb-bulk .lab{color:var(--muted);font-size:.75rem;font-weight:800;text-transform:uppercase}' +
    '.hb-bulk .sp{flex:1 0 8px}' +
    '.hb-card{margin:12px 16px;border:1.5px solid var(--line);border-radius:18px;background:var(--card2);overflow:hidden;transition:.2s}' +
    '.hb-card.sel{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.18)}' +
    '.hb-top{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 14px}' +
    '.hb-ck{width:20px;height:20px;flex-shrink:0;cursor:pointer}' +
    '.hb-info{flex:1 1 260px;min-width:0;cursor:pointer}' +
    '.hb-act{display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
    '.hb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}' +
    '.hb-chip{padding:2px 10px;border-radius:999px;background:var(--head);color:var(--ink);font-size:.74rem;font-weight:800}' +
    '.hb-chip.w{background:#fde68a;color:#78350f}.hb-chip.i{background:#a5f3fc;color:#053a45}' +
    '.hb-body{display:none;padding:2px 14px 14px;border-top:1px solid var(--line)}' +
    '.hb-card.open .hb-body{display:block}' +
    '.hb-sub{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 6px;font-weight:800}' +
    '.hb-grp{display:flex;flex-wrap:wrap;gap:6px}' +
    '.hb-t{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}' +
    '.hb-all{margin-top:14px;padding-top:10px;border-top:1px dashed var(--line)}' +
    '@media(max-width:576px){.hb-card,.hb-bulk{margin-left:8px;margin-right:8px}}';
  document.head.appendChild(st);

  /* ---------- Purane 3 tables hatao, Hub lagao ---------- */
  var olds = ['sec-students', 'sec-rentals', 'sec-notes'].map(function (i) { return document.getElementById(i); }).filter(Boolean);
  olds.forEach(function (el) { el.id = 'old-' + el.id; el.hidden = true; });

  var hub = document.createElement('section');
  hub.className = 'panel sep';
  hub.id = 'sec-students';
  hub.innerHTML =
    '<div class="panel-h"><h2>👨‍🎓 Student Hub <span class="badge bg-secondary" id="hb-c">0</span></h2>' +
    '<div class="ph-tools"><input class="form-control form-control-sm" id="hb-q" placeholder="🔍 Student / ID / subject...">' +
    '<select class="form-select form-select-sm" id="hb-f"><option value="">All students</option><option value="Active">Active</option><option value="Inactive">Inactive</option>' +
    '<option value="pendR">E-book pending</option><option value="pendN">Notes pending</option><option value="claim">Paid claimed</option></select></div></div>' +
    '<div class="hb-tools">' +
    '<button class="btn btn-sm min-btn" data-x="open">⊞ Sab kholo</button><button class="btn btn-sm min-btn" data-x="close">⊟ Sab band</button>' +
    '<button class="btn btn-sm min-btn" data-x="selall">☑ Sab select</button><button class="btn btn-sm min-btn" data-x="selnone">☐ Select hatao</button></div>' +
    '<div class="hb-bulk" id="hb-bulk"><b id="hb-n">0 selected</b><span class="sp"></span>' +
    '<span class="lab">Student</span>' +
    '<button class="btn btn-success btn-sm" data-h="stu:on">✅ Activate</button>' +
    '<button class="btn btn-warning btn-sm" data-h="stu:off">⏸ Deactivate</button>' +
    '<button class="btn btn-danger btn-sm" data-h="stu:delall">🗑 Student + Rentals Delete</button>' +
    '<span class="lab">Rentals</span>' +
    '<button class="btn btn-success btn-sm" data-h="rent:approve">✅ Approve pending</button>' +
    '<button class="btn btn-warning btn-sm" data-h="rent:cancel">⏸ Cancel all</button>' +
    '<button class="btn btn-danger btn-sm" data-h="rent:del">🗑 Rentals Delete</button>' +
    '<span id="hb-p" class="mini"></span></div>' +
    '<div id="hb-list" class="pb-2"><div class="text-center py-4"><span class="spin">⏳</span> Loading...</div></div>';
  if (olds[0]) olds[0].parentNode.insertBefore(hub, olds[0]);
  else $('main.wrap').appendChild(hub);

  /* Nav: E-book / Notes links hatao, Students ka naam badlo */
  ['#sec-rentals', '#sec-notes'].forEach(function (h) { var a = $('#subnavIn a[href="' + h + '"]'); if (a) a.remove(); });
  var navS = $('#subnavIn a[href="#sec-students"]'); if (navS) navS.textContent = '👨‍🎓 Student Hub';
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        $$('#subnavIn a').forEach(function (l) { l.classList.remove('active'); });
        if (navS) navS.classList.add('active');
      });
    }, { rootMargin: '-30% 0px -60% 0px' }).observe(hub);
  }

  /* ---------- Data: student ke hisaab se group ---------- */
  function groups() {
    var m = {}, order = [];
    T.students.data.forEach(function (s) {
      var k = U(s.studentId); m[k] = { id: s.studentId, s: s, r: [], n: [] }; order.push(k);
    });
    [['rentals', 'r'], ['notes', 'n']].forEach(function (p) {
      T[p[0]].data.forEach(function (x) {
        var k = U(x.studentId);
        if (!m[k]) { m[k] = { id: x.studentId, s: null, name: x.studentName, r: [], n: [] }; order.push(k); }
        m[k][p[1]].push(x);
      });
    });
    return order.map(function (k) { return m[k]; });
  }
  function G(id) { return groups().filter(function (g) { return U(g.id) === U(id); })[0]; }

  function match(g) {
    var f = S.f, s = g.s, all = g.r.concat(g.n);
    if (f === 'Active' && !(s && s.status === 'Active')) return false;
    if (f === 'Inactive' && !(s && s.status !== 'Active')) return false;
    if (f === 'pendR' && !g.r.some(isP)) return false;
    if (f === 'pendN' && !g.n.some(isP)) return false;
    if (f === 'claim' && !all.some(function (x) { return isP(x) && x.paymentClaimedOn; })) return false;
    if (S.q) {
      var safe = s ? Object.assign({}, s, { password: '' }) : null;
      if (JSON.stringify([safe, g.r, g.n]).toLowerCase().indexOf(S.q) < 0) return false;
    }
    return true;
  }

  /* ---------- Render ---------- */
  function gbtn(k, id) {
    var a = ' data-k="' + k + '" data-s="' + id + '"';
    return '<span class="hb-grp"><button class="btn btn-success btn-sm" data-h="rent:approve"' + a + '>✅ Approve pending</button>' +
      '<button class="btn btn-warning btn-sm" data-h="rent:cancel"' + a + '>⏸ Cancel all</button>' +
      '<button class="btn btn-danger btn-sm" data-h="rent:del"' + a + '>🗑 Delete all</button></span>';
  }
  function rowR(k) {
    return function (x, i) {
      return '<tr style="--i:' + i + '"><td class="fw-bold">' + esc(x.rentalId) + '</td><td>' + esc(x.subject) + '</td>' +
        '<td>' + esc(x.plan) + '<div class="mini">' + esc(x.months) + ' month(s)</div></td>' +
        '<td class="fw-bold">₹' + esc(x.price) + '</td>' +
        '<td>' + fmt(x.startDate) + '<div class="mini">to ' + fmt(x.expiryDate) + '</div></td>' +
        '<td>' + (x.paymentClaimedOn ? '<span class="badge bg-info text-dark">Paid claimed</span><div class="mini">' + fmt(x.paymentClaimedOn) + '</div>' : '<span class="mini">-</span>') + '</td>' +
        '<td>' + badge(x.status) + '</td><td>' + actionBtns(k, x) + '</td></tr>';
    };
  }
  function rentBlock(k, g) {
    var l = k === 'rentals' ? g.r : g.n, id = esc(g.id);
    var h = '<div class="hb-sub"><span>' + (k === 'rentals' ? '📘 E-book' : '📝 Notes') + ' Rentals (' + l.length + ')</span>' + (l.length ? gbtn(k, id) : '') + '</div>';
    if (!l.length) return h + '<div class="mini">Koi rental nahi</div>';
    return h + '<div class="hb-t"><table class="table align-middle"><thead><tr><th>Rental ID</th><th>Subject</th><th>Plan</th><th>Price</th><th>Validity</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      l.map(rowR(k)).join('') + '</tbody></table></div>';
  }
  function card(g) {
    var s = g.s, id = esc(g.id), all = g.r.concat(g.n);
    var pend = all.filter(isP).length, claim = all.filter(function (x) { return isP(x) && x.paymentClaimedOn; }).length;
    var det = s ? '<div class="mini mt-2">✉ ' + esc(s.emailId) + ' · 🏫 ' + esc(s.schoolName) + ' (' + esc(s.schoolPlace) + ') · 📅 ' + esc(s.registrationDate) +
      ' · 🔑 <span class="pw">••••••</span> <button class="btn btn-light btn-sm py-0" data-act="pw" data-pw="' + esc(s.password) + '">👁</button></div>' : '';
    return '<div class="hb-card' + (S.open.has(g.id) ? ' open' : '') + (S.sel.has(g.id) ? ' sel' : '') + '" data-id="' + id + '">' +
      '<div class="hb-top"><input type="checkbox" class="hb-ck form-check-input" data-s="' + id + '"' + (S.sel.has(g.id) ? ' checked' : '') + '>' +
      '<div class="hb-info" data-tg><div><b>' + id + '</b> · ' + esc(s ? s.fullName : (g.name || '(student record nahi mila)')) + ' ' +
      (s ? badge(s.status) : '<span class="badge bg-danger">Deleted student</span>') + '</div>' +
      '<div class="mini">' + (s ? 'Class ' + esc(s.className) + ' · ' + esc(s.board) + ' · 📞 ' + esc(s.mobileNumber) : 'Sirf rentals bache hain') + '</div>' +
      '<div class="hb-chips"><span class="hb-chip">📘 ' + g.r.length + '</span><span class="hb-chip">📝 ' + g.n.length + '</span>' +
      (pend ? '<span class="hb-chip w">⏳ ' + pend + ' pending</span>' : '') + (claim ? '<span class="hb-chip i">💳 ' + claim + ' paid-claimed</span>' : '') + '</div></div>' +
      '<div class="hb-act">' + (s ? actionBtns('students', s) + ' <button class="btn btn-outline-danger btn-sm" data-h="stu:delall" data-s="' + id + '">🗑 Student+Rentals</button>' : '') +
      ' <button class="btn btn-light btn-sm" data-tg>▾</button></div></div>' +
      '<div class="hb-body">' + det + rentBlock('rentals', g) + rentBlock('notes', g) +
      (all.length > 1 ? '<div class="hb-sub hb-all"><span>🔁 E-book + Notes dono</span>' + gbtn('all', id) + '</div>' : '') + '</div></div>';
  }

  function barState() {
    $('#hb-n').textContent = S.sel.size + ' selected';
    $$('#hb-bulk [data-h]').forEach(function (b) { b.disabled = S.busy || !S.sel.size; });
  }
  window.renderHub = function () {
    var gs = groups(), list = gs.filter(match), ids = {};
    gs.forEach(function (g) { ids[g.id] = 1; });
    S.sel.forEach(function (id) { if (!ids[id]) S.sel.delete(id); });
    $('#hb-c').textContent = list.length + ' / ' + gs.length;
    $('#hb-list').innerHTML = list.length ? list.map(card).join('') : '<div class="text-center text-muted py-4">Koi record nahi mila</div>';
    barState();
  };

  /* ---------- Actions banana ---------- */
  function build(op, k, ids) {
    var out = [];
    ids.forEach(function (id) {
      var g = G(id); if (!g) return;
      var rl = [];
      if (k !== 'notes') g.r.forEach(function (x) { rl.push({ t: 'rentals', x: x }); });
      if (k !== 'rentals') g.n.forEach(function (x) { rl.push({ t: 'notes', x: x }); });
      if (op === 'stu:on' || op === 'stu:off') {
        if (g.s) out.push({ t: 'students', id: g.s.studentId, a: op === 'stu:on' ? 'on' : 'off' });
      } else if (op === 'rent:approve') {
        rl.filter(function (p) { return isP(p.x); }).forEach(function (p) { out.push({ t: p.t, id: p.x.rentalId, a: 'on' }); });
      } else if (op === 'rent:cancel') {
        rl.filter(function (p) { return p.x.status === 'Active' || p.x.status === 'Pending'; }).forEach(function (p) { out.push({ t: p.t, id: p.x.rentalId, a: 'off' }); });
      } else if (op === 'rent:del') {
        rl.forEach(function (p) { out.push({ t: p.t, id: p.x.rentalId, a: 'del' }); });
      } else if (op === 'stu:delall') {
        g.r.forEach(function (x) { out.push({ t: 'rentals', id: x.rentalId, a: 'del' }); });
        g.n.forEach(function (x) { out.push({ t: 'notes', id: x.rentalId, a: 'del' }); });
        if (g.s) out.push({ t: 'students', id: g.s.studentId, a: 'del' });
      }
    });
    return out;
  }

  async function run(list) {
    if (!list.length) { toast('Is action ke layak koi record nahi mila', 'warning'); return; }
    var nd = list.filter(function (i) { return i.a === 'del'; }).length;
    if (nd && !confirm('⚠️ ' + nd + ' record Google Sheet se hamesha ke liye delete honge. Pakka?')) return;
    list.sort(function (a, b) { return (a.a === 'del') - (b.a === 'del'); });
    S.busy = true; barState();
    var i = 0, done = 0, ok = 0, fail = 0, conc = nd ? 1 : 3, last = '';   // delete sequential (row shift se bachne ke liye)
    async function worker() {
      while (i < list.length) {
        var it = list[i++], c = T[it.t];
        try {
          var d = it.a === 'del' ? await api(c.del, (function () { var o = {}; o[c.id] = it.id; return o; })())
            : await api(c.upd, (function () { var o = { status: it.a === 'on' ? c.on : c.off }; o[c.id] = it.id; return o; })());
          if (!d.success) throw new Error(d.message || 'Failed');
          if (it.a === 'del') c.data = c.data.filter(function (x) { return x[c.id] !== it.id; });
          else { var row = c.data.filter(function (x) { return x[c.id] === it.id; })[0]; if (row) row.status = it.a === 'on' ? c.on : c.off; }
          ok++;
        } catch (e) { fail++; last = e.message; }
        done++; $('#hb-p').textContent = '⏳ ' + done + ' / ' + list.length;
      }
    }
    var ws = []; for (var w = 0; w < conc; w++) ws.push(worker());
    await Promise.all(ws);
    S.busy = false; $('#hb-p').textContent = '';
    stats();   // -> Hub bhi refresh
    toast('✅ ' + ok + ' ho gaye' + (fail ? ' · ❌ ' + fail + ' fail (' + last + ')' : ''), fail ? 'warning' : 'success');
  }

  /* ---------- Events ---------- */
  hub.addEventListener('click', function (e) {
    var h = e.target.closest('[data-h]');
    if (h) {
      if (S.busy) return;
      var ids = h.dataset.s ? [h.dataset.s] : Array.from(S.sel);
      if (!ids.length) { toast('Pehle student select karein', 'warning'); return; }
      run(build(h.dataset.h, h.dataset.k || 'all', ids));
      return;
    }
    var x = e.target.closest('[data-x]');
    if (x) {
      var gs = groups().filter(match), a = x.dataset.x;
      if (a === 'open') gs.forEach(function (g) { S.open.add(g.id); });
      if (a === 'close') S.open.clear();
      if (a === 'selall') gs.forEach(function (g) { S.sel.add(g.id); });
      if (a === 'selnone') S.sel.clear();
      renderHub(); return;
    }
    var tg = e.target.closest('[data-tg]');
    if (tg) {
      var cd = tg.closest('.hb-card'), id = cd.dataset.id;
      if (S.open.has(id)) S.open.delete(id); else S.open.add(id);
      cd.classList.toggle('open', S.open.has(id));
    }
  });
  hub.addEventListener('change', function (e) {
    var ck = e.target.closest('.hb-ck'); if (!ck) return;
    var id = ck.dataset.s;
    if (ck.checked) S.sel.add(id); else S.sel.delete(id);
    ck.closest('.hb-card').classList.toggle('sel', ck.checked);
    barState();
  });
  var tmr;
  $('#hb-q').addEventListener('input', function () { clearTimeout(tmr); var v = this.value.toLowerCase().trim(); tmr = setTimeout(function () { S.q = v; renderHub(); }, 150); });
  $('#hb-f').addEventListener('change', function () { S.f = this.value; renderHub(); });

  /* Overview cards par click = Hub filter (action wala card pehle jaisa) */
  function cardJump(e) {
    var c = e.target.closest && e.target.closest('.stat[data-jump]');
    if (!c) return;
    var t = c.getAttribute('data-jump');
    if (t === 'action') return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.stopPropagation(); e.preventDefault();
    S.q = ''; $('#hb-q').value = '';
    S.f = t === 'students' ? (c.getAttribute('data-filter') || '') : (t === 'rentals' ? 'pendR' : 'pendN');
    $('#hb-f').value = S.f;
    if (S.f === 'pendR' || S.f === 'pendN') groups().filter(match).forEach(function (g) { S.open.add(g.id); });
    renderHub();
    hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.addEventListener('click', cardJump, true);
  document.addEventListener('keydown', cardJump, true);

  /* stats() har load / change / delete ke baad chalta hai -> Hub refresh */
  var _stats = stats;
  window.stats = stats = function () { _stats(); renderHub(); };
  renderHub();
})();
