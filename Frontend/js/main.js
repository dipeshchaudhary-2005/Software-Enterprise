import { initAuth } from "./auth-ui.js";
import { initAdminUsers } from "./admin-users.js";
import { initGame } from "./game.js";
import { renderAdminLeaderboard, renderPlayerLeaderboard } from "./leaderboard.js";
import { initTheme } from "./theme.js";

const authCard = document.querySelector("#auth-card");
const sessionControls = document.querySelector("#session-controls");
const welcomeMessage = document.querySelector("#welcome-message");
const scoreCard = document.querySelector(".score-card");
const playerLeaderboardLink = document.querySelector("#player-leaderboard-link");
const dashboardLink = document.querySelector("#dashboard-link");
const gameCard = document.querySelector("#game-card");
const adminDashboard = document.querySelector("#admin-dashboard");
const playerLeaderboard = document.querySelector("#player-leaderboard");
const modeCard = document.querySelector("#mode-card");

let currentPlayer = null;
let currentPlayView = "modes";
const adminUsers = initAdminUsers({ onUsersChanged: renderAdminLeaderboard });

initTheme();

const game = initGame({
  getPlayer: () => currentPlayer,
  onModeChange: (view) => {
    currentPlayView = view;
  },
  onScoreUpdated: () => {
    if (currentPlayer?.role === "user") renderPlayerLeaderboard();
  },
});

function showSession(session) {
  currentPlayer = session;
  game.reset();
  authCard.hidden = true;
  sessionControls.hidden = false;
  welcomeMessage.textContent = `Hi, ${session.name}`;

  const isAdmin = session.role === "admin";
  const isUser = session.role === "user";
  scoreCard.hidden = isAdmin;
  playerLeaderboardLink.hidden = !isUser;
  playerLeaderboardLink.textContent = "View leaderboard";
  dashboardLink.hidden = !isAdmin;
  adminDashboard.hidden = !isAdmin;
  playerLeaderboard.hidden = true;
  gameCard.hidden = true;
  modeCard.hidden = isAdmin;

  if (isAdmin) {
    renderAdminLeaderboard();
    adminUsers.render();
  } else if (isUser) {
    renderPlayerLeaderboard();
  }
}

function showLogin() {
  currentPlayer = null;
  currentPlayView = "modes";
  game.reset();
  sessionControls.hidden = true;
  scoreCard.hidden = false;
  playerLeaderboardLink.hidden = true;
  dashboardLink.hidden = true;
  adminDashboard.hidden = true;
  playerLeaderboard.hidden = true;
  gameCard.hidden = true;
  modeCard.hidden = true;
}

playerLeaderboardLink.addEventListener("click", () => {
  if (currentPlayer?.role !== "user") return;

  const opening = playerLeaderboard.hidden;
  playerLeaderboard.hidden = !opening;
  gameCard.hidden = opening || currentPlayView !== "game";
  modeCard.hidden = opening || currentPlayView !== "modes";
  playerLeaderboardLink.textContent = opening ? "Back to game" : "View leaderboard";
  if (opening) renderPlayerLeaderboard();
});

dashboardLink.addEventListener("click", () => {
  if (currentPlayer?.role !== "admin") return;
  gameCard.hidden = true;
  modeCard.hidden = true;
  adminDashboard.hidden = false;
  renderAdminLeaderboard();
});

initAuth({ onAuthenticated: showSession, onLogout: showLogin });
