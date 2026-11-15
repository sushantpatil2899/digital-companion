'use strict';

// The fetch ball (Togepi's Pokeball) while it's out of his hands: you can pick it up and throw it.
// The main process moves this window with the ball; we just draw it.

const canvas = document.getElementById('ball');
const ctx = canvas.getContext('2d');
const R = 14; // keep in sync with BALL.r in src/main/games/fetch.js
// The active character (?character=<id>, set by src/main/main.js).
const ch = window.Characters[new URLSearchParams(location.search).get('character')] || window.Characters.togepi;

let ball = { rot: 0, held: false, dy: 0 }; // dy: how far below the window's centre the ball is

function draw() {
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(window.innerWidth * dpr)) {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.translate(window.innerWidth / 2, window.innerHeight / 2 + (ball.dy || 0));
  ch.drawFetchItem(ctx, 0, 0, ball.rot, R);
}

window.game.onBall((b) => {
  ball = b;
  draw();
});
draw();

let pressed = false;
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  pressed = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('grabbing');
  window.game.pressBall();
});

function endPress() {
  if (!pressed) return;
  pressed = false;
  canvas.classList.remove('grabbing');
  window.game.releaseBall();
}
canvas.addEventListener('pointerup', endPress);
canvas.addEventListener('pointercancel', endPress);
canvas.addEventListener('lostpointercapture', endPress);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
