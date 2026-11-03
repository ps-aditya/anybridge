const SCENES = [
  { start: 0, end: 12, file: "s1" },
  { start: 12, end: 25, file: "s2" },
  { start: 25, end: 50, file: "s3" },
  { start: 50, end: 70, file: "s4" },
  { start: 70, end: 90, file: "s5" },
  { start: 90, end: 115, file: "s6" },
  { start: 115, end: 140, file: "s7" },
  { start: 140, end: 160, file: "s8" },
  { start: 160, end: 180, file: "s9" },
];

const TOTAL = 180;
const stage = document.getElementById("stage");
const nodes = [...document.querySelectorAll(".scene")];
const bar = document.getElementById("progressBar");
const timer = document.getElementById("timer");
const voText = document.getElementById("voText");
const params = new URLSearchParams(location.search);
const still = params.has("still");
const record = params.has("record");

if (still) document.documentElement.classList.add("instant");

function fmt(seconds) {
  const s = Math.max(0, Math.min(TOTAL, Math.floor(seconds)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let activeIndex = -1;
let frozen = still;
let paused = false;
let elapsed = Number(params.get("t") || 0);
let origin = 0;

function setActive(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  nodes.forEach((node, i) => {
    node.classList.toggle("active", i === index);
  });
  const node = nodes[index];
  if (node) voText.textContent = node.dataset.vo || "";
}

function update(time) {
  elapsed = Math.max(0, Math.min(TOTAL, time));
  const index = SCENES.findIndex((s) => elapsed >= s.start && elapsed < s.end) >= 0
    ? SCENES.findIndex((s) => elapsed >= s.start && elapsed < s.end)
    : SCENES.length - 1;
  setActive(index);
  bar.style.width = `${(elapsed / TOTAL) * 100}%`;
  timer.textContent = `${fmt(elapsed)} / 3:00`;
}

function frame(now) {
  if (!frozen && !paused) update((now - origin) / 1000 + startOffset);
  requestAnimationFrame(frame);
}

let startOffset = elapsed;
if (still) {
  update(elapsed);
  document.fonts?.ready.then(() => update(elapsed));
} else {
  origin = performance.now();
  requestAnimationFrame(frame);
}

window.__seek = (seconds) => {
  frozen = true;
  elapsed = Number(seconds);
  update(elapsed);
};

window.__play = () => {
  frozen = false;
  paused = false;
  startOffset = elapsed;
  origin = performance.now();
};

window.__pause = () => { paused = true; };
window.__duration = TOTAL;
window.__scenes = SCENES;

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (frozen) window.__play();
    else paused = !paused;
  }
  if (event.code === "ArrowRight" && frozen) {
    window.__seek(elapsed + 5);
  }
  if (event.code === "ArrowLeft" && frozen) {
    window.__seek(Math.max(0, elapsed - 5));
  }
});

if (record) {
  document.body.dataset.record = "1";
  requestAnimationFrame(() => {
    update(0);
  });
}
