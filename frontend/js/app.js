/**
 * app.js — Application Router & Global Utilities
 *
 * This is the top-level controller for BananaBrain. It handles:
 *   - View routing: switching between the auth, menu, game, gameover, and
 *     leaderboard views in response to navigation events
 *   - Modal management
 *   - Background particle animation
 *   - Global event listeners (Escape key, window resize)
 *
 * Event-driven:
 *   - showView() is called in response to button click events throughout the app
 *   - 'keydown' event closes modals when Escape is pressed
 *   - 'resize' event keeps the confetti canvas sized to the viewport
 *   - requestAnimationFrame drives the floating background animation
 *
 * Version Control note:
 *   This file acts as the entry point / main controller — analogous to
 *   the 'main' module in a modular software architecture. Separating the
 *   application into dedicated files (auth.js, game.js, leaderboard.js, app.js)
 *   supports version control best practices: each file has a single responsibility,
 *   making commits focused and diffs easier to review.
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 */

'use strict';

// ── View Router ───────────────────────────────────────────────────────────────

/**
 * Navigate to a named view.
 *
 * Event-driven: this function is called in response to button click events
 * (e.g., "Play Now", "Back", "Leaderboard") and auth state changes.
 *
 * Only one view is visible at a time. The transition is animated via CSS.
 *
 * @param {'auth' | 'menu' | 'game' | 'gameover' | 'leaderboard' | 'admin'} viewName
 */
function showView(viewName) {
    if (currentRole === 'admin' && ['game', 'gameover'].includes(viewName)) {
        showView('admin');
        return;
    }
    if (viewName === 'admin' && currentRole !== 'admin') {
        showView(currentRole ? 'menu' : 'auth');
        return;
    }
    if (viewName === 'leaderboard' && currentRole === 'guest') {
        showView('menu');
        return;
    }

    // Hide all views by removing the 'active' class
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show the target view
    const target = document.getElementById('view-' + viewName);
    if (!target) {
        console.error('[app] Unknown view:', viewName);
        return;
    }

    target.classList.add('active');

    // ── Side effects for specific views ──────────────────────────────────────
    switch (viewName) {
        case 'leaderboard':
            // Load leaderboard data when navigating to this view
            // This is event-driven: the navigation event triggers a data fetch
            loadLeaderboard(currentLbMode || 'global');
            break;

        case 'menu':
            // Refresh personal stats when returning to the menu
            loadMenuStats();
            break;

        case 'admin':
            loadAdminDashboard();
            break;

        case 'auth':
            // Reset auth forms when returning to the auth screen
            const loginForm    = document.getElementById('form-login');
            const registerForm = document.getElementById('form-register');
            if (loginForm)    loginForm.reset();
            if (registerForm) registerForm.reset();
            break;
    }
}

function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('bb_theme', nextTheme);
    const button = document.getElementById('theme-toggle');
    button.textContent = nextTheme === 'light' ? '🌙 Dark' : '☀️ Light';
    button.setAttribute('aria-label', `Switch to ${nextTheme === 'light' ? 'dark' : 'light'} mode`);
}

document.documentElement.dataset.theme = localStorage.getItem('bb_theme') === 'light' ? 'light' : 'dark';

document.addEventListener('DOMContentLoaded', function initializeThemeButton() {
    const button = document.getElementById('theme-toggle');
    if (button) {
        const isLight = document.documentElement.dataset.theme === 'light';
        button.textContent = isLight ? '🌙 Dark' : '☀️ Light';
        button.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
    }
});

// ── Modal Management ──────────────────────────────────────────────────────────

/** Show the "How to Play" modal */
function showHowToPlay() {
    const modal = document.getElementById('how-to-play-modal');
    if (modal) modal.classList.remove('hidden');
}

/** Close any open modal */
function closeModal() {
    const modal = document.getElementById('how-to-play-modal');
    if (modal) modal.classList.add('hidden');
    const difficultyModal = document.getElementById('difficulty-modal');
    if (difficultyModal) difficultyModal.classList.add('hidden');
}

// ── Global Event Listeners ────────────────────────────────────────────────────

// Event: Escape key closes open modals
// This is an event-driven pattern: the user pressing a key triggers a UI change
document.addEventListener('keydown', function onGlobalKeydown(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Event: Window resize keeps the confetti canvas sized to the viewport
// This is a DOM event listener — event-driven response to browser resizing
window.addEventListener('resize', function onWindowResize() {
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

// ── Background Particle Animation ─────────────────────────────────────────────

/**
 * Initialise and animate floating banana/math emoji particles in the background.
 *
 * This is an event-driven animation pattern using CSS animations.
 * Each particle element has an 'animationend' event that could be used
 * to recycle particles — but here we use CSS infinite loops for simplicity.
 *
 * Version control note:
 *   This decorative feature is self-contained in app.js and can be
 *   modified or removed without touching any other module — good modularity.
 */
(function initBackgroundParticles() {
    const container = document.getElementById('bgParticles');
    if (!container) return;

    // The emoji symbols floating in the background relate to the game's theme
    const symbols = ['🍌', '🔢', '➕', '✖️', '🧮', '⭐', '➗', '🔣'];

    for (let i = 0; i < 14; i++) {
        const particle = document.createElement('div');
        particle.className   = 'particle';
        particle.textContent = symbols[i % symbols.length];
        particle.setAttribute('aria-hidden', 'true');

        // Randomise position, size, speed, and delay for a natural effect
        particle.style.left              = Math.random() * 98 + 'vw';
        particle.style.fontSize          = (Math.random() * 1.2 + 0.8) + 'rem';
        particle.style.animationDuration = (Math.random() * 14 + 10) + 's';
        particle.style.animationDelay    = (Math.random() * 12) + 's';

        container.appendChild(particle);
    }
})();
