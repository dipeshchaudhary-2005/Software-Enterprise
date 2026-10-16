import { getAccounts, getGuests, updateGuestBestScore } from "./authentication.js";

const SCORES_KEY = "banana-breakout-demo-scores";

function getScores() {
  const storedScores = localStorage.getItem(SCORES_KEY);
  if (!storedScores) return [];

  const scores = JSON.parse(storedScores);
  if (
    !Array.isArray(scores)
    || scores.some((entry) => (
      !entry
      || typeof entry.email !== "string"
      || typeof entry.name !== "string"
      || !Number.isInteger(entry.score)
      || entry.score < 0
    ))
  ) {
    throw new Error("Saved leaderboard data is invalid. Clear this site's browser data and try again.");
  }
  return scores;
}

function getTopScores() {
  const userScores = getScores().map((entry) => ({ ...entry, playerType: "user" }));
  const guestScores = getGuests()
    .filter((guest) => guest.score > 0)
    .map((guest) => ({ name: guest.name, score: guest.score, playerType: "guest" }));

  return [...userScores, ...guestScores]
    .sort((first, second) => second.score - first.score || first.name.localeCompare(second.name))
    .slice(0, 10);
}

function populateLeaderboard(body, emptyMessage, scores) {
  body.replaceChildren();
  emptyMessage.hidden = scores.length > 0;
  scores.forEach((entry, index) => {
    const row = document.createElement("tr");
    [String(index + 1), entry.name, String(entry.score)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    body.append(row);
  });
}

export function renderAdminLeaderboard() {
  const summary = document.querySelector("#dashboard-summary");
  const body = document.querySelector("#leaderboard-body");
  const emptyMessage = document.querySelector("#empty-leaderboard");

  try {
    const accounts = getAccounts();
    const guests = getGuests();
    summary.textContent = `${accounts.length} registered user${accounts.length === 1 ? "" : "s"} · ${guests.length} guest${guests.length === 1 ? "" : "s"}`;
    populateLeaderboard(body, emptyMessage, getTopScores());
  } catch (error) {
    summary.textContent = error.message || "Could not load the leaderboard.";
    body.replaceChildren();
    emptyMessage.hidden = true;
  }
}

export function renderPlayerLeaderboard() {
  const status = document.querySelector("#player-leaderboard-status");
  const body = document.querySelector("#player-leaderboard-body");
  const emptyMessage = document.querySelector("#player-leaderboard-empty");

  try {
    const scores = getTopScores();
    status.textContent = `${scores.length} player${scores.length === 1 ? "" : "s"} on the leaderboard`;
    populateLeaderboard(body, emptyMessage, scores);
  } catch (error) {
    status.textContent = error.message || "Could not load the leaderboard.";
    body.replaceChildren();
    emptyMessage.hidden = true;
  }
}

export function savePlayerScore(player, score) {
  if (player?.role === "guest") {
    updateGuestBestScore(player.guestId, score);
    return;
  }
  if (player?.role !== "user") return;

  const scores = getScores();
  const existingScore = scores.find((entry) => entry.email === player.email);
  if (existingScore) {
    existingScore.score = Math.max(existingScore.score, score);
    existingScore.name = player.name;
  } else {
    scores.push({ email: player.email, name: player.name, score });
  }
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

export function deletePlayerScore(email) {
  const scores = getScores();
  localStorage.setItem(
    SCORES_KEY,
    JSON.stringify(scores.filter((entry) => entry.email !== email)),
  );
}
