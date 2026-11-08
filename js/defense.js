/* Mode 3: Network Defense. Tower defense where each defense is strong against the threats it is built for. */
(function () {
  "use strict";
  var esc = CS.esc;
  var W = 960, H = 540, T = 60, COLS = 16, ROWS = 9;

  // ------------------------------------------------------------ defenses and threats
  var TOWERS = {
    firewall: { name: "Firewall", icon: "🧱", cost: 50, range: 125, rate: 0.45, dmg: 12, color: "#ff9f43", stops: ["scan", "ddos"],
      tip: "Blocks traffic you didn't ask for. Strong against port scans and DDoS floods." },
    filter: { name: "Email filter", icon: "✉️", cost: 60, range: 135, rate: 0.7, dmg: 22, color: "#0ea5e9", stops: ["phish"],
      tip: "Checks links, senders and attachments before mail reaches staff. Strong against phishing." },
    mfa: { name: "MFA", icon: "🔑", cost: 80, range: 125, rate: 0.8, dmg: 34, color: "#ffd166", stops: ["brute"],
      tip: "A second proof of identity, so a stolen or guessed password isn't enough. Strong against password attacks." },
    edr: { name: "EDR", icon: "🦠", cost: 100, range: 140, rate: 0.6, dmg: 30, color: "#3ddc84", stops: ["malware", "ransom"],
      tip: "Watches what programs do on each computer and stops malicious ones. Strong against malware and ransomware." },
    patch: { name: "Patching", icon: "🩹", cost: 70, range: 155, rate: 1.0, dmg: 50, color: "#c084fc", stops: ["exploit"],
      tip: "Fixes the software flaws exploits rely on. Strong against exploits." },
  };
  var THREATS = {
    scan: { name: "Port scanner", icon: "📡", hp: 30, speed: 95, reward: 5, hit: 1, color: "#19d3c5",
      brief: "Scanners knock on every port looking for a way in. A firewall turns them away." },
    ddos: { name: "DDoS bot", icon: "🤖", hp: 16, speed: 125, reward: 3, hit: 1, color: "#7dd3fc",
      brief: "Thousands of hijacked devices flooding you with traffic. Firewalls (and DDoS protection) drop it." },
    phish: { name: "Phishing email", icon: "🎣", hp: 60, speed: 70, reward: 8, hit: 2, color: "#60a5fa",
      brief: "Fake emails that trick staff into clicking or giving passwords. An email filter catches most of them." },
    brute: { name: "Password attack", icon: "🔓", hp: 95, speed: 60, reward: 10, hit: 2, color: "#fde047",
      brief: "Guessing or reusing leaked passwords. MFA stops a correct guess from being enough." },
    malware: { name: "Malware", icon: "🐛", hp: 150, speed: 55, reward: 14, hit: 3, color: "#86efac",
      brief: "Malicious programs from downloads and attachments. EDR spots and stops them on each computer." },
    exploit: { name: "Exploit", icon: "💥", hp: 120, speed: 85, reward: 14, hit: 3, color: "#d8b4fe",
      brief: "Attacks on unpatched software flaws. Patching closes the hole." },
    ransom: { name: "Ransomware", icon: "💀", hp: 950, speed: 34, reward: 60, hit: 10, color: "#ff6b6b",
      brief: "Encrypts your files and demands payment. Only EDR hits it hard. Backups would save you if it got through." },
  };
  var WEAK = 0.25, RANSOM_WEAK = 0.12;

  // ------------------------------------------------------------ levels
  var LEVELS = [
    { name: "The front door", desc: "Scanners, bot floods and the first phishing wave.", towers: ["firewall", "filter"], money: 160, lives: 20,
      path: [[0, 4], [4, 4], [4, 1], [9, 1], [9, 6], [13, 6], [13, 4], [15, 4]],
      waves: [[["scan", 8, 0.9]], [["ddos", 14, 0.45]], [["phish", 6, 1.2], ["scan", 6, 0.8]], [["ddos", 20, 0.35], ["phish", 6, 1]], [["phish", 10, 0.9], ["scan", 12, 0.6]]] },
    { name: "Remote workers", desc: "Staff log in from home. Attackers try their passwords.", towers: ["firewall", "filter", "mfa"], money: 200, lives: 20,
      path: [[0, 1], [6, 1], [6, 7], [10, 7], [10, 2], [15, 2]],
      waves: [[["brute", 5, 1.4]], [["scan", 10, 0.6], ["brute", 5, 1.2]], [["phish", 8, 0.9], ["brute", 6, 1]], [["ddos", 24, 0.3], ["brute", 8, 0.9]], [["brute", 10, 0.8], ["phish", 10, 0.8]], [["brute", 14, 0.7], ["scan", 14, 0.5], ["phish", 8, 0.8]]] },
    { name: "Infected downloads", desc: "Malware rides in on attachments and downloads.", towers: ["firewall", "filter", "mfa", "edr"], money: 280, lives: 20,
      path: [[0, 7], [3, 7], [3, 2], [7, 2], [7, 6], [12, 6], [12, 1], [15, 1]],
      waves: [[["malware", 4, 1.8]], [["phish", 10, 0.8], ["malware", 4, 1.5]], [["brute", 8, 0.9], ["malware", 6, 1.3]], [["ddos", 26, 0.3], ["malware", 7, 1.2]], [["malware", 10, 1], ["phish", 10, 0.7]], [["malware", 12, 0.9], ["brute", 10, 0.7], ["scan", 12, 0.5]]] },
    { name: "Unpatched", desc: "Exploits hunt for software nobody updated.", towers: ["firewall", "filter", "mfa", "edr", "patch"], money: 320, lives: 20,
      path: [[0, 4], [2, 4], [2, 1], [6, 1], [6, 7], [9, 7], [9, 3], [13, 3], [13, 7], [15, 7]],
      waves: [[["exploit", 5, 1.3]], [["exploit", 6, 1.1], ["scan", 10, 0.5]], [["malware", 7, 1.1], ["exploit", 7, 1]], [["brute", 10, 0.8], ["exploit", 8, 0.9]], [["phish", 12, 0.6], ["exploit", 9, 0.8]], [["ddos", 30, 0.25], ["malware", 9, 0.9], ["exploit", 8, 0.8]],
        [["exploit", 12, 0.7], ["malware", 10, 0.8], ["brute", 10, 0.6]]] },
    { name: "Ransomware night", desc: "Everything at once, then the ransomware gang arrives.", towers: ["firewall", "filter", "mfa", "edr", "patch"], money: 450, lives: 30,
      path: [[0, 2], [4, 2], [4, 6], [8, 6], [8, 1], [11, 1], [11, 7], [15, 7]],
      waves: [[["scan", 10, 0.6], ["phish", 6, 0.9]], [["brute", 8, 0.9], ["exploit", 5, 1.1]], [["malware", 8, 1], ["ddos", 20, 0.35]], [["ransom", 1, 1], ["phish", 10, 0.7]],
        [["exploit", 10, 0.7], ["brute", 10, 0.7], ["malware", 8, 0.9]], [["ransom", 2, 6], ["ddos", 30, 0.25]], [["phish", 14, 0.5], ["malware", 12, 0.7], ["exploit", 10, 0.7]],
        [["ransom", 3, 5], ["malware", 12, 0.6], ["brute", 12, 0.6]]] },
  ];

  CS.addMode({
    id: "defense", icon: "🏰", title: "Network Defense",
    blurb: "Place firewalls, email filters, MFA, EDR and patches to stop waves of attacks.",
    intro: "Attacks travel from the internet to your server. Build defenses beside the path. Each one is strong against certain threats and nearly useless against the rest, just like the real thing.",
    how: "Pick a defense on the right, then click an empty square beside the path to build it. Defenses hit everything in range, but do <b>full damage only to the threats they're made for</b> (a quarter to the rest). Stopping a threat earns budget. Press <b>Start wave</b> when you're ready. Click a defense you built to sell it. Threats that reach the server cost data integrity; lose it all and the network falls.",
    levels: LEVELS.map(function (l) { return { name: l.name, desc: l.desc }; }),
    start: play,
  });

  function play(levelNo, stage, done) {
    var L = LEVELS[levelNo - 1];
    var money = L.money, lives = L.lives, wave = 0, kills = 0, speed = 1;
    var towers = [], enemies = [], shots = [], spawnQueue = [], running = false, over = false;
    var pick = L.towers[0], hover = null, selected = null, seen = {};

    // Path cells and the pixel route enemies follow
    var pathCells = {}, route = [];
    for (var k = 0; k < L.path.length; k++) {
      var p = L.path[k];
      route.push([p[0] * T + T / 2, p[1] * T + T / 2]);
      if (k > 0) {
        var q = L.path[k - 1], dx = Math.sign(p[0] - q[0]), dy = Math.sign(p[1] - q[1]);
        for (var x = q[0], y = q[1]; ; x += dx, y += dy) {
          pathCells[x + "," + y] = 1;
          if (x === p[0] && y === p[1]) break;
        }
      }
    }
    route[0] = [-30, route[0][1]];
    var serverAt = L.path[L.path.length - 1];

    stage.innerHTML =
      '<div class="hud"><span class="chip">Wave <b id="wv">0</b> / ' + L.waves.length + '</span><span class="chip">Budget <b id="mn">EC$' + money + '</b></span>' +
      '<span class="chip" id="lvc">Data integrity <b id="lv">' + lives + '</b></span><span class="chip">Stopped <b id="kl">0</b></span>' +
      '<button class="btn" id="go">▶ Start wave 1</button><button class="btn ghost" id="spd">Speed 1×</button></div>' +
      '<div class="td-wrap"><canvas class="td-canvas" id="cv" width="' + W + '" height="' + H + '" aria-label="Network map"></canvas><div class="shop" id="shop">' +
      L.towers.map(function (id) {
        var t = TOWERS[id];
        return '<button class="tower" data-t="' + id + '"><span class="dot" style="background:' + t.color + '33">' + t.icon + "</span><span><b>" + esc(t.name) +
          "</b><small>Stops: " + t.stops.map(function (s) { return THREATS[s].name; }).join(", ") + "</small></span><b>EC$" + t.cost + "</b></button>";
      }).join("") + '<div class="tip" id="tip"></div></div></div>';

    var cv = stage.querySelector("#cv"), ctx = cv.getContext("2d"), tip = stage.querySelector("#tip");
    var ui = { wv: stage.querySelector("#wv"), mn: stage.querySelector("#mn"), lv: stage.querySelector("#lv"), kl: stage.querySelector("#kl"), go: stage.querySelector("#go"), spd: stage.querySelector("#spd") };

    function hud() {
      ui.wv.textContent = wave;
      ui.mn.textContent = "EC$" + money;
      ui.lv.textContent = lives;
      ui.kl.textContent = kills;
      stage.querySelector("#lvc").classList.toggle("warn", lives <= L.lives * 0.3);
      stage.querySelectorAll(".tower").forEach(function (b) {
        b.classList.toggle("on", b.dataset.t === pick);
        b.disabled = TOWERS[b.dataset.t].cost > money;
      });
    }
    function showTip(html) { tip.innerHTML = html; }
    function briefing() {
      var next = L.waves[wave];
      if (!next) return;
      var fresh = next.map(function (g) { return g[0]; }).filter(function (t, i, a) { return a.indexOf(t) === i && !seen[t]; });
      var all = next.map(function (g) { return g[1] + " × " + THREATS[g[0]].icon + " " + THREATS[g[0]].name; }).join("<br>");
      showTip("<b>Next wave:</b><br>" + all + fresh.map(function (t) { return "<p><b>" + THREATS[t].icon + " New: " + THREATS[t].name + ".</b> " + esc(THREATS[t].brief) + "</p>"; }).join(""));
    }

    stage.querySelectorAll(".tower").forEach(function (b) {
      b.addEventListener("click", function () {
        pick = b.dataset.t;
        selected = null;
        showTip("<b>" + TOWERS[pick].icon + " " + TOWERS[pick].name + "</b>: " + esc(TOWERS[pick].tip) + "<br><br>Click an empty square beside the path to build.");
        hud();
      });
    });
    ui.go.addEventListener("click", startWave);
    ui.spd.addEventListener("click", function () {
      speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
      ui.spd.textContent = "Speed " + speed + "×";
    });

    function cellAt(ev) {
      var r = cv.getBoundingClientRect();
      return [Math.floor((ev.clientX - r.left) * (W / r.width) / T), Math.floor((ev.clientY - r.top) * (H / r.height) / T)];
    }
    cv.addEventListener("mousemove", function (ev) { hover = cellAt(ev); });
    cv.addEventListener("mouseleave", function () { hover = null; });
    cv.addEventListener("click", function (ev) { tap(cellAt(ev)); });

    function towerAt(c) { return towers.filter(function (t) { return t.c === c[0] && t.r === c[1]; })[0]; }
    function buildable(c) {
      return c[0] >= 0 && c[0] < COLS && c[1] >= 0 && c[1] < ROWS && !pathCells[c[0] + "," + c[1]] && !towerAt(c);
    }
    function tap(c) {
      if (over) return;
      var t = towerAt(c);
      if (t) {
        selected = t;
        var refund = Math.floor(TOWERS[t.type].cost * 0.7);
        showTip("<b>" + TOWERS[t.type].icon + " " + TOWERS[t.type].name + "</b> has stopped " + t.kills + " threats.<br><br><button class=\"btn ghost\" id=\"sell\">Sell for EC$" + refund + "</button>");
        tip.querySelector("#sell").addEventListener("click", function () {
          towers.splice(towers.indexOf(t), 1);
          money += refund;
          selected = null;
          showTip("Sold.");
          hud();
        });
        return;
      }
      place(pick, c[0], c[1]);
    }
    function place(type, c, r) {
      var spec = TOWERS[type];
      if (!spec || !buildable([c, r])) return false;
      if (spec.cost > money) { showTip("Not enough budget for " + spec.name + ". Stop more threats to earn more."); return false; }
      money -= spec.cost;
      towers.push({ type: type, c: c, r: r, x: c * T + T / 2, y: r * T + T / 2, cool: 0, kills: 0 });
      hud();
      return true;
    }

    function startWave() {
      if (running || over || wave >= L.waves.length) return;
      var t = 0;
      L.waves[wave].forEach(function (g) {
        for (var n = 0; n < g[1]; n++) spawnQueue.push({ type: g[0], at: t + n * g[2] });
        t += g[1] * g[2] * 0.55;  // groups overlap a little
      });
      spawnQueue.sort(function (a, b) { return a.at - b.at; });
      L.waves[wave].forEach(function (g) { seen[g[0]] = 1; });
      wave++;
      waveClock = 0;
      running = true;
      ui.go.disabled = true;
      ui.go.textContent = "Wave " + wave + " incoming…";
      hud();
    }
    var waveClock = 0;

    function spawn(type) {
      var s = THREATS[type], scale = 1 + (wave - 1) * 0.06 + (levelNo - 1) * 0.03;
      enemies.push({ type: type, hp: s.hp * scale, max: s.hp * scale, x: route[0][0], y: route[0][1], seg: 1, dist: 0 });
    }

    function step(dt) {
      if (running) {
        waveClock += dt;
        while (spawnQueue.length && spawnQueue[0].at <= waveClock) spawn(spawnQueue.shift().type);
      }
      // Move threats along the route
      for (var i = enemies.length - 1; i >= 0; i--) {
        var e = enemies[i], move = THREATS[e.type].speed * dt;
        while (move > 0 && e.seg < route.length) {
          var tx = route[e.seg][0], ty = route[e.seg][1], dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
          if (d <= move) { e.x = tx; e.y = ty; e.seg++; move -= d; } else { e.x += dx / d * move; e.y += dy / d * move; move = 0; }
        }
        e.dist += THREATS[e.type].speed * dt;
        if (e.seg >= route.length) {
          lives = Math.max(0, lives - THREATS[e.type].hit);
          enemies.splice(i, 1);
          hud();
        }
      }
      // Defenses fire at the threat furthest along the path within range
      towers.forEach(function (t) {
        t.cool -= dt;
        if (t.cool > 0) return;
        var spec = TOWERS[t.type], best = null;
        enemies.forEach(function (e) {
          if (Math.hypot(e.x - t.x, e.y - t.y) <= spec.range && (!best || e.dist > best.dist)) best = e;
        });
        if (!best) return;
        t.cool = spec.rate;
        var mult = spec.stops.indexOf(best.type) >= 0 ? 1 : best.type === "ransom" ? RANSOM_WEAK : WEAK;
        best.hp -= spec.dmg * mult;
        shots.push({ x1: t.x, y1: t.y, x2: best.x, y2: best.y, color: spec.color, life: 0.12, strong: mult === 1 });
        if (best.hp <= 0 && enemies.indexOf(best) >= 0) {
          enemies.splice(enemies.indexOf(best), 1);
          money += THREATS[best.type].reward;
          kills++;
          t.kills++;
          hud();
        }
      });
      shots.forEach(function (s) { s.life -= dt; });
      shots = shots.filter(function (s) { return s.life > 0; });

      if (lives <= 0 && !over) return finish(false);
      if (running && !spawnQueue.length && !enemies.length) {
        running = false;
        money += 40 + wave * 8;  // budget for the next wave
        if (wave >= L.waves.length) return finish(true);
        ui.go.disabled = false;
        ui.go.textContent = "▶ Start wave " + (wave + 1);
        briefing();
        hud();
      }
    }

    // ------------------------------------------------------------ drawing
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var c = 0; c < COLS; c++) for (var r = 0; r < ROWS; r++) {
        ctx.fillStyle = pathCells[c + "," + r] ? "#0f2d40" : (c + r) % 2 ? "#0a1828" : "#0b1a2c";
        ctx.fillRect(c * T, r * T, T, T);
      }
      // the route
      ctx.strokeStyle = "rgba(25,211,197,.35)";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      route.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.stroke();
      ctx.setLineDash([]);
      // internet and server
      ctx.font = "34px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌐", 22, L.path[0][1] * T + T / 2);
      ctx.fillStyle = "rgba(61,220,132,.18)";
      ctx.fillRect(serverAt[0] * T + 4, serverAt[1] * T + 4, T - 8, T - 8);
      ctx.fillText("🗄️", serverAt[0] * T + T / 2, serverAt[1] * T + T / 2);
      // build preview
      if (hover && !over) {
        var ok = buildable(hover) && TOWERS[pick].cost <= money;
        ctx.fillStyle = ok ? "rgba(25,211,197,.18)" : "rgba(255,107,107,.18)";
        ctx.fillRect(hover[0] * T, hover[1] * T, T, T);
        if (ok) circle(hover[0] * T + T / 2, hover[1] * T + T / 2, TOWERS[pick].range, "rgba(25,211,197,.25)");
      }
      // defenses
      towers.forEach(function (t) {
        var spec = TOWERS[t.type];
        if (t === selected) circle(t.x, t.y, spec.range, "rgba(255,255,255,.3)");
        ctx.fillStyle = spec.color + "44";
        roundRect(t.x - 24, t.y - 24, 48, 48, 10);
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = "26px serif";
        ctx.fillText(spec.icon, t.x, t.y + 1);
      });
      // shots
      shots.forEach(function (s) {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = s.strong ? 1 : 0.4;
        ctx.lineWidth = s.strong ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      // threats
      enemies.forEach(function (e) {
        var s = THREATS[e.type], big = e.type === "ransom", rad = big ? 22 : 15;
        ctx.fillStyle = s.color + "55";
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = (big ? 28 : 19) + "px serif";
        ctx.fillText(s.icon, e.x, e.y + 1);
        ctx.fillStyle = "#1f3d5c";
        ctx.fillRect(e.x - rad, e.y - rad - 9, rad * 2, 4);
        ctx.fillStyle = e.hp / e.max > 0.4 ? "#3ddc84" : "#ff6b6b";
        ctx.fillRect(e.x - rad, e.y - rad - 9, rad * 2 * Math.max(0, e.hp / e.max), 4);
      });
    }
    function circle(x, y, r, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.fill();
    }

    // ------------------------------------------------------------ loop
    var last = performance.now(), raf;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!over) for (var s = 0; s < speed; s++) step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    CS.onLeave(function () { cancelAnimationFrame(raf); over = true; });

    function finish(won) {
      over = true;
      running = false;
      ui.go.disabled = true;
      var share = lives / L.lives;
      var stars = !won ? 0 : share >= 0.9 ? 3 : share >= 0.5 ? 2 : 1;
      var score = won ? lives * 100 + money + kills * 10 : kills * 10;
      setTimeout(function () {
        done({
          stars: stars, score: score, title: won ? (stars === 3 ? "Not a byte lost" : "Network held") : "The network fell",
          summary: "<p>" + (won ? "You held all " + L.waves.length + " waves" : "You lasted until wave " + wave) + ", stopping <b>" + kills + "</b> threats, with <b>" +
            lives + " of " + L.lives + "</b> data integrity left.</p><p>" + (won ? "Three stars needs 90% integrity left." :
            "Tip: match each defense to the threat it stops, and build where the path passes several times.") + "</p>",
        });
      }, 400);
    }

    // For automated play-testing
    stage.__td = { place: place, start: startWave, state: function () { return { money: money, lives: lives, wave: wave, running: running, over: over, enemies: enemies.length }; },
      setSpeed: function (s) { speed = s; } };

    briefing();
    showTip(tip.innerHTML + "<p>Pick a defense, then click a square beside the path.</p>");
    hud();
  }
})();
