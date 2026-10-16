import { deleteAccount, deleteGuest, getAccounts, getGuests } from "./authentication.js";
import { deletePlayerScore } from "./leaderboard.js";

export function initAdminUsers({ onUsersChanged }) {
  const status = document.querySelector("#admin-users-status");
  const body = document.querySelector("#admin-users-body");
  const emptyMessage = document.querySelector("#admin-users-empty");
  const guestStatus = document.querySelector("#admin-guests-status");
  const guestBody = document.querySelector("#admin-guests-body");
  const guestEmptyMessage = document.querySelector("#admin-guests-empty");

  function renderUsers() {
    try {
      const accounts = getAccounts().sort((first, second) => first.name.localeCompare(second.name));
      const scores = JSON.parse(localStorage.getItem("banana-breakout-demo-scores") || "[]");
      const scoresByEmail = new Map(scores.map((entry) => [entry.email, entry.score]));

      status.textContent = `${accounts.length} registered user${accounts.length === 1 ? "" : "s"}`;
      emptyMessage.hidden = accounts.length > 0;
      body.replaceChildren();

      accounts.forEach((account) => {
        const row = document.createElement("tr");
        [account.name, account.email, String(scoresByEmail.get(account.email) || 0)].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-user-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${account.name}`);
        deleteButton.addEventListener("click", () => {
          if (!window.confirm(`Delete ${account.name}'s account and score? This cannot be undone.`)) return;

          try {
            deletePlayerScore(account.email);
            deleteAccount(account.email);
            renderUsers();
            onUsersChanged();
          } catch (error) {
            status.textContent = error.message || "Could not delete this user.";
          }
        });
        actionCell.append(deleteButton);
        row.append(actionCell);
        body.append(row);
      });

      const guests = getGuests().sort((first, second) => first.name.localeCompare(second.name));
      guestStatus.textContent = `${guests.length} guest player${guests.length === 1 ? "" : "s"}`;
      guestEmptyMessage.hidden = guests.length > 0;
      guestBody.replaceChildren();

      guests.forEach((guest) => {
        const row = document.createElement("tr");
        [guest.name, String(guest.score)].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-user-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete guest ${guest.name}`);
        deleteButton.addEventListener("click", () => {
          if (!window.confirm(`Remove guest ${guest.name} and their score? This cannot be undone.`)) return;

          try {
            deleteGuest(guest.id);
            renderUsers();
            onUsersChanged();
          } catch (error) {
            guestStatus.textContent = error.message || "Could not remove this guest.";
          }
        });
        actionCell.append(deleteButton);
        row.append(actionCell);
        guestBody.append(row);
      });
    } catch (error) {
      status.textContent = error.message || "Could not load registered users.";
      body.replaceChildren();
      emptyMessage.hidden = true;
      guestStatus.textContent = error.message || "Could not load guest players.";
      guestBody.replaceChildren();
      guestEmptyMessage.hidden = true;
    }
  }

  renderUsers();
  return { render: renderUsers };
}
