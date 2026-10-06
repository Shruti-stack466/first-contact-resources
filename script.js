(function () {
  var STORE = "fc-res-visited";
  var SOUND = "fc-res-sound";
  var cards = Array.prototype.slice.call(document.querySelectorAll("article.res"));
  var total = cards.length;

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* ---------- sound (Web Audio, no files; off unless the learner turns it on) ---------- */
  var soundOn = load(SOUND, false);
  var ctx = null, lastSound = 0;
  function audio() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, gain, type, endFreq) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur * 0.75);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function play(kind) {
    if (!soundOn) return;
    var now = Date.now();
    if (now - lastSound < 350 && kind !== "chime") return;
    lastSound = now;
    if (kind === "tap") tone(1250, 0, 0.06, 0.055, "sine", 620);
    if (kind === "chime") { tone(880, 0, 0.35, 0.11); tone(1760, 0, 0.3, 0.03); tone(1318.5, 0.09, 0.45, 0.11); }
  }
  var soundBtn = document.getElementById("sound-toggle");
  function paintSound() {
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundBtn.setAttribute("aria-label", soundOn ? "Sound on. Turn sound off" : "Sound off. Turn sound on");
  }
  if (soundBtn) {
    paintSound();
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn; save(SOUND, soundOn); paintSound(); play("tap");
    });
  }

  /* ---------- level and time chips on each card summary, so learners can scan before opening ---------- */
  var ICONS = {
    Level: '<path d="M5 20v-5M12 20V10M19 20V4"/>',
    Time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    viewed: '<path d="M20 6 9 17l-5-5"/>'
  };
  function chip(cls, icon, text) {
    var s = document.createElement("span");
    s.className = "chip" + (cls ? " " + cls : "");
    s.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[icon] + "</svg>";
    s.appendChild(document.createTextNode(text));
    return s;
  }
  cards.forEach(function (card) {
    var sum = card.querySelector(".sumtext");
    if (!sum) return;
    var row = document.createElement("span");
    row.className = "chips";
    card.querySelectorAll(".meta li").forEach(function (li) {
      var k = li.querySelector(".k"), v = li.querySelector(".k + span");
      if (!k || !v || !ICONS[k.textContent]) return;
      row.appendChild(chip("", k.textContent, v.textContent.split(";")[0].replace(/, in parts$/, "")));
    });
    row.appendChild(chip("viewed", "viewed", "Viewed"));
    sum.appendChild(row);
  });

  /* ---------- progress: resources actually opened ---------- */
  var viewed = load(STORE, []);
  if (!Array.isArray(viewed)) viewed = [];
  var fill = document.getElementById("prog-fill");
  var count = document.getElementById("prog-n");
  var prog = fill ? fill.closest(".saa-prog") : null;
  document.getElementById("prog-t").textContent = total;
  function paintProgress() {
    var n = cards.filter(function (c) { return viewed.indexOf(c.id) > -1; }).length;
    cards.forEach(function (c) { c.classList.toggle("is-viewed", viewed.indexOf(c.id) > -1); });
    if (fill) fill.style.width = (n / total * 100) + "%";
    if (count) count.textContent = n;
    if (prog) prog.classList.toggle("is-done", n === total);
    return n;
  }
  paintProgress();

  // A card counts as viewed only once the learner opens its resource link (click, middle-click or keyboard).
  function markVisited(card) {
    if (viewed.indexOf(card.id) > -1) return;
    viewed.push(card.id); save(STORE, viewed);
    if (paintProgress() === total) play("chime");
  }
  cards.forEach(function (card) {
    var d = card.querySelector("details");
    var s = card.querySelector("summary");
    if (!d) return;
    if (s) s.addEventListener("click", function () { play("tap"); });
    d.addEventListener("toggle", syncToggleAll);
    card.querySelectorAll("a.open").forEach(function (a) {
      a.addEventListener("click", function () { markVisited(card); });
      a.addEventListener("auxclick", function (e) { if (e.button === 1) markVisited(card); });
    });
  });

  /* ---------- open all / close all ---------- */
  var toggleAll = document.getElementById("toggle-all");
  function allOpen() { return cards.every(function (c) { var d = c.querySelector("details"); return d && d.open; }); }
  function syncToggleAll() {
    if (!toggleAll) return;
    var open = allOpen();
    toggleAll.setAttribute("aria-pressed", open ? "true" : "false");
    toggleAll.querySelector("span").textContent = open ? "Close all cards" : "Open all cards";
  }
  if (toggleAll) {
    toggleAll.addEventListener("click", function () {
      var open = !allOpen();
      cards.forEach(function (c) { var d = c.querySelector("details"); if (d) d.open = open; });
      play("tap");
    });
  }

  /* ---------- section tabs: highlight the section in view, keep the tab visible ---------- */
  var nav = document.querySelector(".sectabs");
  var links = Array.prototype.slice.call(document.querySelectorAll(".tabs a"));
  var sections = links.map(function (a) { return document.getElementById(a.dataset.sec); });
  function setCurrent(id) {
    links.forEach(function (a) {
      var on = a.dataset.sec === id;
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      if (on && a.parentNode.parentNode.scrollWidth > a.parentNode.parentNode.clientWidth) {
        var strip = a.parentNode.parentNode;
        strip.scrollTo({ left: a.parentNode.offsetLeft - 8, behavior: "smooth" });
      }
    });
  }
  function onScroll() {
    var line = (nav ? nav.getBoundingClientRect().bottom : 0) + window.innerHeight * 0.3;
    var current = null;
    sections.forEach(function (s) { if (s && s.getBoundingClientRect().top <= line) current = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].id;
    setCurrent(current);
    if (nav) nav.classList.toggle("is-stuck", nav.getBoundingClientRect().top <= 0 && window.scrollY > 0);
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; onScroll(); });
  }, { passive: true });
  onScroll();
  window.addEventListener("load", onScroll);
  window.addEventListener("hashchange", onScroll);
  links.forEach(function (a) {
    a.addEventListener("click", function () {
      play("tap");
      var s = document.getElementById(a.dataset.sec);
      if (!s) return;
      s.classList.remove("is-flash"); void s.offsetWidth; s.classList.add("is-flash");
      setTimeout(function () { s.classList.remove("is-flash"); }, 1400);
    });
  });

  // Opens every resource card before printing, so no details are hidden on paper.
  window.addEventListener("beforeprint", function () {
    cards.forEach(function (c) { var d = c.querySelector("details"); if (d) d.open = true; });
  });
})();
