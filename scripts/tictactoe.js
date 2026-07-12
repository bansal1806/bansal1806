// Tic-tac-toe engine for the profile README game.
// Triggered by the tictactoe.yml workflow when a visitor opens an issue
// titled "ttt|move|<0-8>". Humans play X, the bot plays O (minimax).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BOARD_FILE = path.join(ROOT, "game", "board.json");
const COMMENT_FILE = path.join(ROOT, "game", "comment.txt");
const README = path.join(ROOT, "Readme.md");
const REPO = "bansal1806/bansal1806";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const winner = (b) => {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every(Boolean) ? "draw" : null;
};

// Minimax with random tie-breaking so games aren't identical.
function bestMove(b) {
  const score = (board, player) => {
    const w = winner(board);
    if (w === "O") return 10;
    if (w === "X") return -10;
    if (w === "draw") return 0;
    const scores = [];
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = player;
        scores.push(score(board, player === "O" ? "X" : "O"));
        board[i] = "";
      }
    }
    return player === "O" ? Math.max(...scores) : Math.min(...scores);
  };
  let best = -Infinity;
  let moves = [];
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = "O";
      const s = score(b, "X");
      b[i] = "";
      if (s > best) { best = s; moves = [i]; }
      else if (s === best) moves.push(i);
    }
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function renderBoard(state) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const cells = [];
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const v = state.board[i];
      if (v === "X") cells.push(`<td><img src="assets/ttt/x.svg" width="72" alt="X" /></td>`);
      else if (v === "O") cells.push(`<td><img src="assets/ttt/o.svg" width="72" alt="O" /></td>`);
      else {
        const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`ttt|move|${i}`)}&body=${encodeURIComponent("Just press 'Create' — the bot replies in ~30 seconds! 🎮")}`;
        cells.push(`<td><a href="${url}"><img src="assets/ttt/blank.svg" width="72" alt="play cell ${i}" /></a></td>`);
      }
    }
    rows.push(`  <tr>${cells.join("")}</tr>`);
  }
  const s = state.stats;
  return [
    `<div align="center">`,
    ``,
    `<table>`,
    rows.join("\n"),
    `</table>`,
    ``,
    `**How to play (10 seconds):** 1️⃣ Click an empty square → 2️⃣ GitHub opens a pre-filled issue → 3️⃣ Just press **Create** — don't edit the title! → ♻️ Refresh this page ~30s later to see the bot's move.`,
    ``,
    `*You are ❌, the bot is ⭕. Best played on desktop — the GitHub mobile app may not pre-fill the move.*`,
    ``,
    `🧑 Humans **${s.humanWins}** · 🤖 Bot **${s.botWins}** · 🤝 Draws **${s.draws}** · 🎮 Games played **${s.games}**`,
    ``,
    `</div>`,
  ].join("\n");
}

function updateReadme(state) {
  const md = fs.readFileSync(README, "utf8");
  const START = "<!-- TTT:START -->";
  const END = "<!-- TTT:END -->";
  const next = md.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    `${START}\n${renderBoard(state)}\n${END}`
  );
  fs.writeFileSync(README, next);
}

function main() {
  const title = process.env.ISSUE_TITLE || "";
  const user = process.env.ISSUE_USER || "friend";
  const state = JSON.parse(fs.readFileSync(BOARD_FILE, "utf8"));
  const say = (msg) => fs.writeFileSync(COMMENT_FILE, msg);

  const m = title.match(/^\s*ttt\s*\|\s*move\s*\|\s*([0-8])\s*$/);
  if (!m) {
    say(`Hmm, I couldn't parse that move. Use the links on the board in my profile README! 🎮`);
    updateReadme(state);
    return;
  }
  const cell = Number(m[1]);
  if (state.board[cell]) {
    say(`@${user} that square is already taken! Pick an empty one from the board on my profile. 😄`);
    updateReadme(state);
    return;
  }

  state.board[cell] = "X";
  let result = winner(state.board);
  let botCell = null;

  if (!result) {
    botCell = bestMove(state.board);
    state.board[botCell] = "O";
    result = winner(state.board);
  }

  let msg;
  if (result === "X") {
    state.stats.games++; state.stats.humanWins++;
    msg = `🏆 @${user} WINS! You actually beat the minimax bot — legendary. Board reset for the next challenger!`;
    state.board = ["", "", "", "", "", "", "", "", ""];
  } else if (result === "O") {
    state.stats.games++; state.stats.botWins++;
    msg = `🤖 The bot wins this round, @${user}! It played square ${botCell}. Board reset — rematch?`;
    state.board = ["", "", "", "", "", "", "", "", ""];
  } else if (result === "draw") {
    state.stats.games++; state.stats.draws++;
    msg = `🤝 It's a draw, @${user}! A perfectly balanced game. Board reset — try again!`;
    state.board = ["", "", "", "", "", "", "", "", ""];
  } else {
    msg = `✅ Move registered, @${user}! You played square ${cell}, the bot replied with square ${botCell}. Your turn — head back to the board!`;
  }
  state.lastPlayer = user;

  fs.writeFileSync(BOARD_FILE, JSON.stringify(state, null, 2) + "\n");
  updateReadme(state);
  say(msg + `\n\n▶️ [Back to the board](https://github.com/${REPO})`);
}

main();
