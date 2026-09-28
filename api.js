// Supabase RPC（纯 fetch）+ Realtime（原生 WebSocket，无第三方依赖，微信内置浏览器友好）
(function () {
  var C = window.APP_CONFIG;

  function rpc(fn, args, tries) {
    tries = tries === undefined ? 2 : tries;
    return fetch(C.SUPABASE_URL + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": C.SUPABASE_ANON_KEY, "Authorization": "Bearer " + C.SUPABASE_ANON_KEY },
      body: JSON.stringify(args || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var d = null;
        try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
        if (!r.ok) {
          var msg = (d && (d.message || d.hint || d.details)) || ("网络错误 " + r.status);
          throw new Error(String(msg).replace(/^.*?:\s*/, ""));
        }
        return d;
      });
    }).catch(function (err) {
      if (tries > 0 && /Failed to fetch|NetworkError|Load failed/i.test(err.message)) {
        return new Promise(function (res) { setTimeout(res, 900); }).then(function () { return rpc(fn, args, tries - 1); });
      }
      if (/Failed to fetch|NetworkError|Load failed|network/i.test(err.message)) throw new Error("网络不稳定，请稍后重试或下拉刷新");
      throw err;
    });
  }

  window.API = {
    judgeList: function () { return rpc("final_judge_list"); },
    judgeState: function (id) { return rpc("final_judge_state", { p_judge_id: id }); },
    saveScore: function (jid, cid, d) { return rpc("final_save_score", { p_judge_id: jid, p_case_id: cid, p_details: d }); },
    login: function (c) { return rpc("final_admin_login", { p_code: c }); },
    state: function (c) { return rpc("final_admin_state", { p_code: c }); },
    setCurrent: function (c, id) { return rpc("final_admin_set_current", { p_code: c, p_case_id: id }); },
    openCase: function (c, id) { return rpc("final_admin_open_case", { p_code: c, p_case_id: id }); },
    saveCase: function (c, o) { return rpc("final_admin_save_case", { p_code: c, p_case: o }); },
    deleteCase: function (c, id) { return rpc("final_admin_delete_case", { p_code: c, p_case_id: id }); },
    reorderCases: function (c, ids) { return rpc("final_admin_reorder_cases", { p_code: c, p_ids: ids }); },
    saveJudge: function (c, o) { return rpc("final_admin_save_judge", { p_code: c, p_judge: o }); },
    deleteJudge: function (c, id) { return rpc("final_admin_delete_judge", { p_code: c, p_judge_id: id }); },
    setJudgeActive: function (c, id, a) { return rpc("final_admin_set_judge_active", { p_code: c, p_judge_id: id, p_active: a }); },
    setVote: function (c, id, v) { return rpc("final_admin_set_vote", { p_code: c, p_case_id: id, p_votes: v }); },
    setReveal: function (c, s) { return rpc("final_admin_set_reveal", { p_code: c, p_step: s }); },
    reset: function (c) { return rpc("final_admin_reset", { p_code: c }); }
  };

  // ---- Realtime：监听 final_signal 表变化，任何数据变动都会推送 ----
  var ws, ref = 0, hb, subs = [], retry = 0, timer;
  function send(topic, event, payload) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ topic: topic, event: event, payload: payload, ref: String(++ref) }));
  }
  function fire() { clearTimeout(timer); timer = setTimeout(function () { subs.forEach(function (f) { f(); }); }, 150); }
  function schedule() { setTimeout(connect, Math.min(15000, 1000 * Math.pow(2, retry++))); }
  function connect() {
    try {
      ws = new WebSocket(C.SUPABASE_URL.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(C.SUPABASE_ANON_KEY) + "&vsn=1.0.0");
    } catch (e) { return schedule(); }
    ws.onopen = function () {
      retry = 0;
      send("realtime:final", "phx_join", { config: { broadcast: { ack: false, self: false }, presence: { key: "" },
        postgres_changes: [{ event: "*", schema: "public", table: "final_signal" }], private: false } });
      clearInterval(hb); hb = setInterval(function () { send("phoenix", "heartbeat", {}); }, 25000);
      fire();
    };
    ws.onmessage = function (m) { var d; try { d = JSON.parse(m.data); } catch (e) { return; } if (d.event === "postgres_changes") fire(); };
    ws.onclose = function () { clearInterval(hb); schedule(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  window.RT = { on: function (f) { subs.push(f); if (!ws) connect(); } };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) fire(); });
})();
