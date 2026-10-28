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
  const battleScoreboard = document.querySelector("#battle-scoreboard");
  const playerOneForm = document.querySelector("#player-one-form");
  const playerOneInput = document.querySelector("#player-one-answer");
  const playerOneScore = document.querySelector("#player-one-score");
  const playerOneName = document.querySelector("#player-one-name");
  const playerOneAnswerLabel = document.querySelector("#player-one-answer-label");
  const playerTwoForm = document.querySelector("#player-two-form");
  const playerTwoInput = document.querySelector("#player-two-answer");
  const playerTwoScore = document.querySelector("#player-two-score");
  const playerTwoName = document.querySelector("#player-two-name");
  const playerTwoAnswerLabel = document.querySelector("#player-two-answer-label");
  const nextButton = document.querySelector("#next-button");
  const gameCard = document.querySelector("#game-card");
  const battleAnswers = document.querySelector("#battle-answers");
  const gameTitle = document.querySelector("#game-title");
  const gameIntro = document.querySelector("#game-intro");

  let currentPuzzle = null;
  let score = 0;
  let friendScore = 0;
  let answered = false;
  let loading = false;
  let currentMode = null;
  let playType = "single";
  let timeRemaining = 0;
  let timerInterval = null;
  let puzzleRequestId = 0;
  let advanceTimeout = null;

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

  function clearAdvanceTimeout() {
    if (advanceTimeout !== null) {
      clearTimeout(advanceTimeout);
      advanceTimeout = null;
    }
  }

  function updateBattleDisplay() {
    const isBattle = playType === "friend";
    answerForm.hidden = isBattle;
    battleAnswers.hidden = !isBattle;
    battleScoreboard.hidden = !isBattle;
    playerOneName.textContent = getPlayer()?.name || "Player 1";
    playerOneAnswerLabel.textContent = playerOneName.textContent.toUpperCase();
    playerTwoName.textContent = "Friend";
    playerTwoAnswerLabel.textContent = "FRIEND";
    playerOneScore.textContent = String(score);
    playerTwoScore.textContent = String(friendScore);
    gameTitle.textContent = isBattle
      ? "Race your friend."
      : "Crack the banana code.";
    gameIntro.textContent = isBattle
      ? "You both see the same puzzle. First correct answer wins the round."
      : "Study the puzzle image. What number is missing?";
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
    playerOneInput.disabled = loading || !currentPuzzle || answered;
    playerTwoInput.disabled = loading || !currentPuzzle || answered;
    playerOneForm.querySelector("button").disabled = playerOneInput.disabled;
    playerTwoForm.querySelector("button").disabled = playerTwoInput.disabled;
    nextButton.disabled = loading;
    nextButton.textContent = loading
      ? "Loading puzzle..."
      : playType === "friend" && answered
        ? "Next shared puzzle"
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
    setFeedback(
      playType === "friend"
        ? "Time's up! Either player can start the next shared puzzle."
        : "Time's up! Click Try next question when you're ready.",
      "error",
    );
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

    clearAdvanceTimeout();
    const requestId = ++puzzleRequestId;
    stopTimer();
    loading = true;
    currentPuzzle = null;
    answered = false;
    puzzleImage.hidden = true;
    puzzlePlaceholder.hidden = false;
    placeholderText.textContent = "Loading a puzzle image from the Banana API...";
    answerInput.value = "";
    playerOneInput.value = "";
    playerTwoInput.value = "";
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
      if (currentPuzzle) {
        (playType === "friend" ? playerOneInput : answerInput).focus();
      }
    }
  }

  document.querySelector(".mode-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button || !GAME_MODES[button.dataset.mode] || loading) return;

    currentMode = button.dataset.mode;
    modeBadge.textContent = `${GAME_MODES[currentMode].label} · ${playType === "friend" ? "Friend battle" : "Single player"}`;
    updateBattleDisplay();
    modeCard.hidden = true;
    gameCard.hidden = false;
    onModeChange("game");
    loadPuzzle();
  });

  changeModeButton.addEventListener("click", () => {
    if (loading) return;
    clearAdvanceTimeout();
    stopTimer();
    currentPuzzle = null;
    currentMode = null;
    gameCard.hidden = true;
    modeCard.hidden = false;
    onModeChange("modes");
  });

  function submitAnswer(input, playerNumber = 1) {
    if (!currentPuzzle || answered) return;

    const answer = Number(input.value);
    if (!Number.isInteger(answer) || answer < 0 || answer > 9) {
      setFeedback("Enter a whole number from 0 to 9.", "error");
      input.focus();
      return;
    }

    if (answer !== currentPuzzle.solution) {
      if (playType === "friend") {
        const name = playerNumber === 1 ? playerOneName.textContent : playerTwoName.textContent;
        setFeedback(`${name} is not quite right. Try again before time runs out.`, "error");
        input.value = "";
        input.focus();
        return;
      }

      answered = true;
      stopTimer();
      setFeedback(`Not quite — the answer was ${currentPuzzle.solution}.`, "error");
      updateControls();
      nextButton.focus();
      return;
    }

    answered = true;
    stopTimer();
    if (playType === "friend" && playerNumber === 2) {
      friendScore += 1;
      playerTwoScore.textContent = String(friendScore);
      setFeedback(`${playerTwoName.textContent} solved it first! Loading the next shared puzzle...`, "success");
    } else {
      score += 1;
      scoreElement.textContent = String(score);
      playerOneScore.textContent = String(score);
      try {
        savePlayerScore(getPlayer(), score);
        setFeedback(
          playType === "friend"
            ? `${playerOneName.textContent} solved it first! Loading the next shared puzzle...`
            : getPlayer()?.role === "user"
              ? "That's right! Your best score is saved."
              : "That's right! Your guest best score is saved.",
          "success",
        );
        onScoreUpdated();
      } catch (error) {
        setFeedback(`Correct! Couldn't save your score: ${error.message}`, "error");
      }
    }
    updateControls();
    if (playType === "friend") {
      advanceTimeout = setTimeout(() => {
        advanceTimeout = null;
        loadPuzzle();
      }, 650);
      return;
    }
    nextButton.focus();
  }

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(answerInput);
  });
  playerOneForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(playerOneInput, 1);
  });
  playerTwoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(playerTwoInput, 2);
  });

  nextButton.addEventListener("click", loadPuzzle);

  return {
    selectPlayType(type) {
      if (type !== "single" && type !== "friend") return;
      this.reset("modes");
      playType = type;
      updateBattleDisplay();
    },
    reset(view = "modes") {
      puzzleRequestId += 1;
      clearAdvanceTimeout();
      stopTimer();
      currentPuzzle = null;
      currentMode = null;
      playType = "single";
      answered = false;
      loading = false;
      score = 0;
      friendScore = 0;
      scoreElement.textContent = "0";
      playerOneScore.textContent = "0";
      playerTwoScore.textContent = "0";
      gameCard.hidden = true;
      modeCard.hidden = view !== "modes";
      updateBattleDisplay();
      updateControls();
      onModeChange(view);
    },
  };
}
