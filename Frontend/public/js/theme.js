const THEME_KEY = "banana-breakout-theme";

export function initTheme() {
  const themeToggle = document.querySelector("#theme-toggle");
  const icon = themeToggle.querySelector("[aria-hidden='true']");

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    const label = `Switch to ${isDark ? "light" : "dark"} theme`;
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
    icon.textContent = isDark ? "☀️" : "🌙";
  }

  try {
    applyTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
  } catch (error) {
    applyTheme("light");
    console.error("Could not load the saved color theme.", error);
  }

  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      console.error("Could not save the selected color theme.", error);
    }
  });
}
