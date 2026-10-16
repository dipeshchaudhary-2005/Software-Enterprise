import { authenticate, saveSession } from "./authentication.js";

export function initLogin({ onAuthenticated }) {
  const form = document.querySelector("#login-form");
  const feedback = document.querySelector("#auth-feedback");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "auth-feedback";

    try {
      const formData = new FormData(form);
      const email = String(formData.get("email")).trim().toLowerCase();
      const password = String(formData.get("password"));
      const session = await authenticate(email, password);
      saveSession(session);
      onAuthenticated(session);
    } catch (error) {
      feedback.textContent = error.message || "Could not log in. Please try again.";
      feedback.className = "auth-feedback error";
    }
  });
}
