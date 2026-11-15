'use strict';

// "Pick your companion" (Phase 9): each character drawn by its own look.js,
// idling. Hovering one makes it come alive (a hop and a wave) and a card
// slides up with its name, what it is, its "Who I am" and "More info" (the
// character creator: its personality, its scenes, and playing with it).
// Click to pick.

const SIZE = 1.15;
const tiles = [];

function poseFor(ch, t, alive, since) {
  const p = ch.defaultPose();
  p.t = t;
  p.scaleY = 1 + Math.sin(t * 2.2) * 0.012;
  p.blink = t % 4 < 0.12 ? 1 : 0;
  p.lookY = 0.2;
  if (!alive) return p;
  // Come alive: a little hop, then a happy wave.
  const s = t - since;
  p.bob = s < 0.5 ? -Math.sin((s / 0.5) * Math.PI) * 18 : -Math.abs(Math.sin(t * 7)) * 2;
  p.arms = s < 0.5 ? 'up' : 'wave';
  p.eyes = 'happy';
  p.mouth = 'open';
  p.blush = 0.9;
  return p;
}

function render(now) {
  const t = now / 1000;
  for (const tile of tiles) {
    const { ctx, canvas, ch } = tile;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.translate(100, 200);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38 * SIZE, 6 * SIZE, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a3a6a';
    ctx.fill();
    ctx.restore();
    ctx.scale(SIZE, SIZE);
    ch.draw(ctx, poseFor(ch, t, tile.alive, tile.since));
  }
  requestAnimationFrame(render);
}

window.picker.onLoad(({ characters, current }) => {
  const row = document.getElementById('row');
  row.textContent = '';
  tiles.length = 0;
  for (const c of characters) {
    const ch = window.Characters[c.id];
    if (!ch) continue;
    const el = document.createElement('div');
    el.className = `choice${c.id === current ? ' current' : ''}`;
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 200 * dpr;
    canvas.height = 230 * dpr;
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = c.name;
    const card = document.createElement('div');
    card.className = 'card';
    const h = document.createElement('h2');
    h.textContent = c.name;
    const concept = document.createElement('p');
    concept.className = 'concept';
    concept.textContent = c.concept;
    const self = document.createElement('p');
    self.className = 'self';
    self.textContent = c.self.replace(/\s+/g, ' ');
    const info = document.createElement('button');
    info.className = 'info';
    info.textContent = 'More info';
    info.addEventListener('click', (e) => {
      e.stopPropagation();
      window.picker.info(c.id);
    });
    card.append(h, concept, self, info);
    el.append(canvas, name, card);
    row.appendChild(el);
    const tile = { ctx: canvas.getContext('2d'), canvas, ch, alive: false, since: 0 };
    el.addEventListener('mouseenter', () => {
      tile.alive = true;
      tile.since = performance.now() / 1000;
      el.classList.add('open');
    });
    el.addEventListener('mouseleave', () => {
      tile.alive = false;
      el.classList.remove('open');
    });
    el.addEventListener('click', () => window.picker.pick(c.id));
    tiles.push(tile);
  }
});

requestAnimationFrame(render);
