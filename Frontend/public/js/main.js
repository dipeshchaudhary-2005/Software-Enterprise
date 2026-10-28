import { initAuth } from "./auth-ui.js";
import { initAdminUsers } from "./admin-users.js";
import { initArcade } from "./arcade.js";
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
const arcadeCard = document.querySelector("#arcade-card");
const adminDashboard = document.querySelector("#admin-dashboard");
const playerLeaderboard = document.querySelector("#player-leaderboard");
const modeCard = document.querySelector("#mode-card");
const userDashboard = document.querySelector("#user-dashboard");

let currentPlayer = null;
const adminUsers = initAdminUsers({ onUsersChanged: renderAdminLeaderboard });

initTheme();

function setPlayView(view) {
  userDashboard.hidden = view !== "dashboard";
  playerLeaderboard.hidden = view !== "leaderboard";
  gameCard.hidden = view !== "game";
  modeCard.hidden = view !== "modes";
  arcadeCard.hidden = view !== "arcade";
  if (view === "leaderboard") renderPlayerLeaderboard();
}

const arcade = initArcade({
  getPlayer: () => currentPlayer,
  onViewChange: setPlayView,
  onScoreUpdated: () => {
    if (currentPlayer?.role === "user") renderPlayerLeaderboard();
  },
});

const game = initGame({
  getPlayer: () => currentPlayer,
  onModeChange: setPlayView,
  onScoreUpdated: () => {
    if (currentPlayer?.role === "user") renderPlayerLeaderboard();
  },
});

function showSession(session) {
  arcade.reset();
  currentPlayer = session;
  game.reset("dashboard");
  authCard.hidden = true;
  sessionControls.hidden = false;
  welcomeMessage.textContent = `Hi, ${session.name}`;

  const isAdmin = session.role === "admin";
  const isUser = session.role === "user";
  const canPlay = !isAdmin;
  scoreCard.hidden = isAdmin;
  playerLeaderboardLink.hidden = !canPlay;
  playerLeaderboardLink.textContent = "Dashboard";
  dashboardLink.hidden = !isAdmin;
  adminDashboard.hidden = !isAdmin;
  userDashboard.hidden = !canPlay;
  document.querySelector("#user-leaderboard-button").hidden = !isUser;
  playerLeaderboard.hidden = true;
  gameCard.hidden = true;
  arcadeCard.hidden = true;
  modeCard.hidden = true;

  if (isAdmin) {
    renderAdminLeaderboard();
    adminUsers.render();
  } else if (isUser) {
    renderPlayerLeaderboard();
  }
}

function showLogin() {
  arcade.reset();
  currentPlayer = null;
  game.reset("dashboard");
  sessionControls.hidden = true;
  scoreCard.hidden = false;
  playerLeaderboardLink.hidden = true;
  dashboardLink.hidden = true;
  adminDashboard.hidden = true;
  userDashboard.hidden = true;
  playerLeaderboard.hidden = true;
  gameCard.hidden = true;
  arcadeCard.hidden = true;
  modeCard.hidden = true;
}

playerLeaderboardLink.addEventListener("click", () => {
  if (currentPlayer?.role !== "user" && currentPlayer?.role !== "guest") return;
  game.reset("dashboard");
  arcade.reset();
});

dashboardLink.addEventListener("click", () => {
  if (currentPlayer?.role !== "admin") return;
  gameCard.hidden = true;
  arcadeCard.hidden = true;
  modeCard.hidden = true;
  adminDashboard.hidden = false;
  renderAdminLeaderboard();
});

document.querySelector("#single-player-button").addEventListener("click", () => {
  if (currentPlayer?.role === "user" || currentPlayer?.role === "guest") {
    arcade.reset();
    game.selectPlayType("single");
  }
});

document.querySelector("#friend-game-button").addEventListener("click", () => {
  if (currentPlayer?.role === "user" || currentPlayer?.role === "guest") {
    arcade.reset();
    game.selectPlayType("friend");
  }
});

document.querySelector("#arcade-game-button").addEventListener("click", () => {
  if (currentPlayer?.role === "user" || currentPlayer?.role === "guest") {
    game.reset("dashboard");
    arcade.open();
  }
});

document.querySelector("#user-leaderboard-button").addEventListener("click", () => {
  if (currentPlayer?.role === "user") setPlayView("leaderboard");
});

document.querySelector("#mode-dashboard-button").addEventListener("click", () => {
  if (currentPlayer?.role === "user" || currentPlayer?.role === "guest") game.reset("dashboard");
});

document.querySelector("#leaderboard-dashboard-button").addEventListener("click", () => {
  if (currentPlayer?.role === "user") setPlayView("dashboard");
});

initAuth({ onAuthenticated: showSession, onLogout: showLogin });
