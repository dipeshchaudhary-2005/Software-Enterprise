/**
 * game.js — Core Game Loop (Event-Driven Programming)
 *
 * This module implements the game's core loop using an event-driven architecture:
 *
 *   Event-Driven Programming examples in this file:
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │ Event Source       │ Event Type        │ Handler                      │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │ document           │ DOMContentLoaded  │ initGameListeners()          │
 *   │ document           │ keydown (Enter)   │ submitAnswer()               │
 *   │ answer-input       │ input             │ sanitiseInput()              │
 *   │ setInterval timer  │ tick (1s)         │ onTimerTick()                │
 *   │ <img>              │ load              │ onPuzzleImageLoaded()        │
 *   │ <img>              │ error             │ onPuzzleImageError()         │
 *   │ requestAnimationFrame│ frame           │ confetti animation           │
 *   │ btn-submit         │ click             │ submitAnswer()               │
 *   │ btn-quit           │ click             │ quitGame()                   │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * Interoperability:
 *   Puzzle data is fetched from api/banana.php (our PHP proxy) which itself
 *   calls the external Banana API (http://marcconrad.com/uob/banana/api.php).
 *   Communication uses HTTP GET with JSON responses.
 *
 * Identity integration:
 *   Registered users send an X-Session-Token; guests send their display name.
 *
 * Banana API reference:
 *   https://marcconrad.com/uob/banana/doc.php
 *   Response: { "question": "<image_url>", "solution": <int 0-9> }
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 */

'use strict';

// ── Game State Object ─────────────────────────────────────────────────────────
// Encapsulates all mutable game data in one place (state machine pattern).
// The game's behaviour is driven by changes to this state in response to events.
let gameState = null;

/** Factory: returns a fresh default game state */
function createInitialState() {
    return {
        active:          false,   // Is a game currently running?
        score:           0,       // Cumulative score this session
        lives:           3,       // Remaining lives (wrong/timeout loses one)
        questionNum:     0,       // Current question index (1-based display)
        totalQuestions:  10,      // Total questions per round
        currentSolution: null,    // The correct answer for the current puzzle
        timerInterval:   null,    // Reference to setInterval handle
        timeLeft:        30,      // Seconds remaining on current question
        maxTime:         30,      // Maximum time per question
        difficulty:      'medium',
        difficultyLocked: false,
        mode:            'single',
        players:         [],
        activePlayerIndex: 0,
        streak:          0,       // Current correct-answer streak
        bestStreak:      0,       // Best streak this session
        correctCount:    0,       // Total correct answers this session
        sessionLog:      []       // History: [{question, answer, correct, points, ...}]
    };
}

// ── Event Listeners Setup ─────────────────────────────────────────────────────
/**
 * Register global event listeners once the DOM is ready.
 * Event-driven: we respond to user input events (keyboard, input changes).
 */
document.addEventListener('DOMContentLoaded', function initGameListeners() {

    // ── Keyboard Event: Enter key submits answer ──────────────────────────────
    // This is an event listener on the 'keydown' event — a core example of
    // event-driven programming: the game responds to user keyboard input.
    document.addEventListener('keydown', function onKeyDown(event) {
        if (event.key !== 'Enter') return;
        if (!gameState || !gameState.active) return;

        const feedbackVisible = !document.getElementById('feedback-overlay').classList.contains('hidden');
        if (!feedbackVisible) {
            submitAnswer(); // Event triggers game action
        }
    });

    // ── Input Event: sanitise answer field ───────────────────────────────────
    // Fires on every keystroke in the answer input.
    // Event-driven: restricts the field to single digits 0–9 in real time.
    const answerInput = document.getElementById('answer-input');
    if (answerInput) {
        answerInput.addEventListener('input', function sanitiseInput() {
            let val = this.value;
            // Strip non-digit characters
            val = val.replace(/[^0-9]/g, '');
            // Keep only the last digit typed
            if (val.length > 1) val = val.slice(-1);
            this.value = val;
        });
    }
});

// ── Game Lifecycle ────────────────────────────────────────────────────────────

/**
 * Start a new game round.
 * Resets all state, switches to the game view, and loads the first question.
 * Event-driven entry point: called by the "Play Now" button click event.
 */
function openDifficultyPicker() {
    closeModal();
    const error = document.getElementById('difficulty-error');
    error.classList.add('hidden');
    if (document.getElementById('player-mode-select').value === 'friend'
        && !document.getElementById('friend-name').value.trim()) {
        window.alert("Enter your friend's name before starting friend mode.");
        document.getElementById('friend-name').focus();
        return;
    }
    document.getElementById('difficulty-modal').classList.remove('hidden');
    document.querySelector('#difficulty-modal .difficulty-choice').focus();
}

function closeDifficultyPicker(event) {
    if (event && event.target !== document.getElementById('difficulty-modal')) return;
    document.getElementById('difficulty-modal').classList.add('hidden');
}

async function startGame(difficulty) {
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        openDifficultyPicker();
        return;
    }

    gameState = createInitialState();
    const mode = document.getElementById('player-mode-select').value;
    const friendName = document.getElementById('friend-name').value.trim();
    if (mode === 'friend' && (!friendName || friendName.length > 24)) {
        const error = document.getElementById('difficulty-error');
        error.textContent = "Enter your friend's name before starting friend mode.";
        error.classList.remove('hidden');
        return;
    }

    gameState.difficulty = difficulty;
    gameState.mode = mode;
    gameState.maxTime = { easy: 30, medium: 45, hard: 60 }[difficulty] || 45;
    gameState.timeLeft = gameState.maxTime;
    gameState.players = [{
        name: currentDisplayName || currentUser || 'Player 1',
        score: 0,
        lives: 3,
        streak: 0,
        bestStreak: 0,
        correctCount: 0
    }];
    if (mode === 'friend') {
        gameState.players.push({
            name: friendName,
            score: 0,
            lives: 3,
            streak: 0,
            bestStreak: 0,
            correctCount: 0
        });
    }
    gameState.activePlayerIndex = 0;
    restoreActivePlayerState();
    gameState.active = true;
    document.getElementById('game-difficulty-select').value = difficulty;
    document.getElementById('game-difficulty-select').disabled = false;
    closeDifficultyPicker();

    showView('game');
    updateHUD();
    updateTimerBar();
    await loadNextQuestion();
}

/**
 * Load the next puzzle from the Banana API via our PHP proxy.
 *
 * Interoperability demonstration:
 *   1. JavaScript → HTTP GET → api/banana.php (our PHP proxy)
 *   2. api/banana.php → HTTP GET (cURL) → Banana API (external)
 *   3. Banana API → JSON response → api/banana.php
 *   4. api/banana.php → JSON response → JavaScript
 *
 * The puzzle image URL is then loaded into an <img> element.
 * Two more events fire: img.onload and img.onerror (event-driven).
 */
async function loadNextQuestion() {
    if (!gameState || !gameState.active) return;
    const round = gameState;
    // Check if we've completed all questions
    if (gameState.questionNum >= gameState.totalQuestions) {
        await endGame();
        return;
    }

    gameState.questionNum++;
    gameState.currentSolution = null;
    gameState.difficultyLocked = false;
    document.getElementById('game-difficulty-select').disabled = false;

    // Show loading state, reset UI
    const loadingEl  = document.getElementById('puzzle-loading');
    const puzzleImg  = document.getElementById('puzzle-image');
    const answerInput = document.getElementById('answer-input');
    const submitBtn  = document.getElementById('btn-submit');

    loadingEl.style.display = 'flex';
    loadingEl.innerHTML     = '<div class="spinner"></div><p>Fetching puzzle from Banana API...</p>';
    puzzleImg.classList.add('hidden');
    answerInput.value       = '';
    submitBtn.disabled      = true;
    updateHUD();

    try {
        const data = await fetchBananaPuzzle();
        if (gameState !== round || !round.active) return;
        gameState.currentSolution = data.solution;

        // ── Event: Image load event ───────────────────────────────────────────
        // Once the puzzle image has fully downloaded, we show it and start the timer.
        // img.onload is an event handler — event-driven programming.
        puzzleImg.onload = onPuzzleImageLoaded;

        // ── Event: Image error event ──────────────────────────────────────────
        // If the image fails to load, we retry.
        puzzleImg.onerror = onPuzzleImageError;

        // Trigger the image load by setting the src (fires load/error events)
        puzzleImg.src = data.question;

    } catch (error) {
        if (gameState !== round || !round.active) return;
        console.error('[game] Failed to load question:', error);
        loadingEl.replaceChildren();
        const title = document.createElement('p');
        title.style.color = 'var(--danger)';
        title.textContent = '⚠️ Failed to load puzzle';
        const reason = document.createElement('p');
        reason.style.cssText = 'font-size:0.82rem;color:var(--text-dim)';
        reason.textContent = error.message;
        const help = document.createElement('p');
        help.style.cssText = 'font-size:0.82rem;color:var(--text-dim)';
        help.textContent = 'Check your internet connection and try again.';
        loadingEl.append(title, reason, help);
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'btn-secondary';
        retry.textContent = 'Retry puzzle';
        retry.addEventListener('click', () => {
            if (gameState === round && round.active) round.questionNum--;
            loadNextQuestion();
        }, { once: true });
        loadingEl.appendChild(retry);
    }
}

async function fetchBananaPuzzle() {
    let proxyError;
    const token = localStorage.getItem('bb_token');
    const headers = token
        ? { 'X-Session-Token': token }
        : { 'X-Guest-Name': currentUser || '' };

    try {
        const response = await fetch('api/banana.php', { headers, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Puzzle proxy returned HTTP ${response.status}`);
        }
        return normalizePuzzle(data);
    } catch (error) {
        proxyError = error;
        console.warn('[game] PHP puzzle proxy unavailable; trying the official API directly:', error.message);
    }

    try {
        const response = await fetch('https://marcconrad.com/uob/banana/api.php?out=json&base64=yes', {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Banana API returned HTTP ${response.status}`);
        return normalizePuzzle(await response.json(), true);
    } catch (directError) {
        throw new Error(`Puzzle service unavailable. Proxy: ${proxyError.message}. Banana API: ${directError.message}.`);
    }
}

function normalizePuzzle(data, questionIsBase64 = false) {
    if (!data || typeof data.question !== 'string' || data.question.length === 0 || data.question.length > 2000000) {
        throw new Error('Banana API returned an invalid puzzle image.');
    }
    const solution = Number(data.solution);
    if (!Number.isInteger(solution) || solution < 0 || solution > 9) {
        throw new Error('Banana API returned an invalid puzzle answer.');
    }

    let question = data.question;
    if (questionIsBase64) {
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(question)) {
            throw new Error('Banana API returned an invalid base64 image.');
        }
        try {
            const binary = atob(question);
            const isPng = binary.startsWith('\x89PNG\r\n\x1a\n');
            const isJpeg = binary.startsWith('\xff\xd8\xff');
            const isGif = binary.startsWith('GIF8');
            const isWebp = binary.startsWith('RIFF') && binary.slice(8, 12) === 'WEBP';
            const mimeType = isPng ? 'image/png' : isJpeg ? 'image/jpeg' : isGif ? 'image/gif' : isWebp ? 'image/webp' : null;
            if (!mimeType) throw new Error('Unsupported image format.');
            question = `data:${mimeType};base64,${question}`;
        } catch (error) {
            throw new Error(`Banana API image could not be decoded: ${error.message}`);
        }
    }

    return { question, solution };
}

/**
 * Event handler: fires when the puzzle image finishes loading.
 * Shows the image and starts the countdown timer.
 * This is an event-driven callback registered on the img element.
 */
function onPuzzleImageLoaded() {
    if (!gameState || !gameState.active) return;
    const loadingEl  = document.getElementById('puzzle-loading');
    const puzzleImg  = document.getElementById('puzzle-image');
    const submitBtn  = document.getElementById('btn-submit');
    const answerInput = document.getElementById('answer-input');

    loadingEl.style.display = 'none';
    puzzleImg.classList.remove('hidden');
    submitBtn.disabled = false;

    // Focus the answer input so user can type immediately
    answerInput.focus();

    document.getElementById('game-turn-indicator').textContent =
        `${getActivePlayer().name} · ${gameState.difficulty[0].toUpperCase()}${gameState.difficulty.slice(1)}`;
    startTimer();
}

/**
 * Event handler: fires if the puzzle image fails to load.
 * Retries loading a new question after a short delay.
 */
function onPuzzleImageError() {
    if (!gameState || !gameState.active) return;
    console.warn('[game] Puzzle image failed to load. Retrying...');
    document.getElementById('puzzle-loading').innerHTML =
        '<p style="color:var(--danger)">⚠️ Image error. Retrying...</p>';

    const round = gameState;
    // Retry the same question after a short delay.
    setTimeout(() => {
        if (gameState !== round || !round.active) return;
        round.questionNum--;
        loadNextQuestion();
    }, 2000);
}

// ── Timer (Timer-Based Event-Driven Programming) ──────────────────────────────

/**
 * Start the per-question countdown timer.
 *
 * setInterval() creates a recurring timer event that fires every 1 second.
 * Each tick calls onTimerTick() — this is a core event-driven programming pattern.
 * When the timer reaches 0, it fires the timeout event handler (handleTimeout).
 */
function startTimer() {
    if (!gameState || !gameState.active) return;
    // Clear any previously running timer before starting a new one
    stopTimer();

    gameState.timeLeft = gameState.maxTime;
    updateTimerBar();

    // ── Timer Event: setInterval registers a repeating timed event ───────────
    // The callback (onTimerTick) is called every 1000ms (1 second).
    // This is event-driven: the passage of time triggers state changes.
    gameState.timerInterval = setInterval(onTimerTick, 1000);
}

/**
 * Timer event handler — called once per second by setInterval.
 * Decrements the timer and checks for timeout.
 */
function onTimerTick() {
    gameState.timeLeft--;
    updateTimerBar();

    if (gameState.timeLeft <= 0) {
        stopTimer(); // Cancel the repeating timer event
        handleTimeout(); // Fire the timeout event handler
    }
}

/** Stop the current timer by clearing the interval handle */
function stopTimer() {
    if (gameState.timerInterval !== null) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

/**
 * Update the visual timer bar and text.
 * Called on every timer tick — reactive UI update in response to an event.
 */
function updateTimerBar() {
    const pct     = (gameState.timeLeft / gameState.maxTime) * 100;
    const bar     = document.getElementById('timer-bar');
    const text    = document.getElementById('timer-text');
    const container = document.querySelector('.timer-bar-container');
    const danger  = gameState.timeLeft <= 10;

    container.setAttribute('aria-valuemax', String(gameState.maxTime));
    container.setAttribute('aria-valuenow', String(gameState.timeLeft));
    bar.style.width = pct + '%';
    text.textContent = gameState.timeLeft + 's';
    bar.classList.toggle('danger', danger);
    text.style.color = danger ? 'var(--danger)' : 'var(--text-dim)';
}

function changeGameDifficulty(difficulty) {
    const timeByDifficulty = { easy: 30, medium: 45, hard: 60 };
    if (!gameState || !gameState.active || gameState.difficultyLocked || !timeByDifficulty[difficulty]) {
        if (gameState) document.getElementById('game-difficulty-select').value = gameState.difficulty;
        return;
    }

    gameState.difficulty = difficulty;
    gameState.maxTime = timeByDifficulty[difficulty];
    document.getElementById('game-turn-indicator').textContent =
        `${getActivePlayer().name} · ${difficulty[0].toUpperCase()}${difficulty.slice(1)}`;

    if (gameState.timerInterval !== null) {
        startTimer();
    } else {
        gameState.timeLeft = gameState.maxTime;
        updateTimerBar();
    }
}

function getActivePlayer() {
    return gameState.players[gameState.activePlayerIndex];
}

function restoreActivePlayerState() {
    const player = getActivePlayer();
    gameState.score = player.score;
    gameState.lives = player.lives;
    gameState.streak = player.streak;
    gameState.bestStreak = player.bestStreak;
    gameState.correctCount = player.correctCount;
}

function saveActivePlayerState() {
    const player = getActivePlayer();
    player.score = gameState.score;
    player.lives = gameState.lives;
    player.streak = gameState.streak;
    player.bestStreak = gameState.bestStreak;
    player.correctCount = gameState.correctCount;
}

function roundIsOver() {
    return gameState.questionNum >= gameState.totalQuestions
        || gameState.players.every(player => player.lives <= 0);
}

function advanceTurn() {
    if (gameState.mode !== 'friend') return;
    for (let offset = 1; offset <= gameState.players.length; offset++) {
        const index = (gameState.activePlayerIndex + offset) % gameState.players.length;
        if (gameState.players[index].lives > 0) {
            gameState.activePlayerIndex = index;
            restoreActivePlayerState();
            return;
        }
    }
}

function continueRound() {
    hideFeedback();
    if (roundIsOver()) {
        endGame();
        return;
    }
    advanceTurn();
    updateHUD();
    loadNextQuestion();
}

// ── Answer Submission ─────────────────────────────────────────────────────────

/**
 * Handle answer submission.
 *
 * Event-driven: triggered by:
 *   - The Submit button's 'click' event (onclick="submitAnswer()")
 *   - The 'keydown' Enter event registered in initGameListeners()
 *
 * Evaluates the player's input against the stored solution,
 * updates score and lives, then shows feedback.
 */
function submitAnswer() {
    if (!gameState || !gameState.active || gameState.currentSolution === null) return;

    const answerInput = document.getElementById('answer-input');
    const rawValue    = answerInput.value.trim();

    // Require a value — shake input if empty
    if (rawValue === '') {
        answerInput.classList.add('shake');
        // Event: animationend could clean up, but setTimeout is simpler here
        setTimeout(() => answerInput.classList.remove('shake'), 480);
        return;
    }

    stopTimer(); // Stop the countdown timer
    gameState.difficultyLocked = true;
    document.getElementById('game-difficulty-select').disabled = true;

    const playerAnswer = parseInt(rawValue, 10);
    const isCorrect    = playerAnswer === gameState.currentSolution;

    // ── Score calculation ─────────────────────────────────────────────────────
    // Points are awarded for correct answers, weighted by time remaining.
    // Faster answers earn more points (encourages speed).
    const timeBonus    = isCorrect ? Math.round((gameState.timeLeft / gameState.maxTime) * 100) : 0;
    const basePoints   = isCorrect ? 50 : 0;
    const streakBonus  = (isCorrect && gameState.streak >= 2) ? (gameState.streak - 1) * 10 : 0;
    const totalPoints  = basePoints + timeBonus + streakBonus;

    // ── Update state based on answer ──────────────────────────────────────────
    if (isCorrect) {
        gameState.score        += totalPoints;
        gameState.streak++;
        gameState.bestStreak    = Math.max(gameState.bestStreak, gameState.streak);
        gameState.correctCount++;
    } else {
        gameState.streak = 0;    // Break the streak
        gameState.lives--;       // Lose a life
    }
    saveActivePlayerState();

    // Log this attempt to the session history
    gameState.sessionLog.push({
        questionNum: gameState.questionNum,
        answer:      playerAnswer,
        solution:    gameState.currentSolution,
        correct:     isCorrect,
        points:      totalPoints,
        timeUsed:    gameState.maxTime - gameState.timeLeft
    });

    updateHUD();
    showFeedback(isCorrect, totalPoints, gameState.currentSolution);

    // ── Check for game-over conditions ────────────────────────────────────────
    setTimeout(continueRound, 1800);
}

/**
 * Handle timer timeout.
 *
 * Event-driven: this is the handler for the timer expiry event (fired by onTimerTick).
 * Player loses a life; correct answer is revealed.
 */
function handleTimeout() {
    if (!gameState.active) return;

    // Timeout = wrong — reset streak, lose a life
    gameState.streak = 0;
    gameState.lives--;
    gameState.difficultyLocked = true;
    document.getElementById('game-difficulty-select').disabled = true;
    saveActivePlayerState();

    gameState.sessionLog.push({
        questionNum: gameState.questionNum,
        answer:      null,
        solution:    gameState.currentSolution,
        correct:     false,
        points:      0,
        timeUsed:    gameState.maxTime,
        timeout:     true
    });

    updateHUD();
    showFeedback(false, 0, gameState.currentSolution, /* timeout */ true);

    setTimeout(continueRound, 1800);
}

// ── Feedback Overlay ──────────────────────────────────────────────────────────

/**
 * Show the correct/wrong feedback overlay.
 * @param {boolean} correct    Was the answer correct?
 * @param {number}  points     Points earned (0 if wrong)
 * @param {number}  solution   The correct answer
 * @param {boolean} timeout    Was this a timeout (not a wrong answer)?
 */
function showFeedback(correct, points, solution, timeout = false) {
    const overlay  = document.getElementById('feedback-overlay');
    const card     = document.getElementById('feedback-card');
    const icon     = document.getElementById('feedback-icon');
    const text     = document.getElementById('feedback-text');
    const pointsEl = document.getElementById('feedback-points');

    overlay.classList.remove('hidden');
    card.className = 'feedback-card ' + (correct ? 'correct' : 'wrong');

    if (correct) {
        icon.textContent = '🎉';
        text.textContent = gameState.streak > 2 ? `${gameState.streak}x Streak! 🔥` : 'Correct!';
        pointsEl.textContent = `+${points} points`;
        launchConfetti(); // Celebrate with confetti (canvas animation event loop)
    } else if (timeout) {
        icon.textContent = '⏰';
        text.textContent = "Time's up!";
        pointsEl.textContent = `The answer was ${solution}`;
    } else {
        icon.textContent = '❌';
        text.textContent = 'Wrong!';
        pointsEl.textContent = `The answer was ${solution}`;
    }
}

function hideFeedback() {
    document.getElementById('feedback-overlay').classList.add('hidden');
}

// ── HUD Update ────────────────────────────────────────────────────────────────

/** Update all HUD elements to reflect current game state */
function updateHUD() {
    const hearts = '❤️'.repeat(Math.max(0, gameState.lives)) +
                   '🖤'.repeat(Math.max(0, 3 - gameState.lives));

    document.getElementById('game-lives').textContent      = hearts;
    document.getElementById('game-score').textContent      = gameState.score;
    document.getElementById('game-question-num').textContent = gameState.questionNum;
    document.getElementById('game-turn-indicator').textContent =
        `${getActivePlayer().name} · ${gameState.difficulty[0].toUpperCase()}${gameState.difficulty.slice(1)}`;
}

// ── Game End ──────────────────────────────────────────────────────────────────

/**
 * End the current game round.
 * Saves score to the PHP backend, then shows the game-over screen.
 */
async function endGame() {
    if (!gameState || !gameState.active) return;
    const completedGame = gameState;
    gameState.active = false;
    stopTimer();

    // Save score via PHP leaderboard API (interoperability)
    if (gameState.score > 0 && gameState.mode === 'single' && currentRole !== 'guest') {
        await saveScore(gameState.score, gameState.correctCount, gameState.bestStreak);
    }
    if (gameState !== completedGame || !document.getElementById('view-game').classList.contains('active')) return;

    const winner = gameState.players.reduce((best, player) => player.score > best.score ? player : best);
    const isDraw = gameState.mode === 'friend'
        && gameState.players.every(player => player.score === gameState.players[0].score);
    const perfect = winner.correctCount === gameState.totalQuestions;
    const great = winner.score >= 600;

    document.getElementById('gameover-icon').textContent  = perfect ? '🏆' : great ? '⭐' : '🎯';
    document.getElementById('gameover-title').textContent =
        gameState.mode === 'friend' ? isDraw ? "It's a draw!" : `${winner.name} wins!` : perfect ? 'Perfect Round!' : great ? 'Great Score!' : 'Game Over!';
    document.getElementById('gameover-sub').textContent =
        gameState.mode === 'friend' ? 'Friend match results:' : currentRole === 'guest' ? `Guest round for ${currentUser}.` : "Here's how you did:";
    document.getElementById('go-score').textContent = winner.score;
    document.getElementById('go-correct').textContent = `${winner.correctCount}/${gameState.totalQuestions}`;
    document.getElementById('go-streak').textContent = winner.bestStreak;
    const friendResults = document.getElementById('friend-results');
    friendResults.classList.toggle('hidden', gameState.mode !== 'friend');
    friendResults.innerHTML = gameState.mode === 'friend'
        ? gameState.players.map(player =>
            `<div><strong>${escapeHtml(player.name)}</strong>: ${player.score.toLocaleString()} points · ${player.correctCount} correct · ${player.lives} lives left</div>`
        ).join('')
        : '';

    showView('gameover');
}

/**
 * Quit the current game and return to the menu.
 * Event-driven: triggered by the quit button's click event.
 */
function quitGame() {
    stopTimer();
    if (gameState) gameState.active = false;
    document.getElementById('game-difficulty-select').disabled = true;
    document.getElementById('friend-results').classList.add('hidden');
    showView('menu');
    loadMenuStats();
}

// ── Confetti (Canvas Animation — Event-Driven via requestAnimationFrame) ───────

/**
 * Launch a confetti burst on the canvas when the player gets a correct answer.
 *
 * Uses requestAnimationFrame — a browser event that fires before each repaint.
 * Each frame event moves the particles and redraws them — this is event-driven
 * animation: the browser drives the loop by firing frame events.
 */
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx    = canvas.getContext('2d');

    // Size the canvas to fill the viewport
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create a burst of colourful particles
    const colours   = ['#ffd700', '#ffffff', '#4ade80', '#f472b6', '#60a5fa', '#fb923c'];
    const particles = Array.from({ length: 90 }, () => ({
        x:       Math.random() * canvas.width,
        y:       -10 - Math.random() * 80,
        vx:      (Math.random() - 0.5) * 7,
        vy:      Math.random() * 5 + 3,
        color:   colours[Math.floor(Math.random() * colours.length)],
        w:       Math.random() * 9 + 4,
        h:       Math.random() * 5 + 3,
        rot:     Math.random() * 360,
        rotVel:  (Math.random() - 0.5) * 12
    }));

    let frameCount = 0;
    const MAX_FRAMES = 65;

    // ── requestAnimationFrame event loop ─────────────────────────────────────
    // The browser fires this callback before each screen repaint (~60fps).
    // This is event-driven: each 'frame' event causes us to redraw the particles.
    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            // Physics update
            p.x   += p.vx;
            p.y   += p.vy;
            p.rot += p.rotVel;
            p.vy  += 0.15; // Gravity

            // Draw rotated rectangle
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.globalAlpha = Math.max(0, 1 - frameCount / MAX_FRAMES);
            ctx.fillStyle   = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        frameCount++;
        if (frameCount < MAX_FRAMES) {
            requestAnimationFrame(drawFrame); // Request next frame event
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clean up
        }
    }

    requestAnimationFrame(drawFrame); // Start the animation event loop
}
