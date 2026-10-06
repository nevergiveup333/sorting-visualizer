// ---------- 1. State ----------
const $ = (id) => document.getElementById(id);
const stage = $('stage');

let original = [];   // the shuffled array we started from
let view = [];       // the array as it looks right now while replaying
let steps = [];      // the recorded "movie" of the sort
let pos = 0;         // which frame of the movie we are on
let timer = null;    // setTimeout handle while playing
let sorted = new Set(), pivot = null, active = [], activeType = '';
let comparisons = 0, swaps = 0;

const BIG_O = {
  bubble:    'Time: O(n²) · Space: O(1)',
  selection: 'Time: O(n²) · Space: O(1)',
  quick:     'Time: O(n log n) average, O(n²) worst · Space: O(log n)',
};

// ---------- 2. Algorithms: they only RECORD steps, they never touch the screen ----------
function recordBubble(a, out) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      out.push({ t: 'compare', i: j, j: j + 1 });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        out.push({ t: 'swap', i: j, j: j + 1 });
      }
    }
    out.push({ t: 'sorted', i: n - i - 1 });   // the biggest value has "bubbled" to the end
  }
  out.push({ t: 'sorted', i: 0 });
}

function recordSelection(a, out) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    out.push({ t: 'pivot', i: min });
    for (let j = i + 1; j < n; j++) {
      out.push({ t: 'compare', i: j, j: min });
      if (a[j] < a[min]) { min = j; out.push({ t: 'pivot', i: min }); }
    }
    if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; out.push({ t: 'swap', i, j: min }); }
    out.push({ t: 'sorted', i });
  }
  out.push({ t: 'sorted', i: n - 1 });
}

function recordQuick(a, out) {
  function qs(lo, hi) {
    if (lo > hi) return;
    if (lo === hi) { out.push({ t: 'sorted', i: lo }); return; }
    const p = a[hi];                              // choose the last element as pivot
    out.push({ t: 'pivot', i: hi });
    let s = lo;                                   // s = boundary: everything left of s is < pivot
    for (let j = lo; j < hi; j++) {
      out.push({ t: 'compare', i: j, j: hi });
      if (a[j] < p) {
        if (s !== j) { [a[s], a[j]] = [a[j], a[s]]; out.push({ t: 'swap', i: s, j }); }
        s++;
      }
    }
    if (s !== hi) { [a[s], a[hi]] = [a[hi], a[s]]; out.push({ t: 'swap', i: s, j: hi }); }
    out.push({ t: 'sorted', i: s });              // pivot is now exactly where it belongs
    qs(lo, s - 1);
    qs(s + 1, hi);
  }
  qs(0, a.length - 1);
}

const RECORDERS = { bubble: recordBubble, selection: recordSelection, quick: recordQuick };

// ---------- 3. Replaying one recorded step ----------
function applyStep(s) {
  active = []; activeType = '';
  if (s.t === 'compare') { comparisons++; active = [s.i, s.j]; activeType = 'compare';
    say(`Is ${view[s.i]} bigger or smaller than ${view[s.j]}?`); }
  if (s.t === 'swap') { swaps++; [view[s.i], view[s.j]] = [view[s.j], view[s.i]];
    active = [s.i, s.j]; activeType = 'swap'; say(`Swap them: ${view[s.j]} and ${view[s.i]} change places.`); }
  if (s.t === 'pivot') { pivot = s.i;
    say(`Marked ${view[s.i]} as the value to measure against.`); }
  if (s.t === 'sorted') { sorted.add(s.i); if (pivot === s.i) pivot = null;
    say(`${view[s.i]} is in its final position.`); }
}

// ---------- 4. Drawing ----------
function say(text) { $('note').textContent = text; }

function draw() {
  const bars = stage.children;
  view.forEach((v, i) => {
    const b = bars[i];
    b.style.height = v + '%';
    let cls = 'bar';
    if (sorted.has(i)) cls += ' sorted';
    else if (active.includes(i)) cls += ' ' + activeType;
    else if (i === pivot) cls += ' pivot';
    b.className = cls;
  });
  $('cmp').textContent = comparisons;
  $('swp').textContent = swaps;
}

// ---------- 5. Controls ----------
function resetRun() {
  stopPlaying();
  view = original.slice(); steps = []; pos = 0;
  sorted = new Set(); pivot = null; active = []; activeType = '';
  comparisons = 0; swaps = 0;
  $('big-o').textContent = BIG_O[$('algo').value];
  say('Press Play or Step to begin.');
  draw();
}

function newArray() {
  const n = +$('size').value;
  original = Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 95));
  stage.innerHTML = '';
  for (let i = 0; i < n; i++) stage.appendChild(Object.assign(document.createElement('div'), { className: 'bar' }));
  resetRun();
}

function ensureRecorded() {
  if (steps.length) return;
  RECORDERS[$('algo').value](original.slice(), steps);   // run on a COPY so `original` stays intact
}

function stepOnce() {
  ensureRecorded();
  if (pos >= steps.length) { finish(); return false; }
  applyStep(steps[pos++]);
  draw();
  return true;
}

function finish() {
  view.forEach((_, i) => sorted.add(i));
  pivot = null; active = [];
  say('Sorted! Every bar is in its final position.');
  stopPlaying(); draw();
}

function tick() {
  if (!stepOnce()) return;
  timer = setTimeout(tick, 510 - $('speed').value * 5);   // faster slider = shorter delay
}

function startPlaying() { $('play').textContent = 'Pause'; tick(); }
function stopPlaying() { clearTimeout(timer); timer = null; $('play').textContent = 'Play'; }

$('play').onclick = () => {
  if (timer) return stopPlaying();
  if (pos >= steps.length && steps.length) resetRun();    // finished? replay from the start
  startPlaying();
};
$('step').onclick = () => { stopPlaying(); stepOnce(); };
$('shuffle').onclick = newArray;
$('size').oninput = newArray;
$('algo').onchange = resetRun;

newArray();
