// 动态星河背景：海报原图 + 旋转星系 + 闪烁星芒 + 流星
(function () {
  var IMG = new Image(), loaded = false, waiters = [];
  IMG.onload = function () { loaded = true; waiters.forEach(function (f) { f(); }); waiters = []; };
  IMG.src = "assets/galaxy-bg.png";
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function G(r) { return (r() + r() + r() - 1.5) / 1.5; }
  function off(W, H, d) { var o = document.createElement("canvas"); o.width = Math.max(1, W * d); o.height = Math.max(1, H * d); var x = o.getContext("2d"); x.scale(d, d); return [o, x]; }

  function mount(host, opt) {
    opt = opt || {};
    var cv = document.createElement("canvas"), dm = document.createElement("div");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    dm.style.cssText = "position:absolute;inset:0;transition:background .5s";
    host.appendChild(cv); host.appendChild(dm);
    var W, H, d, g, art, spr, bgc, tw, fl, shots = [], nextShot = 0, t0 = performance.now(), raf, key, dead = false;
    function setDim(v) { dm.style.background = "rgba(3,5,26," + (v || 0) + ")"; }
    setDim(opt.dim);

    function ridge(base, amp, r, ro) {
      var p = [[0, base + G(r) * amp], [W, base + G(r) * amp]], a = amp;
      for (var k = 0; k < 7; k++) { var n = []; for (var i = 0; i < p.length - 1; i++) { n.push(p[i]); n.push([(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2 + G(r) * a]); } n.push(p[p.length - 1]); p = n; a *= ro; }
      return p;
    }
    function mountains(x, r, layers) {
      layers = layers || [[H * .8, H * .08, "#1c2270", .5], [H * .86, H * .06, "#0e1348", .6], [H * .93, H * .05, "#04061a", .7]];
      layers.forEach(function (L, li) {
        var pts = ridge(L[0], L[1], r, L[3]);
        x.beginPath(); x.moveTo(0, H); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(W, H); x.closePath(); x.fillStyle = L[2]; x.fill();
        var e = Math.max(.01, Math.min(.99, g.ex / W)), rim = x.createLinearGradient(0, 0, W, 0);
        rim.addColorStop(0, "rgba(255,200,120,0)"); rim.addColorStop(Math.max(0, e - .25), "rgba(255,200,120,0)");
        rim.addColorStop(e, "rgba(255,215,150," + (.8 - li * .2) + ")"); rim.addColorStop(Math.min(1, e + .25), "rgba(255,200,120,0)"); rim.addColorStop(1, "rgba(255,200,120,0)");
        x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.strokeStyle = rim; x.lineWidth = 1.2; x.stroke();
      });
    }
    function drawStatic(r) {
      var o = off(W, H, d), x = o[1], M = Math.max(W, H), i;
      var gr = x.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, "#030622"); gr.addColorStop(.45, "#0a1250"); gr.addColorStop(.8, "#1a2070"); gr.addColorStop(1, "#2a2468");
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = "lighter";
      var hz = x.createRadialGradient(g.ex, H * .95, 0, g.ex, H * .95, W * .75);
      hz.addColorStop(0, "rgba(255,190,110,.45)"); hz.addColorStop(.4, "rgba(200,120,160,.12)"); hz.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = hz; x.fillRect(0, 0, W, H);
      var A = { x: W * 1.05, y: -H * .05 }, B = { x: -W * .1, y: H * .6 }, nx = -(B.y - A.y), ny = B.x - A.x, nl = Math.hypot(nx, ny);
      var cols = ["rgba(60,90,230,.10)", "rgba(140,90,230,.08)", "rgba(40,130,255,.08)", "rgba(255,200,150,.04)"];
      for (i = 0; i < 70; i++) {
        var t = r(), o2 = G(r) * M * .12, px = A.x + (B.x - A.x) * t + nx / nl * o2, py = A.y + (B.y - A.y) * t + ny / nl * o2, rad = M * (.06 + r() * .14);
        var n = x.createRadialGradient(px, py, 0, px, py, rad); n.addColorStop(0, cols[i % 4]); n.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = n; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
      for (i = 0; i < (W * H) / 180; i++) {
        var t2 = r(), o3 = G(r) * M * .1, qx = A.x + (B.x - A.x) * t2 + nx / nl * o3, qy = A.y + (B.y - A.y) * t2 + ny / nl * o3;
        x.fillStyle = r() < .15 ? "rgba(255,225,170," + (.3 + r() * .6) + ")" : "rgba(200,215,255," + (.2 + r() * .6) + ")";
        var s = r() < .05 ? 1.4 : .6 + r() * .5; x.fillRect(qx, qy, s, s);
      }
      for (i = 0; i < (W * H) / 1400; i++) { x.fillStyle = "rgba(255,255,255," + (.2 + r() * .7) + ")"; var s2 = .5 + r() * 1.1; x.fillRect(r() * W, r() * H, s2, s2); }
      x.globalCompositeOperation = "source-over";
      if (art) {
        if (art.dw < W - 1) mountains(x, r, [[H * .66, H * .06, "#1a2168", .5], [H * .76, H * .06, "#0c1146", .6], [H * .9, H * .05, "#04061a", .7]]);
        var tt = off(art.dw, art.dh, d), tx = tt[1];
        tx.drawImage(IMG, 0, 0, art.dw, art.dh);
        if (art.dw < W - 1) {
          tx.globalCompositeOperation = "destination-in";
          var right = opt.align === "right", fx = tx.createLinearGradient(0, 0, art.dw, 0);
          fx.addColorStop(0, "rgba(0,0,0,0)"); fx.addColorStop(.2, "rgba(0,0,0,1)"); fx.addColorStop(right ? .999 : .8, "rgba(0,0,0,1)"); fx.addColorStop(1, right ? "rgba(0,0,0,1)" : "rgba(0,0,0,0)");
          tx.fillStyle = fx; tx.fillRect(0, 0, art.dw, art.dh);
        }
        x.drawImage(tt[0], art.dx, art.dy, art.dw, art.dh);
      } else mountains(x, r);
      return o[0];
    }
    function setup() {
      var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      var k = w + "x" + h + opt.layout + opt.align + loaded; if (k === key) return; key = k;
      W = w; H = h; d = Math.min(2, window.devicePixelRatio || 1); cv.width = W * d; cv.height = H * d;
      var tall = opt.layout === "tall"; art = null; spr = null;
      g = tall ? { x: W * .6, y: H * .3, r: W * .46, ex: W * .46 } : { x: W * .7, y: H * .36, r: H * .36, ex: W * .42 };
      if (loaded) {
        var iw = IMG.naturalWidth, ih = IMG.naturalHeight, s, dx, dy = 0;
        if (tall) { s = Math.max(W / iw, H / ih); dx = Math.min(0, Math.max(W - iw * s, W / 2 - 470 * s)); dy = H - ih * s; }
        else { s = H / ih; dx = opt.align === "right" ? W - iw * s : (W - iw * s) / 2; }
        art = { s: s, dx: dx, dy: dy, dw: iw * s, dh: ih * s };
        g = { x: dx + 620 * s, y: dy + 225 * s, r: 260 * s, ex: dx + 470 * s, hx: dx + 504 * s, hy: dy + 592 * s };
        var R = 270, K = .74, S = 2 * R * s, o = off(S, S, d), sx = o[1];
        sx.drawImage(IMG, 620 - R, 225 - R, 2 * R, 2 * R, 0, 0, S, S);
        sx.globalCompositeOperation = "destination-in"; sx.save(); sx.translate(S / 2, S / 2); sx.scale(1, K);
        var mg = sx.createRadialGradient(0, 0, 0, 0, 0, S / 2); mg.addColorStop(0, "rgba(0,0,0,1)"); mg.addColorStop(.55, "rgba(0,0,0,1)"); mg.addColorStop(.95, "rgba(0,0,0,0)");
        sx.fillStyle = mg; sx.fillRect(-S, -S / K, S * 2, S * 2 / K); sx.restore();
        spr = { c: o[0], S: S, K: K };
      }
      var r = rng(7); bgc = drawStatic(r);
      tw = []; for (var i = 0; i < (tall ? 60 : 120); i++) tw.push({ x: r() * W, y: r() * H * .8, s: .6 + r() * 1.4, p: r() * 6.28, v: .001 + r() * .003 });
      fl = (tall ? [[.14, .12, 16], [.86, .5, 12], [.3, .62, 9], [.9, .08, 10]] : [[.9, .1, 22], [.16, .2, 14], [.5, .08, 10], [.28, .7, 12], [.95, .7, 10]])
        .map(function (f) { return { x: f[0] * W, y: f[1] * H, L: f[2], p: r() * 6.28 }; });
    }
    function flare(x, px, py, L, a) {
      var gl = x.createRadialGradient(px, py, 0, px, py, L * .5); gl.addColorStop(0, "rgba(255,245,220," + a + ")"); gl.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = gl; x.fillRect(px - L, py - L, L * 2, L * 2);
      [[L * 2.4, 0], [0, L * 1.6]].forEach(function (v) {
        var gg = x.createLinearGradient(px - v[0], py - v[1], px + v[0], py + v[1]);
        gg.addColorStop(0, "rgba(255,220,150,0)"); gg.addColorStop(.5, "rgba(255,245,215," + a + ")"); gg.addColorStop(1, "rgba(255,220,150,0)");
        x.strokeStyle = gg; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px - v[0], py - v[1]); x.lineTo(px + v[0], py + v[1]); x.stroke();
      });
    }
    function loop() {
      if (dead) return;
      if (bgc) {
        var x = cv.getContext("2d"), t = performance.now() - t0;
        x.setTransform(d, 0, 0, d, 0, 0); x.globalCompositeOperation = "source-over"; x.drawImage(bgc, 0, 0, W, H);
        if (spr) { x.save(); x.translate(g.x, g.y); x.scale(1, spr.K); x.rotate(-t * .000045); x.scale(1, 1 / spr.K); x.drawImage(spr.c, -spr.S / 2, -spr.S / 2, spr.S, spr.S); x.restore(); }
        x.globalCompositeOperation = "lighter";
        var pa = .35 + .15 * Math.sin(t * .0015), cg = x.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r * .3);
        cg.addColorStop(0, "rgba(255,240,200," + pa + ")"); cg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = cg; x.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
        tw.forEach(function (s) { x.fillStyle = "rgba(255,245,225," + (.25 + .75 * Math.abs(Math.sin(t * s.v + s.p))) + ")"; x.fillRect(s.x, s.y, s.s, s.s); });
        fl.forEach(function (f) { flare(x, f.x, f.y, f.L, .55 + .35 * Math.sin(t * .0012 + f.p)); });
        if (art && g.hx) flare(x, g.hx, g.hy, 14 * art.s + 8, .5 + .4 * Math.sin(t * .002));
        if (t > nextShot) {
          var M = Math.max(W, H);
          shots.push({ x: W * (.25 + Math.random() * .8), y: H * Math.random() * .45, t: t, dur: 1100 + Math.random() * 700, dist: M * (.25 + Math.random() * .2), ang: Math.PI * (.78 + Math.random() * .1), len: M * (.08 + Math.random() * .06) });
          nextShot = t + 1500 + Math.random() * 2500;
        }
        shots = shots.filter(function (sh) { return t - sh.t < sh.dur; });
        shots.forEach(function (sh) {
          var k = (t - sh.t) / sh.dur, e = 1 - Math.pow(1 - k, 2), a = Math.sin(k * Math.PI), cx = Math.cos(sh.ang), cy = Math.sin(sh.ang);
          var hx = sh.x + cx * sh.dist * e, hy = sh.y + cy * sh.dist * e, tx = hx - cx * sh.len, ty = hy - cy * sh.len;
          var sg = x.createLinearGradient(hx, hy, tx, ty); sg.addColorStop(0, "rgba(255,245,220," + a + ")"); sg.addColorStop(.3, "rgba(255,215,150," + a * .5 + ")"); sg.addColorStop(1, "rgba(255,215,150,0)");
          x.strokeStyle = sg; x.lineWidth = 2; x.lineCap = "round"; x.beginPath(); x.moveTo(hx, hy); x.lineTo(tx, ty); x.stroke();
          var hg = x.createRadialGradient(hx, hy, 0, hx, hy, 8); hg.addColorStop(0, "rgba(255,250,235," + a + ")"); hg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = hg; x.fillRect(hx - 8, hy - 8, 16, 16);
        });
      }
      raf = requestAnimationFrame(loop);
    }
    var ro = window.ResizeObserver ? new ResizeObserver(setup) : null;
    if (ro) ro.observe(host); else window.addEventListener("resize", setup);
    if (!loaded) waiters.push(function () { key = null; setup(); });
    setup(); loop();
    return {
      setDim: setDim,
      destroy: function () { dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); host.innerHTML = ""; }
    };
  }
  window.Galaxy = { mount: mount };
})();
