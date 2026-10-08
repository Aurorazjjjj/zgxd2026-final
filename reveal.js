// 结果揭晓大屏：#/reveal（由后台「结果揭晓」远程控制；本机空格键 / → 也可揭晓下一名）
(function () {
  var F = FINAL, esc = F.esc, root, stage, fw, R = { code: F.store.get("code", ""), data: null, prev: null };

  function start() {
    root = document.getElementById("root");
    F.bg({ layout: "wide", dim: .52 });
    if (!R.code) return loginView();
    API.login(R.code).then(go).catch(function () { F.store.del("code"); R.code = ""; loginView(); });
  }
  function loginView(err) {
    root.innerHTML = '<div class="alogin center"><div class="card alog-box"><div class="gold-t alog-t">逐光行动 · 点亮星河</div><div class="alog-s">结果揭晓大屏</div><input id="pwd" type="password" placeholder="请输入管理密码"><button class="btn" id="go">进入大屏</button>' + (err ? '<div class="err">' + esc(err) + "</div>" : "") + "</div></div>";
    function sub() { var v = document.getElementById("pwd").value; API.login(v).then(function () { R.code = v; F.store.set("code", v); go(); }).catch(function (e) { loginView(e.message); }); }
    document.getElementById("go").onclick = sub;
    document.getElementById("pwd").onkeydown = function (e) { if (e.key === "Enter") sub(); };
  }
  function go() {
    root.innerHTML = '<div class="rv-stage" id="stage"></div><div class="fwc" id="fw"></div>';
    stage = document.getElementById("stage");
    fw = Fireworks.mount(document.getElementById("fw"));
    fit(); window.addEventListener("resize", fit);
    document.addEventListener("keydown", function (e) {
      if ((e.code === "Space" || e.key === "ArrowRight") && R.data) { var nk = nextK(R.data.reveal_step || 0); if (nk) { e.preventDefault(); reveal(nk); } }
    });
    stage.addEventListener("click", function (e) { var el = e.target.closest("[data-k]"); if (el && R.data && !on(R.data.reveal_step || 0, +el.dataset.k)) reveal(+el.dataset.k); });
    document.addEventListener("dblclick", function () { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); });
    refresh(); RT.on(refresh); setInterval(refresh, 3000);
  }
  // reveal_step 为位掩码：第 k 名 = 1<<(k-1)，k=7 表示优胜奖（第 7–12 名）
  function bit(k) { return 1 << (k - 1); }
  function on(rv, k) { return (rv & bit(k)) !== 0; }
  function nextK(rv) { return [6, 5, 4, 3, 2, 1, 7].find(function (k) { return !on(rv, k); }) || 0; }
  function reveal(k) { var rv = R.data.reveal_step || 0; R.data.reveal_step = rv | bit(k); refreshLocal(rv); API.setReveal(R.code, rv | bit(k)).then(refresh); }
  function refreshLocal(prev) { var s = R.data.reveal_step; fireFor(prev, s); R.prev = s; draw(); }
  function fireFor(prev, s) { var nw = s & ~prev; if (!nw) return; for (var k = 1; k <= 7; k++) if (nw & bit(k)) R.last = k; if (nw & 63) fw.fire(!!(nw & 1)); }
  function fit() { var k = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = "translate(-50%,-50%) scale(" + k + ")"; }
  function refresh() {
    return API.state(R.code).then(function (d) {
      var s = d.reveal_step || 0;
      if (R.prev !== null) fireFor(R.prev, s);
      R.prev = s; R.data = d; draw();
    }).catch(function () {});
  }
  function draw() {
    var d = R.data, M = F.compute(d), rv = d.reveal_step || 0, rk = M.ranked;
    function person(r) { return esc(r.c.region) + "大区 · " + esc(r.c.name); }
    function slot(k, tier) {
      var r = rk[k - 1], isOn = on(rv, k) && !!r, latest = isOn && R.last === k;
      var sz = tier === 1 ? 84 : tier === 2 ? 66 : 56, metal = tier === 1 ? "gold" : tier === 2 ? "silver" : "bronze", aw = tier === 1 ? "一等奖" : tier === 2 ? "二等奖" : "三等奖";
      var h = '<div class="slot t' + tier + (isOn ? " on" : " pick") + (latest ? " latest" : "") + '" data-k="' + k + '">';
      if (!isOn) h += '<div class="slot-h">' + F.trophy("dim", sz) + "<span>" + aw + " · 待揭晓</span></div>";
      else h += '<div class="slot-a">' + F.trophy(metal, sz) + '<span class="aw aw' + tier + '">' + aw + '</span></div><div class="slot-i"><span class="mono gd2">CASE ' + r.no + '</span><span class="sp">' + person(r) + '</span><span class="st">' + esc(r.c.title) + "</span></div>";
      return h + "</div>";
    }
    var rest = rk.slice(6, 12);
    stage.innerHTML = '<div class="rv-title"><div class="gold-t">逐光行动 · 点亮星河</div><span>决赛获奖揭晓</span></div>' +
      '<div class="tier">' + slot(1, 1) + '</div><div class="tier">' + slot(2, 2) + slot(3, 2) + '</div><div class="tier">' + slot(4, 3) + slot(5, 3) + slot(6, 3) + "</div>" +
      '<div class="rest">' + (on(rv, 7) ? '<div class="rest-t">优胜奖</div><div class="rest-g">' + rest.map(function (r) { return '<div class="rc"><span class="mono"><em>CASE ' + r.no + "</em></span><b>" + esc(r.c.region + " · " + r.c.name) + "</b></div>"; }).join("") + "</div>" : '<div class="rest-h pick" data-k="7">优胜奖 · 待揭晓</div>') + "</div>" +
      (rk.length < d.cases.length ? '<div class="rv-warn">评分尚未全部完成（已排名 ' + rk.length + " / " + d.cases.length + "）</div>" : "");
  }
  window.RevealApp = { start: start };
})();
