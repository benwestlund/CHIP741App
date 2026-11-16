// app.js — Steady prototype logic
// Plain JavaScript, no frameworks. Data is saved in the browser (localStorage).
// Nothing private belongs in this file: anyone can read it with "Inspect".

/* ---------- 1. Configuration ---------- */
const CONFIG = {
  // Leave empty to use the built-in demo coach (canned replies from content.js).
  // To use a real AI model, run server/server.py somewhere and put its URL here,
  // e.g. "https://your-proxy.onrender.com/chat". The API key lives on that
  // server, never in this file.
  CHAT_ENDPOINT: ""
};

/* ---------- 2. Saving and loading ---------- */
const STORE_KEY = "steady.v1";

function blankState() {
  return {
    profile: null,          // {name, track, med, time, reminder, startDate}
    doses: {},              // {"2026-11-16": "2026-11-16T20:04:00.000Z"}
    checkins: {},           // {"2026-11-16": {mood, side:[], alcohol, note}}
    chat: [],               // [{role:"user"|"assistant", text}]
    share: false,
    lastNotified: null
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? Object.assign(blankState(), JSON.parse(raw)) : blankState();
  } catch (e) {
    return blankState(); // storage blocked: app still works for this visit
  }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

let state = load();

/* ---------- 3. Date helpers ---------- */
function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- 4. Adherence math ---------- */
function isTaken(k) { return Boolean(state.doses[k]); }

// Status of a given day: "taken", "missed", "today", "future", or "before" (before the user started)
function dayStatus(k) {
  const today = dayKey();
  if (isTaken(k)) return "taken";
  if (state.profile && k < state.profile.startDate) return "before";
  if (k === today) return "today";
  if (k > today) return "future";
  return "missed";
}

function streak() {
  let d = new Date();
  if (!isTaken(dayKey(d))) d = addDays(d, -1); // today isn't over yet
  let n = 0;
  while (isTaken(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

// Percent of doses taken over the last `days` days (only counts days since starting;
// counts today only if already taken).
function adherence(days) {
  let taken = 0, total = 0;
  for (let i = 0; i < days; i++) {
    const k = dayKey(addDays(new Date(), -i));
    const s = dayStatus(k);
    if (s === "taken") { taken++; total++; }
    else if (s === "missed") total++;
  }
  return { taken, total, pct: total ? Math.round((taken / total) * 100) : null };
}

/* ---------- 5. Routing between screens ---------- */
const VIEWS = ["today", "history", "learn", "coach", "profile", "care-team"];

function route() {
  let v = location.hash.replace("#", "");
  if (!VIEWS.includes(v)) v = "today";
  $$(".view").forEach((el) => (el.hidden = el.dataset.view !== v));
  $$(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === v || (v === "care-team" && a.dataset.tab === "profile")));
  render[v.replace("-", "")]?.();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ---------- 6. Rendering each screen ---------- */
const render = {
  today() {
    const p = state.profile; if (!p) return;
    const now = new Date();
    $("#todayDate").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const hr = now.getHours();
    const part = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    $("#greet").textContent = p.name ? `${part}, ${p.name}` : part;

    const taken = isTaken(dayKey());
    const card = $("#doseCard");
    card.classList.toggle("taken", taken);
    const label = p.med ? p.med : "Today's dose";
    if (taken) {
      const t = new Date(state.doses[dayKey()]);
      $("#doseStatus").textContent = "Done for today";
      $("#doseSub").textContent = `${label} logged at ${t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      $("#takeBtn").textContent = "Logged";
      $("#takeBtn").disabled = true;
      $("#undoBtn").hidden = false;
    } else {
      $("#doseStatus").textContent = label;
      $("#doseSub").textContent = `Reminder at ${fmtTime(p.time)}`;
      $("#takeBtn").textContent = "I took it";
      $("#takeBtn").disabled = false;
      $("#undoBtn").hidden = true;
    }

    const s = streak();
    $("#streakNum").textContent = s;
    const wk = adherence(7);
    const frac = wk.total ? wk.taken / wk.total : 0;
    $("#ringFg").style.strokeDashoffset = String(326.7 * (1 - frac));

    // Week strip (Mon..Sun of the current week)
    const start = addDays(now, -((now.getDay() + 6) % 7));
    $("#week").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i), k = dayKey(d);
      const st = dayStatus(k);
      const cls = [st === "taken" ? "taken" : st === "missed" ? "missed" : "", k === dayKey() ? "today" : ""].join(" ");
      return `<div class="${cls}">${d.toLocaleDateString([], { weekday: "narrow" })}<b>${d.getDate()}</b></div>`;
    }).join("");

    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    $("#tipText").textContent = CONTENT.tips[doy % CONTENT.tips.length];

    // Check-in: restore today's answers
    const ci = state.checkins[dayKey()];
    $("#checkinState").textContent = ci ? "Done" : "Not yet";
    $("#checkinState").classList.toggle("done", Boolean(ci));
    $$("#checkinForm .choices").forEach((group) => {
      const name = group.dataset.name;
      const val = ci ? ci[name] : null;
      group.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("on", Array.isArray(val) ? val.includes(b.dataset.value) : val === b.dataset.value);
      });
    });
    $("#checkinNote").value = ci?.note || "";
    $("#sideOther").value = ci?.sideOther || "";
    syncOtherField();
    $("#checkinFeedback").hidden = true;
  },

  history() {
    const a7 = adherence(7), a30 = adherence(30);
    $("#stats").innerHTML = `
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${a7.pct ?? "–"}${a7.pct != null ? "%" : ""}</b><span>last 7 days</span></div>
      <div class="stat"><b>${a30.pct ?? "–"}${a30.pct != null ? "%" : ""}</b><span>last 30 days</span></div>`;
    drawCalendar();
  },

  learn() {
    const t = state.profile?.track || "prep";
    $("#learnLede").textContent = t === "prep"
      ? "Short reads on PrEP, staying on track, and keeping it private."
      : "Short reads on treatment, staying on track, and keeping it private.";
    $("#learnList").innerHTML = CONTENT.learn.filter((c) => c.tracks.includes(t)).map((c) => `
      <details class="learn-card">
        <summary><span class="tag">${esc(c.tag)}</span><strong>${esc(c.title)}</strong></summary>
        <div class="learn-body">
          ${c.body.map((p) => `<p>${esc(p)}</p>`).join("")}
          ${c.source ? `<p class="src">Source: <a href="${c.source.url}" target="_blank" rel="noopener">${esc(c.source.label)}</a></p>` : ""}
        </div>
      </details>`).join("");
    $("#resourceList").innerHTML = CONTENT.resources.filter((r) => r.tracks.includes(t))
      .map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener">${esc(r.label)}</a></li>`).join("");
  },

  coach() {
    $("#coachMode").textContent = CONFIG.CHAT_ENDPOINT
      ? "AI coach. It can make mistakes and is not medical advice. Don't share your full name or other identifying details."
      : "Demo coach with prewritten answers. Not medical advice. In the full version this connects to an AI model through a secure server.";
    if (!state.chat.length) {
      state.chat.push({ role: "assistant", text: `Hi${state.profile?.name ? " " + state.profile.name : ""}. I'm here for questions about staying on track: missed doses, side effects, drinking, privacy. What's on your mind?` });
      save();
    }
    drawChat();
  },

  profile() {
    const p = state.profile || {};
    $("#pName").value = p.name || "";
    $("#pTrack").value = p.track || "prep";
    $("#pMed").value = p.med || "";
    $("#pTime").value = p.time || "20:00";
    $("#pReminder").value = p.reminder || "";
    $("#shareToggle").checked = state.share;
    $("#profileFeedback").hidden = true;
    $("#reminderFeedback").hidden = true;
    const n = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
    $("#notifyBtn").textContent = n === "granted" ? "Browser alerts on" : "Turn on browser alerts";
  },

  careteam() {
    const p = state.profile || {};
    $("#provName").textContent = `${p.name || "Patient"} · ${p.track === "art" ? "ART" : "PrEP"}`;
    if (!state.share) {
      $("#providerBody").innerHTML = `<div class="card"><p><strong>Sharing is off.</strong></p><p class="muted">The patient hasn't turned on sharing, so the care team sees nothing. Turn on "Share with my care team" in Profile to preview.</p></div>`;
      return;
    }
    const a7 = adherence(7), a30 = adherence(30);
    // last 30 days, oldest first, for the bar chart
    const days = Array.from({ length: 30 }, (_, i) => dayKey(addDays(new Date(), i - 29)));
    const bars = days.map((k) => {
      const s = dayStatus(k);
      return s === "taken" ? `<i style="height:100%" title="${k}: taken"></i>`
        : s === "missed" ? `<i class="miss" title="${k}: missed"></i>`
        : `<i class="fut" style="height:20%" title="${k}"></i>`;
    }).join("");
    const missed = days.filter((k) => dayStatus(k) === "missed");
    const ciDays = days.filter((k) => state.checkins[k]);
    const eligible = days.filter((k) => ["taken", "missed"].includes(dayStatus(k))).length;
    const response = eligible ? Math.round((ciDays.length / eligible) * 100) : 0;
    const sideDays = ciDays.filter((k) => (state.checkins[k].side || []).some((s) => s !== "none"));
    const heavy = ciDays.filter((k) => state.checkins[k].alcohol === "3+");
    const rough = ciDays.filter((k) => state.checkins[k].mood === "rough");

    // Flags a provider might want to follow up on
    const flags = [];
    if (a7.pct != null && a7.pct < 85) flags.push(`7-day adherence is ${a7.pct}% (below 85%).`);
    if (heavy.length) {
      const missAfter = heavy.filter((k) => dayStatus(dayKey(addDays(parseKey(k), 1))) === "missed" || dayStatus(k) === "missed").length;
      flags.push(`Reported 3+ drinks on ${heavy.length} day(s); ${missAfter} of those had a missed dose that day or the next.`);
    }
    if (sideDays.length >= 3) flags.push(`Side effects reported on ${sideDays.length} days.`);
    if (eligible >= 7 && response < 50) flags.push(`Check-in response rate is ${response}%. Engagement may be dropping.`);

    const recent = ciDays.slice(-5).reverse().map((k) => {
      const c = state.checkins[k];
      const side = (c.side || []).filter((s) => s !== "none")
        .map((s) => (s === "other" && c.sideOther ? `other (${c.sideOther})` : s)).join(", ") || "none";
      return `<div class="prov-row"><span>${parseKey(k).toLocaleDateString([], { month: "short", day: "numeric" })}</span><span>Mood: ${esc(c.mood || "–")} · Side effects: ${esc(side)} · Drinks: ${esc(c.alcohol || "–")}${c.note ? ` · "${esc(c.note)}"` : ""}</span></div>`;
    }).join("") || `<p class="muted">No check-ins yet.</p>`;

    $("#providerBody").innerHTML = `
      <div class="stats">
        <div class="stat"><b>${a7.pct ?? "–"}${a7.pct != null ? "%" : ""}</b><span>7-day adherence</span></div>
        <div class="stat"><b>${a30.pct ?? "–"}${a30.pct != null ? "%" : ""}</b><span>30-day adherence</span></div>
        <div class="stat"><b>${response}%</b><span>check-in response</span></div>
      </div>
      ${flags.length ? `<div class="card flag"><h2>Follow-up suggested</h2>${flags.map((f) => `<p>${esc(f)}</p>`).join("")}</div>` : `<div class="card"><h2>No flags</h2><p class="muted">Adherence and check-ins look steady.</p></div>`}
      <div class="card"><h2>Last 30 days</h2><div class="bars">${bars}</div>
        <p class="muted small">${missed.length} missed dose(s): ${missed.map((k) => parseKey(k).toLocaleDateString([], { month: "short", day: "numeric" })).join(", ") || "none"}</p></div>
      <div class="card"><h2>Recent check-ins</h2>${recent}</div>
      <div class="card"><h2>Rough-mood days</h2><p class="muted">${rough.length} in the last 30 days</p></div>`;
  }
};

/* ---------- 7. Calendar ---------- */
let calMonth = new Date(); calMonth.setDate(1);
function drawCalendar() {
  $("#monthLabel").textContent = calMonth.toLocaleDateString([], { month: "long", year: "numeric" });
  const first = new Date(calMonth);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  let html = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="dow">${d}</div>`).join("");
  html += "<div></div>".repeat(offset);
  for (let i = 1; i <= daysIn; i++) {
    const k = dayKey(new Date(first.getFullYear(), first.getMonth(), i));
    const s = dayStatus(k);
    const cls = ["d", s === "taken" ? "taken" : s === "missed" ? "missed" : s === "future" ? "future" : "", k === dayKey() ? "today" : ""].join(" ");
    html += `<div class="${cls}" title="${k}: ${s}">${i}</div>`;
  }
  $("#cal").innerHTML = html;
}
$("#prevMonth").addEventListener("click", () => { calMonth.setMonth(calMonth.getMonth() - 1); drawCalendar(); });
$("#nextMonth").addEventListener("click", () => { calMonth.setMonth(calMonth.getMonth() + 1); drawCalendar(); });

/* ---------- 8. Logging a dose ---------- */
function takeDose() {
  state.doses[dayKey()] = new Date().toISOString();
  save();
  $("#banner").hidden = true;
  render.today();
}
$("#takeBtn").addEventListener("click", takeDose);
$("#bannerTake").addEventListener("click", takeDose);
$("#undoBtn").addEventListener("click", () => { delete state.doses[dayKey()]; save(); render.today(); });

/* ---------- 9. Daily check-in ---------- */
// Show a text box when "Other" side effect is selected
function syncOtherField() {
  const on = Boolean($('#checkinForm [data-name="side"] [data-value="other"].on'));
  $("#sideOtherWrap").hidden = !on;
  return on;
}
$$("#checkinForm .choices").forEach((group) => {
  group.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (group.classList.contains("multi")) {
      if (b.dataset.value === "none") group.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      else group.querySelector('[data-value="none"]').classList.remove("on");
      b.classList.toggle("on");
      if (syncOtherField() && b.dataset.value === "other") $("#sideOther").focus();
    } else {
      group.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    }
  });
});
$("#checkinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const pick = (name) => $(`#checkinForm [data-name="${name}"] .on`)?.dataset.value || null;
  const side = $$('#checkinForm [data-name="side"] .on').map((b) => b.dataset.value);
  const sideOther = side.includes("other") ? $("#sideOther").value.trim() : "";
  state.checkins[dayKey()] = { mood: pick("mood"), side, sideOther, alcohol: pick("alcohol"), note: $("#checkinNote").value.trim() };
  save();
  render.today();
  // Tailored response to the check-in (the "keep people engaged" piece)
  const c = state.checkins[dayKey()];
  let msg = "Thanks for checking in.";
  if (c.alcohol === "3+") msg = "Thanks for being honest. On nights out, taking your dose before you leave helps a lot.";
  else if (side.some((s) => s !== "none")) msg = "Noted. If side effects keep up, mention them to your provider. They can often help.";
  else if (c.mood === "rough") msg = "Sorry today's rough. The Coach tab is here if you want to talk something through.";
  const fb = $("#checkinFeedback"); fb.textContent = msg; fb.hidden = false;
});

/* ---------- 10. Coach chat ---------- */
function drawChat() {
  $("#chat").innerHTML = state.chat.map((m) => `<div class="msg ${m.role === "user" ? "me" : "bot"}">${esc(m.text)}</div>`).join("");
  const last = $("#chat").lastElementChild; last?.scrollIntoView({ block: "end" });
  $("#suggestions").hidden = state.chat.filter((m) => m.role === "user").length > 0;
}

function demoReply(text) {
  const t = text.toLowerCase();
  // Keywords match the start of a word ("miss" matches "missed"); short words like "hi" must match exactly.
  const matches = (k) => new RegExp(`\\b${k}${k.length <= 3 ? "\\b" : ""}`).test(t);
  const rule = CONTENT.coachRules.find((r) => r.keys.some(matches));
  return rule ? rule.reply : CONTENT.coachFallback;
}

async function aiReply() {
  // Sends recent messages to OUR server (server/server.py), which adds the
  // API key and calls the AI model. The key never reaches the browser.
  const res = await fetch(CONFIG.CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      track: state.profile?.track || "prep",
      messages: state.chat.slice(-12).map((m) => ({ role: m.role, content: m.text }))
    })
  });
  if (!res.ok) throw new Error("Server error " + res.status);
  const data = await res.json();
  return data.reply;
}

async function sendChat(text) {
  text = text.trim(); if (!text) return;
  state.chat.push({ role: "user", text });
  drawChat();
  $("#chatText").value = "";
  const typing = document.createElement("div");
  typing.className = "msg bot typing"; typing.textContent = "typing…";
  $("#chat").appendChild(typing); typing.scrollIntoView({ block: "end" });

  let reply;
  try {
    reply = CONFIG.CHAT_ENDPOINT ? await aiReply() : await new Promise((r) => setTimeout(() => r(demoReply(text)), 600));
  } catch (err) {
    reply = "Sorry, I couldn't reach the coach right now. Try again in a bit.";
  }
  state.chat.push({ role: "assistant", text: reply });
  save();
  drawChat();
}
$("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); sendChat($("#chatText").value); });
$("#suggestions").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) sendChat(b.textContent); });

/* ---------- 11. Profile ---------- */
$("#profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  Object.assign(state.profile, {
    name: $("#pName").value.trim(),
    track: $("#pTrack").value,
    med: $("#pMed").value.trim(),
    time: $("#pTime").value || "20:00",
    reminder: $("#pReminder").value.trim() || "Daily routine time"
  });
  state.lastNotified = null;
  save();
  const fb = $("#profileFeedback"); fb.textContent = "Saved."; fb.hidden = false;
});
$("#shareToggle").addEventListener("change", (e) => { state.share = e.target.checked; save(); });
$("#providerBtn").addEventListener("click", () => { location.hash = "care-team"; });
$("#providerBack").addEventListener("click", () => { location.hash = "profile"; });

/* ---------- 12. Reminders ---------- */
function checkReminder() {
  const p = state.profile; if (!p) return;
  const [h, m] = p.time.split(":").map(Number);
  const due = new Date(); due.setHours(h, m, 0, 0);
  const today = dayKey();
  if (new Date() >= due && !isTaken(today)) {
    $("#bannerText").textContent = p.reminder || "Daily routine time";
    $("#banner").hidden = false;
    if (state.lastNotified !== today) {
      state.lastNotified = today; save();
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Steady", { body: p.reminder || "Daily routine time" });
        }
      } catch (e) { /* some browsers only allow notifications from a service worker */ }
    }
  } else {
    $("#banner").hidden = true;
  }
}
setInterval(checkReminder, 30000);

$("#notifyBtn").addEventListener("click", async () => {
  const fb = $("#reminderFeedback");
  try {
    if (typeof Notification === "undefined") throw new Error();
    const perm = await Notification.requestPermission();
    fb.textContent = perm === "granted" ? "Alerts on. You'll get one at your reminder time while Steady is open." : "Alerts were blocked. You can allow them in your browser settings.";
  } catch (e) {
    fb.textContent = "This browser doesn't support alerts here. Try the calendar option.";
  }
  fb.hidden = false;
  render.profile(); fb.hidden = false;
});

// Builds a repeating daily calendar event (.ics) with the user's private wording.
$("#icsBtn").addEventListener("click", () => {
  const p = state.profile;
  const [h, m] = p.time.split(":");
  const start = dayKey().replace(/-/g, "") + `T${h}${m}00`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Steady//EN",
    "BEGIN:VEVENT",
    `UID:steady-${Date.now()}@steady`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${start}`, "DURATION:PT5M", "RRULE:FREQ=DAILY",
    `SUMMARY:${(p.reminder || "Daily routine time").replace(/[,;]/g, " ")}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", "DESCRIPTION:Reminder", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "daily-reminder.ics";
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { /* ignore */ }
  const fb = $("#reminderFeedback");
  fb.textContent = "Calendar file created. Open it to add the daily event. (If nothing downloaded, this preview blocks downloads; it works on the hosted site.)";
  fb.hidden = false;
});

/* ---------- 13. Privacy: quick hide ---------- */
function showCover() {
  const now = new Date();
  $("#coverTime").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $(".cover-sub").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  $("#cover").hidden = false;
  document.title = "Clock";
}
$("#quickHide").addEventListener("click", showCover);
$("#cover").addEventListener("click", () => { $("#cover").hidden = true; document.title = "Steady"; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#cover").hidden) showCover(); });

/* ---------- 14. Onboarding ---------- */
let obTrack = "prep";
function obGo(i) {
  $$(".ob-step").forEach((s) => (s.hidden = Number(s.dataset.step) !== i));
  $$("#obSteps i").forEach((d, j) => d.classList.toggle("on", j <= i));
}
$("[data-next]").addEventListener("click", () => obGo(1));
$$("[data-track]").forEach((b) => b.addEventListener("click", () => { obTrack = b.dataset.track; obGo(2); }));
$("#obFinish").addEventListener("click", () => {
  state.profile = {
    name: $("#obName").value.trim(),
    track: obTrack,
    med: "",
    time: $("#obTime").value || "20:00",
    reminder: $("#obReminder").value.trim() || "Daily routine time",
    startDate: dayKey()
  };
  save();
  $("#onboard").hidden = true;
  location.hash = "today"; route(); checkReminder();
});

/* ---------- 15. Demo tools ---------- */
$("#sampleBtn").addEventListener("click", () => {
  const today = new Date();
  state.doses = {}; state.checkins = {};
  state.profile.startDate = dayKey(addDays(today, -30));
  let seed = 7; const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 30; i >= 1; i--) {
    const d = addDays(today, -i), k = dayKey(d);
    const weekend = [5, 6].includes(d.getDay()); // Fri, Sat
    const drinks = weekend ? (rand() < 0.5 ? "3+" : "1-2") : (rand() < 0.15 ? "1-2" : "none");
    const missChance = drinks === "3+" ? 0.45 : 0.06;
    if (rand() > missChance) {
      const t = new Date(d); t.setHours(20, Math.floor(rand() * 50), 0, 0);
      state.doses[k] = t.toISOString();
    }
    if (rand() < 0.7) {
      state.checkins[k] = {
        mood: rand() < 0.65 ? "good" : rand() < 0.7 ? "okay" : "rough",
        side: i > 24 && rand() < 0.5 ? ["nausea"] : ["none"],
        alcohol: drinks, note: ""
      };
    }
  }
  state.share = true;
  save();
  const b = $("#sampleBtn"); b.textContent = "Sample data loaded"; setTimeout(() => (b.textContent = "Load 30 days of sample data"), 2000);
  render.profile();
});

let resetArmed = false;
$("#resetBtn").addEventListener("click", (e) => {
  if (!resetArmed) { resetArmed = true; e.target.textContent = "Tap again to erase"; setTimeout(() => { resetArmed = false; e.target.textContent = "Erase everything"; }, 3000); return; }
  state = blankState(); save();
  location.hash = ""; location.reload();
});

/* ---------- 16. Start ---------- */
if (!state.profile) { $("#onboard").hidden = false; obGo(0); }
route();
checkReminder();
