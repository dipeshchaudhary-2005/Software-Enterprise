const API_URL = "https://marcconrad.com/uob/banana/api.php?out=json&base64=no";

const scoreElement = document.querySelector("#score");
const puzzleImage = document.querySelector("#puzzle-image");
const puzzlePlaceholder = document.querySelector("#puzzle-placeholder");
const feedback = document.querySelector("#feedback");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer");
const submitButton = document.querySelector("#submit-button");
const nextButton = document.querySelector("#next-button");

let currentPuzzle = null;
let score = 0;
let answered = false;
let loading = false;

function setFeedback(message, type = "") {
  feedback.textContent = message;
  feedback.className = `feedback${type ? ` ${type}` : ""}`;
}

function updateControls() {
  answerInput.disabled = loading || !currentPuzzle || answered;
  submitButton.disabled = loading || !currentPuzzle || answered;
  nextButton.disabled = loading;
  nextButton.textContent = loading ? "Loading puzzle..." : currentPuzzle && !answered ? "Skip this puzzle" : "Next puzzle";
}

async function loadPuzzle() {
  if (loading) return;

  loading = true;
  currentPuzzle = null;
  answered = false;
  puzzleImage.hidden = true;
  puzzlePlaceholder.hidden = false;
  answerInput.value = "";
  setFeedback("Getting your next puzzle...");
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
      || !Number.isInteger(puzzle.solution)
      || puzzle.solution < 0
      || puzzle.solution > 9
    ) {
      throw new Error("The puzzle service returned an invalid puzzle.");
    }

    currentPuzzle = {
      imageUrl: puzzle.question,
      solution: puzzle.solution,
    };
    puzzleImage.src = currentPuzzle.imageUrl;
    puzzleImage.hidden = false;
    puzzlePlaceholder.hidden = true;
    setFeedback("Puzzle ready. Enter a number from 0 to 9.");
  } catch (error) {
    currentPuzzle = null;
    puzzlePlaceholder.hidden = false;
    setFeedback(`${error.message} Check your connection and try again.`, "error");
  } finally {
    loading = false;
    updateControls();
    if (currentPuzzle) answerInput.focus();
  }
}

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
  if (answer === currentPuzzle.solution) {
    score += 1;
    scoreElement.textContent = String(score);
    setFeedback("That's right! Nice one.", "success");
  } else {
    setFeedback(`Not quite — the answer was ${currentPuzzle.solution}.`, "error");
  }
  updateControls();
  nextButton.focus();
});

nextButton.addEventListener("click", loadPuzzle);

puzzleImage.addEventListener("error", () => {
  puzzleImage.hidden = true;
  puzzlePlaceholder.hidden = false;
  currentPuzzle = null;
  setFeedback("Couldn't load the puzzle image. Try getting another puzzle.", "error");
  updateControls();
});

loadPuzzle();
