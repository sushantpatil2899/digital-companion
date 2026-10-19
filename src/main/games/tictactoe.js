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

// How often he plays his best move; otherwise any free square. He's good,
// but you can beat him.
const SKILL = 0.75;

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

/** His move for `me`: usually one of the best, sometimes any free square. */
function chooseMove(board, me, rng = Math.random, skill = SKILL) {
  const free = freeSquares(board);
  if (!free.length) return null;
  const pool = rng() < skill ? bestMoves(board, me) : free;
  return pool[Math.floor(rng() * pool.length)];
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
