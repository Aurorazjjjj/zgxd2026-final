// 公共：评分标准、排名计算、工具函数
(function () {
  var CRIT = [
    { k: "c1", no: "01", name: "识别问题", max: 5, group: "价值性（60%）", desc: "清晰锁定业务问题或挑战，明确给业务带来的影响。" },
    { k: "c2", no: "02", name: "洞察剖析", max: 10, desc: "1、深入剖析挑战背后隐藏的真正原因，聚焦问题关键卡点\n2、清楚还原医疗机构医生的顾虑及出现新的问题" },
    { k: "c3", no: "03", name: "业务价值", max: 10, desc: "1、给医疗机构客户、患者带来价值\n2、给市场推广带来价值\n3、有阶段性成果呈现" },
    { k: "c4", no: "04", name: "复制推广", max: 15, group: "可复制性（40%）", desc: "1、该案例在全国/区域范围内广泛复制难易程度\n2、形成简单易行的可复制路径" },
    { k: "c5", no: "05", name: "复制验证", max: 10, desc: "1、复制已成功案例或形成的路径已被复制验证\n2、有清晰的过程管理" },
    { k: "c6", no: "06", name: "加分项", max: 10, optional: true, group: "其他表现优异加分项", desc: "演讲能力，提炼总结能力，应变能力" }
  ];
  var MAX_TOTAL = 60;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return String(n).padStart(2, "0"); }
  // 同分同名次，后面顺延（1,1,3）
  function rankBy(rows, key, out) {
    var s = rows.filter(function (r) { return r[key] != null; }).sort(function (a, b) { return b[key] - a[key]; });
    s.forEach(function (r, k) { r[out] = k > 0 && Math.abs(s[k - 1][key] - r[key]) < 1e-9 ? s[k - 1][out] : k + 1; });
  }
  function compute(d) {
    var judges = d.judges.filter(function (j) { return j.active; }), sc = {};
    d.scores.forEach(function (s) { sc[s.case_id + "-" + s.judge_id] = s; });
    var rows = d.cases.map(function (c, i) {
      var list = judges.map(function (j) { return sc[c.id + "-" + j.id]; }).filter(Boolean), n = list.length;
      var v = d.votes[c.id];
      return { c: c, idx: i, no: pad(i + 1), n: n, avg: n ? list.reduce(function (a, b) { return a + b.total; }, 0) / n : null, votes: v == null ? null : +v, jr: null, pr: null, final: null };
    });
    rankBy(rows, "avg", "jr"); rankBy(rows, "votes", "pr");
    rows.forEach(function (r) { r.comp = r.jr && r.pr ? r.jr * 0.8 + r.pr * 0.2 : null; });
    var order = rows.slice().sort(function (a, b) {
      if (a.comp == null && b.comp == null) return a.idx - b.idx;
      if (a.comp == null) return 1; if (b.comp == null) return -1;
      return a.comp - b.comp || a.idx - b.idx;
    });
    order.forEach(function (r, k) { if (r.comp == null) return; var p = order[k - 1]; r.final = k > 0 && p.comp != null && Math.abs(p.comp - r.comp) < 1e-9 ? p.final : k + 1; });
    order.forEach(function (r) { r.tied = r.final != null && order.some(function (q) { return q !== r && q.final === r.final; }); });
    return { rows: rows, order: order, ranked: order.filter(function (r) { return r.final != null; }), judges: judges, sc: sc };
  }
  function award(k) { return k === 1 ? "一等奖" : k <= 3 ? "二等奖" : k <= 6 ? "三等奖" : ""; }
  var METAL = {
    gold: ["linear-gradient(135deg,#fff5cc 0%,#f6c65a 38%,#b8761c 68%,#ffe08a 100%)", "#e6a93f", "#5a3a12", "drop-shadow(0 0 14px rgba(255,200,100,.75))"],
    silver: ["linear-gradient(135deg,#ffffff 0%,#d3d8ec 38%,#7c86a8 68%,#eef1ff 100%)", "#b9c0dc", "#3a4060", "drop-shadow(0 0 12px rgba(200,210,255,.6))"],
    bronze: ["linear-gradient(135deg,#ffe1bf 0%,#dd9255 38%,#8a4a1f 68%,#f4b57c 100%)", "#c9783c", "#4a2410", "drop-shadow(0 0 12px rgba(230,150,90,.55))"],
    dim: ["linear-gradient(135deg,rgba(200,205,240,.35),rgba(120,128,180,.25))", "rgba(170,178,230,.3)", "rgba(90,96,150,.35)", "none"]
  };
  function trophy(metal, size) {
    var m = METAL[metal] || METAL.gold, k = size / 64, a = "position:absolute;";
    return '<div style="position:relative;flex:none;width:' + size + 'px;height:' + Math.round(76 * k) + 'px;filter:' + m[3] + '">' +
      '<div style="' + a + 'left:0;top:0;width:64px;height:76px;transform-origin:0 0;transform:scale(' + k + ')">' +
      '<div style="' + a + 'left:1px;top:5px;width:22px;height:22px;box-sizing:border-box;border-radius:50%;border:5px solid ' + m[1] + '"></div>' +
      '<div style="' + a + 'right:1px;top:5px;width:22px;height:22px;box-sizing:border-box;border-radius:50%;border:5px solid ' + m[1] + '"></div>' +
      '<div style="' + a + 'left:12px;top:0;width:40px;height:36px;border-radius:3px 3px 22px 22px;background:' + m[0] + ';box-shadow:inset -4px -4px 8px rgba(0,0,0,.25),inset 3px 2px 5px rgba(255,255,255,.55)"></div>' +
      '<div style="' + a + 'left:25px;top:9px;width:14px;height:14px;background:rgba(255,255,255,.85);clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"></div>' +
      '<div style="' + a + 'left:28px;top:35px;width:8px;height:12px;background:' + m[0] + '"></div>' +
      '<div style="' + a + 'left:18px;top:46px;width:28px;height:7px;border-radius:3px;background:' + m[0] + '"></div>' +
      '<div style="' + a + 'left:12px;top:53px;width:40px;height:14px;border-radius:3px;background:' + m[2] + ';box-shadow:inset 0 2px 0 rgba(255,255,255,.25)"></div>' +
      '</div></div>';
  }
  function titleFx(size) {
    var stars = [["6%", "12%", 18, 0, 2.4], ["48%", "4%", 12, .9, 2.8], ["94%", "30%", 20, 1.6, 2.2], ["30%", "52%", 10, 2.1, 3], ["72%", "60%", 14, .4, 2.6], ["2%", "82%", 12, 1.3, 2.9], ["88%", "94%", 16, 2.4, 2.5], ["58%", "100%", 9, .7, 3.2]];
    return '<div class="tfx" style="font-size:' + size + 'px"><span class="gold-t">逐光行动<br>点亮星河</span><span class="tfx-sh" aria-hidden="true">逐光行动<br>点亮星河</span>' +
      stars.map(function (s) { return '<i class="tstar" style="left:' + s[0] + ';top:' + s[1] + ';width:' + s[2] + 'px;height:' + s[2] + 'px;animation-delay:' + s[3] + 's;animation-duration:' + s[4] + 's"></i>'; }).join("") + "</div>";
  }
  var bgInst = null;
  function bg(opt) { var h = document.getElementById("bg"); if (bgInst) bgInst.destroy(); h.className = ""; bgInst = Galaxy.mount(h, opt); return bgInst; }
  function plain() { var h = document.getElementById("bg"); if (bgInst) { bgInst.destroy(); bgInst = null; } h.className = "plain"; }
  function modal(title, html, actions) {
    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = '<div class="modal-box"><div class="modal-t">' + esc(title) + "</div><div class=\"modal-b\">" + html + '</div><div class="modal-a"></div></div>';
    var bar = wrap.querySelector(".modal-a");
    function close() { wrap.remove(); }
    (actions || [{ label: "关闭" }]).forEach(function (a) {
      var b = document.createElement("button");
      b.className = "btn-sm" + (a.primary ? " gold" : "") + (a.danger ? " danger" : "");
      b.textContent = a.label;
      b.onclick = function () { if (a.onClick) a.onClick(close, wrap); else close(); };
      bar.appendChild(b);
    });
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    var f = wrap.querySelector("input"); if (f) setTimeout(function () { f.focus(); }, 30);
    return close;
  }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  var store = {
    get: function (k, def) { try { var v = localStorage.getItem("zgxdf_" + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem("zgxdf_" + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem("zgxdf_" + k); } catch (e) {} }
  };
  window.FINAL = { CRIT: CRIT, MAX_TOTAL: MAX_TOTAL, esc: esc, pad: pad, compute: compute, award: award, trophy: trophy, titleFx: titleFx, bg: bg, plain: plain, modal: modal, toast: toast, store: store };
})();
