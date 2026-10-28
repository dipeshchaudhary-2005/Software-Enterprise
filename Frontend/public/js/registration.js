import { registerAccount, saveSession } from "./authentication.js";

export function initRegistration({ onAuthenticated }) {
  const form = document.querySelector("#registration-form");
  const feedback = document.querySelector("#auth-feedback");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "auth-feedback";

    const formData = new FormData(form);
    const name = String(formData.get("name")).trim();
    const email = String(formData.get("email")).trim().toLowerCase();
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirm-password"));

    if (!name) {
      feedback.textContent = "Enter your name to create an account.";
      feedback.className = "auth-feedback error";
      return;
    }
    if (password.length < 8) {
      feedback.textContent = "Use a password with at least 8 characters.";
      feedback.className = "auth-feedback error";
      return;
    }
    if (password !== confirmPassword) {
      feedback.textContent = "The passwords do not match.";
      feedback.className = "auth-feedback error";
      return;
    }

    try {
      const session = await registerAccount(name, email, password);
      saveSession(session);
      onAuthenticated(session);
    } catch (error) {
      feedback.textContent = error.message || "Could not create your account. Please try again.";
      feedback.className = "auth-feedback error";
    }
  });
}
