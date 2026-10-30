/**
 * leaderboard.js — Score Management & Leaderboard Display
 *
 * Handles:
 *   - Saving completed game scores to the PHP backend
 *   - Loading and displaying the global and personal leaderboards
 *   - Fetching per-user stats for the menu screen
 *
 * Interoperability:
 *   All operations communicate with api/leaderboard.php via HTTP/JSON.
 *   The same PHP endpoints could serve a mobile app, desktop app, or any
 *   other client — demonstrating system-neutral interoperability.
 *
 * Virtual Identity:
 *   All save operations are authenticated — the session token links the
 *   score to the user's virtual identity. The 'mine' leaderboard mode
 *   filters scores to the current authenticated user only.
 *
 * Event-driven:
 *   - Tab button click events trigger loadLeaderboard()
 *   - Refresh button click event triggers loadLeaderboard()
 *   - View navigation event (showView('leaderboard')) triggers loadLeaderboard()
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 * PHP Backend: api/leaderboard.php
 */

'use strict';

// ── State: track which leaderboard tab is currently showing ───────────────────
let currentLbMode = 'global';

/**
 * Save a completed game's score to the server.
 *
 * Interoperability: HTTP POST to api/leaderboard.php with JSON body.
 * Virtual Identity: token in header ties the score to the user's account.
 *
 * Called by game.js → endGame() after each completed round.
 *
 * @param {number} score   Final score for the round
 * @param {number} correct Number of correct answers
 * @param {number} streak  Best answer streak achieved
 */
async function saveScore(score, correct, streak) {
    const token = localStorage.getItem('bb_token');
    if (!token) {
        console.warn('[leaderboard] Cannot save score: no session token.');
        return;
    }

    try {
        // Interoperability: HTTP POST with JSON to PHP backend
        const response = await fetch('api/leaderboard.php?action=save', {
            method:  'POST',
            headers: {
                'Content-Type':    'application/json',
                'X-Session-Token': token          // Virtual Identity: authenticate request
            },
            body: JSON.stringify({ score, correct, streak })
        });

        const data = await response.json();
        if (!data.success) {
            console.warn('[leaderboard] Score save failed:', data.message);
        }
    } catch (error) {
        // Non-critical: if this fails the game still works
        console.warn('[leaderboard] Could not save score (server unreachable):', error.message);
    }
}

/**
 * Load and render leaderboard entries.
 *
 * Interoperability: HTTP GET to api/leaderboard.php returns JSON array of scores.
 * Virtual Identity: 'mine' mode fetches only the current user's scores.
 *
 * Event-driven: called by:
 *   - Tab button click events (global / my scores tabs)
 *   - Refresh button click event
 *   - showView('leaderboard') navigation event in app.js
 *
 * @param {'global' | 'mine'} mode  Which set of scores to display
 */
async function loadLeaderboard(mode = 'global') {
    currentLbMode = mode;

    // Update active tab button state
    const tabGlobal = document.getElementById('lb-tab-global');
    const tabMine   = document.getElementById('lb-tab-mine');
    if (tabGlobal) tabGlobal.classList.toggle('active', mode === 'global');
    if (tabMine)   tabMine.classList.toggle('active',   mode === 'mine');

    const list = document.getElementById('lb-list');
    if (!list) return;

    list.innerHTML = '<div class="lb-loading">⏳ Loading scores...</div>';

    const token = localStorage.getItem('bb_token');

    try {
        // Interoperability: HTTP GET to PHP leaderboard endpoint
        // The 'mode' query param tells the server which dataset to return
        const response = await fetch(`api/leaderboard.php?action=get&mode=${mode}`, {
            headers: { 'X-Session-Token': token || '' }
        });

        const data = await response.json();

        if (!data.success) {
            list.innerHTML = `<div class="lb-loading">⚠️ ${data.message}</div>`;
            return;
        }

        const entries = data.entries;

        if (!entries || entries.length === 0) {
            const msg = mode === 'mine'
                ? "You haven't played any games yet. Play now to get on the board!"
                : 'No scores yet. Be the first to play!';
            list.innerHTML = `<div class="lb-loading">${msg}</div>`;
            return;
        }

        // ── Render leaderboard entries ────────────────────────────────────────
        list.innerHTML = '';

        entries.forEach((entry, index) => {
            const rank      = index + 1;
            const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            const isMe      = entry.username === currentUser;
            const displayName = entry.display_name || entry.username;

            const entryEl = document.createElement('div');
            entryEl.className = 'lb-entry' + (isMe ? ' mine' : '');
            entryEl.setAttribute('aria-label', `Rank ${rank}: ${displayName} — ${entry.score} points`);

            entryEl.innerHTML = `
                <span class="lb-rank rank-${Math.min(rank, 4)}">${rankLabel}</span>
                <span class="lb-user">${escapeHtml(displayName)}${isMe ? ' 👤' : ''}</span>
                <div class="lb-right">
                    <div class="lb-score">${entry.score.toLocaleString()} pts</div>
                    <div class="lb-date">${escapeHtml(entry.date || '')}</div>
                </div>
            `;

            // Stagger the animation of each entry for a polished effect
            entryEl.style.animationDelay = (index * 0.05) + 's';
            list.appendChild(entryEl);
        });

    } catch (error) {
        list.innerHTML = `<div class="lb-loading">⚠️ Could not load scores: ${escapeHtml(error.message)}</div>`;
        console.error('[leaderboard] Load error:', error);
    }
}

/**
 * Load the current user's personal stats for the menu screen.
 *
 * Interoperability: HTTP GET to api/leaderboard.php?action=stats
 * Virtual Identity: stats are specific to the authenticated user
 *
 * Updates the menu's best-score, games-played, and global-rank displays.
 */
async function loadMenuStats() {
    const token = localStorage.getItem('bb_token');
    if (!token || !currentUser) return;

    // Update the username display in the menu badge
    const usernameEl = document.getElementById('menu-username');
    if (usernameEl) usernameEl.textContent = currentUser;

    try {
        // Interoperability: fetch user stats from PHP backend
        const response = await fetch('api/leaderboard.php?action=stats', {
            headers: { 'X-Session-Token': token }
        });

        const data = await response.json();

        if (data.success) {
            const bestEl  = document.getElementById('stat-best');
            const gamesEl = document.getElementById('stat-games');
            const rankEl  = document.getElementById('stat-rank');

            if (bestEl)  bestEl.textContent  = data.bestScore   > 0 ? data.bestScore.toLocaleString() : '—';
            if (gamesEl) gamesEl.textContent = data.gamesPlayed > 0 ? data.gamesPlayed                : '—';
            if (rankEl)  rankEl.textContent  = data.rank        ? `#${data.rank}`                      : '—';
        }
    } catch (error) {
        // Stats are non-critical; fail silently
        console.warn('[leaderboard] Could not load stats:', error.message);
    }
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS when inserting user data into the DOM.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}
