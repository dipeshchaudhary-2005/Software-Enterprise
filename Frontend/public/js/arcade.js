// AI-assisted initial implementation by GitHub Copilot (2026-10-28); review and adapt before submission.
import { BOARD, createBreakoutState, stepBreakout } from "./breakout-engine.mjs";
import { savePlayerScore } from "./leaderboard.js";

export function initArcade({ getPlayer, onViewChange, onScoreUpdated }) {
  const card = document.querySelector("#arcade-card");
  const canvas = document.querySelector("#arcade-canvas");
  const context = canvas.getContext("2d");
  const feedback = document.querySelector("#arcade-feedback");
  const scoreElement = document.querySelector("#arcade-score");
  const livesElement = document.querySelector("#arcade-lives");
  const levelElement = document.querySelector("#arcade-level");
  const startButton = document.querySelector("#arcade-start-button");
  const pauseButton = document.querySelector("#arcade-pause-button");
  const restartButton = document.querySelector("#arcade-restart-button");
  const exitButton = document.querySelector("#arcade-exit-button");

  let state = createBreakoutState();
  let status = "ready";
  let frameId = null;
  let previousFrameTime = 0;
  let paddleDirection = 0;
  let pointerTarget = null;
  const pressedKeys = new Set();

  function syncHud() {
    scoreElement.textContent = String(state.score);
    livesElement.textContent = String(state.lives);
    levelElement.textContent = String(state.level);
    startButton.textContent = status === "over"
      ? "Play again"
      : status === "paused"
        ? "Resume"
        : status === "running"
          ? "Playing"
          : "Start game";
    startButton.disabled = status === "running";
    pauseButton.disabled = status !== "running";
  }

  function draw() {
    context.clearRect(0, 0, BOARD.width, BOARD.height);
    const background = context.createLinearGradient(0, 0, 0, BOARD.height);
    background.addColorStop(0, "#213f2c");
    background.addColorStop(1, "#14291f");
    context.fillStyle = background;
    context.fillRect(0, 0, BOARD.width, BOARD.height);

    state.bricks.forEach((brick) => {
      context.fillStyle = brick.row % 2 === 0 ? "#f5c84c" : "#c7a936";
      context.fillRect(brick.x, brick.y, brick.width, brick.height);
      context.fillStyle = "#705516";
      context.font = "16px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("🍌", brick.x + brick.width / 2, brick.y + brick.height / 2);
    });

    context.fillStyle = "#a9d28c";
    context.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);
    context.fillStyle = "#fff1a8";
    context.beginPath();
    context.arc(state.ball.x, state.ball.y, BOARD.ballRadius, 0, Math.PI * 2);
    context.fill();

    if (status !== "running") {
      context.fillStyle = "rgb(10 20 14 / 72%)";
      context.fillRect(0, 0, BOARD.width, BOARD.height);
      context.fillStyle = "#fff9e8";
      context.font = "700 26px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(
        status === "over" ? "Game over" : status === "paused" ? "Paused" : "Ready to play?",
        BOARD.width / 2,
        BOARD.height / 2,
      );
    }
  }

  function stopAnimation() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function saveScore() {
    if (state.score === 0) return;
    try {
      savePlayerScore(getPlayer(), state.score);
      onScoreUpdated();
    } catch (error) {
      feedback.textContent = `Score could not be saved: ${error.message}`;
      feedback.className = "arcade-feedback error";
    }
  }

  function finishGame() {
    status = "over";
    stopAnimation();
    feedback.textContent = `Game over — you scored ${state.score}.`;
    feedback.className = "arcade-feedback";
    saveScore();
    syncHud();
    draw();
  }

  function frame(timestamp) {
    if (status !== "running") return;
    const delta = previousFrameTime === 0 ? 0 : (timestamp - previousFrameTime) / 1000;
    previousFrameTime = timestamp;

    const events = stepBreakout(state, delta, {
      paddleDirection,
      paddleTarget: pointerTarget,
    });
    if (pointerTarget !== null) pointerTarget = null;

    if (events.lifeLost) {
      feedback.textContent = events.gameOver
        ? "That was your last life."
        : `${state.lives} ${state.lives === 1 ? "life" : "lives"} left. Serve again when ready.`;
      feedback.className = "arcade-feedback";
      if (events.gameOver) {
        finishGame();
        return;
      }
      status = "paused";
      stopAnimation();
    } else if (events.levelComplete) {
      feedback.textContent = `Level complete! Level ${state.level} is ready.`;
    }

    syncHud();
    draw();
    if (status === "running") frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (status === "running") return;
    if (status === "over") state = createBreakoutState();
    status = "running";
    feedback.textContent = "Break the banana blocks. Use the arrow keys, A/D, or move on the board.";
    feedback.className = "arcade-feedback";
    previousFrameTime = 0;
    syncHud();
    draw();
    frameId = requestAnimationFrame(frame);
  }

  function reset() {
    stopAnimation();
    if (state.score > 0) saveScore();
    state = createBreakoutState();
    status = "ready";
    paddleDirection = 0;
    pointerTarget = null;
    pressedKeys.clear();
    feedback.textContent = "Break all the banana blocks. Three lives per game.";
    feedback.className = "arcade-feedback";
    syncHud();
    draw();
  }

  function setPointerTarget(event) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0) return;
    pointerTarget = ((event.clientX - bounds.left) / bounds.width) * BOARD.width;
    if (status === "running") {
      state.paddle.x = Math.max(
        0,
        Math.min(BOARD.width - state.paddle.width, pointerTarget - state.paddle.width / 2),
      );
      draw();
    }
  }

  startButton.addEventListener("click", start);
  pauseButton.addEventListener("click", () => {
    if (status !== "running") return;
    status = "paused";
    stopAnimation();
    feedback.textContent = "Game paused. Resume when you are ready.";
    syncHud();
    draw();
  });
  restartButton.addEventListener("click", reset);
  exitButton.addEventListener("click", () => {
    reset();
    onViewChange("dashboard");
  });

  canvas.addEventListener("pointermove", setPointerTarget);
  canvas.addEventListener("pointerdown", (event) => {
    setPointerTarget(event);
    if (status === "ready" || status === "paused") start();
  });

  document.addEventListener("keydown", (event) => {
    if (card.hidden || !["ArrowLeft", "ArrowRight", "a", "A", "d", "D", " "].includes(event.key)) return;
    if (event.key === " ") {
      event.preventDefault();
      if (!event.repeat && status !== "running") start();
      return;
    }

    event.preventDefault();
    pressedKeys.add(event.key.toLowerCase());
    paddleDirection = (pressedKeys.has("arrowright") || pressedKeys.has("d") ? 1 : 0)
      - (pressedKeys.has("arrowleft") || pressedKeys.has("a") ? 1 : 0);
  });

  document.addEventListener("keyup", (event) => {
    pressedKeys.delete(event.key.toLowerCase());
    paddleDirection = (pressedKeys.has("arrowright") || pressedKeys.has("d") ? 1 : 0)
      - (pressedKeys.has("arrowleft") || pressedKeys.has("a") ? 1 : 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && status === "running") {
      status = "paused";
      pressedKeys.clear();
      paddleDirection = 0;
      pointerTarget = null;
      stopAnimation();
      feedback.textContent = "Game paused while this tab was hidden.";
      syncHud();
      draw();
    }
  });

  syncHud();
  draw();

  return {
    open() {
      reset();
      card.hidden = false;
      onViewChange("arcade");
    },
    reset,
  };
}
