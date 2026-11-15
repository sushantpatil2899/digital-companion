// The character creator (src/creator/creator.html; served by src/main/creator.js,
// in the app on Character → More info and in a browser by dev/server.js):
// a character picker and these tabs:
//   Scenes       ready-made scripts of frames (dev/scenes.js)
//   Personality  who it is, as the app stores it (its index.js): concept,
//                "Who I am" and every personality slider, explained
//   Simulation   the real simulation (src/main/companion.js, through
//                /creator/sim.js) in a bordered world: it does what it likes,
//                and you can pick it up, throw it, pat and pet it
// and, under More, two more ways to look at the animations:
//   State        every field of the frame the main process sends, by hand
//   Raw pose     every field of the pose, drawn straight with the character's draw()
// On the right, while an item scene is on, a carousel of items to hold: the item library
// (src/main/items.js, through /creator/items.json; only in the browser) and a few samples.
// Scenes and State run the real renderer in an iframe (/creator/stage.html with
// the fake companion in dev/stage.js); Raw pose draws in this page.
'use strict';

const FOOT_MARGIN = 18; // keep in sync with src/renderer/renderer.js
const SIZE = 1.15;

// Slider ranges for the pose's numbers: [min, max, step]. Others get 0..1.
const TAU = Math.PI * 2;
const POSE_RANGES = {
  t: [0, 30, 0.01], facing: [-1, 1, 2], tilt: [-0.6, 0.6, 0.005], bob: [-24, 12, 0.1], scaleX: [0.5, 1.5, 0.005],
  scaleY: [0.5, 1.5, 0.005], walkPhase: [0, TAU * 2, 0.01], stepHeight: [0, 14, 0.1], lookX: [-1, 1, 0.01], lookY: [-1, 1, 0.01],
  ballX: [-90, 90, 0.5], ballRot: [0, TAU, 0.01], keySpin: [0, TAU, 0.01], tailSpin: [0, TAU, 0.01],
};

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const box = $('stageBox');
const poseCanvas = $('poseCanvas');

// ------------------------------------------------------------ saved settings

const saved = load();
const settings = {
  character: 'togepi',
  tab: 'personality',
  scene: null,
  manual: { state: 'idle', band: 'content', happiness: 0.6, energy: 0.8, facing: 1, stateDuration: 4 },
  opts: { speed: 1, paused: false, followMouse: true, sound: false, loop: true, loopState: true, zoom: 2 },
  size: '220x256',
  stageBackdrop: 'system', // system (follows light/dark mode, like the rest of the app), light, dark or checker
  guides: false,
  poses: {},
  poseAnim: { t: true, walk: false, walkSpeed: 10 },
  item: null, // { src, w, h }: the picture for holdItem / playItem (a sample until you pick one)
  ...saved,
};
// It opens on Personality; a reload (a file changed, or --creator again)
// stays on the tab you were on.
settings.tab = sessionGet('creator-tab') || 'personality';
// ?character=<id> in the address opens that character (kept in the address
// when you pick another, so the reload after a file change stays on it).
const asked = new URLSearchParams(location.search).get('character');
if (asked) settings.character = asked;

function load() {
  try {
    // (Saved as "playground" before it was called the character creator.)
    return JSON.parse(localStorage.getItem('creator') || localStorage.getItem('playground') || '{}');
  } catch {
    return {};
  }
}
function save() {
  try {
    localStorage.setItem('creator', JSON.stringify(settings));
    sessionStorage.setItem('creator-tab', settings.tab);
  } catch {
    // Not saved: fine, it's a convenience.
  }
}

function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

// Light or dark mode, for the System backdrop.
const darkMode = window.matchMedia('(prefers-color-scheme: dark)');

/** The backdrop to draw: System follows light or dark mode. */
function backdrop() {
  const b = settings.stageBackdrop;
  return b === 'system' ? (darkMode.matches ? 'dark' : 'light') : b;
}

// ------------------------------------------------------------ characters

let characters = [];
let rendererInfo = { states: [], events: [] }; // what renderer.js handles (/creator/renderer.json)
let ci = null; // info for the current character (from /creator/characters.json)
let looks = null; // window.Characters[id] (its look.js)

// What the host can do: the browser one (dev/server.js) reloads when a file
// changes and makes new items; the app (src/main/main.js) does neither.
let env = { host: 'app', live: false, makesItems: false };

async function init() {
  env = await fetch('/creator/env.json')
    .then((r) => (r.ok ? r.json() : env))
    .catch(() => env);
  characters = await (await fetch('/creator/characters.json')).json();
  rendererInfo = await (await fetch('/creator/renderer.json')).json();
  await loadSampleItems();
  // The simulation; the other tabs work without it.
  await script('/creator/sim.js').catch((err) => console.error('No simulation:', err));
  window.addEventListener('resize', layout);
  wireSim();
  await Promise.all(characters.map((c) => script(`/src/characters/${c.id}/look.js`)));
  const sel = $('character');
  sel.innerHTML = characters.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  if (!characters.some((c) => c.id === settings.character)) settings.character = characters[0].id;
  sel.value = settings.character;
  sel.onchange = () => {
    settings.character = sel.value;
    settings.scene = null;
    if (!stateKnown(settings.manual.state)) settings.manual.state = 'idle';
    save();
    if (asked) history.replaceState(null, '', `?character=${sel.value}`);
    pickCharacter();
  };
  wireToolbar();
  wireItems();
  for (const b of document.querySelectorAll('.tabs [data-tab]')) b.onclick = () => showTab(b.dataset.tab);
  $('moreBtn').onclick = (e) => {
    e.stopPropagation();
    $('moreMenu').hidden = !$('moreMenu').hidden;
  };
  document.addEventListener('click', () => ($('moreMenu').hidden = true));
  $('debugBox').checked = !!settings.debug;
  $('debugBox').onchange = () => {
    settings.debug = $('debugBox').checked;
    save();
    showDebug();
  };
  pickCharacter();
  showDebug();
  // Reload when a file changes (dev/server.js watches src/ and dev/).
  if (env.live) new EventSource('/creator/reload').onmessage = () => location.reload();
}

function script(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function stateKnown(state) {
  return rendererInfo.states.includes(state) || ci.activities.some((a) => a.id === state) || ci.states.some((s) => s.id === state);
}

/** The More tab (State, Raw pose) only in debug mode. */
function showDebug() {
  document.querySelector('.more').hidden = !settings.debug;
  if (!settings.debug && ['state', 'pose'].includes(settings.tab)) showTab('scenes');
}

function pickCharacter() {
  ci = characters.find((c) => c.id === settings.character);
  document.title = `${ci.name} · Character creator`;
  looks = window.Characters[ci.id];
  stage.src = `/creator/stage.html?character=${ci.id}`;
  $('tray').hidden = true;
  buildScenes();
  buildPersonality();
  sim = null; // a new character drops in fresh
  buildSim();
  buildState();
  buildPose();
  showTab(settings.tab);
  layout();
}

// ------------------------------------------------------------ stage

function send(msg) {
  if (stage.contentWindow) stage.contentWindow.postMessage(msg, '*');
}

window.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.from !== 'stage') return;
  switch (m.type) {
    case 'ready':
      send({ type: 'opts', opts: settings.opts });
      sendManual();
      if (settings.tab === 'scenes' && settings.scene) send({ type: 'scene', id: settings.scene });
      break;
    case 'status':
      showStatus(m);
      break;
    case 'sceneEnded':
      settings.scene = null;
      markScene();
      break;
    case 'trayIcon':
      $('tray').src = m.dataUrl;
      $('tray').hidden = false;
      break;
    case 'pose':
      if (m.pose) {
        // The renderer's walk phase keeps counting up; wrap it into the slider's range.
        settings.poses[ci.id] = { ...m.pose, walkPhase: (m.pose.walkPhase || 0) % (TAU * 2) };
        settings.poseAnim.t = false;
        save();
        buildPose();
        showTab('pose');
      }
      break;
    default:
  }
});

function showStatus(m) {
  if (settings.tab === 'pose') return;
  const parts = [`<span><b>${m.state}</b> ${m.stateTime.toFixed(2)}s${m.stateDuration ? ` / ${(+m.stateDuration).toFixed(1)}s` : ''}</span>`];
  if (m.scene) parts.push(`<span>step <b>${m.scene.i + 1}</b>/${m.scene.n} · ${m.scene.label}</span>`);
  if (settings.opts.paused) parts.push('<span>paused</span>');
  $('status').innerHTML = parts.join('');
}

function setOpts(o) {
  Object.assign(settings.opts, o);
  save();
  send({ type: 'opts', opts: o });
}

function wireToolbar() {
  const play = $('play');
  const syncPlay = () => (play.textContent = settings.opts.paused ? 'Play' : 'Pause');
  syncPlay();
  play.onclick = () => {
    setOpts({ paused: !settings.opts.paused });
    syncPlay();
  };
  $('step').onclick = () => {
    if (!settings.opts.paused) {
      setOpts({ paused: true });
      syncPlay();
    }
    send({ type: 'step' });
    poseStep = 1;
  };
  $('restart').onclick = () => {
    send({ type: 'restart' });
    if (settings.tab === 'pose' && settings.poseAnim.t) setPoseField('t', 0);
  };
  bindSelect('speed', settings.opts.speed, (v) => setOpts({ speed: +v }));
  bindSelect('zoom', settings.opts.zoom, (v) => {
    setOpts({ zoom: +v });
    layout();
  });
  bindSelect('size', settings.size, (v) => {
    settings.size = v;
    save();
    layout();
  });
  darkMode.addEventListener('change', layout);
  bindSelect('backdrop', settings.stageBackdrop, (v) => {
    settings.stageBackdrop = v;
    save();
    layout();
  });
  bindCheck('follow', settings.opts.followMouse, (v) => setOpts({ followMouse: v }));
  bindCheck('sound', settings.opts.sound, (v) => setOpts({ sound: v }));
  bindCheck('loop', settings.opts.loop, (v) => setOpts({ loop: v }));
  bindCheck('guides', settings.guides, (v) => {
    settings.guides = v;
    save();
  });
}

function bindSelect(id, value, onChange) {
  const el = $(id);
  el.value = String(value);
  el.onchange = () => onChange(el.value);
}
function bindCheck(id, value, onChange) {
  const el = $(id);
  el.checked = !!value;
  el.onchange = () => onChange(el.checked);
}

function windowSize() {
  const [w, h] = settings.size.split('x').map(Number);
  return { w, h };
}

function layout() {
  const { w, h } = windowSize();
  const inSim = settings.tab === 'sim';
  const z = inSim ? simZoom() : settings.opts.zoom;
  $('stageWrap').classList.toggle('sim', inSim);
  const b = backdrop();
  box.className = `${b === 'checker' && inSim ? (darkMode.matches ? 'dark' : 'light') : b}${inSim ? ' arena' : ''}`;
  box.style.width = inSim ? '' : `${w * z}px`;
  box.style.height = inSim ? '' : `${h * z}px`;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.transform = `scale(${z})`;
  if (!inSim) stage.style.left = stage.style.top = '0px';
  if (inSim) fitSim();
  const dpr = window.devicePixelRatio || 1;
  poseCanvas.width = Math.round(w * z * dpr);
  poseCanvas.height = Math.round(h * z * dpr);
}

// ------------------------------------------------------------ tabs

function showTab(tab) {
  settings.tab = tab;
  save();
  for (const b of document.querySelectorAll('.tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
  const more = document.querySelector(`#moreMenu [data-tab="${tab}"]`);
  $('moreBtn').textContent = `${more ? more.textContent : 'More'} ▾`;
  $('moreBtn').classList.toggle('on', !!more);
  $('moreMenu').hidden = true;
  for (const t of ['scenes', 'personality', 'sim', 'state', 'pose']) $(`tab-${t}`).hidden = t !== tab;
  markScene();
  if (tab !== 'sim') send({ type: 'sim', frame: null });
  layout();
  const pose = tab === 'pose';
  stage.style.visibility = pose ? 'hidden' : 'visible';
  poseCanvas.style.pointerEvents = pose ? 'auto' : 'none';
  if (pose) $('status').innerHTML = '<span>Raw pose: drawn straight with the character’s <b>draw(ctx, pose)</b>, no renderer</span>';
  if (tab === 'scenes' && settings.scene) send({ type: 'scene', id: settings.scene });
  if (tab === 'state') {
    settings.scene = null;
    markScene();
    send({ type: 'stopScene' });
  }
}

// ------------------------------------------------------------ Scenes tab

function buildScenes() {
  const list = window.Scenes.list(ci);
  const groups = {};
  for (const s of list) (groups[s.group] = groups[s.group] || []).push(s);
  const el = $('sceneList');
  el.innerHTML = '';
  for (const [group, scenes] of Object.entries(groups)) {
    const h = document.createElement('h2');
    h.textContent = group;
    el.appendChild(h);
    for (const s of scenes) {
      const b = document.createElement('button');
      b.className = 'scene';
      b.dataset.id = s.id;
      const secs = s.steps.reduce((n, st) => n + st.dur, 0);
      b.innerHTML = `<span>${s.name}</span><small>${s.steps.length} steps · ${secs.toFixed(0)}s</small>`;
      b.onclick = () => {
        settings.scene = s.id;
        save();
        markScene();
        send({ type: 'scene', id: s.id });
      };
      el.appendChild(b);
    }
  }
  markScene();
}

function markScene() {
  for (const b of document.querySelectorAll('.scene')) b.classList.toggle('on', b.dataset.id === settings.scene);
  // The items carousel only while an item scene is on (State and Raw pose have their own item controls).
  $('items').hidden = !(settings.tab === 'scenes' && /^item/.test(settings.scene || ''));
}

// ------------------------------------------------------------ Personality tab

/**
 * What the app stores about who it is (src/characters/<id>/index.js):
 * portrait, concept, "Who I am", its strongest traits and values, and every
 * personality slider with the explanation the app's Personality window uses.
 */
function buildPersonality() {
  const el = $('tab-personality');
  el.innerHTML = '';
  if (!ci.sliders) {
    // A server started before it sent personalities (it doesn't reload its own code).
    el.innerHTML = '<p class="hint">Restart <b>npm run creator</b> to see the personality.</p>';
    return;
  }
  const add = (html) => el.insertAdjacentHTML('beforeend', html);
  const head = (t) => add(`<h2>${esc(t)}</h2>`);

  add(`<div class="card"><canvas class="portrait"></canvas><div>
    <h3>${esc(ci.name)}</h3>
    ${ci.concept ? `<p class="tagline">${esc(ci.concept)}</p>` : ''}
  </div></div>`);
  drawPortrait(el.querySelector('.portrait'));
  add(`<p class="hint">From src/characters/${esc(ci.id)}/index.js</p>`);

  head('Who I am');
  add(`<div class="prose"><p>${esc(ci.self.replace(/\s*\n\s*/g, ' '))}</p></div>`);

  head('Strongest traits & values');
  add(`<div class="chips">${strongest().map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`);

  let group = null;
  for (const s of ci.sliders) {
    if (s.group !== group) {
      group = s.group;
      head(group === 'Relationship' ? 'Relationship (starts at)' : group);
    }
    const v = sliderValue(s.path);
    add(`<div class="pslider">
      <div class="top"><span class="name" title="${esc(s.label)}">${esc(s.label)}</span><span class="bar"><i style="width:${v}%"></i><b style="left:50%"></b></span><output>${v}</output></div>
      <div class="why">${esc(s.help)}</div>
    </div>`);
  }
}

function sliderValue(p) {
  const v = p.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), ci.personality);
  return typeof v === 'number' ? v : 50;
}

// ------------------------------------------------------------ Simulation tab

// Like src/main/main.js: how he's made, and what a press, a click and a hold are.
const SIM = { halfWidth: 56, height: 142, floor: 34, dragThreshold: 6, clickMax: 0.25, petDelay: 0.25, maxZoom: 1.5 };
const NEEDS = ['hunger', 'energy', 'boredom', 'affection'];
let sim = null; // the Companion (src/main/companion.js), while the Simulation tab is open
let simCursor = null; // the mouse in world px, or null when it's outside
let simPress = null; // { x, y, t, onQuestion } while the mouse is down on him
let simShown = 0;

/** The world is drawn at most 1.5× (Zoom), so there's room to walk around. */
function simZoom() {
  return Math.min(settings.opts.zoom, SIM.maxZoom);
}

/** The world's floor and walls (world px) for the area's size now. */
function simBounds() {
  const z = simZoom();
  return { left: 0, top: 0, right: box.clientWidth / z, floor: box.clientHeight / z - SIM.floor };
}

function startSim() {
  if (!window.Sim) return;
  const b = simBounds();
  sim = new window.Sim.Companion({
    character: window.Sim.characters.get(ci.id),
    bounds: b,
    halfWidth: SIM.halfWidth,
    height: SIM.height,
    x: (b.left + b.right) / 2,
    // Drops in from above the floor, like on startup.
    y: Math.max(b.top + SIM.height, b.floor - 260),
  });
  // No games: the ball and the board are windows of their own in the app, not
  // here. He plays on his own instead (soloPlay), as when a game can't start.
  sim.startGame = () => false;
  setSimTime(settings.simTime || 'now');
}

/** The floor fits the area; he stays inside it when it's resized. */
function fitSim() {
  $('floor').style.height = `${SIM.floor * simZoom()}px`;
  if (sim && box.clientWidth) sim.setBounds(simBounds());
}

function setSimTime(when) {
  settings.simTime = when;
  save();
  const hour = when === 'day' ? 14 : when === 'night' ? 23 : new Date().getHours();
  if (sim) sim.setContext({ hour });
}

/** One step of the simulation, as src/main/main.js tickOnce() does it, and the frame to the renderer. */
function simTick(dt) {
  if (!window.Sim || !box.clientWidth) return;
  if (!sim) startSim();
  const now = performance.now() / 1000;
  const cursor = simCursor || { x: -1e4, y: -1e4 };
  // A press turns into a pick-up once the mouse moves; held still, it's petting.
  if (simPress && !simPress.onQuestion && sim.state !== 'grabbed') {
    if (Math.hypot(cursor.x - simPress.x, cursor.y - simPress.y) > SIM.dragThreshold) sim.grab(simPress);
    else if (now - simPress.t > SIM.petDelay) sim.pet(dt);
  }
  if (sim.state === 'grabbed' && simCursor) sim.drag(simCursor);
  sim.update(dt, cursor);

  // His window moves around the world, like the real one moves around your screen.
  const { w, h } = windowSize();
  const z = simZoom();
  stage.style.left = `${(sim.x - w / 2) * z}px`;
  stage.style.top = `${(sim.y - (h - FOOT_MARGIN)) * z}px`;
  box.classList.toggle('holding', !!simPress);
  box.classList.toggle('over', !!simCursor && sim.isOver(simCursor));
  send({
    type: 'sim',
    frame: { ...sim.snapshot(), events: sim.drainEvents(), cursor: simCursor && { x: simCursor.x - sim.x, y: simCursor.y - sim.y } },
  });
  if (now - simShown > 0.25) {
    simShown = now;
    showSim();
  }
}

/** The mouse in world px. */
function simPoint(e) {
  const r = box.getBoundingClientRect();
  const z = simZoom();
  return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
}

function wireSim() {
  box.addEventListener('pointermove', (e) => {
    if (settings.tab === 'sim') simCursor = simPoint(e);
  });
  box.addEventListener('pointerleave', () => {
    if (!simPress) simCursor = null;
  });
  box.addEventListener('pointerdown', (e) => {
    if (settings.tab !== 'sim' || !sim) return;
    const p = simPoint(e);
    const part = sim.hitPart(p);
    if (!part) return;
    box.setPointerCapture(e.pointerId);
    // On his question bubble a press is only ever a click.
    simPress = { ...p, t: performance.now() / 1000, onQuestion: /^(answer|question)/.test(part) };
  });
  box.addEventListener('pointerup', () => {
    if (!simPress || !sim) return;
    const at = simPress;
    simPress = null;
    if (sim.state === 'grabbed') return sim.release();
    if (performance.now() / 1000 - at.t >= SIM.clickMax && !at.onQuestion) return;
    // A click: answer his question, close his speech bubble, or a pat.
    const part = sim.hitPart(at);
    if (part === 'answer0' || part === 'answer1') sim.answerQuestion(part === 'answer0' ? 0 : 1);
    else if (part === 'speech') sim.dismissSpeech();
    else if (!at.onQuestion) sim.pat();
  });
}

function buildSim() {
  const el = $('tab-sim');
  el.innerHTML = '';
  if (!window.Sim) {
    el.innerHTML = '<p class="hint">The simulation didn’t load (see the console). Restart <b>npm run creator</b>.</p>';
    return;
  }
  const add = (node) => el.appendChild(node);
  const head = (t) => add(Object.assign(document.createElement('h2'), { textContent: t }));
  add(
    Object.assign(document.createElement('p'), {
      className: 'hint',
      textContent: 'The real simulation from the app: it decides what to do by itself. Drag to pick it up and throw it, click to pat, press and hold to pet.',
    }),
  );
  head('Now');
  add(Object.assign(document.createElement('div'), { id: 'simNow', className: 'prose' }));

  head('Needs (drag to change)');
  for (const k of NEEDS) {
    const r = slider(k, 0, 0, 1, 0.01, (v) => sim && (sim.needs[k] = v));
    r.classList.add('need');
    r.querySelector('input').dataset.need = k;
    add(r);
  }

  head('Do something');
  const chips = document.createElement('div');
  chips.className = 'chips';
  const doIt = (id) => sim && sim.doActivity(id);
  for (const a of ci.activities) chips.appendChild(button(a.label, () => doIt(a.id)));
  for (const id of window.Sim.MENU_ACTIVITIES) chips.appendChild(button(id === 'backView' ? 'turn around' : id, () => doIt(id)));
  add(chips);

  head('World');
  add(row('time', choice(['now', 'day', 'night'], settings.simTime || 'now', setSimTime)));
  add(button('Drop in again', () => startSim()));
}

/** What he's doing and how he feels, and the needs sliders following his needs. */
function showSim() {
  const now = $('simNow');
  if (!now || !sim) return;
  const label = (ci.activities.find((a) => a.id === sim.state) || ci.states.find((s) => s.id === sim.state) || {}).label;
  now.innerHTML = `<p><b>${esc(label || sim.state)}</b> · ${esc(sim.moodBand())} · ${sim.stateTime.toFixed(0)}s${sim.stateDuration ? ` / ${sim.stateDuration.toFixed(0)}s` : ''}</p>`;
  for (const i of document.querySelectorAll('[data-need]')) {
    if (document.activeElement === i) continue;
    const v = sim.needs[i.dataset.need];
    i.value = v;
    i.nextElementSibling.value = fmt(v);
  }
}

/** The traits furthest from average, and its strongest values, like the concept sheets' list. */
function strongest() {
  return ci.sliders
    .filter((s) => s.group !== 'Relationship')
    .map((s) => ({ s, v: sliderValue(s.path) }))
    .filter(({ s, v }) => (s.group === 'Values' ? v >= 75 : Math.abs(v - 50) >= 25))
    .sort((a, b) => Math.abs(b.v - 50) - Math.abs(a.v - 50))
    .slice(0, 10)
    .map(({ s, v }) => (s.group === 'Values' ? `Value: ${s.label.toLowerCase()}` : `${v > 50 ? 'High' : 'Low'} ${s.label.toLowerCase()}`));
}

/** The character standing in its default pose, small. */
function drawPortrait(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = 88;
  const h = 96;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.translate(w / 2, h - 6);
  const k = Math.min(0.8, (h - 12) / Math.abs(looks.HEAD_TOP || -110));
  ctx.scale(k, k);
  try {
    looks.draw(ctx, looks.defaultPose());
  } catch (err) {
    console.error(err);
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ------------------------------------------------------------ State tab

function sendManual() {
  const m = { ...settings.manual };
  if (m.board && !m.board.style) delete m.board;
  if (m.answersText) m.answers = m.answersText.split(',').map((s) => s.trim()).filter(Boolean);
  delete m.answersText;
  if (!m.speech) m.speech = null;
  if (!m.ballOut) m.ball = null;
  else m.ball = { x: m.ballX || 0, y: m.ballY || 0 };
  delete m.ballOut;
  delete m.ballX;
  delete m.ballY;
  m.item = settings.item && settings.item.src ? settings.item : null;
  send({ type: 'manual', frame: m });
}

function setManual(key, value) {
  settings.manual[key] = value;
  save();
  sendManual();
}

function buildState() {
  const el = $('tab-state');
  el.innerHTML = '';
  const m = settings.manual;
  const add = (node) => el.appendChild(node);
  const head = (t) => add(Object.assign(document.createElement('h2'), { textContent: t }));

  head('State');
  const groups = [
    ['Shared', rendererInfo.states],
    [`${ci.name}'s activities`, ci.activities.map((a) => a.id)],
    [`${ci.name}'s own states`, ci.states.map((s) => s.id)],
  ];
  const stateSel = document.createElement('select');
  stateSel.innerHTML = groups
    .filter(([, ids]) => ids.length)
    .map(([label, ids]) => `<optgroup label="${label}">${ids.map((id) => `<option>${id}</option>`).join('')}</optgroup>`)
    .join('');
  stateSel.value = m.state;
  add(row('state', stateSel));
  const variantSel = document.createElement('select');
  const fillVariants = () => {
    const a = ci.activities.find((x) => x.id === m.state);
    const vs = a ? a.variants : [];
    variantSel.innerHTML = '<option value="">(none)</option>' + vs.map((v) => `<option>${v.id}</option>`).join('');
    variantSel.value = m.variant || '';
    variantSel.disabled = !vs.length;
  };
  fillVariants();
  variantSel.onchange = () => setManual('variant', variantSel.value || null);
  add(row('variant', variantSel));
  stateSel.onchange = () => {
    m.state = stateSel.value;
    m.variant = null;
    const a = ci.activities.find((x) => x.id === m.state);
    if (a && a.duration) m.stateDuration = Array.isArray(a.duration) ? (a.duration[0] + a.duration[1]) / 2 : a.duration;
    if (a && a.move) m.vx = (a.move.speed || 80) * (m.facing || 1);
    fillVariants();
    save();
    sendManual();
    buildState();
  };
  add(slider('stateDuration', m.stateDuration, 0.5, 20, 0.1, (v) => setManual('stateDuration', v)));
  const replay = check('replay when it ends', settings.opts.loopState, (v) => setOpts({ loopState: v }));
  add(replay);

  head('Mood');
  add(row('band', choice(window.Scenes.BANDS, m.band, (v) => setManual('band', v))));
  add(slider('happiness', m.happiness, 0, 1, 0.01, (v) => setManual('happiness', v)));
  add(slider('energy', m.energy, 0, 1, 0.01, (v) => setManual('energy', v)));

  head('Movement');
  add(row('facing', choice(['1', '-1'], String(m.facing || 1), (v) => setManual('facing', +v))));
  add(slider('vx', m.vx || 0, -400, 400, 1, (v) => setManual('vx', v)));
  add(slider('vy', m.vy || 0, -3000, 3000, 10, (v) => setManual('vy', v)));
  add(slider('swing', m.swing || 0, -1, 1, 0.01, (v) => setManual('swing', v)));

  head('Flags');
  const flags = document.createElement('div');
  flags.className = 'checks';
  for (const k of ['grumpy', 'quiet', 'petting', 'watching', 'byWindow', 'holdingBall', 'thinking', 'wonGame']) {
    flags.appendChild(check(k, m[k], (v) => setManual(k, v)));
  }
  add(flags);
  add(row('watchMood', choice(['', ...window.Scenes.WATCH_MOODS], m.watchMood || '', (v) => setManual('watchMood', v || null))));

  head('Ball (loose, for watchBall)');
  add(check('ball out', m.ballOut, (v) => setManual('ballOut', v)));
  add(slider('ball x', m.ballX || 120, -300, 300, 1, (v) => setManual('ballX', v)));
  add(slider('ball y', m.ballY || -60, -300, 20, 1, (v) => setManual('ballY', v)));

  head('Board over the head');
  const board = { line1: 'Meeting in 5!', line2: 'Design review', tag: 'OK ✓', ...(m.board || {}) };
  const setBoard = (k, v) => {
    board[k] = v;
    setManual('board', board.style ? { ...board } : null);
  };
  add(row('style', choice(['', 'sign', 'bubble', 'note'], board.style || '', (v) => setBoard('style', v))));
  add(row('line1', text(board.line1 || '', (v) => setBoard('line1', v))));
  add(row('line2', text(board.line2 || '', (v) => setBoard('line2', v))));
  add(row('tag', text(board.tag || '', (v) => setBoard('tag', v || null))));
  add(check('urgent', board.urgent, (v) => setBoard('urgent', v)));

  head('Item (holdItem, playItem)');
  for (const n of itemControls(() => sendManual())) add(n);

  head('Speech');
  add(row('speech', text(m.speech || '', (v) => setManual('speech', v))));
  add(row('answers', text(m.answersText || '', (v) => setManual('answersText', v), 'Yes, Later (makes it a question)')));

  head('Events');
  const chips = document.createElement('div');
  chips.className = 'chips';
  const own = Object.keys((ci.lines && ci.lines.floats) || {}).filter((k) => !rendererInfo.events.includes(k));
  for (const name of [...rendererInfo.events, ...own]) {
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => send({ type: 'event', name });
    chips.appendChild(b);
  }
  add(chips);

  head('More');
  const more = document.createElement('div');
  more.className = 'chips';
  more.append(
    button('Chirp', () => send({ type: 'chirp', band: m.band })),
    button('Edit this pose in Raw pose', () => send({ type: 'getPose' })),
    button('Reset all', () => {
      settings.manual = { state: 'idle', band: 'content', happiness: 0.6, energy: 0.8, facing: 1, stateDuration: 4 };
      save();
      sendManual();
      buildState();
    }),
  );
  add(more);
}

// ------------------------------------------------------------ Raw pose tab

let poseStep = 0;

function currentPose() {
  return { ...looks.defaultPose(), ...(settings.poses[ci.id] || {}) };
}

/** The pose to draw: the current one with the item's picture, like renderer.js itemFor. */
function drawablePose() {
  const p = currentPose();
  const it = p.arms === 'item' ? window.Items.load(settings.item) : null;
  p.item = it && { img: it.img, w: it.w / SIZE, h: it.h / SIZE };
  return p;
}

function setPoseField(k, v) {
  settings.poses[ci.id] = { ...currentPose(), [k]: v };
  save();
  const out = document.querySelector(`[data-pose="${k}"]`);
  if (out && out.type === 'range') {
    out.value = v;
    out.nextElementSibling.value = fmt(v);
  }
}

function buildPose() {
  const el = $('tab-pose');
  el.innerHTML = '';
  const add = (node) => el.appendChild(node);
  const head = (t) => add(Object.assign(document.createElement('h2'), { textContent: t }));
  const p = currentPose();

  head('Animate');
  const anim = document.createElement('div');
  anim.className = 'checks';
  anim.append(
    check('advance t', settings.poseAnim.t, (v) => ((settings.poseAnim.t = v), save())),
    check('walk cycle', settings.poseAnim.walk, (v) => ((settings.poseAnim.walk = v), save())),
  );
  add(anim);
  add(slider('walk speed', settings.poseAnim.walkSpeed, 1, 25, 0.5, (v) => ((settings.poseAnim.walkSpeed = v), save())));

  head('Looks');
  for (const [k, v] of Object.entries(p)) {
    if (k === 'item') continue;
    if (typeof v === 'string' || v === null) {
      const values = [...(ci.poseValues[k] || [])];
      if (k === 'prop') values.unshift('');
      add(row(k, values.length ? choice(values, v || '', (x) => setPoseField(k, x || null), true) : text(v || '', (x) => setPoseField(k, x || null))));
    }
  }
  head('Numbers');
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'number') {
      const [min, max, step] = POSE_RANGES[k] || [0, Math.max(1, Math.abs(v)), 0.01];
      const r = slider(k, v, min, max, step, (x) => setPoseField(k, x));
      r.querySelector('input').dataset.pose = k;
      add(r);
    }
  }
  const flags = Object.entries(p).filter(([, v]) => typeof v === 'boolean');
  if (flags.length) {
    head('Flags');
    const box = document.createElement('div');
    box.className = 'checks';
    for (const [k, v] of flags) box.appendChild(check(k, v, (x) => setPoseField(k, x)));
    add(box);
  }

  head('Item (for arms: item)');
  for (const n of itemControls()) add(n);

  head('JSON (add fields the default pose lacks, like "hat": true)');
  const ta = document.createElement('textarea');
  ta.rows = 8;
  ta.value = JSON.stringify(p, null, 1);
  add(ta);
  const btns = document.createElement('div');
  btns.className = 'chips';
  btns.append(
    button('Apply JSON', () => {
      try {
        settings.poses[ci.id] = JSON.parse(ta.value);
        save();
        buildPose();
      } catch (err) {
        alert(err.message);
      }
    }),
    button('Copy JSON', () => navigator.clipboard.writeText(JSON.stringify({ ...currentPose(), item: undefined }, null, 2))),
    button('Reset to default', () => {
      delete settings.poses[ci.id];
      save();
      buildPose();
    }),
  );
  add(btns);
}

let lastNow = performance.now();
function drawLoop(now) {
  const real = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  let dt = settings.opts.paused ? 0 : real * settings.opts.speed;
  if (poseStep) {
    dt = 1 / 60;
    poseStep = 0;
  }
  if (settings.tab === 'sim') simTick(dt);
  const ctx = poseCanvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const z = settings.opts.zoom;
  const { w, h } = windowSize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
  ctx.scale(dpr * z, dpr * z);
  if (looks) {
    ctx.save();
    ctx.translate(w / 2, h - FOOT_MARGIN);
    ctx.scale(SIZE, SIZE);
    if (settings.tab === 'pose') {
      const p = currentPose();
      if (dt && settings.poseAnim.t) setPoseField('t', (p.t + dt) % 30);
      if (dt && settings.poseAnim.walk) {
        const ph = (p.walkPhase + dt * settings.poseAnim.walkSpeed) % (TAU * 2);
        setPoseField('walkPhase', ph);
        if (!p.stepHeight) setPoseField('stepHeight', 5);
        setPoseField('bob', -Math.abs(Math.sin(ph)) * (p.stepHeight || 5) * 0.55);
      }
      const pose = drawablePose();
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.ellipse(0, 0, (pose.view === 'lying' ? 50 : 38) * pose.scaleX, 6, 0, 0, TAU);
      ctx.fillStyle = '#4a3a6a';
      ctx.fill();
      ctx.restore();
      looks.draw(ctx, pose);
    }
    if (settings.guides) drawGuides(ctx, w, h);
    ctx.restore();
  }
  requestAnimationFrame(drawLoop);
}

/** Feet origin, BODY_CY and HEAD_TOP lines, in drawing units. */
function drawGuides(ctx, w) {
  ctx.save();
  ctx.lineWidth = 1 / SIZE;
  ctx.font = `${9 / SIZE}px ui-monospace, monospace`;
  ctx.fillStyle = ctx.strokeStyle = 'rgba(212, 99, 95, 0.8)';
  const half = w / 2 / SIZE;
  const line = (y, label) => {
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(-half, y);
    ctx.lineTo(half, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(`${label} ${y}`, -half + 3, y - 3);
  };
  line(0, 'feet');
  line(looks.BODY_CY, 'BODY_CY');
  line(looks.HEAD_TOP, 'HEAD_TOP');
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------ the item

// Sample items, drawn here at 2x and shown at half size ({ src, w, h }, as the
// brain would send them), so there's something to hold before you pick a PNG.
const SAMPLE_ITEMS = {};

function sample(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.lineWidth = 2;
  g.strokeStyle = '#3a2d25';
  g.lineJoin = g.lineCap = 'round';
  paint(g);
  return { src: c.toDataURL('image/png'), w, h };
}

async function loadSampleItems() {
  SAMPLE_ITEMS.lollipop = sample(24, 46, (g) => {
    g.fillStyle = '#f6efe4';
    g.fillRect(10.5, 18, 3, 26);
    g.strokeRect(10.5, 18, 3, 26);
    g.beginPath();
    g.arc(12, 12, 10, 0, TAU);
    g.fillStyle = '#f58a95';
    g.fill();
    g.stroke();
    g.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) g.lineTo(12 + Math.cos(a) * a * 0.62, 12 + Math.sin(a) * a * 0.62);
    g.strokeStyle = '#fff';
    g.stroke();
  });
  SAMPLE_ITEMS.flag = sample(34, 46, (g) => {
    g.fillStyle = '#8a5a2b';
    g.fillRect(4, 4, 3, 40);
    g.strokeRect(4, 4, 3, 40);
    g.beginPath();
    g.moveTo(7, 6);
    g.quadraticCurveTo(20, 2, 32, 9);
    g.quadraticCurveTo(22, 14, 32, 22);
    g.quadraticCurveTo(20, 18, 7, 22);
    g.closePath();
    g.fillStyle = '#5c9bc8';
    g.fill();
    g.stroke();
  });
  SAMPLE_ITEMS.star = sample(30, 40, (g) => {
    g.fillStyle = '#c99a5b';
    g.fillRect(13.5, 20, 3, 18);
    g.strokeRect(13.5, 20, 3, 18);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 5.5 : 12;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      g.lineTo(15 + Math.cos(a) * r, 14 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#ffd34d';
    g.fill();
    g.stroke();
  });
  if (!settings.item || !settings.item.src) settings.item = { ...SAMPLE_ITEMS.lollipop, sample: 'lollipop' };
  // Samples are made fresh each time rather than kept in localStorage.
  if (settings.item.sample) settings.item = { ...SAMPLE_ITEMS[settings.item.sample], sample: settings.item.sample };
  setItemImage();
}

function setItemImage() {
  window.Items.load(settings.item); // start loading it
}

function setItem(item, onChange) {
  settings.item = item;
  save();
  setItemImage();
  if (onChange) onChange();
  if (characters.length) buildItems();
}

/** Controls for the item: a sample, your own PNG or SVG (or a URL, or SVG markup), and its size in screen px. */
function itemControls(onChange) {
  const it = settings.item || {};
  const picker = choice(['', ...Object.keys(SAMPLE_ITEMS)], it.sample || '', (v) => {
    if (v) setItem({ ...SAMPLE_ITEMS[v], sample: v }, onChange);
  });
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/png,image/svg+xml';
  file.onchange = () => {
    const f = file.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Sized like the app would (an SVG with only a viewBox: 48 px on its longest side).
        const it = window.Items.load(r.result);
        setItem({ src: r.result, w: it ? Math.round(it.w) : undefined, h: it ? Math.round(it.h) : undefined, name: f.name }, onChange);
        if (settings.tab === 'pose') buildPose();
        else buildState();
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };
  const shownUrl = it.sample || !it.src || it.src.startsWith('data:') ? '' : it.src;
  const url = text(shownUrl, (v) => v && setItem({ src: v }, onChange), 'or a URL, or <svg> markup');
  const size = (k) => slider(k, it[k] || 0, 0, 200, 1, (v) => setItem({ ...settings.item, [k]: v || undefined }, onChange));
  const name = document.createElement('p');
  name.className = 'hint';
  name.textContent = it.sample ? `Sample: ${it.sample}` : it.library ? `Library: ${it.name}` : it.name ? `Your file: ${it.name}` : 'From a URL';
  return [row('sample', picker), row('PNG / SVG', file), row('URL', url), size('w'), size('h'), name];
}

// ------------------------------------------------------------ the item carousel

const HOLD_SIZE = 48; // a library item's longest side in the hand, in screen px (its PNG is up to 256)
let library = [];
const drawing = new Set(); // descriptions being drawn

async function loadLibrary() {
  try {
    library = await (await fetch('/creator/items.json')).json();
  } catch {
    library = [];
  }
  buildItems();
}

function wireItems() {
  const form = $('itemNew');
  const desc = $('itemDesc');
  const recolourBox = $('itemRecolour');
  const note = $('itemNote');
  // Making items needs the browser host's models (dev/server.js); the app shows the samples.
  if (!env.makesItems) {
    form.style.display = 'none';
    return buildItems();
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const description = desc.value.trim();
    const recolour = recolourBox.value.trim();
    if (!description || drawing.has(description)) return;
    desc.value = '';
    recolourBox.value = '';
    note.className = 'hint';
    note.textContent = 'Up to 10 words.';
    drawing.add(description);
    buildItems();
    try {
      const r = await (await fetch('/creator/items.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, recolour }) })).json();
      if (r.error) throw new Error(r.error);
      library = r.items;
      const it = library.find((x) => x.id === r.id);
      if (it) pickItem(libraryItem(it));
    } catch (err) {
      note.className = 'hint err';
      note.textContent = `“${description}”: ${err.message}`;
      desc.value = description;
      recolourBox.value = recolour;
    } finally {
      drawing.delete(description);
      buildItems();
    }
  };
  loadLibrary();
}

function libraryItem(it) {
  const k = HOLD_SIZE / Math.max(it.w, it.h);
  return { src: it.src, w: Math.round(it.w * k), h: Math.round(it.h * k), name: it.name, library: it.id };
}

function buildItems() {
  const strip = $('itemStrip');
  strip.innerHTML = '';
  const cur = settings.item || {};
  const tile = (src, label, title, on, onClick) => {
    const b = document.createElement('button');
    b.className = `tile${on ? ' on' : ''}`;
    b.title = title;
    const img = new Image();
    img.src = src;
    img.alt = '';
    const l = document.createElement('span');
    l.textContent = label;
    b.append(img, l);
    b.onclick = onClick;
    strip.appendChild(b);
    return b;
  };
  for (const d of drawing) {
    const b = document.createElement('button');
    b.className = 'tile drawing';
    b.disabled = true;
    b.innerHTML = '<div class="spin">✎</div>';
    b.appendChild(Object.assign(document.createElement('span'), { textContent: d }));
    strip.appendChild(b);
  }
  for (const it of library) tile(it.src, it.name, it.description, cur.library === it.id, () => pickItem(libraryItem(it)));
  for (const [k, it] of Object.entries(SAMPLE_ITEMS)) tile(it.src, `${k} (sample)`, 'A sample drawn by the creator', cur.sample === k, () => pickItem({ ...it, sample: k }));
  if (!library.length && !drawing.size) {
    strip.prepend(Object.assign(document.createElement('p'), { className: 'hint', textContent: 'No items in the library yet: describe one above.' }));
  }
}

/** Hold this item, and show it held: the item states, the item scene or arms: item. */
function pickItem(item) {
  setItem(item, sendManual);
  if (settings.tab === 'state') {
    if (!/Item$/.test(settings.manual.state)) setManual('state', 'playItem');
    buildState();
  } else if (settings.tab === 'scenes') {
    if (!/^item/.test(settings.scene || '')) {
      settings.scene = 'item';
      save();
      markScene();
      send({ type: 'scene', id: 'item' });
    }
  } else {
    setPoseField('arms', 'item');
    buildPose();
  }
  buildItems();
}

// ------------------------------------------------------------ little form helpers

function fmt(v) {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
}

function row(label, input) {
  const r = document.createElement('div');
  r.className = 'row wide';
  const l = document.createElement('label');
  l.textContent = label;
  l.title = label;
  r.append(l, input);
  return r;
}

function slider(label, value, min, max, step, onInput) {
  const r = document.createElement('div');
  r.className = 'row';
  const l = document.createElement('label');
  l.textContent = label;
  l.title = label;
  const i = document.createElement('input');
  Object.assign(i, { type: 'range', min, max, step, value });
  const o = document.createElement('output');
  o.value = fmt(+value);
  i.oninput = () => {
    o.value = fmt(+i.value);
    onInput(+i.value);
  };
  // Double-click the label to type an exact value.
  l.ondblclick = () => {
    const v = prompt(label, i.value);
    if (v != null && !Number.isNaN(+v)) {
      i.value = v;
      o.value = fmt(+v);
      onInput(+v);
    }
  };
  r.append(l, i, o);
  return r;
}

function choice(values, value, onChange, free = false) {
  if (free) {
    // A text box with suggestions, so new values can be tried before they're listed.
    const wrap = document.createElement('span');
    const i = document.createElement('input');
    i.type = 'text';
    i.value = value;
    const id = `dl-${Math.random().toString(36).slice(2)}`;
    i.setAttribute('list', id);
    const dl = document.createElement('datalist');
    dl.id = id;
    dl.innerHTML = values.map((v) => `<option value="${v}">`).join('');
    i.oninput = () => onChange(i.value);
    // Empty while focused, so the whole list shows; back to the value if nothing was picked.
    i.onfocus = () => {
      i.placeholder = i.value;
      i.value = '';
    };
    i.onblur = () => {
      if (!i.value) i.value = i.placeholder;
    };
    wrap.append(i, dl);
    return wrap;
  }
  const s = document.createElement('select');
  s.innerHTML = values.map((v) => `<option value="${v}">${v || '(none)'}</option>`).join('');
  s.value = value;
  s.onchange = () => onChange(s.value);
  return s;
}

function text(value, onChange, placeholder = '') {
  const i = document.createElement('input');
  Object.assign(i, { type: 'text', value, placeholder });
  i.oninput = () => onChange(i.value);
  return i;
}

function check(label, value, onChange) {
  const l = document.createElement('label');
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.checked = !!value;
  i.onchange = () => onChange(i.checked);
  l.append(i, ` ${label}`);
  return l;
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

init().then(() => requestAnimationFrame(drawLoop));
