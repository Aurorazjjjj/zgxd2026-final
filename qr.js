// 轻量二维码生成（字节模式 · 纠错等级 M · 版本 1–10），无第三方依赖
(function () {
  var ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLK = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  function rawModules(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
  function dataCw(v) { return Math.floor(rawModules(v) / 8) - ECC[v] * BLK[v]; }
  function mul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
  function rsDiv(deg) { var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1); var root = 1; for (i = 0; i < deg; i++) { for (var j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; }
  function rsRem(data, div) { var r = div.map(function () { return 0; }); data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= mul(c, f); }); }); return r; }
  function utf8(s) { var b = unescape(encodeURIComponent(s)), a = []; for (var i = 0; i < b.length; i++) a.push(b.charCodeAt(i)); return a; }
  function make(text) {
    var bytes = utf8(text), ver = 0;
    for (var v = 1; v <= 10; v++) if (4 + 8 + bytes.length * 8 <= dataCw(v) * 8) { ver = v; break; }
    if (!ver) throw new Error("内容过长");
    var bits = [], cap = dataCw(ver) * 8;
    function put(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, 8); bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    for (var p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) put(p, 8);
    var data = []; for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = (x << 1) | bits[i + j]; data.push(x); }
    var nb = BLK[ver], el = ECC[ver], raw = Math.floor(rawModules(ver) / 8), ns = nb - raw % nb, sl = Math.floor(raw / nb), dv = rsDiv(el), blocks = [], k = 0;
    for (i = 0; i < nb; i++) { var dat = data.slice(k, k + sl - el + (i < ns ? 0 : 1)); k += dat.length; var ec = rsRem(dat, dv); if (i < ns) dat.push(0); blocks.push(dat.concat(ec)); }
    var cw = []; for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (b, j) { if (i !== sl - el || j >= ns) cw.push(b[i]); });
    var size = ver * 4 + 17, M = [], F = [];
    for (i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    function set(x, y, d) { M[y][x] = d; F[y][x] = true; }
    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var xx = c[0] + dx, yy = c[1] + dy, dd = Math.max(Math.abs(dx), Math.abs(dy)); if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, dd !== 2 && dd !== 4); }
    });
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
      for (var q = size - 7; pos.length < na; q -= step) pos.splice(1, 0, q);
      pos.forEach(function (ay, a) { pos.forEach(function (ax, b) {
        if ((a === 0 && b === 0) || (a === 0 && b === na - 1) || (a === na - 1 && b === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }); });
    }
    var mask = 0;
    function format() {
      var d = (0 << 3) | mask, r = d; for (var t = 0; t < 10; t++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var b = ((d << 10) | r) ^ 0x5412, g = function (n) { return ((b >>> n) & 1) === 1; };
      for (var t2 = 0; t2 <= 5; t2++) set(8, t2, g(t2));
      set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
      for (t2 = 9; t2 < 15; t2++) set(14 - t2, 8, g(t2));
      for (t2 = 0; t2 < 8; t2++) set(size - 1 - t2, 8, g(t2));
      for (t2 = 8; t2 < 15; t2++) set(8, size - 15 + t2, g(t2));
      set(8, size - 8, true);
    }
    format();
    if (ver >= 7) {
      var rr = ver; for (i = 0; i < 12; i++) rr = (rr << 1) ^ ((rr >>> 11) * 0x1F25);
      var vb = (ver << 12) | rr;
      for (i = 0; i < 18; i++) { var bt = ((vb >>> i) & 1) === 1, aa = size - 11 + i % 3, bb = Math.floor(i / 3); set(aa, bb, bt); set(bb, aa, bt); }
    }
    var n = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
        var cx = right - j, up = ((right + 1) & 2) === 0, cy = up ? size - 1 - vert : vert;
        if (!F[cy][cx] && n < cw.length * 8) { M[cy][cx] = ((cw[n >>> 3] >>> (7 - (n & 7))) & 1) === 1; n++; }
      }
    }
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!F[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x];
    return M;
  }
  function svg(text, px) {
    var M = make(text), n = M.length, b = 4, t = n + b * 2, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (M[y][x]) d += "M" + (x + b) + " " + (y + b) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + " " + t + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  window.QR = { svg: svg };
})();
