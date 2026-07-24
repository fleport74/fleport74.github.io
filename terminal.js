/* Interactive console: a small command map rendered into a bottom
   sheet. Also owns the accent theme (CSS vars + localStorage). */

const ACCENTS = {
  shu: "#ff3355",
  gold: "#d8a94f",
  cyan: "#58c4dc",
  violet: "#a78bfa",
  mint: "#6ee7b7",
};

function hexToSoft(hex, alpha = 0.14) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function applyAccent(name) {
  const hex = ACCENTS[name];
  if (!hex) return false;
  const root = document.documentElement.style;
  root.setProperty("--accent", hex);
  root.setProperty("--accent-soft", hexToSoft(hex));
  try {
    localStorage.setItem("accent", name);
  } catch {}
  dispatchEvent(new Event("accentchange"));
  return true;
}

export function getAccent() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || ACCENTS.gold
  );
}

/* restore persisted accent as early as possible */
try {
  const saved = localStorage.getItem("accent");
  if (saved && ACCENTS[saved]) applyAccent(saved);
} catch {}

/* ============================================================ */

const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const RING_ART = `        /\\
       /::\\
      /____\\
   .-'      '-.
  /            \\
 |              |
  \\            /
   '-.______.-'

a solitaire, sampled from line segments.
the real ones are NURBS.`;

const COMMANDS = {
  help: () =>
    [
      "help          this list",
      "whoami        who is this",
      "projects      selected work, one line each",
      "stack         tools I reach for",
      "contact       how to reach me",
      "accent <c>    theme: shu | gold | cyan | violet | mint",
      "ring          craft demo",
      "pika          ⚡ summon pikachu",
      "goto <id>     scroll to: work | approach | contact",
      "clear         wipe output",
      "exit          close console",
    ].join("\n"),

  whoami: () =>
    `<span class="out-accent">Filipp</span> · AI / Product Engineer
Voice copilots, parametric CAD, agents in production.
<a href="https://github.com/fleport74">github.com/fleport74</a>`,

  projects: () =>
    [
      "A1  jarvis        local voice copilot (Python · MCP)",
      "A2  cad-engine    parametric NURBS jewelry generator (TS · rhino3dm)",
      "B1  hive          spatial team workspace (Next.js monorepo)",
      "B2  client-work   production systems for teams (private; ask)",
      "",
      "slot codes match the vending machine in ~/work.",
    ].join("\n"),

  stack: () =>
    [
      "langs      TypeScript · Python",
      "ai         Claude · MCP · Whisper · agent loops",
      "web        Next.js · SvelteKit · Supabase",
      "geometry   rhino3dm · manifold · NURBS",
      "mobile     React Native · Expo · SQLite",
      "infra      Railway · Vercel · GitHub Actions",
    ].join("\n"),

  contact: () =>
    `<a href="https://github.com/fleport74">github.com/fleport74</a>
Repos are mostly private; ask for a walkthrough.`,

  ring: () => RING_ART,

  pika: () => {
    dispatchEvent(new CustomEvent("hero:pika"));
    closeConsole();
    return `⚡ <span class="out-accent">pika pika!</span> summoning… look up.`;
  },

  accent: (arg) => {
    if (applyAccent(arg)) {
      return `<span class="out-ok">accent set: ${arg}</span>`;
    }
    return `usage: accent &lt;shu | gold | cyan | violet | mint&gt;`;
  },

  goto: (arg) => {
    const el = document.getElementById(arg);
    if (!el) return `no such section: ${esc(arg || "")}. try work | approach | contact`;
    closeConsole();
    el.scrollIntoView({ behavior: "smooth" });
    return `<span class="out-ok">→ ${arg}</span>`;
  },

  sudo: () =>
    `[sudo] password for guest:
<span class="out-ok">permission granted.</span> you were always root here.`,

  hire: () =>
    `good instinct. → <a href="https://github.com/fleport74">github.com/fleport74</a>`,
};

/* ============================================================ */

let panel, out, form, input;
let history = [];
let histIdx = -1;
let greeted = false;

function print(html, cls = "") {
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function run(raw) {
  const line = raw.trim();
  if (!line) return;
  print(`<span class="out-cmd">❯ ${esc(line)}</span>`);
  const [cmd, ...rest] = line.toLowerCase().split(/\s+/);
  const arg = rest.join(" ");

  if (cmd === "clear") {
    out.innerHTML = "";
    return;
  }
  if (cmd === "exit") {
    closeConsole();
    return;
  }
  const fn =
    COMMANDS[cmd] ||
    (cmd === "hire-me" || cmd === "hireme" ? COMMANDS.hire : null);
  if (fn) {
    print(fn(arg));
  } else {
    print(`command not found: ${esc(cmd)}\ntry 'help'`);
  }
}

export function openConsole() {
  panel.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => panel.classList.add("open"))
  );
  if (!greeted) {
    greeted = true;
    print(
      `<span class="out-accent">fleport74.github.io</span> · interactive console
<span lang="ja">ようこそ。</span> type 'help' for commands. Esc closes.`
    );
  }
  setTimeout(() => input.focus(), 120);
}

export function closeConsole() {
  panel.classList.remove("open");
  setTimeout(() => {
    panel.hidden = true;
  }, 380);
}

export function initTerminal() {
  panel = document.getElementById("console");
  out = document.getElementById("console-out");
  form = document.getElementById("console-form");
  input = document.getElementById("console-input");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    input.value = "";
    if (value.trim()) {
      history.push(value);
      histIdx = history.length;
    }
    run(value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx > 0) input.value = history[--histIdx] ?? "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < history.length - 1) {
        input.value = history[++histIdx] ?? "";
      } else {
        histIdx = history.length;
        input.value = "";
      }
    }
  });

  document.getElementById("console-close").addEventListener("click", closeConsole);
  document.getElementById("open-console").addEventListener("click", openConsole);
  document
    .querySelectorAll("[data-open-console]")
    .forEach((b) => b.addEventListener("click", openConsole));

  addEventListener("keydown", (e) => {
    const typing =
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement;
    if ((e.key === "/" || e.key === "`") && !typing && panel.hidden) {
      e.preventDefault();
      openConsole();
    } else if (e.key === "Escape" && !panel.hidden) {
      closeConsole();
    }
  });
}
