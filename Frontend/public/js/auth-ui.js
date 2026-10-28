import { clearSession, createGuest, restoreSession, saveSession } from "./authentication.js";
import { initLogin } from "./login.js";
import { initRegistration } from "./registration.js";

export function initAuth({ onAuthenticated, onLogout }) {
  const authCard = document.querySelector("#auth-card");
  const authTitle = document.querySelector("#auth-title");
  const authIntro = document.querySelector("#auth-intro");
  const authFeedback = document.querySelector("#auth-feedback");
  const authSwitch = document.querySelector("#auth-switch");
  const loginForm = document.querySelector("#login-form");
  const registrationForm = document.querySelector("#registration-form");
  const guestForm = document.querySelector("#guest-form");
  const guestButton = document.querySelector("#guest-button");
  const logoutButton = document.querySelector("#logout-button");

  function showAuth(mode = "login") {
    const registering = mode === "register";
    authCard.hidden = false;
    loginForm.hidden = registering;
    registrationForm.hidden = !registering;
    guestForm.hidden = true;
    authTitle.textContent = registering ? "Create your account." : "Welcome back.";
    authIntro.textContent = registering
      ? "Sign up to start playing Banana Breakout."
      : "Log in to play Banana Breakout.";
    authSwitch.innerHTML = registering
      ? 'Already have an account? <button class="text-button" type="button" data-auth-mode="login">Log in</button>'
      : 'New here? <button class="text-button" type="button" data-auth-mode="register">Create an account</button>';
    authFeedback.textContent = "";
    authFeedback.className = "auth-feedback";
  }

  authSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-mode]");
    if (button) showAuth(button.dataset.authMode);
  });

  initLogin({ onAuthenticated });
  initRegistration({ onAuthenticated });

  guestButton.addEventListener("click", () => {
    loginForm.hidden = true;
    registrationForm.hidden = true;
    guestForm.hidden = false;
    authTitle.textContent = "Play as a guest.";
    authIntro.textContent = "Enter your name to join the game and leaderboard.";
    authFeedback.textContent = "";
    authFeedback.className = "auth-feedback";
    document.querySelector("#guest-name").focus();
  });

  guestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const guestName = String(new FormData(guestForm).get("name")).trim();
    if (!guestName) {
      authFeedback.textContent = "Enter your name to continue as a guest.";
      authFeedback.className = "auth-feedback error";
      return;
    }

    try {
      const session = createGuest(guestName);
      saveSession(session);
      onAuthenticated(session);
    } catch (error) {
      authFeedback.textContent = error.message || "Could not save your guest name.";
      authFeedback.className = "auth-feedback error";
    }
  });

  logoutButton.addEventListener("click", () => {
    clearSession();
    showAuth("login");
    onLogout();
  });

  try {
    const session = restoreSession();
    if (session) {
      onAuthenticated(session);
    } else {
      showAuth("login");
    }
  } catch (error) {
    showAuth("login");
    authFeedback.textContent = error.message || "Could not load saved demo accounts.";
    authFeedback.className = "auth-feedback error";
  }
}
