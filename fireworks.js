// 烟花：Fireworks.mount(host).fire(big)
(function () {
  var COLS = ["255,220,140", "255,245,215", "255,190,90", "190,175,255", "140,170,255", "255,160,120"];
  function mount(host) {
    var cv = document.createElement("canvas"), ps = [], running = false;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    host.appendChild(cv);
    function size() {
      var W = cv.offsetWidth, H = cv.offsetHeight, d = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== W * d || cv.height !== H * d) { cv.width = W * d; cv.height = H * d; }
      return { W: W, H: H, d: d };
    }
    function burst(W, H, sc) {
      var cx = W * (.12 + Math.random() * .76), cy = H * (.12 + Math.random() * .4), n = Math.round(110 * sc);
      var base = COLS[Math.floor(Math.random() * COLS.length)], alt = COLS[Math.floor(Math.random() * COLS.length)];
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = (2.5 + Math.random() * 5.5) * sc * (W / 1920 + .4);
        ps.push({ x: cx, y: cy, px: cx, py: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, dec: .008 + Math.random() * .01, col: Math.random() < .75 ? base : alt, w: 1.2 + Math.random() * 1.6 });
      }
      ps.push({ flash: true, x: cx, y: cy, life: 1, dec: .06, r: 120 * sc });
    }
    function loop() {
      var s = size(), x = cv.getContext("2d");
      running = true;
      x.setTransform(s.d, 0, 0, s.d, 0, 0); x.clearRect(0, 0, s.W, s.H); x.globalCompositeOperation = "lighter"; x.lineCap = "round";
      ps = ps.filter(function (p) { return p.life > 0; });
      ps.forEach(function (p) {
        if (p.flash) { var g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, "rgba(255,240,200," + p.life * .6 + ")"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); p.life -= p.dec; return; }
        p.px = p.x; p.py = p.y; p.vx *= .975; p.vy = p.vy * .975 + .06; p.x += p.vx; p.y += p.vy; p.life -= p.dec;
        var tw = p.life < .35 ? (Math.random() < .5 ? 1 : .2) : 1;
        x.strokeStyle = "rgba(" + p.col + "," + Math.max(0, p.life) * tw + ")"; x.lineWidth = p.w;
        x.beginPath(); x.moveTo(p.px - p.vx * 2.5, p.py - p.vy * 2.5); x.lineTo(p.x, p.y); x.stroke();
      });
      if (ps.length) requestAnimationFrame(loop); else { x.clearRect(0, 0, s.W, s.H); running = false; }
    }
    return {
      fire: function (big) {
        var s = size(), n = big ? 7 : 3;
        for (var i = 0; i < n; i++) setTimeout(function () { burst(s.W, s.H, big ? 1.35 : 1); if (!running) loop(); }, i * (big ? 260 : 220));
      }
    };
  }
  window.Fireworks = { mount: mount };
})();
