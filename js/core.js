/* Cyber Shift: shared pieces. Every mode registers itself with CS.addMode(). */
(function () {
  "use strict";
  var CS = window.CS = {};
  var KEY = "cybershift.v1";
  var screen = document.getElementById("screen");

  // ------------------------------------------------------------ helpers
  CS.esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  CS.shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  CS.stars = function (n) {
    var s = "";
    for (var i = 1; i <= 3; i++) s += '<span class="' + (i <= n ? "on" : "") + '">★</span>';
    return '<span class="stars" aria-label="' + n + ' of 3 stars">' + s + "</span>";
  };
  CS.toast = function (msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  };
  CS.screen = screen;
  /** Remember which address we set ourselves, so the back-button handler only reacts to the user's moves. */
  function setHash(h) {
    CS._lastHash = h;
    if (location.hash.replace("#", "") !== h) location.hash = h;
  }

  // ------------------------------------------------------------ saved progress
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  var data = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private browsing: progress lasts this visit */ }
  }
  CS.progress = function (mode, level) {
    return (data[mode] && data[mode][level]) || { stars: 0, best: 0 };
  };
  CS.record = function (mode, level, stars, score) {
    data[mode] = data[mode] || {};
    var p = CS.progress(mode, level);
    var better = stars > p.stars || score > p.best;
    data[mode][level] = { stars: Math.max(stars, p.stars), best: Math.max(score, p.best) };
    save();
    updateTotal();
    return better;
  };
  CS.unlocked = function (mode, level) {
    return level === 1 || CS.progress(mode, level - 1).stars > 0;
  };
  CS.totalStars = function () {
    var t = 0;
    Object.keys(data).forEach(function (m) { Object.keys(data[m]).forEach(function (l) { t += data[m][l].stars; }); });
    return t;
  };
  function updateTotal() { document.getElementById("totalStars").textContent = CS.totalStars(); }
  CS.resetProgress = function () { data = {}; save(); updateTotal(); };

  // ------------------------------------------------------------ modes
  var modes = [];
  CS.addMode = function (m) { modes.push(m); };
  CS.modes = function () { return modes; };
  function mode(id) { return modes.filter(function (m) { return m.id === id; })[0]; }

  // Stop timers and animation loops from the previous screen
  var cleanups = [];
  CS.onLeave = function (fn) { cleanups.push(fn); };
  function leave() {
    cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
    cleanups = [];
    var o = document.querySelector(".overlay");
    if (o) o.remove();
  }

  // ------------------------------------------------------------ screens
  CS.hub = function () {
    leave();
    setHash("");
    screen.innerHTML =
      '<section class="hero"><div><h1>Your shift starts now.</h1>' +
      '<p class="lead">You are the security team at <b>Island Networks</b>, a small company in Kingstown. Alerts are coming in, someone is phishing your staff, attackers are probing the network, and there are puzzles only you can crack. Four kinds of work, five levels each.</p>' +
      '<p class="muted">Earn up to 3 stars per level. A star unlocks the next level.</p></div>' +
      '<div class="art">' + heroArt() + "</div></section>" +
      '<div class="modes">' + modes.map(function (m) {
        var stars = 0;
        for (var i = 1; i <= 5; i++) stars += CS.progress(m.id, i).stars;
        return '<button class="mode" data-mode="' + m.id + '"><div class="ic">' + m.icon + "</div><div><h2>" + CS.esc(m.title) + "</h2><p>" + CS.esc(m.blurb) +
          '</p><div class="prog"><div class="meter"><i style="width:' + Math.round(stars / 15 * 100) + '%"></i></div>' + stars + " / 15 ★</div></div></button>";
      }).join("") + "</div>";
    screen.querySelectorAll(".mode").forEach(function (b) { b.addEventListener("click", function () { CS.levels(b.dataset.mode); }); });
  };

  CS.levels = function (id) {
    leave();
    var m = mode(id);
    setHash(id);
    screen.innerHTML = '<button class="back" id="back">← All modes</button><h1>' + m.icon + " " + CS.esc(m.title) + '</h1><p class="lead">' + CS.esc(m.intro) + "</p>" +
      '<div class="levels">' + m.levels.map(function (l, i) {
        var n = i + 1, open = CS.unlocked(id, n), p = CS.progress(id, n);
        return '<button class="level" data-level="' + n + '"' + (open ? "" : " disabled") + '><span class="n">Level ' + n + (open ? "" : " · locked") + "</span><h3>" + CS.esc(l.name) +
          '</h3><span class="d">' + CS.esc(l.desc) + "</span>" + CS.stars(p.stars) + (p.best ? '<span class="muted">Best ' + p.best.toLocaleString() + "</span>" : "") + "</button>";
      }).join("") + '</div><div class="how"><b>How to play.</b> ' + m.how + "</div>";
    document.getElementById("back").addEventListener("click", CS.hub);
    screen.querySelectorAll(".level").forEach(function (b) {
      b.addEventListener("click", function () { CS.play(id, +b.dataset.level); });
    });
  };

  CS.play = function (id, level) {
    leave();
    var m = mode(id);
    setHash(id + "/" + level);
    screen.innerHTML = '<button class="back" id="back">← ' + CS.esc(m.title) + " levels</button><div id=\"stage\"></div>";
    document.getElementById("back").addEventListener("click", function () { CS.levels(id); });
    m.start(level, document.getElementById("stage"), function (r) { finish(m, level, r); });
  };

  /** End of a level: r = { stars, score, title, summary (HTML) } */
  function finish(m, level, r) {
    var better = CS.record(m.id, level, r.stars, r.score);
    var next = level < m.levels.length && r.stars > 0;
    var o = document.createElement("div");
    o.className = "overlay";
    o.innerHTML = '<div class="result" role="dialog" aria-label="Level result"><div class="big">' +
      [1, 2, 3].map(function (i) { return '<span class="' + (i <= r.stars ? "on" : "") + '">★</span>'; }).join("") + "</div>" +
      "<h2>" + CS.esc(r.title || (r.stars ? "Level complete" : "Not this time")) + "</h2>" +
      '<p class="muted">Score <b>' + (r.score || 0).toLocaleString() + "</b>" + (better ? " · new best" : "") + "</p>" +
      '<div class="sum">' + (r.summary || "") + "</div>" +
      '<div class="row"><button class="btn ghost" data-a="levels">Levels</button><button class="btn ghost" data-a="again">Play again</button>' +
      (next ? '<button class="btn" data-a="next">Next level →</button>' : "") + "</div></div>";
    document.body.appendChild(o);
    o.querySelector("[data-a=levels]").addEventListener("click", function () { CS.levels(m.id); });
    o.querySelector("[data-a=again]").addEventListener("click", function () { CS.play(m.id, level); });
    if (next) o.querySelector("[data-a=next]").addEventListener("click", function () { CS.play(m.id, level + 1); });
    var btn = o.querySelector(next ? "[data-a=next]" : "[data-a=again]");
    if (btn) btn.focus();
  }

  /** A countdown that calls tick(fractionLeft) and then done(). Returns { stop, left() }. */
  CS.countdown = function (seconds, tick, done) {
    var end = Date.now() + seconds * 1000, stopped = false;
    var id = setInterval(function () {
      var left = Math.max(0, end - Date.now());
      tick(left / (seconds * 1000), Math.ceil(left / 1000));
      if (left <= 0) { clearInterval(id); if (!stopped) { stopped = true; done(); } }
    }, 200);
    var t = { stop: function () { stopped = true; clearInterval(id); }, left: function () { return Math.max(0, (end - Date.now()) / 1000); } };
    CS.onLeave(t.stop);
    return t;
  };

  CS.route = function () {
    var h = location.hash.replace("#", "").split("/");
    if (h[0] && mode(h[0])) {
      var lvl = +h[1];
      if (lvl && CS.unlocked(h[0], lvl)) return CS.play(h[0], lvl);
      return CS.levels(h[0]);
    }
    CS.hub();
  };

  CS.init = function () {
    updateTotal();
    document.getElementById("home").addEventListener("click", CS.hub);
    document.getElementById("reset").addEventListener("click", function () {
      if (confirm("Clear all your stars and scores?")) { CS.resetProgress(); CS.hub(); }
    });
    CS.route();
  };

  function heroArt() {
    // An island at dusk with a network running across it
    return '<svg viewBox="0 0 480 300" role="img" aria-label="An island with a glowing network">' +
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2140"/><stop offset=".65" stop-color="#174e6e"/><stop offset="1" stop-color="#ff9a5a"/></linearGradient>' +
      '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e5c7a"/><stop offset="1" stop-color="#062638"/></linearGradient></defs>' +
      '<rect width="480" height="300" fill="url(#sky)"/><circle cx="360" cy="190" r="34" fill="#ffd166" opacity=".9"/>' +
      '<rect y="200" width="480" height="100" fill="url(#sea)"/>' +
      '<path d="M60 205 Q150 120 240 150 Q300 110 360 160 Q410 180 440 205 Z" fill="#0f3d2e"/><path d="M190 150 L215 95 L240 150 Z" fill="#163f33"/>' +
      '<g stroke="#19d3c5" stroke-width="2" fill="none" opacity=".9"><path d="M110 185 L170 160 L215 120 L270 150 L330 165 L400 190"/><path d="M170 160 L230 180 L330 165"/></g>' +
      '<g fill="#19d3c5">' + [[110, 185], [170, 160], [215, 120], [270, 150], [330, 165], [400, 190], [230, 180]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="12" opacity=".25"/>';
      }).join("") + "</g>" +
      '<g fill="#ff6b6b"><circle cx="40" cy="60" r="5"/><circle cx="20" cy="110" r="4"/><circle cx="70" cy="30" r="3"/></g>' +
      '<g stroke="#ff6b6b" stroke-dasharray="4 5" opacity=".7"><path d="M40 60 L110 185"/><path d="M20 110 L110 185"/></g>' +
      '<path d="M0 230 Q30 225 60 230 T120 230 T180 230 T240 230 T300 230 T360 230 T420 230 T480 230" stroke="#7fd8e6" opacity=".35" fill="none"/></svg>';
  }
})();
