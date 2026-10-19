'use strict';

// Tic-tac-toe (noughts and crosses). Pure logic, no Electron.
//
// Squares are numbered 0..8, left to right, top to bottom. X always goes
// first; whoever starts plays X.

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// He always wins when he can and always blocks you. Otherwise he plays his
// best move this often, else any free square: so he only slips up on the
// trickier moves (like letting you set up two threats at once), and you can
// still beat him.
const SKILL = 0.8;

function other(mark) {
  return mark === 'X' ? 'O' : 'X';
}

function freeSquares(board) {
  const out = [];
  for (let i = 0; i < 9; i++) if (!board[i]) out.push(i);
  return out;
}

/** { mark: 'X' | 'O', line } for three in a row, { mark: 'draw' } for a full board, else null. */
function winner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { mark: board[a], line };
  }
  return freeSquares(board).length ? null : { mark: 'draw', line: null };
}

// Score of the position for `me` with `turn` to move: > 0 a win (sooner is
// better), < 0 a loss (later is better), 0 a draw.
function minimax(board, turn, me, depth) {
  const w = winner(board);
  if (w) return w.mark === 'draw' ? 0 : w.mark === me ? 10 - depth : depth - 10;
  let best = turn === me ? -Infinity : Infinity;
  for (const i of freeSquares(board)) {
    board[i] = turn;
    const score = minimax(board, other(turn), me, depth + 1);
    board[i] = null;
    best = turn === me ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

/** The squares that are best for `me` to play now. */
function bestMoves(board, me) {
  const b = board.slice();
  let best = -Infinity;
  let moves = [];
  for (const i of freeSquares(b)) {
    b[i] = me;
    const score = minimax(b, other(me), me, 1);
    b[i] = null;
    if (score > best) {
      best = score;
      moves = [i];
    } else if (score === best) {
      moves.push(i);
    }
  }
  return moves;
}

/** Would putting `mark` on square `i` make three in a row? */
function completes(board, i, mark) {
  const b = board.slice();
  b[i] = mark;
  const w = winner(b);
  return !!w && w.mark === mark;
}

/** His move for `me`: win, else block, else usually one of the best moves. */
function chooseMove(board, me, rng = Math.random, skill = SKILL) {
  const free = freeSquares(board);
  if (!free.length) return null;
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const wins = free.filter((i) => completes(board, i, me));
  if (wins.length) return pick(wins);
  const blocks = free.filter((i) => completes(board, i, other(me)));
  if (blocks.length) return pick(blocks);
  return pick(rng() < skill ? bestMoves(board, me) : free);
}

class TicTacToe {
  /** @param {boolean} youStart you play X and go first; otherwise he does */
  constructor(youStart) {
    this.board = Array(9).fill(null);
    this.you = youStart ? 'X' : 'O';
    this.me = other(this.you);
    this.turn = 'X';
    this.result = null; // winner() once the game is over
  }

  get yourTurn() {
    return !this.result && this.turn === this.you;
  }

  get myTurn() {
    return !this.result && this.turn === this.me;
  }

  /** Put `mark` on square `i`. Returns false if that's not allowed now. */
  play(i, mark) {
    if (this.result || mark !== this.turn || !Number.isInteger(i) || i < 0 || i > 8 || this.board[i]) return false;
    this.board[i] = mark;
    this.turn = other(mark);
    this.result = winner(this.board);
    return true;
  }

  /** 'you' | 'me' | 'draw' once it's over, else null. */
  outcome() {
    if (!this.result) return null;
    if (this.result.mark === 'draw') return 'draw';
    return this.result.mark === this.you ? 'you' : 'me';
  }
}

module.exports = { TicTacToe, winner, bestMoves, chooseMove, freeSquares, LINES, SKILL };
