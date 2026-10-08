// 管理后台：#/admin
(function () {
  var F = FINAL, esc = F.esc, pad = F.pad, C = APP_CONFIG, root;
  var A = { code: F.store.get("code", ""), data: null, page: "live", pending: false, started: false };
  var PAGES = [["overview", "总览"], ["live", "实时评分"], ["cases", "案例管理"], ["judges", "评委管理"], ["votes", "大众投票"], ["results", "最终结果"], ["reveal", "结果揭晓"]];

  function start() {
    root = document.getElementById("root");
    var m = location.hash.match(/admin\/(\w+)/); if (m && PAGES.some(function (p) { return p[0] === m[1]; })) A.page = m[1];
    root.addEventListener("click", click);
    root.addEventListener("change", change);
    root.addEventListener("keydown", function (e) { if (e.target.id === "pwd" && e.key === "Enter") login(); });
    root.addEventListener("focusout", function () { if (A.pending) { A.pending = false; setTimeout(render, 0); } });
    if (A.code) API.login(A.code).then(enter).catch(function () { A.code = ""; F.store.del("code"); showLogin(); });
    else showLogin();
  }
  function showLogin(err) {
    F.bg({ layout: "wide", align: "right", dim: 0 });
    root.innerHTML = '<div class="alogin"><div class="card alog-box"><div class="gold-t alog-t">逐光行动 · 点亮星河</div><div class="alog-s">决赛评分系统 · 管理后台</div>' +
      '<input id="pwd" type="password" placeholder="请输入管理密码" autocomplete="current-password"><button class="btn" data-act="login">进入后台</button>' +
      (err ? '<div class="err">' + esc(err) + "</div>" : "") + "</div></div>";
  }
  function login() {
    var v = (document.getElementById("pwd") || {}).value || "";
    API.login(v).then(function () { A.code = v; F.store.set("code", v); enter(); }).catch(function (e) { showLogin(e.message); });
  }
  function enter() {
    F.plain();
    refresh();
    if (!A.started) { A.started = true; RT.on(refresh); setInterval(refresh, C.PULSE_MS); }
  }
  function refresh() {
    if (!A.code) return;
    return API.state(A.code).then(function (d) {
      A.data = d;
      var ae = document.activeElement;
      if (ae && root.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) A.pending = true; else render();
    }).catch(function (e) { if (/密码/.test(e.message)) { F.store.del("code"); A.code = ""; showLogin(e.message); } });
  }
  function act(p) { return p.then(refresh).catch(function (e) { F.toast(e.message); }); }

  function render() {
    if (!A.data) return;
    var M = F.compute(A.data), d = A.data, cur = d.cases.findIndex(function (c) { return c.id === d.current_case_id; });
    var open = cur >= 0 && d.opened.indexOf(d.current_case_id) >= 0;
    var liveT = cur < 0 ? "尚未选择案例" : open ? "直播中 · CASE " + pad(cur + 1) + " 评分进行中" : "CASE " + pad(cur + 1) + " 待开放评分";
    var page = { overview: overview, live: live, cases: cases, judges: judges, votes: votes, results: results, reveal: reveal }[A.page](M, d, cur, open);
    var y = window.scrollY;
    root.innerHTML = '<div class="adm"><aside class="side"><div class="brand"><div class="gold-t b1">逐光行动 · 点亮星河</div><div class="b2">决赛评分系统</div></div><nav>' +
      PAGES.map(function (p) { return '<a class="' + (p[0] === A.page ? "on" : "") + '" data-act="page" data-v="' + p[0] + '">' + p[1] + "</a>"; }).join("") +
      '</nav><div class="me"><span class="av">管</span><span>管理员</span><button class="lnk" data-act="logout">退出</button></div></aside>' +
      '<main class="main"><header class="mh"><h1>' + PAGES.find(function (p) { return p[0] === A.page; })[1] + '</h1><span class="live"><i style="background:' + (open ? "#f6cf7c" : "#8d93c9") + '"></i>' + liveT + "</span></header>" + page + "</main></div>";
    window.scrollTo(0, y);
  }
  function stat(label, val, sub, hl) { return '<div class="stat' + (hl ? " hl" : "") + '"><span>' + label + '</span><b class="mono">' + val + (sub ? "<small> " + sub + "</small>" : "") + "</b></div>"; }
  function judgeChips(M, d, cid) {
    return M.judges.map(function (j) {
      var s = M.sc[cid + "-" + j.id];
      return '<div class="jchip' + (s ? " done" : "") + '"><span class="ck">' + (s ? "✓" : "") + "</span><span>" + esc(j.name) + '</span><span class="mono t">' + (s ? s.at : "等待") + "</span></div>";
    }).join("");
  }
  function overview(M, d, cur, open) {
    var nC = d.cases.length, nJ = M.judges.length, sub = d.scores.filter(function (s) { return M.judges.some(function (j) { return j.id === s.judge_id; }); }).length, cc = d.cases[cur];
    var h = '<div class="stats">' + stat("参赛案例", nC) + stat("评委人数", nJ) + stat("已提交评分", sub, "/ " + nC * nJ) + stat("完成度", Math.round(sub / Math.max(1, nC * nJ) * 100) + "%") + stat("当前案例", cur >= 0 ? "CASE " + pad(cur + 1) : "—", "/ " + nC, true) + "</div>";
    h += '<div class="cols2"><div class="card pad">';
    if (cc) {
      var n = M.rows[cur].n;
      h += '<div class="row-b"><b>当前案例评分状态</b><span class="pill">' + (open ? "评分已开放" : "待开放评分") + '</span></div><div class="row-b" style="margin:14px 0"><div><div class="mono gd2">CASE ' + pad(cur + 1) + '</div><div class="ctitle">' + esc(cc.region + " - " + cc.name + " - " + cc.title) + '</div></div><div class="mono big">' + n + "<small> / " + nJ + '</small></div></div><div class="bar"><i style="width:' + Math.round(n / Math.max(1, nJ) * 100) + '%"></i></div><div class="jgrid">' + judgeChips(M, d, cc.id) + "</div>";
      var w = M.judges.filter(function (j) { return !M.sc[cc.id + "-" + j.id]; }).map(function (j) { return esc(j.name); });
      h += '<div class="muted sm">未提交：<span class="gd">' + (w.join("、") || "全部已提交") + "</span></div>";
    } else h += '<div class="muted">请到「实时评分」选择并开放第一个案例。</div>';
    h += '</div><div class="card pad"><div class="row-b"><b>评委平均分</b><span class="muted sm">实时计算</span></div><table><tr><th>Case</th><th>大区 - 姓名</th><th class="r">已评</th><th class="r">平均分</th></tr>' +
      M.rows.map(function (r) { return "<tr><td class=\"mono gd2\">" + r.no + "</td><td>" + esc(r.c.region + " - " + r.c.name) + '</td><td class="r mono muted">' + r.n + "/" + nJ + '</td><td class="r mono gd">' + (r.avg == null ? "—" : r.avg.toFixed(2)) + "</td></tr>"; }).join("") + "</table></div></div>";
    return h;
  }
  function live(M, d, cur, open) {
    var nC = d.cases.length, nJ = M.judges.length, cc = d.cases[cur], h = "";
    if (cc) {
      var n = M.rows[cur].n;
      h += '<div class="hero"><div class="hero-l"><div class="lbl">CURRENT CASE</div><div class="gold-t mono hero-n">CASE ' + pad(cur + 1) + " <small>/ " + nC + '</small></div><div class="muted">' + esc(cc.region) + "大区 · " + esc(cc.name) + '</div><div class="hero-t">' + esc(cc.title) + '</div></div><div class="hero-r"><div class="row-b"><span class="mono big">' + n + "<small> / " + nJ + '</small></span><span class="muted sm">位评委已提交</span></div><div class="bar lg"><i style="width:' + Math.round(n / Math.max(1, nJ) * 100) + '%"></i></div><span class="pill">' + (open ? "评分已开放" : "待开放评分") + "</span></div></div>";
    } else h += '<div class="hero"><div class="hero-l"><div class="lbl">CURRENT CASE</div><div class="hero-t">尚未选择案例 · 点击下方任一案例开始</div></div></div>';
    h += '<div class="ctrl"><button class="btn-ghost" data-act="prev"' + (cur <= 0 ? " disabled" : "") + '>← 上一个案例</button><button class="btn"' + (cc && !open ? ' data-act="open"' : " disabled") + ">" + (open ? "✓ 评分已开放" : "开放评分") + '</button><button class="btn-ghost" data-act="nextc"' + (cur >= nC - 1 ? " disabled" : "") + ">下一个案例 →</button></div>";
    h += '<div class="card pad"><div class="row-b"><b>案例星图</b><span class="muted sm">点击任意案例直接调出（切换后需再点「开放评分」）</span></div><div class="smap">' +
      M.rows.map(function (r) {
        var isCur = r.idx === cur, op = d.opened.indexOf(r.c.id) >= 0, full = r.n === nJ && nJ > 0;
        return '<button class="sdot' + (isCur ? " cur" : full ? " full" : op ? " op" : "") + '" data-act="cur" data-v="' + r.c.id + '"><span class="st">✦</span><span class="mono">CASE ' + r.no + "</span><b>" + esc(r.c.name) + '</b><span class="mono sm">' + r.n + "/" + nJ + "</span></button>";
      }).join("") + "</div></div>";
    if (cc) h += '<div class="card pad"><b>评委提交状态 · CASE ' + pad(cur + 1) + '</b><div class="jgrid">' + judgeChips(M, d, cc.id) + "</div></div>";
    h += '<div class="card pad"><div class="row-b"><b>评分矩阵</b><span class="muted sm">评委 × 案例 · 单元格为总分</span></div><div class="mx-w"><table class="mx"><tr><th>评委</th>' +
      M.rows.map(function (r) { return '<th class="c' + (r.idx === cur ? " cur" : "") + '">' + r.no + "</th>"; }).join("") + '<th class="c">已评</th></tr>' +
      M.judges.map(function (j) {
        var cnt = 0;
        return "<tr><td>" + esc(j.name) + "</td>" + M.rows.map(function (r) { var s = M.sc[r.c.id + "-" + j.id]; if (s) cnt++; return '<td class="c mono' + (r.idx === cur ? " cur" : "") + (s ? "" : " dim") + '">' + (s ? s.total : "·") + "</td>"; }).join("") + '<td class="c mono muted">' + cnt + "/" + nC + "</td></tr>";
      }).join("") +
      '<tr class="avg"><td>平均分</td>' + M.rows.map(function (r) { return '<td class="c mono gd' + (r.idx === cur ? " cur" : "") + '">' + (r.avg == null ? "—" : r.avg.toFixed(1)) + "</td>"; }).join("") + "<td></td></tr></table></div></div>";
    return h;
  }
  function cases(M, d) {
    return '<div class="row-b bar-top"><span class="muted sm">共 ' + d.cases.length + ' 个案例 · 点 ↑↓ 调整上场顺序 · 显示名自动生成「大区 - 姓名 - 案例名称」</span><button class="btn-sm gold" data-act="addCase">+ 添加案例</button></div>' +
      '<div class="card pad"><table><tr><th>序号</th><th>大区</th><th>姓名</th><th>案例名称</th><th>评分状态</th><th class="r">已评</th><th class="r">操作</th></tr>' +
      M.rows.map(function (r, i) {
        var op = d.opened.indexOf(r.c.id) >= 0, isCur = r.c.id === d.current_case_id;
        return '<tr><td class="mono gd2">' + r.no + "</td><td>" + esc(r.c.region) + "</td><td>" + esc(r.c.name) + "</td><td>" + esc(r.c.title) + '</td><td class="' + (isCur && op ? "gd" : op ? "" : "dim") + '">' + (isCur && op ? "● 评分中" : op ? "已开放" : "未开放") +
          '</td><td class="r mono muted">' + r.n + "/" + M.judges.length + '</td><td class="r nowrap"><button class="btn-sm" data-act="up" data-v="' + i + '"' + (i === 0 ? " disabled" : "") + '>↑</button> <button class="btn-sm" data-act="down" data-v="' + i + '"' + (i === d.cases.length - 1 ? " disabled" : "") + '>↓</button> <button class="btn-sm" data-act="editCase" data-v="' + r.c.id + '">编辑</button> <button class="btn-sm danger" data-act="delCase" data-v="' + r.c.id + '">删除</button></td></tr>';
      }).join("") + "</table></div>";
  }
  function judges(M, d) {
    var nC = d.cases.length;
    return '<div class="row-b bar-top"><span class="muted sm">共 ' + d.judges.length + " 位评委 · 启用 " + M.judges.length + ' 位 · 停用的评委不计入进度和平均分，重新启用后恢复</span><span class="nowrap"><button class="btn-sm" data-act="qrAll">通用入口二维码</button> <button class="btn-sm" data-act="qrPrint">打印全部评委二维码</button> <button class="btn-sm gold" data-act="addJudge">+ 添加评委</button></span></div>' +
      '<div class="card pad"><table><tr><th>#</th><th>评委姓名</th><th>职位</th><th>状态</th><th>评分进度</th><th class="r">操作</th></tr>' +
      d.judges.map(function (j, i) {
        var done = d.scores.filter(function (s) { return s.judge_id === j.id; }).length;
        return '<tr style="opacity:' + (j.active ? 1 : .55) + '"><td class="mono muted">' + pad(i + 1) + "</td><td>" + esc(j.name) + '</td><td class="' + (j.title ? "" : "dim") + '">' + esc(j.title || "未填写") + '</td><td class="' + (j.active ? "ok" : "dim") + '">● ' + (j.active ? "启用" : "已停用") +
          '</td><td><div class="prog"><div class="bar"><i style="width:' + Math.round(done / Math.max(1, nC) * 100) + '%"></i></div><span class="mono">' + done + "/" + nC + '</span></div></td><td class="r nowrap"><button class="btn-sm" data-act="qrJudge" data-v="' + j.id + '">二维码</button> <button class="btn-sm" data-act="clearJudge" data-v="' + j.id + '"' + (done ? "" : " disabled") + '>清空评分</button> <button class="btn-sm" data-act="toggleJudge" data-v="' + j.id + '">' + (j.active ? "停用" : "启用") + '</button> <button class="btn-sm" data-act="editJudge" data-v="' + j.id + '">编辑</button> <button class="btn-sm danger" data-act="delJudge" data-v="' + j.id + '">删除</button></td></tr>';
      }).join("") + "</table></div>";
  }
  function votes(M, d) {
    var tot = M.rows.reduce(function (a, r) { return a + (r.votes || 0); }, 0), ent = M.rows.filter(function (r) { return r.votes != null; }).length;
    return '<div class="stats s3">' + stat("已录入", ent, "/ " + d.cases.length) + stat("总票数", tot) + stat("排名规则", "票数高→低", "同票同名次") + "</div>" +
      '<div class="card pad"><table><tr><th>Case</th><th>大区 - 姓名 - 案例名称</th><th style="width:180px">票数</th><th class="r">大众排名</th></tr>' +
      M.rows.map(function (r) { return '<tr><td class="mono gd2">' + r.no + "</td><td>" + esc(r.c.region + " - " + r.c.name + " - " + r.c.title) + '</td><td><input class="vin mono" inputmode="numeric" data-vote="' + r.c.id + '" value="' + (r.votes == null ? "" : r.votes) + '" placeholder="输入票数"></td><td class="r mono big2">' + (r.pr || "—") + "</td></tr>"; }).join("") +
      '</table><div class="muted sm" style="margin-top:10px">输入后按回车或点击别处自动保存。</div></div>';
  }
  function results(M, d) {
    return '<div class="row-b bar-top"><span class="muted sm">最终排名 = 评委排名 × 80% + 大众排名 × 20%（数值越小越靠前）· 同分同名次，后面顺延</span><span><button class="btn-sm" data-act="csv">导出 CSV</button> <button class="btn-sm danger" data-act="reset">清空评分数据</button></span></div>' +
      '<div class="card pad"><table><tr><th>最终排名</th><th>案例</th><th class="r">评委平均分</th><th class="r">评委排名</th><th class="r">大众票数</th><th class="r">大众排名</th><th class="r">综合值</th><th>奖项</th></tr>' +
      M.order.map(function (r) {
        var aw = r.final ? F.award(r.final) : "";
        return '<tr class="' + (aw ? "top" : "") + '"><td class="mono big2 ' + (aw ? "gd" : "") + '">' + (r.final || "—") + (r.tied ? '<small class="dim"> 并列</small>' : "") + '</td><td><div class="mono gd2 sm">CASE ' + r.no + (r.n < M.judges.length ? '<span class="dim"> · 评分中 ' + r.n + "/" + M.judges.length + "</span>" : "") + "</div>" + esc(r.c.region + " - " + r.c.name + " - " + r.c.title) +
          '</td><td class="r mono">' + (r.avg == null ? "—" : r.avg.toFixed(2)) + '</td><td class="r mono">' + (r.jr || "—") + '</td><td class="r mono">' + (r.votes == null ? "—" : r.votes) + '</td><td class="r mono">' + (r.pr || "—") + '</td><td class="r mono">' + (r.comp == null ? "—" : r.comp.toFixed(1)) + "</td><td>" + (aw ? '<span class="pill gold">' + aw + "</span>" : "") + "</td></tr>";
      }).join("") + "</table></div>";
  }
  function reveal(M, d) {
    var rv = d.reveal_step || 0, rk = M.ranked;
    var B = function (k) { return 1 << (k - 1); }, ON = function (k) { return (rv & B(k)) !== 0; }, nk = [6, 5, 4, 3, 2, 1, 7].find(function (k) { return !ON(k); }) || 0;
    var steps = [6, 5, 4, 3, 2, 1].map(function (k) {
      var r = rk[k - 1], done = ON(k), nx = k === nk;
      return "<tr><td>第 " + k + " 名</td><td>" + F.award(k) + "</td><td>" + (done && r ? "CASE " + r.no + " · " + esc(r.c.region + " - " + r.c.name) + " · No." + r.final : "—") + '</td><td class="r ' + (done ? "gd" : nx ? "gd2" : "dim") + '">' + (done ? "已揭晓" : nx ? "下一个" : "待揭晓") + "</td></tr>";
    }).join("") + "<tr><td>第 7–12 名</td><td>优胜奖</td><td>" + (ON(7) ? "已一键放出" : "—") + '</td><td class="r ' + (ON(7) ? "gd" : nk === 7 ? "gd2" : "dim") + '">' + (ON(7) ? "已揭晓" : nk === 7 ? "下一个" : "待揭晓") + "</td></tr>";
    var label = !nk ? "已全部揭晓" : nk === 7 ? "放出优胜奖（第 7–12 名）" : "揭晓第 " + nk + " 名";
    return '<div class="cols2 rv"><div class="card pad"><b>揭晓顺序</b>' + (rk.length < d.cases.length ? '<div class="err">评分尚未全部完成（已排名 ' + rk.length + " / " + d.cases.length + "），请确认后再揭晓</div>" : "") + "<table>" + steps + '</table></div><div class="rv-side"><button class="btn" data-act="revNext"' + (!nk ? " disabled" : "") + ">" + label + '</button><button class="btn-ghost" data-act="revReset">重置揭晓</button><div class="card pad sm muted">揭晓大屏在另一台电脑打开：<br><a href="' + esc(C.SITE_URL) + '#/reveal" target="_blank">' + esc(C.SITE_URL) + "#/reveal</a><br>输入同一管理密码后投屏。这里每点一次，大屏同步揭晓并放烟花；也可以直接在大屏上点击任一奖位单独揭晓。</div>" +
      '<div class="card pad sm muted">评委扫码入口：<br><a href="' + esc(C.SITE_URL) + '#/judge" target="_blank">' + esc(C.SITE_URL) + "#/judge</a></div></div></div>";
  }
  function caseForm(c) {
    F.modal(c ? "编辑案例" : "添加案例", '<div class="form"><label>大区<input id="f_r" value="' + esc(c ? c.region : "") + '" placeholder="如：沪闽"></label><label>姓名<input id="f_n" value="' + esc(c ? c.name : "") + '" placeholder="参赛者姓名"></label><label>案例名称<input id="f_t" value="' + esc(c ? c.title : "") + '" placeholder="案例名称"></label></div>', [
      { label: "取消" },
      { label: "保存", primary: true, onClick: function (close, w) {
        var o = { region: w.querySelector("#f_r").value, name: w.querySelector("#f_n").value, title: w.querySelector("#f_t").value };
        if (c) o.id = c.id;
        API.saveCase(A.code, o).then(function () { close(); refresh(); }).catch(function (e) { F.toast(e.message); });
      } }
    ]);
  }
  function judgeForm(j) {
    F.modal(j ? "编辑评委" : "添加评委", '<div class="form"><label>评委姓名<input id="f_n" value="' + esc(j ? j.name : "") + '"></label><label>职位（选填）<input id="f_t" value="' + esc(j ? j.title : "") + '"></label></div>', [
      { label: "取消" },
      { label: "保存", primary: true, onClick: function (close, w) {
        var o = { name: w.querySelector("#f_n").value, title: w.querySelector("#f_t").value };
        if (j) o.id = j.id;
        API.saveJudge(A.code, o).then(function () { close(); refresh(); }).catch(function (e) { F.toast(e.message); });
      } }
    ]);
  }
  function confirmBox(title, msg, label, fn) {
    F.modal(title, '<div class="muted">' + msg + "</div>", [{ label: "取消" }, { label: label, danger: true, onClick: function (close) { close(); act(fn()); } }]);
  }
  function judgeUrl(id) { return C.SITE_URL.replace(/\/?$/, "/") + "#/judge" + (id ? "?j=" + id : ""); }
  function showQR(title, name, url, tip) {
    F.modal(title, '<div class="qr-card"><div class="qr">' + QR.svg(url, 260) + '</div><div class="qn">' + esc(name) + '</div><div class="sm muted">' + esc(tip) + '</div><div class="ql">' + esc(url) + "</div></div>", [{ label: "关闭" }]);
  }
  function printQR(list) {
    var w = window.open("", "_blank"); if (!w) return F.toast("请允许弹出窗口");
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>评委二维码</title><style>body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}.g{display:grid;grid-template-columns:repeat(3,1fr)}.c{border:1px dashed #bbb;padding:18px 10px;text-align:center;page-break-inside:avoid}.n{font-size:22px;font-weight:700;margin-top:6px}.s{font-size:11px;color:#666;margin-top:4px}.h{text-align:center;padding:14px;font-size:16px}@media print{.h{display:none}}</style></head><body><div class="h">逐光行动 · 点亮星河 · 决赛评委专属二维码（Ctrl+P 打印后裁开分发）</div><div class="g">' +
      list.map(function (j) { return '<div class="c">' + QR.svg(judgeUrl(j.id), 180) + '<div class="n">' + esc(j.name) + ' 评委</div><div class="s">逐光行动 · 决赛评分 · 仅限本人使用</div></div>'; }).join("") + "</div></body></html>");
    w.document.close();
  }
  function click(e) {
    var t = e.target.closest("[data-act]"); if (!t || t.disabled) return;
    var a = t.dataset.act, v = t.dataset.v, d = A.data;
    if (a === "login") return login();
    if (a === "logout") { F.store.del("code"); A.code = ""; showLogin(); return; }
    if (a === "page") { A.page = v; history.replaceState(null, "", "#/admin/" + v); render(); window.scrollTo(0, 0); return; }
    var cur = d.cases.findIndex(function (c) { return c.id === d.current_case_id; });
    if (a === "prev" && cur > 0) act(API.setCurrent(A.code, d.cases[cur - 1].id));
    else if (a === "nextc" && cur < d.cases.length - 1) act(API.setCurrent(A.code, d.cases[cur + 1].id));
    else if (a === "open") act(API.openCase(A.code, d.current_case_id));
    else if (a === "cur") act(API.setCurrent(A.code, +v));
    else if (a === "addCase") caseForm(null);
    else if (a === "editCase") caseForm(d.cases.find(function (c) { return c.id === +v; }));
    else if (a === "delCase") { var c = d.cases.find(function (x) { return x.id === +v; }); confirmBox("删除案例", "确定删除「" + esc(c.region + " - " + c.name + " - " + c.title) + "」？该案例的所有评分和票数将一并删除。", "确认删除", function () { return API.deleteCase(A.code, c.id); }); }
    else if (a === "up" || a === "down") {
      var i = +v, j = a === "up" ? i - 1 : i + 1, ids = d.cases.map(function (c) { return c.id; });
      ids.splice(j, 0, ids.splice(i, 1)[0]); act(API.reorderCases(A.code, ids));
    }
    else if (a === "addJudge") judgeForm(null);
    else if (a === "editJudge") judgeForm(d.judges.find(function (x) { return x.id === +v; }));
    else if (a === "toggleJudge") { var jj = d.judges.find(function (x) { return x.id === +v; }); act(API.setJudgeActive(A.code, jj.id, !jj.active)); }
    else if (a === "clearJudge") { var jc = d.judges.find(function (x) { return x.id === +v; }), nc = d.scores.filter(function (s) { return s.judge_id === jc.id; }).length; confirmBox("清空评委评分", "确定清空评委「" + esc(jc.name) + "」的全部 " + nc + " 条评分？评委本人保留，可以重新打分。此操作无法撤销。", "确认清空", function () { return API.clearJudge(A.code, jc.id); }); }
    else if (a === "qrJudge") { var jq = d.judges.find(function (x) { return x.id === +v; }); showQR(jq.name + " 评委专属二维码", jq.name, judgeUrl(jq.id), "扫码后直接进入该评委的身份确认页"); }
    else if (a === "qrAll") showQR("评委通用入口", "评委评分入口", judgeUrl(null), "扫码后在下拉框选择自己的姓名");
    else if (a === "qrPrint") printQR(d.judges.filter(function (x) { return x.active; }));
    else if (a === "delJudge") { var jd = d.judges.find(function (x) { return x.id === +v; }); confirmBox("删除评委", "确定删除评委「" + esc(jd.name) + "」？TA 的所有评分将一并删除。如只是暂时不参与，请用「停用」。", "确认删除", function () { return API.deleteJudge(A.code, jd.id); }); }
    else if (a === "revNext") act(API.setReveal(A.code, (function (rv) { var k = [6, 5, 4, 3, 2, 1, 7].find(function (k) { return !(rv & (1 << (k - 1))); }); return k ? rv | (1 << (k - 1)) : rv; })(d.reveal_step || 0)));
    else if (a === "revReset") act(API.setReveal(A.code, 0));
    else if (a === "reset") confirmBox("清空评分数据", "将删除全部评委评分、大众票数，并重置开放状态和揭晓进度（案例和评委保留）。一般在彩排结束后使用。", "确认清空", function () { return API.reset(A.code); });
    else if (a === "csv") exportCsv();
  }
  function change(e) {
    var id = e.target.dataset.vote; if (!id) return;
    var raw = e.target.value.replace(/[^\d]/g, ""), v = raw === "" ? null : +raw;
    act(API.setVote(A.code, +id, v));
  }
  function exportCsv() {
    var M = F.compute(A.data), head = ["最终排名", "Case", "大区", "姓名", "案例名称", "评委平均分", "评委排名", "大众票数", "大众排名", "综合值", "奖项"];
    M.judges.forEach(function (j) { head.push(j.name); });
    var lines = [head.join(",")];
    M.order.forEach(function (r) {
      var row = [r.final || "", r.no, r.c.region, r.c.name, r.c.title, r.avg == null ? "" : r.avg.toFixed(2), r.jr || "", r.votes == null ? "" : r.votes, r.pr || "", r.comp == null ? "" : r.comp.toFixed(2), r.final ? F.award(r.final) : ""];
      M.judges.forEach(function (j) { var s = M.sc[r.c.id + "-" + j.id]; row.push(s ? s.total : ""); });
      lines.push(row.map(function (x) { x = String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(","));
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "决赛评分结果.csv"; a.click();
  }
  window.AdminApp = { start: start };
})();
