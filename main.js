// 路由：#/judge 评委端 · #/admin 后台 · #/reveal 揭晓大屏
(function () {
  function app() { var h = location.hash; return /^#\/?admin/.test(h) ? "admin" : /^#\/?reveal/.test(h) ? "reveal" : /^#\/?judge/.test(h) ? "judge" : ""; }
  var cur = app();
  window.addEventListener("hashchange", function () { if (app() !== cur) location.reload(); });
  if (cur === "admin") return AdminApp.start();
  if (cur === "reveal") return RevealApp.start();
  if (cur === "judge") return JudgeApp.start();
  FINAL.bg({ layout: innerWidth < innerHeight ? "tall" : "wide", dim: .45 });
  document.getElementById("root").innerHTML = '<div class="jfull">' + FINAL.titleFx(46) + '<div class="jsub">决赛评分系统</div><div class="card jpick"><a class="btn" href="#/judge">评委评分入口</a><a class="btn-ghost" href="#/admin">管理后台</a><a class="btn-ghost" href="#/reveal">结果揭晓大屏</a></div><div class="internal">仅供内部使用</div></div>';
})();
