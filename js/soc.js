/* Mode 1: SOC Analyst. Read each alert and decide, before the timer runs out. */
(function () {
  "use strict";
  var esc = CS.esc;
  var SECONDS = [0, 45, 40, 35, 30, 25];
  var CHOICES = [
    { id: "benign", label: "False alarm", small: "Nothing bad: close it", cls: "green" },
    { id: "contain", label: "Contain", small: "Real: deal with it now", cls: "amber" },
    { id: "escalate", label: "Escalate", small: "Serious: call incident response", cls: "red" },
  ];
  var LABEL = { benign: "False alarm", contain: "Contain", escalate: "Escalate" };

  CS.addMode({
    id: "soc", icon: "🛡️", title: "SOC Analyst",
    blurb: "Alerts are piling up. Read the logs and decide: false alarm, contain it, or escalate.",
    intro: "You're on the night shift at Island Networks' security operations centre. Each alert has logs and context. Decide quickly, but read carefully.",
    how: "For each alert pick <b>False alarm</b> (nothing bad happened), <b>Contain</b> (a real problem you can handle now: block, reset, isolate) or <b>Escalate</b> (serious: a confirmed break-in, data leaving, ransomware). Correct answers score 100 plus a speed bonus, and streaks add more. Running out of time counts as wrong.",
    levels: [
      { name: "First shift", desc: "Six alerts. Some are obvious, some are noise." },
      { name: "Busy morning", desc: "VPNs, change tickets and a phished password." },
      { name: "Something's off", desc: "DNS, service accounts and a tired user's phone." },
      { name: "Shades of grey", desc: "Blocked versus breached; travel versus theft." },
      { name: "Incident night", desc: "Active Directory attacks and data leaving the building." },
    ],
    start: play,
  });

  function play(level, stage, done) {
    var alerts = CS.shuffle(CS.SOC_ALERTS.filter(function (a) { return a.level === level; }));
    var i = 0, score = 0, right = 0, streak = 0, timer = null, log = [];

    function show() {
      var a = alerts[i];
      stage.innerHTML =
        '<div class="hud"><span class="chip">Alert <b>' + (i + 1) + "</b> of " + alerts.length + '</span><span class="chip">Score <b id="sc">' + score + '</b></span>' +
        '<span class="chip">Streak <b id="stk">' + streak + '</b></span><div class="timer" id="tm"><i></i></div><span class="chip" id="secs"></span></div>' +
        '<div class="card"><div class="alert-head"><span class="sev ' + esc(a.sev) + '">' + esc(a.sev) + '</span><span class="muted">' + esc(a.source) + "</span></div>" +
        "<h2>" + esc(a.title) + '</h2><div class="logs">' + a.logs.map(esc).join("\n") + '</div><p class="ctx">' + a.ctx + "</p>" +
        '<div class="choices">' + CHOICES.map(function (c) {
          return '<button class="btn ' + c.cls + '" data-c="' + c.id + '">' + c.label + "<small>" + c.small + "</small></button>";
        }).join("") + '</div><div id="after"></div></div>';
      var bar = stage.querySelector("#tm"), fill = bar.querySelector("i"), secs = stage.querySelector("#secs");
      timer = CS.countdown(SECONDS[level], function (f, s) {
        fill.style.width = f * 100 + "%";
        bar.classList.toggle("low", f < 0.3);
        secs.textContent = s + "s";
      }, function () { answer(null); });
      stage.querySelectorAll("[data-c]").forEach(function (b) { b.addEventListener("click", function () { answer(b.dataset.c); }); });
    }

    function answer(choice) {
      var a = alerts[i], left = timer.left();
      timer.stop();
      var ok = choice === a.answer, gained = 0;
      if (ok) {
        right++;
        streak++;
        gained = 100 + Math.ceil(left * 4) + (streak > 2 ? 25 * (streak - 2) : 0);
        score += gained;
      } else {
        streak = 0;
      }
      log.push({ title: a.title, ok: ok });
      stage.querySelectorAll("[data-c]").forEach(function (b) {
        b.disabled = true;
        if (b.dataset.c === a.answer) b.style.outline = "3px solid #fff";
      });
      stage.querySelector("#sc").textContent = score;
      stage.querySelector("#stk").textContent = streak;
      var last = i === alerts.length - 1;
      stage.querySelector("#after").innerHTML = '<div class="verdict' + (ok ? "" : " bad") + '"><h3>' +
        (ok ? "Correct: " + LABEL[a.answer] + " (+" + gained + ")" : (choice ? "Not quite. " : "Out of time. ") + "The answer is " + LABEL[a.answer] + ".") +
        "</h3><p>" + esc(a.why) + '</p></div><p><button class="btn" id="next">' + (last ? "Finish shift" : "Next alert →") + "</button></p>";
      var next = stage.querySelector("#next");
      next.focus();
      next.addEventListener("click", function () {
        if (last) return end();
        i++;
        show();
      });
    }

    function end() {
      var pct = right / alerts.length;
      var stars = pct === 1 ? 3 : pct >= 0.75 ? 2 : pct >= 0.5 ? 1 : 0;
      done({
        stars: stars, score: score,
        title: stars === 3 ? "Flawless shift" : stars ? "Shift complete" : "Rough shift",
        summary: "<p>You got <b>" + right + " of " + alerts.length + "</b> right." + (stars ? "" : " Get half right to unlock the next level.") + "</p><ul>" +
          log.map(function (l) { return "<li>" + (l.ok ? "✅ " : "❌ ") + esc(l.title) + "</li>"; }).join("") + "</ul>",
      });
    }

    show();
  }
})();
