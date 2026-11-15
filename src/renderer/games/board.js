'use strict';

// Tic-tac-toe board next to him. The game itself runs in the main process
// (src/main/companion.js); this only shows it and sends your clicks.

const grid = document.getElementById('grid');
const status = document.getElementById('status');
const again = document.getElementById('again');

// The character's own pieces (Pip: gears vs bolts; Mori: your leaves vs his
// mushrooms; Nomi: your stars vs her moons, whoever starts); X and O otherwise.
const PIECES = { pip: { X: '⚙️', O: '🔩' }, mori: { you: '🍃', me: '🍄' }, nomi: { you: '⭐', me: '🌙' }, tonk: { you: '🔌', me: '🔋' }, wolfie: { you: '🐾', me: '🌊' } }[new URLSearchParams(location.search).get('character')] || null;
let you = 'X';
const piece = (mark) => (PIECES && (PIECES[mark] || (PIECES.you && (mark === you ? PIECES.you : PIECES.me)))) || mark;

const cells = [];
for (let i = 0; i < 9; i++) {
  const b = document.createElement('button');
  b.className = 'cell';
  b.addEventListener('click', () => window.game.play(i));
  grid.appendChild(b);
  cells.push(b);
}

function statusText(v) {
  if (v.outcome === 'you') return 'You win! 🎉';
  if (v.outcome === 'me') return `${window.CHARACTER_NAME} wins!`;
  if (v.outcome === 'draw') return "It's a draw!";
  return v.yourTurn ? `You're ${piece(v.you)}. Your turn!` : `${window.CHARACTER_NAME} is thinking…`;
}

window.game.onBoard((v) => {
  you = v.you;
  status.textContent = statusText(v);
  const win = new Set(v.line || []);
  cells.forEach((c, i) => {
    const mark = v.board[i];
    c.textContent = mark ? piece(mark) : '';
    c.className = `cell ${mark || 'free'}${!mark && v.yourTurn ? ' open' : ''}${win.has(i) ? ' win' : ''}`;
    c.disabled = !!mark || !v.yourTurn;
  });
  again.classList.toggle('show', !!v.over);
});

again.addEventListener('click', () => window.game.again());
document.getElementById('close').addEventListener('click', () => window.game.close());
