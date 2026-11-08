/* Mode 2: Phish or Legit. Inspect each message (hover or tap links to see where they really go) and decide. */
(function () {
  "use strict";
  var esc = CS.esc;
  var SECONDS = [0, 35, 30, 30, 25, 25];

  CS.addMode({
    id: "phish", icon: "🎣", title: "Phish or Legit?",
    blurb: "Emails and texts flood in. Check the sender, the links and the story, then call it.",
    intro: "Staff keep forwarding messages to you. Some are real, some are traps. Hover over or tap a link to see where it really goes before you decide.",
    how: "Read the sender, any attachment and the message, and use what you know in the story (the grey box). Hover over or tap links to see their real address at the bottom: it costs nothing. Then choose <b>Phish</b> or <b>Legit</b>. Speed adds a bonus.",
    levels: [
      { name: "Inbox basics", desc: "Prize draws, panic and too-good-to-be-true." },
      { name: "Boss and bills", desc: "Gift cards, fake shares and real payslips." },
      { name: "Lookalikes", desc: "One letter off, and attachments that aren't what they seem." },
      { name: "Trusted senders", desc: "Hacked colleagues, hidden links, QR codes." },
      { name: "Expert inbox", desc: "Reply-To tricks, foreign letters and fake app permissions." },
    ],
    start: play,
  });

  /** Message text with [[shown|real]] links: escape everything, then add the links. */
  function body(text) {
    var out = "", re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g, last = 0, m;
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index)) + '<a tabindex="0" data-href="' + esc(m[2]) + '">' + esc(m[1]) + "</a>";
      last = re.lastIndex;
    }
    return (out + esc(text.slice(last))).replace(/\n/g, "<br>");
  }

  function render(m) {
    if (m.kind === "sms") {
      return '<div class="msg sms"><div class="from">Text message from <b>' + esc(m.from) + '</b></div><div class="bubble">' + body(m.body) + "</div></div>";
    }
    return '<div class="msg"><div class="mh"><div><b>' + esc(m.name) + '</b> <span class="addr">&lt;' + esc(m.from) + "&gt;</span></div>" +
      (m.replyTo ? '<div class="addr">Reply-To: ' + esc(m.replyTo) + "</div>" : "") +
      "<div><b>" + esc(m.subject) + '</b></div></div><div class="mb">' + body(m.body) +
      (m.attach ? '<div class="att">📎 ' + esc(m.attach) + "</div>" : "") + "</div></div>";
  }

  function play(level, stage, done) {
    var msgs = CS.shuffle(CS.PHISH.filter(function (m) { return m.level === level; }));
    var i = 0, score = 0, right = 0, streak = 0, timer, log = [];

    function show() {
      var m = msgs[i];
      stage.innerHTML =
        '<div class="hud"><span class="chip">Message <b>' + (i + 1) + "</b> of " + msgs.length + '</span><span class="chip">Score <b id="sc">' + score + "</b></span>" +
        '<span class="chip">Streak <b id="stk">' + streak + '</b></span><div class="timer" id="tm"><i></i></div><span class="chip" id="secs"></span></div>' +
        '<div class="card">' + (m.ctx ? '<p class="ctx">📌 ' + esc(m.ctx) + "</p>" : "") + render(m) +
        '<div class="status" id="status">Hover over or tap a link to see where it really goes.</div>' +
        '<div class="choices"><button class="btn red" data-c="phish">🎣 Phish<small>A trap: report it</small></button>' +
        '<button class="btn green" data-c="legit">✅ Legit<small>Safe to act on</small></button></div><div id="after"></div></div>';
      var status = stage.querySelector("#status");
      stage.querySelectorAll("a[data-href]").forEach(function (a) {
        var reveal = function (e) {
          if (e) e.preventDefault();
          status.innerHTML = "This link goes to: <b>" + esc(a.dataset.href) + "</b>";
        };
        a.addEventListener("mouseenter", reveal);
        a.addEventListener("focus", reveal);
        a.addEventListener("click", reveal);
      });
      var bar = stage.querySelector("#tm"), fill = bar.querySelector("i"), secs = stage.querySelector("#secs");
      timer = CS.countdown(SECONDS[level], function (f, s) {
        fill.style.width = f * 100 + "%";
        bar.classList.toggle("low", f < 0.3);
        secs.textContent = s + "s";
      }, function () { answer(null); });
      stage.querySelectorAll("[data-c]").forEach(function (b) { b.addEventListener("click", function () { answer(b.dataset.c); }); });
    }

    function answer(choice) {
      var m = msgs[i], left = timer.left();
      timer.stop();
      var ok = choice === m.answer, gained = 0;
      if (ok) {
        right++;
        streak++;
        gained = 100 + Math.ceil(left * 4) + (streak > 2 ? 25 * (streak - 2) : 0);
        score += gained;
      } else streak = 0;
      log.push({ title: m.subject || m.body.slice(0, 50) + "…", ok: ok, answer: m.answer });
      stage.querySelectorAll("[data-c]").forEach(function (b) { b.disabled = true; });
      stage.querySelector("#sc").textContent = score;
      stage.querySelector("#stk").textContent = streak;
      var last = i === msgs.length - 1, label = m.answer === "phish" ? "Phish" : "Legit";
      stage.querySelector("#after").innerHTML = '<div class="verdict' + (ok ? "" : " bad") + '"><h3>' +
        (ok ? "Right, it's " + label + " (+" + gained + ")" : (choice ? "Not quite. " : "Out of time. ") + "It's " + label + ".") + "</h3><ul>" +
        m.flags.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + '</ul></div><p><button class="btn" id="next">' + (last ? "Finish" : "Next message →") + "</button></p>";
      var next = stage.querySelector("#next");
      next.focus();
      next.addEventListener("click", function () {
        if (last) return end();
        i++;
        show();
      });
    }

    function end() {
      var pct = right / msgs.length;
      var stars = pct === 1 ? 3 : pct >= 0.75 ? 2 : pct >= 0.5 ? 1 : 0;
      done({
        stars: stars, score: score, title: stars === 3 ? "Nothing gets past you" : stars ? "Inbox cleared" : "Too many slipped through",
        summary: "<p>You judged <b>" + right + " of " + msgs.length + "</b> correctly.</p><ul>" + log.map(function (l) {
          return "<li>" + (l.ok ? "✅ " : "❌ ") + esc(l.title) + ' <span class="muted">(' + (l.answer === "phish" ? "phish" : "legit") + ")</span></li>";
        }).join("") + "</ul>",
      });
    }

    show();
  }
})();
