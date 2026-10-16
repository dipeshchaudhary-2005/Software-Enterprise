import { savePlayerScore } from "./leaderboard.js";

const API_URL = "https://marcconrad.com/uob/banana/api.php?out=json&base64=no";
const GAME_MODES = {
  easy: { label: "Easy", seconds: 30 },
  medium: { label: "Medium", seconds: 50 },
  hard: { label: "Hard", seconds: 120 },
};

export function initGame({ getPlayer, onModeChange, onScoreUpdated }) {
  const modeCard = document.querySelector("#mode-card");
  const modeBadge = document.querySelector("#mode-badge");
  const timerElement = document.querySelector("#puzzle-timer");
  const timerValue = document.querySelector("#timer-value");
  const placeholderText = document.querySelector("#puzzle-placeholder-text");
  const changeModeButton = document.querySelector("#change-mode-button");
  const scoreElement = document.querySelector("#score");
  const puzzleImage = document.querySelector("#puzzle-image");
  const puzzlePlaceholder = document.querySelector("#puzzle-placeholder");
  const feedback = document.querySelector("#feedback");
  const answerForm = document.querySelector("#answer-form");
  const answerInput = document.querySelector("#answer");
  const submitButton = document.querySelector("#submit-button");
  const nextButton = document.querySelector("#next-button");
  const gameCard = document.querySelector("#game-card");

  let currentPuzzle = null;
  let score = 0;
  let answered = false;
  let loading = false;
  let currentMode = null;
  let timeRemaining = 0;
  let timerInterval = null;
  let puzzleRequestId = 0;

  function setFeedback(message, type = "") {
    feedback.textContent = message;
    feedback.className = `feedback${type ? ` ${type}` : ""}`;
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerElement.classList.remove("urgent");
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerValue.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
    timerElement.classList.toggle("urgent", timeRemaining <= 10);
    timerElement.setAttribute("aria-label", `${minutes} minutes and ${seconds} seconds remaining`);
  }

  function updateControls() {
    answerInput.disabled = loading || !currentPuzzle || answered;
    submitButton.disabled = loading || !currentPuzzle || answered;
    nextButton.disabled = loading;
    nextButton.textContent = loading
      ? "Loading puzzle..."
      : currentPuzzle && !answered
        ? "Skip this puzzle"
        : "Try next question";
    changeModeButton.disabled = loading;
  }

  function finishPuzzleOnTimeout() {
    if (!currentPuzzle || answered) return;

    answered = true;
    timeRemaining = 0;
    stopTimer();
    updateTimerDisplay();
    setFeedback("Time's up! Click Try next question when you're ready.", "error");
    updateControls();
  }

  function startTimer() {
    stopTimer();
    timeRemaining = GAME_MODES[currentMode].seconds;
    updateTimerDisplay();
    const deadline = Date.now() + timeRemaining * 1000;

    timerInterval = setInterval(() => {
      timeRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      updateTimerDisplay();
      if (timeRemaining === 0) finishPuzzleOnTimeout();
    }, 200);
  }

  function preloadPuzzleImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => {
        image.src = "";
        reject(new Error("The puzzle image took too long to load. Check your connection and try again."));
      }, 15000);

      image.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("The Banana API returned an image URL, but the puzzle image could not be loaded."));
      };
      image.src = imageUrl;
    });
  }

  async function loadPuzzle() {
    if (loading || !currentMode) return;

    const requestId = ++puzzleRequestId;
    stopTimer();
    loading = true;
    currentPuzzle = null;
    answered = false;
    puzzleImage.hidden = true;
    puzzlePlaceholder.hidden = false;
    placeholderText.textContent = "Loading a puzzle image from the Banana API...";
    answerInput.value = "";
    setFeedback("Getting a puzzle image and answer from the Banana API...");
    updateControls();

    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`The puzzle service returned HTTP ${response.status}.`);
      }

      const puzzle = await response.json();
      if (
        !puzzle
        || typeof puzzle.question !== "string"
        || !puzzle.question
        || !/^[0-9]$/.test(String(puzzle.solution))
      ) {
        throw new Error("The Banana API response must include a puzzle image and a single-digit solution.");
      }

      let imageUrl;
      try {
        const parsedImageUrl = new URL(puzzle.question, API_URL);
        if (!["https:", "http:", "data:"].includes(parsedImageUrl.protocol)) {
          throw new Error("Unsupported image URL.");
        }
        imageUrl = parsedImageUrl.href;
      } catch {
        throw new Error("The Banana API returned an invalid puzzle image URL.");
      }

      await preloadPuzzleImage(imageUrl);
      if (requestId !== puzzleRequestId) return;
      currentPuzzle = { imageUrl, solution: Number(puzzle.solution) };
      puzzleImage.src = currentPuzzle.imageUrl;
      puzzleImage.hidden = false;
      puzzlePlaceholder.hidden = true;
      setFeedback(`Puzzle ready. Enter a number from 0 to 9. You have ${GAME_MODES[currentMode].seconds} seconds.`);
      startTimer();
    } catch (error) {
      if (requestId !== puzzleRequestId) return;
      currentPuzzle = null;
      puzzlePlaceholder.hidden = false;
      placeholderText.textContent = "Puzzle unavailable. Use Try next question to try again.";
      setFeedback(`${error.message} Check your connection and try again.`, "error");
    } finally {
      if (requestId !== puzzleRequestId) return;
      loading = false;
      updateControls();
      if (currentPuzzle) answerInput.focus();
    }
  }

  document.querySelector(".mode-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button || !GAME_MODES[button.dataset.mode] || loading) return;

    currentMode = button.dataset.mode;
    modeBadge.textContent = `${GAME_MODES[currentMode].label} mode`;
    modeCard.hidden = true;
    gameCard.hidden = false;
    onModeChange("game");
    loadPuzzle();
  });

  changeModeButton.addEventListener("click", () => {
    if (loading) return;
    stopTimer();
    currentPuzzle = null;
    currentMode = null;
    gameCard.hidden = true;
    modeCard.hidden = false;
    onModeChange("modes");
  });

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentPuzzle || answered) return;

    const answer = Number(answerInput.value);
    if (!Number.isInteger(answer) || answer < 0 || answer > 9) {
      setFeedback("Enter a whole number from 0 to 9.", "error");
      answerInput.focus();
      return;
    }

    answered = true;
    stopTimer();
    if (answer === currentPuzzle.solution) {
      score += 1;
      scoreElement.textContent = String(score);
      try {
        savePlayerScore(getPlayer(), score);
        setFeedback(
          getPlayer()?.role === "user"
            ? "That's right! Your best score is saved."
            : "That's right! Your guest best score is saved.",
          "success",
        );
        onScoreUpdated();
      } catch (error) {
        setFeedback(`Correct! Couldn't save your score: ${error.message}`, "error");
      }
    } else {
      setFeedback(`Not quite — the answer was ${currentPuzzle.solution}.`, "error");
    }
    updateControls();
    nextButton.focus();
  });

  nextButton.addEventListener("click", loadPuzzle);

  return {
    reset() {
      puzzleRequestId += 1;
      stopTimer();
      currentPuzzle = null;
      currentMode = null;
      answered = false;
      loading = false;
      score = 0;
      scoreElement.textContent = "0";
      gameCard.hidden = true;
      modeCard.hidden = false;
      updateControls();
      onModeChange("modes");
    },
  };
}
