// 评委端：#/judge
(function () {
  var F = FINAL, esc = F.esc, pad = F.pad, C = APP_CONFIG, root, bg;
  var S = { step: "pick", list: [], draft: "", jid: null, name: "", data: null, view: "list", caseId: null, picks: {}, confirm: false, last: null, err: "", busy: false };

  function start() {
    root = document.getElementById("root");
    bg = F.bg({ layout: innerWidth < innerHeight ? "tall" : "wide", dim: .45 });
    var saved = F.store.get("judge", null);
    if (saved) { S.jid = saved.id; S.name = saved.name; S.step = "in"; }
    root.addEventListener("click", click);
    root.addEventListener("change", function (e) { if (e.target.id === "jsel") { S.draft = e.target.value; render(); } });
    render();
    refresh();
    RT.on(function () { if (S.step === "in") refresh(); });
    setInterval(function () { if (S.step === "in") refresh(); }, C.PULSE_MS);
  }
  function refresh() {
    if (S.step !== "in") {
      return API.judgeList().then(function (l) { S.list = l || []; S.err = ""; render(); }).catch(function (e) { S.err = e.message; render(); });
    }
    return API.judgeState(S.jid).then(function (d) { S.data = d; S.err = ""; render(); }).catch(function (e) {
      if (/不存在|停用/.test(e.message)) { F.store.del("judge"); S.step = "pick"; S.jid = null; F.toast(e.message); refresh(); }
      else { S.err = "网络不稳定，正在重试…"; render(); }
    });
  }
  function go(top) { render(); if (top) window.scrollTo(0, 0); }

  function render() {
    var h;
    if (S.step === "pick") h = pick();
    else if (S.step === "confirm") h = confirmId();
    else if (!S.data) h = '<div class="jfull"><div class="muted" style="text-align:center">加载中…</div></div>';
    else h = S.view === "score" ? score() : S.view === "success" ? success() : list();
    bg.setDim(S.step !== "in" ? .45 : S.view === "score" ? .76 : S.view === "success" ? .2 : .5);
    var y = window.scrollY; root.innerHTML = h; window.scrollTo(0, y);
  }
  function pick() {
    return '<div class="jfull">' + F.titleFx(46) + '<div class="jsub">决赛评分系统</div>' +
      '<div class="card jpick"><div class="jlab">请选择您的姓名</div><div class="selw"><select id="jsel"><option value=""' + (S.draft ? "" : " selected") + ' disabled>请选择…</option>' +
      (S.list.length ? "" : '<option value="" disabled>加载中…</option>') + S.list.map(function (j) { return '<option value="' + j.id + '"' + (String(j.id) === S.draft ? " selected" : "") + ">" + esc(j.name) + "</option>"; }).join("") +
      '</select><span class="selw-a">▼</span></div><button class="btn" data-act="next"' + (S.draft ? "" : " disabled") + ">下一步</button>" +
      (S.err ? '<div class="err">' + esc(S.err) + "</div>" : "") + '</div><div class="internal">仅供内部使用</div></div>';
  }
  function confirmId() {
    return '<div class="jfull">' + F.titleFx(46) + '<div class="jsub">决赛评分系统</div>' +
      '<div class="card jpick" style="text-align:center"><div class="muted">您将以</div><div class="jname">【' + esc(S.name) + '】</div><div class="muted">身份进行评分</div>' +
      '<div class="two"><button class="btn-ghost" data-act="back">返回</button><button class="btn" data-act="ok">确认</button></div></div><div class="internal">仅供内部使用</div></div>';
  }
  function caseNo(id) { var i = S.data.cases.findIndex(function (c) { return c.id === id; }); return pad(i + 1); }
  function list() {
    var d = S.data, opened = d.opened || [], cur = d.current_case_id, mine = d.scores || {}, n = d.cases.length;
    var done = d.cases.filter(function (c) { return mine[c.id]; }).length;
    var h = '<div class="jwrap"><div class="jhead"><div><div class="gold-t jbrand">逐光行动 · 点亮星河</div><div class="jhello">欢迎，' + esc(d.judge.name) + '评委</div></div><button class="lnk" data-act="switch">切换评委</button></div>';
    if (S.err) h += '<div class="err">' + esc(S.err) + "</div>";
    h += '<div class="card jprog"><div class="row-b"><span class="muted">评分进度</span><span class="mono big">' + done + '<small> / ' + n + '</small></span></div><div class="bar"><i style="width:' + Math.round(done / Math.max(1, n) * 100) + '%"></i></div></div>';
    var cc = d.cases.find(function (c) { return c.id === cur; });
    if (cc && opened.indexOf(cur) >= 0) {
      h += '<div class="live-card"><div class="row-b"><span class="live-dot">现场正在评分</span><span class="mono">CASE ' + caseNo(cur) + '</span></div><div class="sm2">' + esc(cc.region) + "大区 · " + esc(cc.name) + '</div><div class="ctitle">' + esc(cc.title) + '</div><button class="btn" data-act="enter" data-v="' + cur + '">' + (mine[cur] ? "已评分 · 修改" : "立即评分") + "</button></div>";
    }
    h += '<div class="sec-l">全部案例</div>';
    d.cases.forEach(function (c, i) {
      var sc = mine[c.id], op = opened.indexOf(c.id) >= 0, isCur = c.id === cur, st, cls = "ccard", btn = "";
      if (sc) { st = '<span class="gd">✓ 已评分 · ' + sc.total + " 分</span>"; btn = '<button class="btn-ghost sm" data-act="enter" data-v="' + c.id + '">修改评分</button>'; }
      else if (op) { st = '<span class="gd">' + (isCur ? "● 正在评分" : "已开放 · 待评分") + "</span>"; cls += " on"; btn = '<button class="btn sm" data-act="enter" data-v="' + c.id + '">进入评分</button>'; }
      else { st = '<span class="dim">🔒 尚未开放</span>'; cls += " off"; }
      h += '<div class="' + cls + '"><div class="row-b"><span class="mono gd2">CASE ' + pad(i + 1) + "</span>" + st + '</div><div class="sm2">' + esc(c.region) + "大区 · " + esc(c.name) + '</div><div class="ctitle">' + esc(c.title) + "</div>" + btn + "</div>";
    });
    return h + '<div class="internal static">仅供内部使用</div></div>';
  }
  function total() { return Object.keys(S.picks).reduce(function (a, k) { return a + S.picks[k]; }, 0); }
  function remain() { return F.CRIT.filter(function (k) { return !k.optional && S.picks[k.k] === undefined; }).length; }
  function score() {
    var d = S.data, c = d.cases.find(function (x) { return x.id === S.caseId; });
    if (!c) { S.view = "list"; return list(); }
    var isEdit = !!(d.scores || {})[c.id], open = (d.opened || []).indexOf(c.id) >= 0, rem = remain(), can = rem === 0 && (isEdit || open);
    var h = '<div class="jwrap"><div class="row-b"><button class="round" data-act="tolist">‹</button><span class="case-pill mono">CASE ' + caseNo(c.id) + " / " + d.cases.length + '</span><span style="width:44px"></span></div>' +
      '<div class="card chead"><div class="sm2">' + esc(c.region) + "大区 · " + esc(c.name) + '</div><div class="ctitle lg">' + esc(c.title) + "</div></div>";
    if (!isEdit && !open) h += '<div class="err">该案例尚未开放评分</div>';
    F.CRIT.forEach(function (k) {
      if (k.group) h += '<div class="grp"><span>' + k.group + "</span><i></i></div>";
      var sel = S.picks[k.k];
      h += '<div class="crit' + (sel === undefined ? "" : " set") + '"><div class="row-b"><span class="cname"><span class="mono dim">' + k.no + "</span>" + k.name + (k.optional ? '<span class="opt">选填</span>' : "") +
        '</span><span class="mono"><b class="' + (sel === undefined ? "dim" : "gd") + '">' + (sel === undefined ? "–" : sel) + "</b> / " + k.max + '</span></div><div class="cdesc">' + esc(k.desc) + '</div><div class="grid">';
      for (var v = 0; v <= k.max; v++) h += '<button class="gbtn' + (sel === v ? " on" : "") + '" data-act="pick" data-v="' + k.k + ":" + v + '">' + v + "</button>";
      h += "</div></div>";
    });
    h += "</div>";
    h += '<div class="sticky"><div class="sticky-in"><div><div class="sm2">当前总分</div><div class="gold-t mono tot">' + total() + ' <small>/ ' + F.MAX_TOTAL + '</small></div></div><button class="btn" style="width:auto;padding:0 26px" data-act="ask"' + (can ? "" : " disabled") + ">" + (isEdit ? "保存修改" : "提交评分") + '</button></div><div class="sticky-t">' +
      (isEdit ? "已评分案例可随时修改，改完点击保存" : !open ? "评分未开放" : rem ? "还有 " + rem + " 项必填未评分" : "加分项为选填，可直接提交") + "</div></div>";
    if (S.confirm) {
      h += '<div class="modal"><div class="modal-box sheet"><div class="modal-t" style="text-align:center">' + (isEdit ? "确认修改评分？" : "确认提交评分？") + '</div><div style="text-align:center"><div class="mono gd2">CASE ' + caseNo(c.id) + '</div><div class="sm2">' + esc(c.title) + '</div><div class="card" style="padding:16px;margin:16px 0"><div class="sm2">当前总分</div><div class="gold-t mono tot xl">' + total() + " <small>/ " + F.MAX_TOTAL + '</small></div></div><div class="dim sm">提交后仍可在案例列表中随时修改</div></div><div class="two"><button class="btn-ghost" data-act="cancel">返回修改</button><button class="btn" data-act="submit"' + (S.busy ? " disabled" : "") + ">" + (S.busy ? "提交中…" : "确认提交") + "</button></div></div></div>";
    }
    return h;
  }
  function success() {
    return '<div class="jfull"><div class="ok-dot">✓</div><div class="ok-t">' + (S.last.edit ? "评分已修改成功" : "评分已提交成功") + '</div><div class="mono gd2">CASE ' + S.last.no + '</div><div class="mono ok-n">' + S.last.total + '<small> / ' + F.MAX_TOTAL + '</small></div><button class="btn-ghost" data-act="tolist">返回案例列表</button></div>';
  }
  function click(e) {
    var t = e.target.closest("[data-act]"); if (!t || t.disabled) return;
    var a = t.dataset.act, v = t.dataset.v;
    if (a === "next") { var j = S.list.find(function (x) { return String(x.id) === S.draft; }); if (j) { S.jid = j.id; S.name = j.name; S.step = "confirm"; go(true); } }
    else if (a === "back") { S.step = "pick"; go(true); }
    else if (a === "ok") { F.store.set("judge", { id: S.jid, name: S.name }); S.step = "in"; S.view = "list"; S.data = null; go(true); refresh(); }
    else if (a === "switch") { F.store.del("judge"); S.step = "pick"; S.draft = ""; S.data = null; refresh(); }
    else if (a === "enter") { var id = +v, sc = (S.data.scores || {})[id]; S.caseId = id; S.picks = sc ? JSON.parse(JSON.stringify(sc.details)) : {}; S.confirm = false; S.view = "score"; go(true); }
    else if (a === "pick") { var p = v.split(":"), k = p[0], n = +p[1], cr = F.CRIT.find(function (x) { return x.k === k; }); if (S.picks[k] === n && cr.optional) delete S.picks[k]; else S.picks[k] = n; render(); }
    else if (a === "tolist") { S.view = "list"; S.confirm = false; go(true); }
    else if (a === "ask") { S.confirm = true; render(); }
    else if (a === "cancel") { S.confirm = false; render(); }
    else if (a === "submit") {
      var isEdit = !!(S.data.scores || {})[S.caseId];
      S.busy = true; render();
      API.saveScore(S.jid, S.caseId, S.picks).then(function (r) {
        S.busy = false; S.confirm = false; S.last = { no: caseNo(S.caseId), total: r.total, edit: isEdit }; S.view = "success"; go(true); refresh();
      }).catch(function (err) { S.busy = false; S.confirm = false; render(); F.toast(err.message); });
    }
  }
  window.JudgeApp = { start: start };
})();
